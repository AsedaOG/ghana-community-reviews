from django.contrib import admin

from .models import MarketReport, Payment, ReportPurchase, Subscription, SubscriptionPlan


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ["name", "price_ghs", "interval", "is_active"]
    prepopulated_fields = {"slug": ["name"]}


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ["user", "plan", "status", "current_period_end"]
    list_filter = ["status", "plan"]


@admin.register(MarketReport)
class MarketReportAdmin(admin.ModelAdmin):
    list_display = ["title", "price_ghs", "is_published", "created_at"]
    prepopulated_fields = {"slug": ["title"]}


@admin.register(ReportPurchase)
class ReportPurchaseAdmin(admin.ModelAdmin):
    list_display = ["user", "report", "is_paid", "created_at"]
    list_filter = ["is_paid"]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["user", "purpose", "amount_ghs", "status", "provider", "created_at"]
    list_filter = ["status", "purpose", "provider"]
    readonly_fields = ["reference", "raw_response"]
