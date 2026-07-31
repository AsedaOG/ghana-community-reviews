import json

from django.conf import settings
from django.http import FileResponse
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MarketReport, Payment, ReportPurchase, Subscription, SubscriptionPlan
from .paystack import PaystackClient
from .serializers import (
    MarketReportSerializer,
    PaymentSerializer,
    SubscriptionPlanSerializer,
    SubscriptionSerializer,
)


class PlanListView(ListAPIView):
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer
    pagination_class = None


class ReportListView(ListAPIView):
    queryset = MarketReport.objects.filter(is_published=True)
    serializer_class = MarketReportSerializer
    pagination_class = None


class BillingStatusView(APIView):
    """The owner dashboard's billing card: subscription, purchases, history."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        subscription = (
            Subscription.objects.filter(user=request.user)
            .exclude(status=Subscription.Status.CANCELED)
            .select_related("plan")
            .order_by("-created_at")
            .first()
        )
        purchases = ReportPurchase.objects.filter(
            user=request.user, is_paid=True
        ).select_related("report")
        payments = Payment.objects.filter(user=request.user)[:20]
        return Response({
            "provider_configured": PaystackClient().configured,
            "subscription": SubscriptionSerializer(subscription).data if subscription else None,
            "purchased_reports": MarketReportSerializer(
                [p.report for p in purchases], many=True
            ).data,
            "payments": PaymentSerializer(payments, many=True).data,
        })


def _start_payment(request, *, purpose, amount_ghs, subscription=None, report_purchase=None):
    """Create a Payment and either hand off to Paystack (live) or settle it
    locally (sandbox, until API keys are added)."""
    payment = Payment.objects.create(
        user=request.user,
        purpose=purpose,
        subscription=subscription,
        report_purchase=report_purchase,
        amount_ghs=amount_ghs,
        currency=settings.PAYMENT_CURRENCY,
    )
    client = PaystackClient()
    if not client.configured:
        payment.status = Payment.Status.SANDBOX
        payment.save(update_fields=["status"])
        if subscription:
            subscription.activate()
        if report_purchase:
            report_purchase.is_paid = True
            report_purchase.save(update_fields=["is_paid"])
        return {
            "mode": "sandbox",
            "detail": "Payment provider keys are not configured — payment simulated "
                      "and activated locally.",
            "reference": str(payment.reference),
            "authorization_url": None,
        }

    init = client.initialize_transaction(
        email=request.user.email,
        amount_ghs=amount_ghs,
        reference=str(payment.reference),
        callback_url=f"{settings.FRONTEND_URL}/business/dashboard?payment={payment.reference}",
    )
    payment.raw_response = init
    payment.provider_reference = init.get("data", {}).get("reference", "")
    payment.save(update_fields=["raw_response", "provider_reference"])
    return {
        "mode": "live",
        "reference": str(payment.reference),
        "authorization_url": init.get("data", {}).get("authorization_url"),
    }


class SubscribeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan = SubscriptionPlan.objects.filter(
            slug=request.data.get("plan"), is_active=True
        ).first()
        if plan is None:
            return Response({"detail": "Unknown plan."}, status=400)
        if Subscription.objects.filter(
            user=request.user, status=Subscription.Status.ACTIVE
        ).exists():
            return Response({"detail": "You already have an active subscription."},
                            status=400)
        subscription = Subscription.objects.create(user=request.user, plan=plan)
        result = _start_payment(
            request, purpose=Payment.Purpose.SUBSCRIPTION,
            amount_ghs=plan.price_ghs, subscription=subscription,
        )
        return Response(result, status=status.HTTP_201_CREATED)


class PurchaseReportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        report = MarketReport.objects.filter(
            slug=request.data.get("report"), is_published=True
        ).first()
        if report is None:
            return Response({"detail": "Unknown report."}, status=400)
        purchase, created = ReportPurchase.objects.get_or_create(
            user=request.user, report=report
        )
        if purchase.is_paid:
            return Response({"detail": "You already own this report."}, status=400)
        result = _start_payment(
            request, purpose=Payment.Purpose.REPORT,
            amount_ghs=report.price_ghs, report_purchase=purchase,
        )
        return Response(result, status=status.HTTP_201_CREATED)


class ReportDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        purchase = ReportPurchase.objects.filter(
            user=request.user, report__slug=slug, is_paid=True
        ).select_related("report").first()
        if purchase is None:
            return Response({"detail": "You have not purchased this report."}, status=403)
        if not purchase.report.file:
            return Response({"detail": "The report file is not uploaded yet — "
                                       "contact support."}, status=404)
        return FileResponse(purchase.report.file.open("rb"), as_attachment=True)


class PaystackWebhookView(APIView):
    """Endpoint for Paystack to notify charge results. Configure the URL
    <api-host>/api/billing/webhook/paystack/ in the Paystack dashboard once
    keys are added. Inert (403) until then."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        client = PaystackClient()
        signature = request.headers.get("x-paystack-signature", "")
        if not client.valid_webhook_signature(request.body, signature):
            return Response({"detail": "Invalid signature."}, status=403)

        event = json.loads(request.body.decode())
        if event.get("event") == "charge.success":
            data = event.get("data", {})
            payment = Payment.objects.filter(reference=data.get("reference")).first()
            if payment and payment.status != Payment.Status.SUCCESS:
                payment.mark_success(
                    provider_reference=data.get("reference", ""), raw=data
                )
        return Response({"status": "ok"})
