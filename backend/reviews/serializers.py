from rest_framework import serializers

from accounts.models import ReviewerProfile
from core.models import Listing

from .models import BusinessClaim, Evidence, OwnerResponse, Review, ReviewPhoto


class ReviewPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewPhoto
        fields = ["id", "image", "caption"]


class OwnerResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = OwnerResponse
        fields = ["id", "body", "created_at"]


class ReviewSerializer(serializers.ModelSerializer):
    reviewer = serializers.CharField(source="reviewer.username", read_only=True)
    reviewer_badges = serializers.SerializerMethodField()
    photos = ReviewPhotoSerializer(many=True, read_only=True)
    owner_response = OwnerResponseSerializer(read_only=True)
    listing_slug = serializers.SlugRelatedField(
        source="listing", slug_field="slug", queryset=Listing.objects.all(), write_only=True
    )
    listing = serializers.SerializerMethodField(read_only=True)
    has_evidence = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id", "rating", "title", "body", "verification_level", "created_at",
            "reviewer", "reviewer_badges", "photos", "owner_response",
            "listing", "listing_slug", "has_evidence",
        ]
        read_only_fields = ["verification_level", "created_at"]

    def get_listing(self, obj):
        return {"name": obj.listing.name, "slug": obj.listing.slug}

    def get_reviewer_badges(self, obj):
        return [
            {"name": rb.badge.name, "icon": rb.badge.icon}
            for rb in obj.reviewer.badges.select_related("badge")
        ]

    def get_has_evidence(self, obj):
        return obj.evidence.exists()

    def create(self, validated_data):
        user = self.context["request"].user
        reviewer = getattr(user, "reviewer_profile", None)
        if reviewer is None:
            # Owners and staff get an anonymous identity on their first review.
            reviewer = ReviewerProfile.objects.create(user=user)
        if reviewer.is_blocked:
            raise serializers.ValidationError(
                "This account has been blocked by moderators."
            )
        review = Review.objects.create(reviewer=reviewer, **validated_data)
        if reviewer.is_trusted:
            review.verification_level = Review.VerificationLevel.TRUSTED
            review.save(update_fields=["verification_level"])
        return review


class EvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidence
        fields = ["id", "review", "file", "note"]

    def validate(self, attrs):
        user = self.context["request"].user
        if attrs["review"].reviewer.user_id != user.id:
            raise serializers.ValidationError("Evidence can only be added to your own review.")
        return attrs


class BusinessClaimSerializer(serializers.ModelSerializer):
    listing_slug = serializers.SlugRelatedField(
        source="listing", slug_field="slug", queryset=Listing.objects.all(), write_only=True
    )
    listing = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = BusinessClaim
        fields = ["id", "listing_slug", "listing", "contact_name", "email", "phone",
                  "message", "status", "created_at"]
        read_only_fields = ["status", "created_at"]

    def get_listing(self, obj):
        return {"name": obj.listing.name, "slug": obj.listing.slug}


