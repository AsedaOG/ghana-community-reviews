from django.db.models import Avg, Count, Q
from rest_framework import serializers

from .models import Area, Category, District, Listing, ListingRequest, Region


class AreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Area
        fields = ["id", "name", "slug"]


class DistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = ["id", "name", "slug"]


class RegionSerializer(serializers.ModelSerializer):
    districts = DistrictSerializer(many=True, read_only=True)

    class Meta:
        model = Region
        fields = ["id", "name", "slug", "districts"]


class CategorySerializer(serializers.ModelSerializer):
    listing_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "icon", "allows_photos", "listing_count"]


class ListingSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_slug = serializers.SlugRelatedField(
        source="category", slug_field="slug", queryset=Category.objects.all(), write_only=True
    )
    area = serializers.SerializerMethodField()
    area_id = serializers.PrimaryKeyRelatedField(
        source="area", queryset=Area.objects.all(), write_only=True
    )
    average_rating = serializers.FloatField(read_only=True)
    review_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Listing
        fields = [
            "id", "name", "slug", "description", "address", "is_claimed", "created_at",
            "category", "category_slug", "area", "area_id", "average_rating", "review_count",
        ]
        read_only_fields = ["slug", "is_claimed"]

    def get_area(self, obj):
        return {
            "name": obj.area.name,
            "district": obj.area.district.name,
            "region": obj.area.district.region.name,
        }


class ListingRequestSerializer(serializers.ModelSerializer):
    """Suggest-a-listing form. Requesters pick an existing Region → District
    → Area, or type `new_area_name` when their area isn't listed yet — the
    admin decision endpoint creates that Area on approval."""

    category = CategorySerializer(read_only=True)
    category_slug = serializers.SlugRelatedField(
        source="category", slug_field="slug", queryset=Category.objects.all(), write_only=True
    )
    region_id = serializers.PrimaryKeyRelatedField(
        source="region", queryset=Region.objects.all(), write_only=True
    )
    district_id = serializers.PrimaryKeyRelatedField(
        source="district", queryset=District.objects.all(), write_only=True
    )
    area_id = serializers.PrimaryKeyRelatedField(
        source="area", queryset=Area.objects.all(), write_only=True, required=False, allow_null=True
    )
    location = serializers.SerializerMethodField()
    requester_email = serializers.EmailField(source="requester.email", read_only=True)

    class Meta:
        model = ListingRequest
        fields = [
            "id", "name", "description", "address",
            "category", "category_slug",
            "location", "region_id", "district_id", "area_id", "new_area_name",
            "status", "admin_note", "created_at", "requester_email",
        ]
        read_only_fields = ["status", "admin_note", "created_at"]

    def get_location(self, obj):
        return {
            "region": obj.region.name,
            "district": obj.district.name,
            "area": obj.area.name if obj.area else obj.new_area_name,
        }

    def validate(self, attrs):
        region = attrs.get("region")
        district = attrs.get("district")
        area = attrs.get("area")
        if district and region and district.region_id != region.id:
            raise serializers.ValidationError("That district isn't in the selected region.")
        if area and district and area.district_id != district.id:
            raise serializers.ValidationError("That area isn't in the selected district.")
        if not area and not attrs.get("new_area_name", "").strip():
            raise serializers.ValidationError(
                "Choose an existing area, or type a new area name if yours isn't listed."
            )
        return attrs

    def create(self, validated_data):
        return ListingRequest.objects.create(
            requester=self.context["request"].user, **validated_data
        )


def annotated_listings(queryset):
    published = Q(reviews__status="published")
    return queryset.select_related("category", "area__district__region").annotate(
        average_rating=Avg("reviews__rating", filter=published),
        review_count=Count("reviews", filter=published, distinct=True),
    )
