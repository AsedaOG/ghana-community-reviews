"""Email + password auth for business owners (and staff logins for the
moderation panel). Flow: register → inactive User + verification email →
verify → active + DRF token → login anywhere."""
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import EmailVerificationToken, OwnerAccount


def _send_verification_email(user):
    token = EmailVerificationToken.objects.create(user=user)
    link = f"{settings.FRONTEND_URL}/business/verify?token={token.token}"
    send_mail(
        subject="Verify your Ghana Community Reviews business account",
        message=(
            f"Akwaaba!\n\nConfirm your email to activate your business account:\n\n"
            f"{link}\n\nThe link is valid for {EmailVerificationToken.VALID_HOURS} hours.\n"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        business_name = (request.data.get("business_name") or "").strip()
        phone = (request.data.get("phone") or "").strip()

        if not email or "@" not in email:
            return Response({"detail": "A valid email is required."}, status=400)
        if len(password) < 8:
            return Response(
                {"detail": "Password must be at least 8 characters."}, status=400
            )
        if User.objects.filter(username=email).exists():
            return Response(
                {"detail": "An account with this email already exists."}, status=400
            )

        user = User.objects.create_user(
            username=email, email=email, password=password, is_active=False
        )
        OwnerAccount.objects.create(user=user, business_name=business_name, phone=phone)
        _send_verification_email(user)
        return Response(
            {"detail": "Account created. Check your email for a verification link."},
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw = request.data.get("token")
        record = EmailVerificationToken.objects.filter(token=raw).first() if raw else None
        if record is None or not record.is_valid:
            return Response(
                {"detail": "This verification link is invalid or has expired."}, status=400
            )
        record.used_at = timezone.now()
        record.save(update_fields=["used_at"])

        user = record.user
        user.is_active = True
        user.save(update_fields=["is_active"])
        account = getattr(user, "owner_account", None)
        if account and account.email_verified_at is None:
            account.email_verified_at = timezone.now()
            account.save(update_fields=["email_verified_at"])

        token, _ = Token.objects.get_or_create(user=user)
        return Response({"detail": "Email verified.", **session_payload(user, token)})


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        user = User.objects.filter(username=email, is_active=False).first()
        if user:
            _send_verification_email(user)
        # Same answer either way — don't leak which emails exist.
        return Response({"detail": "If that account exists, a new link has been sent."})


def session_payload(user, token):
    """One shape for every kind of account — the frontend routes on `kind`."""
    reviewer = getattr(user, "reviewer_profile", None)
    owner = getattr(user, "owner_account", None)
    if user.is_staff:
        kind, name = "staff", user.email or user.username
    elif owner is not None:
        kind, name = "owner", owner.business_name or user.email
    else:
        kind, name = "reviewer", reviewer.username if reviewer else user.email
    return {
        "token": token.key,
        "kind": kind,
        "name": name,
        "email": user.email,
        "is_staff": user.is_staff,
        "username": reviewer.username if reviewer else "",
    }


class LoginView(APIView):
    """Single sign-in for every role: reviewers, business owners and staff."""

    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""
        user = authenticate(request, username=email, password=password)
        if user is None:
            inactive = User.objects.filter(username=email, is_active=False).first()
            if inactive is not None:
                reviewer = getattr(inactive, "reviewer_profile", None)
                if reviewer is not None and reviewer.is_blocked:
                    return Response(
                        {"detail": "This account has been blocked by moderators."},
                        status=403,
                    )
                return Response(
                    {"detail": "Email not verified yet. Check your inbox or resend the link."},
                    status=403,
                )
            return Response({"detail": "Invalid email or password."}, status=400)

        reviewer = getattr(user, "reviewer_profile", None)
        if reviewer is not None and reviewer.is_blocked:
            return Response(
                {"detail": "This account has been blocked by moderators."}, status=403
            )
        token, _ = Token.objects.get_or_create(user=user)
        return Response(session_payload(user, token))


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({"detail": "Logged out."})


class AccountMeView(APIView):
    """Session check used by the frontend to validate a stored token."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        token, _ = Token.objects.get_or_create(user=request.user)
        account = getattr(request.user, "owner_account", None)
        return Response({
            **session_payload(request.user, token),
            "business_name": account.business_name if account else "",
            "phone": account.phone if account else "",
        })
