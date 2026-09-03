from django.contrib import admin

from .models import (
    BusinessClaim,
    Evidence,
    OwnerResponse,
    Report,
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


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ["review", "reported_by", "status", "reason", "created_at"]
    list_filter = ["status"]
    search_fields = ["review__title", "reported_by__username", "reason"]
    actions = ["uphold", "dismiss"]

    def _decide(self, request, queryset, new_status):
        from django.utils import timezone

        for report in queryset.filter(status=Report.Status.PENDING).select_related(
            "review__reviewer__user"
        ):
            report.status = new_status
            report.decided_by = request.user
            report.decided_at = timezone.now()
            report.save(update_fields=["status", "decided_by", "decided_at"])
            if new_status == Report.Status.UPHELD:
                author = report.review.reviewer
                author.strikes += 1
                update_fields = ["strikes"]
                if author.strikes >= author.STRIKES_TO_BLOCK and not author.is_blocked:
                    author.is_blocked = True
                    update_fields.append("is_blocked")
                    if author.user:
                        author.user.is_active = False
                        author.user.save(update_fields=["is_active"])
                author.save(update_fields=update_fields)

    @admin.action(description="Uphold report — adds a strike")
    def uphold(self, request, queryset):
        self._decide(request, queryset, Report.Status.UPHELD)

    @admin.action(description="Dismiss report — no strike")
    def dismiss(self, request, queryset):
        self._decide(request, queryset, Report.Status.DISMISSED)
