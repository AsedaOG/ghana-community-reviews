from django.db.models import Count, Q
from rest_framework.generics import ListAPIView

from .models import Badge, ReviewerProfile
from .serializers import BadgeSerializer, ReviewerLeaderboardSerializer


class BadgeListView(ListAPIView):
    queryset = Badge.objects.all()
    serializer_class = BadgeSerializer
    pagination_class = None


class ReviewerLeaderboardView(ListAPIView):
    """Top reviewers by reputation — hidden/blocked reviewers never appear."""

    serializer_class = ReviewerLeaderboardSerializer
    pagination_class = None

    def get_queryset(self):
        return (
            ReviewerProfile.objects.filter(is_blocked=False)
            .annotate(
                review_count=Count(
                    "reviews", filter=Q(reviews__status="published"), distinct=True
                )
            )
            .filter(review_count__gt=0)
            .prefetch_related("badges__badge")
            .order_by("-reputation", "-review_count")[:50]
        )
