from rest_framework import serializers

from .models import Badge, ReviewerProfile


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ["name", "slug", "description", "icon", "min_reviews"]


class ReviewerProfileSerializer(serializers.ModelSerializer):
    badges = serializers.SerializerMethodField()
    review_count = serializers.IntegerField(source="reviews.count", read_only=True)

    has_account = serializers.SerializerMethodField()

    class Meta:
        model = ReviewerProfile
        fields = ["username", "reputation", "is_trusted", "is_blocked", "created_at",
                  "badges", "review_count", "has_account"]

    def get_has_account(self, obj):
        return obj.user_id is not None

    def get_badges(self, obj):
        return BadgeSerializer([rb.badge for rb in obj.badges.select_related("badge")], many=True).data
