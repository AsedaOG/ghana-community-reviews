from rest_framework import mixins, status, viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import Evidence, Review, ReviewPhoto
from .serializers import EvidenceSerializer, ReviewSerializer


class ReviewViewSet(
    mixins.CreateModelMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ReviewSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filterset_fields = {
        "listing__slug": ["exact"],
        "reviewer__username": ["exact"],
        "verification_level": ["exact"],
        "rating": ["exact", "gte", "lte"],
    }
    ordering_fields = ["created_at", "rating"]

    def get_queryset(self):
        return (
            Review.objects.filter(status=Review.Status.PUBLISHED)
            .select_related("listing", "reviewer", "owner_response")
            .prefetch_related("photos", "reviewer__badges__badge", "evidence")
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


class EvidenceViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Attach evidence to a review you already published."""

    queryset = Evidence.objects.all()
    serializer_class = EvidenceSerializer
    parser_classes = [MultiPartParser, FormParser]
