from django.contrib import admin

from .models import Badge, EmailVerificationToken, OwnerAccount, ReviewerBadge, ReviewerProfile


@admin.register(OwnerAccount)
class OwnerAccountAdmin(admin.ModelAdmin):
    list_display = ["user", "business_name", "phone", "email_verified_at"]
    search_fields = ["user__email", "business_name"]


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ["user", "created_at", "used_at"]
    readonly_fields = ["token"]


@admin.register(ReviewerProfile)
class ReviewerProfileAdmin(admin.ModelAdmin):
    list_display = ["username", "reputation", "is_trusted", "is_blocked", "created_at"]
    list_filter = ["is_trusted", "is_blocked"]
    search_fields = ["username"]
    readonly_fields = ["token"]
    actions = ["block", "unblock"]

    @admin.action(description="Block selected reviewers")
    def block(self, request, queryset):
        queryset.update(is_blocked=True)
        for p in queryset.select_related("user"):
            if p.user:
                p.user.is_active = False
                p.user.save(update_fields=["is_active"])

    @admin.action(description="Unblock selected reviewers")
    def unblock(self, request, queryset):
        queryset.update(is_blocked=False)
        for p in queryset.select_related("user"):
            if p.user:
                p.user.is_active = True
                p.user.save(update_fields=["is_active"])


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ["name", "min_reviews"]


@admin.register(ReviewerBadge)
class ReviewerBadgeAdmin(admin.ModelAdmin):
    list_display = ["profile", "badge", "awarded_at"]
