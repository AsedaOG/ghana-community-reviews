from django.urls import path

from .views import (
    BillingStatusView,
    PaystackWebhookView,
    PlanListView,
    PurchaseReportView,
    ReportDownloadView,
    ReportListView,
    SubscribeView,
)

urlpatterns = [
    path("billing/plans/", PlanListView.as_view(), name="billing-plans"),
    path("billing/reports/", ReportListView.as_view(), name="billing-reports"),
    path("billing/reports/<slug:slug>/download/", ReportDownloadView.as_view(),
         name="billing-report-download"),
    path("billing/status/", BillingStatusView.as_view(), name="billing-status"),
    path("billing/subscribe/", SubscribeView.as_view(), name="billing-subscribe"),
    path("billing/purchase-report/", PurchaseReportView.as_view(),
         name="billing-purchase-report"),
    path("billing/webhook/paystack/", PaystackWebhookView.as_view(),
         name="billing-webhook-paystack"),
]
