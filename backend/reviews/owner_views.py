"""Authenticated business-owner endpoints backing the frontend dashboard."""
from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Listing
from core.serializers import ListingSerializer, annotated_listings

from .models import BusinessClaim, OwnerResponse, Review
from .serializers import BusinessClaimSerializer, ReviewSerializer


def approved_listing_ids(user):
    return BusinessClaim.objects.filter(
        owner=user, status=BusinessClaim.Status.APPROVED
    ).values_list("listing_id", flat=True)


class OwnerOverviewView(APIView):
    """Everything the dashboard needs in one call: claims, listings, reviews."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        claims = BusinessClaim.objects.filter(owner=request.user).select_related("listing")
        listings = annotated_listings(
            Listing.objects.filter(id__in=approved_listing_ids(request.user))
        )
        reviews = (
            Review.objects.filter(
                listing_id__in=approved_listing_ids(request.user),
                status=Review.Status.PUBLISHED,
            )
            .select_related("listing", "reviewer", "owner_response")
            .prefetch_related(
                "photos", "reviewer__badges__badge", "evidence",
                "votes", "replies__reviewer",
            )
            .order_by("-created_at")[:50]
        )
        return Response({
            "claims": BusinessClaimSerializer(claims, many=True).data,
            "listings": ListingSerializer(listings, many=True).data,
            "reviews": ReviewSerializer(reviews, many=True).data,
        })


class OwnerClaimView(APIView):
    """Claim a listing while logged in — the claim is tied to the account."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        account = getattr(request.user, "owner_account", None)
        data = {
            "email": request.user.email,
            "contact_name": (account.business_name if account else "") or request.user.email,
            **request.data,
        }
        serializer = BusinessClaimSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        listing = serializer.validated_data["listing"]
        existing = BusinessClaim.objects.filter(
            owner=request.user, listing=listing
        ).exclude(status=BusinessClaim.Status.REJECTED)
        if existing.exists():
            return Response(
                {"detail": "You already have a claim on this listing."}, status=400
            )
        claim = serializer.save(owner=request.user, email=request.user.email)
        return Response(BusinessClaimSerializer(claim).data, status=status.HTTP_201_CREATED)


class OwnerRespondView(APIView):
    """Public response to a review on a listing with an approved claim."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        review_id = request.data.get("review")
        body = (request.data.get("body") or "").strip()
        if not body:
            return Response({"detail": "A response body is required."}, status=400)
        review = Review.objects.filter(pk=review_id).select_related("listing").first()
        if review is None:
            return Response({"detail": "Review not found."}, status=404)
        claim = BusinessClaim.objects.filter(
            owner=request.user,
            listing=review.listing,
            status=BusinessClaim.Status.APPROVED,
        ).first()
        if claim is None:
            return Response(
                {"detail": "You need an approved claim on this listing to respond."},
                status=403,
            )
        if hasattr(review, "owner_response"):
            return Response({"detail": "This review already has a response."}, status=400)
        response = OwnerResponse.objects.create(review=review, claim=claim, body=body)
        return Response(
            {"id": response.id, "body": response.body, "created_at": response.created_at},
            status=status.HTTP_201_CREATED,
        )


class OwnerListingUpdateView(APIView):
    """Manage profile information: description and address only."""

    permission_classes = [IsAuthenticated]

    def patch(self, request, slug):
        listing = Listing.objects.filter(slug=slug).first()
        if listing is None:
            return Response({"detail": "Listing not found."}, status=404)
        if listing.id not in set(approved_listing_ids(request.user)):
            return Response(
                {"detail": "You need an approved claim on this listing."}, status=403
            )
        for field in ("description", "address"):
            if field in request.data:
                setattr(listing, field, request.data[field])
        listing.save()
        qs = annotated_listings(Listing.objects.filter(pk=listing.pk))
        return Response(ListingSerializer(qs.first()).data)
