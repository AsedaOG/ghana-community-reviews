from django.urls import path

from .auth_views import (
    AccountMeView,
    LoginView,
    LogoutView,
    RegisterView,
    ResendVerificationView,
    VerifyEmailView,
)
from .reviewer_auth_views import ReviewerMeView, ReviewerRegisterView
from .views import BadgeListView, ReviewerLeaderboardView

urlpatterns = [
    path("badges/", BadgeListView.as_view(), name="badges"),
    path("reviewers/leaderboard/", ReviewerLeaderboardView.as_view(), name="reviewer-leaderboard"),
    # Auth — one login for every role, two sign-up paths.
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/account/", AccountMeView.as_view(), name="auth-account"),
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/verify/", VerifyEmailView.as_view(), name="auth-verify"),
    path("auth/resend-verification/", ResendVerificationView.as_view(), name="auth-resend"),
    path("reviewer/register/", ReviewerRegisterView.as_view(), name="reviewer-register"),
    path("reviewer/me/", ReviewerMeView.as_view(), name="reviewer-me"),
]
