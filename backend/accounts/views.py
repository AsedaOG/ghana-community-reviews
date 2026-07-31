from rest_framework.generics import ListAPIView

from .models import Badge
from .serializers import BadgeSerializer


class BadgeListView(ListAPIView):
    queryset = Badge.objects.all()
    serializer_class = BadgeSerializer
    pagination_class = None
