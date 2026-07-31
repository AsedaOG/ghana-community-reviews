"""Staff-only review queue for member-suggested listings."""
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Area, Listing, ListingRequest
from .serializers import ListingRequestSerializer


class ListingRequestQueueView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        status_filter = request.query_params.get("status", "pending")
        qs = ListingRequest.objects.select_related(
            "category", "region", "district", "area", "requester"
        )
        if status_filter != "all":
            qs = qs.filter(status=status_filter)
        return Response(ListingRequestSerializer(qs, many=True).data)


class ListingRequestDecisionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        req = (
            ListingRequest.objects.select_related("category", "region", "district", "area")
            .filter(pk=pk)
            .first()
        )
        if req is None:
            return Response({"detail": "Request not found."}, status=404)
        if req.status != ListingRequest.Status.PENDING:
            return Response({"detail": "This request has already been resolved."}, status=400)

        decision = request.data.get("decision")
        if decision not in ("approve", "reject"):
            return Response({"detail": "decision must be 'approve' or 'reject'."}, status=400)

        req.admin_note = request.data.get("admin_note", "")

        if decision == "reject":
            req.status = ListingRequest.Status.REJECTED
            req.save(update_fields=["status", "admin_note"])
            return Response(ListingRequestSerializer(req).data)

        area = req.area
        if area is None:
            # Requester's area wasn't in the system yet — create it now.
            area, _ = Area.objects.get_or_create(district=req.district, name=req.new_area_name.strip())

        listing = Listing.objects.create(
            category=req.category,
            area=area,
            name=req.name,
            description=req.description,
            address=req.address,
        )
        req.status = ListingRequest.Status.APPROVED
        req.resolved_listing = listing
        req.save(update_fields=["status", "admin_note", "resolved_listing"])
        return Response(ListingRequestSerializer(req).data)
