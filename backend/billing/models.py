import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


class SubscriptionPlan(models.Model):
    """Phase 2: business subscriptions."""

    class Interval(models.TextChoices):
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"

    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True)
    price_ghs = models.DecimalField(max_digits=8, decimal_places=2)
    interval = models.CharField(max_length=10, choices=Interval.choices,
                                default=Interval.MONTHLY)
    description = models.CharField(max_length=255, blank=True)
    features = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["price_ghs"]

    def __str__(self):
        return f"{self.name} (GHS {self.price_ghs}/{self.interval})"


class Subscription(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending payment"
        ACTIVE = "active", "Active"
        PAST_DUE = "past_due", "Past due"
        CANCELED = "canceled", "Canceled"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="subscriptions", on_delete=models.CASCADE
    )
    plan = models.ForeignKey(SubscriptionPlan, related_name="subscriptions",
                             on_delete=models.PROTECT)
    status = models.CharField(max_length=10, choices=Status.choices,
                              default=Status.PENDING)
    started_at = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    # Filled by the provider once live keys are configured.
    provider_subscription_code = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def activate(self):
        self.status = self.Status.ACTIVE
        self.started_at = self.started_at or timezone.now()
        days = 365 if self.plan.interval == SubscriptionPlan.Interval.YEARLY else 30
        self.current_period_end = timezone.now() + timedelta(days=days)
        self.save(update_fields=["status", "started_at", "current_period_end"])

    def __str__(self):
        return f"{self.user} — {self.plan.name} ({self.status})"


class MarketReport(models.Model):
    """Phase 3: premium market intelligence reports."""

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    description = models.TextField(blank=True)
    price_ghs = models.DecimalField(max_digits=8, decimal_places=2)
    file = models.FileField(upload_to="reports/", blank=True,
                            help_text="The PDF delivered after purchase")
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ReportPurchase(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="report_purchases", on_delete=models.CASCADE
    )
    report = models.ForeignKey(MarketReport, related_name="purchases",
                               on_delete=models.PROTECT)
    is_paid = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "report")]

    def __str__(self):
        return f"{self.user} — {self.report.title}"


class Payment(models.Model):
    """One row per attempted charge, whatever the provider. `reference` is ours
    and is what we hand to Paystack; `provider_reference` is theirs."""

    class Purpose(models.TextChoices):
        SUBSCRIPTION = "subscription", "Subscription"
        REPORT = "report", "Market report"

    class Status(models.TextChoices):
        INITIALIZED = "initialized", "Initialized"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"
        SANDBOX = "sandbox", "Sandbox (no provider keys)"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="payments", on_delete=models.CASCADE
    )
    purpose = models.CharField(max_length=15, choices=Purpose.choices)
    subscription = models.ForeignKey(Subscription, null=True, blank=True,
                                     related_name="payments", on_delete=models.SET_NULL)
    report_purchase = models.ForeignKey(ReportPurchase, null=True, blank=True,
                                        related_name="payments", on_delete=models.SET_NULL)
    amount_ghs = models.DecimalField(max_digits=8, decimal_places=2)
    currency = models.CharField(max_length=5, default="GHS")
    provider = models.CharField(max_length=20, default="paystack")
    reference = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    provider_reference = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices,
                              default=Status.INITIALIZED)
    raw_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def mark_success(self, provider_reference="", raw=None):
        self.status = self.Status.SUCCESS
        if provider_reference:
            self.provider_reference = provider_reference
        if raw is not None:
            self.raw_response = raw
        self.save()
        if self.subscription:
            self.subscription.activate()
        if self.report_purchase:
            self.report_purchase.is_paid = True
            self.report_purchase.save(update_fields=["is_paid"])

    def __str__(self):
        return f"{self.user} {self.purpose} GHS {self.amount_ghs} ({self.status})"
