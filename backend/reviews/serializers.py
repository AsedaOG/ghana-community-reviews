from rest_framework import serializers

from accounts.models import ReviewerProfile
from core.models import Listing

from .models import (
    BusinessClaim,
    Evidence,
    OwnerResponse,
    Review,
    ReviewPhoto,
    ReviewReply,
    ReviewVote,
    is_paying_customer,
)


class ReviewPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewPhoto
        fields = ["id", "image", "caption"]


class OwnerResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = OwnerResponse
        fields = ["id", "body", "created_at"]


class ReviewReplySerializer(serializers.ModelSerializer):
    reviewer = serializers.CharField(source="reviewer.username", read_only=True)

    class Meta:
        model = ReviewReply
        fields = ["id", "review", "body", "reviewer", "created_at"]
        read_only_fields = ["created_at"]

    def validate_body(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("A reply can't be empty.")
        return value

    def create(self, validated_data):
        user = self.context["request"].user
        reviewer = getattr(user, "reviewer_profile", None)
        if reviewer is None:
            reviewer = ReviewerProfile.objects.create(user=user)
        if reviewer.is_blocked:
            raise serializers.ValidationError(
                "This account has been blocked by moderators."
            )
        review = validated_data["review"]
        if not is_paying_customer(user):
            existing = ReviewReply.objects.filter(review=review, reviewer=reviewer).count()
            if existing >= ReviewReply.MAX_FREE_REPLIES_PER_REVIEW:
                raise serializers.ValidationError(
                    f"Free accounts can post up to "
                    f"{ReviewReply.MAX_FREE_REPLIES_PER_REVIEW} replies per review. "
                    "Subscribe for unlimited replies."
                )
        return ReviewReply.objects.create(reviewer=reviewer, **validated_data)


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
    replies = ReviewReplySerializer(many=True, read_only=True)
    upvotes = serializers.SerializerMethodField()
    downvotes = serializers.SerializerMethodField()
    my_vote = serializers.SerializerMethodField()
    can_reply_unlimited = serializers.SerializerMethodField()
    reply_limit = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id", "rating", "title", "body", "verification_level", "created_at",
            "reviewer", "reviewer_badges", "photos", "owner_response",
            "listing", "listing_slug", "has_evidence",
            "replies", "upvotes", "downvotes", "my_vote",
            "can_reply_unlimited", "reply_limit",
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

    def get_upvotes(self, obj):
        return sum(1 for v in obj.votes.all() if v.value == ReviewVote.Value.UP)

    def get_downvotes(self, obj):
        return sum(1 for v in obj.votes.all() if v.value == ReviewVote.Value.DOWN)

    def get_my_vote(self, obj):
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return None
        reviewer = getattr(request.user, "reviewer_profile", None)
        if reviewer is None:
            return None
        for v in obj.votes.all():
            if v.reviewer_id == reviewer.id:
                return "up" if v.value == ReviewVote.Value.UP else "down"
        return None

    def get_can_reply_unlimited(self, obj):
        request = self.context.get("request")
        if request is None:
            return False
        return is_paying_customer(request.user)

    def get_reply_limit(self, obj):
        return ReviewReply.MAX_FREE_REPLIES_PER_REVIEW

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

    def update(self, instance, validated_data):
        # Editing a review can only change rating/title/body — never move it
        # to a different listing.
        validated_data.pop("listing", None)
        return super().update(instance, validated_data)


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


