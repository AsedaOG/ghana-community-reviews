from django.db.models import Count, Prefetch, Q
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import ReviewerBadge, ReviewerProfile

from .models import Evidence, Report, Review, ReviewPhoto, ReviewReply, ReviewVote
from .permissions import IsReviewOwner
from .serializers import EvidenceSerializer, ReviewReplySerializer, ReviewSerializer


class ReviewViewSet(
    mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin, mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ReviewSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    # No PUT: editing only ever sends the fields that changed (PATCH).
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    filterset_fields = {
        "listing__slug": ["exact"],
        "reviewer__username": ["exact"],
        "verification_level": ["exact"],
        "rating": ["exact", "gte", "lte"],
    }
    ordering_fields = ["created_at", "rating"]

    def get_permissions(self):
        if self.action in ("partial_update", "destroy"):
            return [IsAuthenticated(), IsReviewOwner()]
        return super().get_permissions()

    def get_queryset(self):
        # Each entry in prefetch_related() is one extra DB round trip — on a
        # remote DB that's real latency, not free, so badges/replies are
        # collapsed into a single query each via Prefetch(select_related=...)
        # instead of the 2-query "a__b__c" string form.
        return (
            Review.objects.filter(status=Review.Status.PUBLISHED)
            .select_related("listing", "reviewer", "owner_response")
            .prefetch_related(
                "photos", "evidence", "votes", "reports",
                Prefetch(
                    "reviewer__badges",
                    queryset=ReviewerBadge.objects.select_related("badge"),
                ),
                Prefetch(
                    "replies",
                    queryset=ReviewReply.objects.select_related("reviewer"),
                ),
            )
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save()

        # Photos ride along as multipart files; workplaces never accept them.
        photos = request.FILES.getlist("photos")
        if photos and not review.listing.category.allows_photos:
            review.delete()
            return Response(
                {"detail": f"Photos are not allowed for {review.listing.category.name} reviews."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for f in photos[:5]:
            ReviewPhoto.objects.create(review=review, image=f)

        for f in request.FILES.getlist("evidence")[:5]:
            Evidence.objects.create(review=review, file=f)

        out = ReviewSerializer(review, context=self.get_serializer_context())
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def vote(self, request, pk=None):
        """Cast/change/clear an upvote or downvote. Voting the same value
        again clears your vote."""
        review = self.get_object()
        value = request.data.get("value")
        if value not in ("up", "down"):
            return Response({"detail": "value must be \"up\" or \"down\"."}, status=400)
        numeric = ReviewVote.Value.UP if value == "up" else ReviewVote.Value.DOWN

        reviewer = getattr(request.user, "reviewer_profile", None)
        if reviewer is None:
            reviewer = ReviewerProfile.objects.create(user=request.user)
        if reviewer.is_blocked:
            return Response(
                {"detail": "This account has been blocked by moderators."}, status=403
            )

        existing = ReviewVote.objects.filter(review=review, reviewer=reviewer).first()
        if existing and existing.value == numeric:
            existing.delete()
            my_vote = None
        elif existing:
            existing.value = numeric
            existing.save(update_fields=["value"])
            my_vote = value
        else:
            ReviewVote.objects.create(review=review, reviewer=reviewer, value=numeric)
            my_vote = value

        counts = ReviewVote.objects.filter(review=review).aggregate(
            upvotes=Count("id", filter=Q(value=ReviewVote.Value.UP)),
            downvotes=Count("id", filter=Q(value=ReviewVote.Value.DOWN)),
        )
        return Response({
            "upvotes": counts["upvotes"] or 0,
            "downvotes": counts["downvotes"] or 0,
            "my_vote": my_vote,
        })

    @action(detail=True, methods=["post"])
    def report(self, request, pk=None):
        """Flag a review as abusive or false for staff to review. Filing a
        report does not by itself add a strike — a moderator has to uphold
        it first (see ReportDecisionView)."""
        review = self.get_object()

        reviewer = getattr(request.user, "reviewer_profile", None)
        if reviewer is None:
            reviewer = ReviewerProfile.objects.create(user=request.user)
        if reviewer.is_blocked:
            return Response(
                {"detail": "This account has been blocked by moderators."}, status=403
            )
        if review.reviewer_id == reviewer.id:
            return Response({"detail": "You can't report your own review."}, status=400)
        if Report.objects.filter(review=review, reported_by=reviewer).exists():
            return Response({"detail": "You already reported this review."}, status=400)

        reason = (request.data.get("reason") or "").strip()[:255]
        if not reason:
            return Response(
                {"detail": "Please tell us why you're reporting this review."}, status=400
            )

        Report.objects.create(
            review=review,
            reported_by=reviewer,
            reason=reason,
        )

        return Response(
            {"detail": "Report received. Our moderators will review it.", "reported_by_me": True},
            status=status.HTTP_201_CREATED,
        )


class EvidenceViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Attach evidence to a review you already published."""

    queryset = Evidence.objects.all()
    serializer_class = EvidenceSerializer
    parser_classes = [MultiPartParser, FormParser]


class ReviewReplyViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    """Threaded replies to a review. Free accounts are capped at
    ReviewReply.MAX_FREE_REPLIES_PER_REVIEW per review — enforced in
    ReviewReplySerializer.create()."""

    queryset = ReviewReply.objects.select_related("reviewer")
    serializer_class = ReviewReplySerializer
    filterset_fields = ["review"]
    pagination_class = None
