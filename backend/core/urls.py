from django.urls import path
from rest_framework.routers import DefaultRouter

from .moderation_views import ListingRequestDecisionView, ListingRequestQueueView
from .views import (
    AreaViewSet,
    CategoryViewSet,
    ListingRequestViewSet,
    ListingViewSet,
    RegionViewSet,
)

router = DefaultRouter()
router.register("regions", RegionViewSet, basename="region")
router.register("areas", AreaViewSet, basename="area")
router.register("categories", CategoryViewSet, basename="category")
router.register("listings", ListingViewSet, basename="listing")
router.register("listing-requests", ListingRequestViewSet, basename="listing-request")

urlpatterns = router.urls + [
    path("moderation/listing-requests/", ListingRequestQueueView.as_view(),
         name="moderation-listing-requests"),
    path("moderation/listing-requests/<int:pk>/", ListingRequestDecisionView.as_view(),
         name="moderation-listing-request-decision"),
]
