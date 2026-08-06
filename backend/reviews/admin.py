from django.contrib import admin

from .models import (
    BusinessClaim,
    Evidence,
    OwnerResponse,
    Review,
    ReviewPhoto,
    ReviewReply,
    ReviewVote,
)


class ReviewPhotoInline(admin.TabularInline):
    model = ReviewPhoto
    extra = 0


class EvidenceInline(admin.TabularInline):
    model = Evidence
    extra = 0


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["listing", "reviewer", "rating", "verification_level", "status", "created_at"]
    list_filter = ["status", "verification_level", "rating", "listing__category"]
    search_fields = ["title", "body", "listing__name", "reviewer__username"]
    inlines = [ReviewPhotoInline, EvidenceInline]
    actions = ["mark_verified", "flag", "remove"]

    @admin.action(description="Upgrade to Verified Experience")
    def mark_verified(self, request, queryset):
        queryset.update(verification_level=Review.VerificationLevel.VERIFIED)

    @admin.action(description="Flag for dispute handling")
    def flag(self, request, queryset):
        queryset.update(status=Review.Status.FLAGGED)

    @admin.action(description="Remove from public view")
    def remove(self, request, queryset):
        queryset.update(status=Review.Status.REMOVED)


@admin.register(Evidence)
class EvidenceAdmin(admin.ModelAdmin):
    list_display = ["review", "is_verified", "reviewed_by_admin", "uploaded_at"]
    list_filter = ["is_verified", "reviewed_by_admin"]


@admin.register(BusinessClaim)
class BusinessClaimAdmin(admin.ModelAdmin):
    list_display = ["listing", "contact_name", "email", "status", "created_at"]
    list_filter = ["status"]


@admin.register(OwnerResponse)
class OwnerResponseAdmin(admin.ModelAdmin):
    list_display = ["review", "claim", "created_at"]


@admin.register(ReviewVote)
class ReviewVoteAdmin(admin.ModelAdmin):
    list_display = ["review", "reviewer", "value", "created_at"]
    list_filter = ["value"]


@admin.register(ReviewReply)
class ReviewReplyAdmin(admin.ModelAdmin):
    list_display = ["review", "reviewer", "created_at"]
    search_fields = ["body", "reviewer__username"]
