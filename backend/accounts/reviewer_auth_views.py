"""Reviewer sign-up. Everyone needs an account to use the platform, but the
account never becomes public: readers only ever see the generated username.
The email exists so people can sign in — and so moderators can block abusers."""
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth_views import session_payload
from .models import ReviewerProfile
from .serializers import ReviewerProfileSerializer


class ReviewerRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""

        if not email or "@" not in email:
            return Response({"detail": "A valid email is required."}, status=400)
        if len(password) < 8:
            return Response({"detail": "Password must be at least 8 characters."},
                            status=400)
        if User.objects.filter(username=email).exists():
            return Response({"detail": "An account with this email already exists."},
                            status=400)

        user = User.objects.create_user(username=email, email=email, password=password)
        profile = ReviewerProfile.objects.create(user=user)
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                **session_payload(user, token),
                "detail": f"You are now {profile.username} — that is the only name "
                          "other people see. Your email stays private.",
            },
            status=status.HTTP_201_CREATED,
        )


class ReviewerMeView(APIView):
    """The signed-in reviewer's own profile: username, reputation, badges."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, "reviewer_profile", None)
        if profile is None:
            # Business owners and staff can review too — give them an identity
            # the first time they look for one.
            profile = ReviewerProfile.objects.create(user=request.user)
        return Response(ReviewerProfileSerializer(profile).data)
