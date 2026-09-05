from django.db import connection
from django.db.models import Count, Q
from rest_framework import mixins, viewsets
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated

from .models import Area, Category, Listing, ListingRequest, Region
from .serializers import (
    AreaSerializer,
    CategorySerializer,
    ListingRequestSerializer,
    ListingSerializer,
    RegionSerializer,
    annotated_listings,
)


class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    """Region → District tree (no areas nested — with ~21k areas that payload
    would be megabytes for a dropdown almost nobody scrolls through). Fetch a
    district's areas on demand from AreaViewSet instead."""

    queryset = Region.objects.prefetch_related("districts")
    serializer_class = RegionSerializer
    lookup_field = "slug"
    pagination_class = None
    permission_classes = [AllowAny]


class AreaViewSet(viewsets.ReadOnlyModelViewSet):
    """Areas for a single district, e.g. /api/areas/?district=123 — used to
    populate the last step of a Region → District → Area cascading select."""

    queryset = Area.objects.all()
    serializer_class = AreaSerializer
    filterset_fields = ["district"]
    pagination_class = None
    ordering_fields = ["name"]

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.query_params.get("district"):
            # Avoid accidentally serving all ~21k areas if the filter is dropped.
            return qs.none()
        return qs


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.annotate(listing_count=Count("listings"))
    serializer_class = CategorySerializer
    lookup_field = "slug"
    pagination_class = None
    permission_classes = [AllowAny]


class ListingViewSet(viewsets.ModelViewSet):
    """Public reads; direct creation is staff-only. Everyone else suggests a
    place through ListingRequestViewSet, which goes to the moderation queue."""

    serializer_class = ListingSerializer
    lookup_field = "slug"
    http_method_names = ["get", "post", "head", "options"]
    filterset_fields = {
        "category__slug": ["exact"],
        "area__district__region__slug": ["exact"],
        "area__district__slug": ["exact"],
    }
    ordering_fields = ["name", "created_at", "average_rating", "review_count"]

    def get_permissions(self):
        if self.action == "create":
            return [IsAdminUser()]
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = annotated_listings(Listing.objects.all())
        q = self.request.query_params.get("q")
        if q:
            if connection.vendor == "postgresql":
                # PostgreSQL full-text search, per the spec.
                from django.contrib.postgres.search import SearchQuery, SearchVector

                qs = qs.annotate(
                    search=SearchVector("name", "description", "address", "area__name")
                ).filter(search=SearchQuery(q))
            else:
                qs = qs.filter(
                    Q(name__icontains=q)
                    | Q(description__icontains=q)
                    | Q(address__icontains=q)
                    | Q(area__name__icontains=q)
                )
        return qs


class ListingRequestViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    """POST to suggest a new listing; GET returns the signed-in user's own
    requests so they can track the outcome."""

    serializer_class = ListingRequestSerializer
    pagination_class = None

    def get_queryset(self):
        return ListingRequest.objects.filter(requester=self.request.user).select_related(
            "category", "region", "district", "area"
        )
