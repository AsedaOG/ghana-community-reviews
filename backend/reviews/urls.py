from django.urls import path
from rest_framework.routers import DefaultRouter

from .moderation_views import (
    ClaimDecisionView,
    EvidenceDecisionView,
    ModerationQueueView,
    ReportDecisionView,
    ReviewerBlockView,
    ReviewerListView,
    ReviewModerationView,
)
from .owner_views import (
    OwnerClaimView,
    OwnerListingUpdateView,
    OwnerOverviewView,
    OwnerRespondView,
)
from .views import EvidenceViewSet, ReviewReplyViewSet, ReviewViewSet

router = DefaultRouter()
router.register("reviews", ReviewViewSet, basename="review")
router.register("evidence", EvidenceViewSet, basename="evidence")
router.register("replies", ReviewReplyViewSet, basename="review-reply")

urlpatterns = router.urls + [
    path("owner/overview/", OwnerOverviewView.as_view(), name="owner-overview"),
    path("owner/claim/", OwnerClaimView.as_view(), name="owner-claim"),
    path("owner/respond/", OwnerRespondView.as_view(), name="owner-respond"),
    path("owner/listings/<slug:slug>/", OwnerListingUpdateView.as_view(), name="owner-listing"),
    path("moderation/queue/", ModerationQueueView.as_view(), name="moderation-queue"),
    path("moderation/claims/<int:pk>/", ClaimDecisionView.as_view(), name="moderation-claim"),
    path("moderation/evidence/<int:pk>/", EvidenceDecisionView.as_view(), name="moderation-evidence"),
    path("moderation/reviews/<int:pk>/", ReviewModerationView.as_view(), name="moderation-review"),
    path("moderation/reports/<int:pk>/", ReportDecisionView.as_view(), name="moderation-report"),
    path("moderation/reviewers/", ReviewerListView.as_view(), name="moderation-reviewers"),
    path("moderation/reviewers/<int:pk>/", ReviewerBlockView.as_view(), name="moderation-reviewer-block"),
]
