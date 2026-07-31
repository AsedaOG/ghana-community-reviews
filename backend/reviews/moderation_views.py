"""Staff-only endpoints backing the frontend moderation panel. The full Django
admin remains available at /admin/ for anything not covered here."""
from django.db.models import Count
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import ReviewerProfile

from .models import BusinessClaim, Evidence, Review
from .serializers import BusinessClaimSerializer, ReviewSerializer


class ModerationQueueView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        pending_claims = BusinessClaim.objects.filter(
            status=BusinessClaim.Status.PENDING
        ).select_related("listing")
        unreviewed_evidence = Evidence.objects.filter(
            reviewed_by_admin=False
        ).select_related("review__listing", "review__reviewer")
        flagged = (
            Review.objects.filter(status=Review.Status.FLAGGED)
            .select_related("listing", "reviewer", "owner_response")
            .prefetch_related("photos", "reviewer__badges__badge", "evidence")
        )
        return Response({
            "pending_claims": BusinessClaimSerializer(pending_claims, many=True).data,
            "unreviewed_evidence": [
                {
                    "id": e.id,
                    "review_id": e.review_id,
                    "review_title": e.review.title,
                    "listing": e.review.listing.name,
                    "reviewer": e.review.reviewer.username,
                    "file": e.file.url if e.file else None,
                    "note": e.note,
                    "uploaded_at": e.uploaded_at,
                }
                for e in unreviewed_evidence
            ],
            "flagged_reviews": ReviewSerializer(flagged, many=True).data,
        })


class ReviewerListView(APIView):
    """Search reviewers for the moderation panel."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = ReviewerProfile.objects.annotate(n_reviews=Count("reviews"))
        q = request.query_params.get("q")
        if q:
            qs = qs.filter(username__icontains=q)
        if request.query_params.get("blocked") == "1":
            qs = qs.filter(is_blocked=True)
        return Response([
            {
                "id": p.id,
                "username": p.username,
                "reputation": p.reputation,
                "review_count": p.n_reviews,
                "is_trusted": p.is_trusted,
                "is_blocked": p.is_blocked,
                "has_account": p.user_id is not None,
                "created_at": p.created_at,
            }
            for p in qs.order_by("-n_reviews")[:50]
        ])


class ReviewerBlockView(APIView):
    """Block or unblock a reviewer. Blocking stops new reviews immediately;
    if the reviewer has an account, their login is disabled too. Existing
    reviews stay up — remove them individually if needed."""

    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        profile = ReviewerProfile.objects.filter(pk=pk).select_related("user").first()
        if profile is None:
            return Response({"detail": "Reviewer not found."}, status=404)
        action = request.data.get("action")
        if action not in ("block", "unblock"):
            return Response({"detail": "action must be 'block' or 'unblock'."},
                            status=400)
        profile.is_blocked = action == "block"
        profile.save(update_fields=["is_blocked"])
        if profile.user:
            profile.user.is_active = not profile.is_blocked
            profile.user.save(update_fields=["is_active"])
        return Response({"id": profile.id, "username": profile.username,
                         "is_blocked": profile.is_blocked})


class ClaimDecisionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        claim = BusinessClaim.objects.filter(pk=pk).first()
        if claim is None:
            return Response({"detail": "Claim not found."}, status=404)
        decision = request.data.get("decision")
        if decision not in ("approve", "reject"):
            return Response({"detail": "decision must be 'approve' or 'reject'."}, status=400)
        claim.status = (
            BusinessClaim.Status.APPROVED if decision == "approve"
            else BusinessClaim.Status.REJECTED
        )
        claim.save()
        return Response(BusinessClaimSerializer(claim).data)


class EvidenceDecisionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        evidence = Evidence.objects.filter(pk=pk).select_related("review").first()
        if evidence is None:
            return Response({"detail": "Evidence not found."}, status=404)
        verified = bool(request.data.get("verified"))
        evidence.is_verified = verified
        evidence.reviewed_by_admin = True
        evidence.save(update_fields=["is_verified", "reviewed_by_admin"])
        if verified:
            review = evidence.review
            if review.verification_level == Review.VerificationLevel.COMMUNITY:
                review.verification_level = Review.VerificationLevel.VERIFIED
                review.save(update_fields=["verification_level"])
        return Response({"id": evidence.id, "is_verified": evidence.is_verified})


class ReviewModerationView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        review = Review.objects.filter(pk=pk).first()
        if review is None:
            return Response({"detail": "Review not found."}, status=404)
        action = request.data.get("action")
        actions = {
            "remove": Review.Status.REMOVED,
            "restore": Review.Status.PUBLISHED,
            "flag": Review.Status.FLAGGED,
        }
        if action not in actions:
            return Response(
                {"detail": f"action must be one of {sorted(actions)}."}, status=400
            )
        review.status = actions[action]
        review.save(update_fields=["status"])
        return Response({"id": review.id, "status": review.status})
