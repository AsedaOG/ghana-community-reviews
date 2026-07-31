from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from accounts.models import ReviewerProfile
from core.models import Listing


class Review(models.Model):
    class VerificationLevel(models.TextChoices):
        COMMUNITY = "community", "Community Review"
        VERIFIED = "verified", "Verified Experience"
        TRUSTED = "trusted", "Trusted Reviewer"

    class Status(models.TextChoices):
        PUBLISHED = "published", "Published"
        FLAGGED = "flagged", "Flagged"
        REMOVED = "removed", "Removed"

    listing = models.ForeignKey(Listing, related_name="reviews", on_delete=models.CASCADE)
    reviewer = models.ForeignKey(ReviewerProfile, related_name="reviews", on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    title = models.CharField(max_length=150)
    body = models.TextField()
    verification_level = models.CharField(
        max_length=12, choices=VerificationLevel.choices, default=VerificationLevel.COMMUNITY
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PUBLISHED)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.listing.name} — {self.rating}★ by {self.reviewer.username}"


class ReviewPhoto(models.Model):
    review = models.ForeignKey(Review, related_name="photos", on_delete=models.CASCADE)
    image = models.ImageField(upload_to="review_photos/%Y/%m/")
    caption = models.CharField(max_length=150, blank=True)

    def __str__(self):
        return f"Photo for review #{self.review_id}"


class Evidence(models.Model):
    """Private supporting documents (tenancy agreement, payslip, admission letter…).
    Never exposed publicly; admins use it to upgrade the review's verification level."""

    review = models.ForeignKey(Review, related_name="evidence", on_delete=models.CASCADE)
    file = models.FileField(upload_to="evidence/%Y/%m/")
    note = models.CharField(max_length=255, blank=True)
    is_verified = models.BooleanField(default=False)
    reviewed_by_admin = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "evidence"

    def __str__(self):
        return f"Evidence for review #{self.review_id}"


class BusinessClaim(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    listing = models.ForeignKey(Listing, related_name="claims", on_delete=models.CASCADE)
    owner = models.ForeignKey(
        "auth.User", related_name="business_claims", on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    contact_name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    message = models.TextField(blank=True, help_text="Proof of ownership / role at the business")
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.status == self.Status.APPROVED and not self.listing.is_claimed:
            self.listing.is_claimed = True
            self.listing.save(update_fields=["is_claimed"])

    def __str__(self):
        return f"Claim on {self.listing.name} by {self.contact_name} ({self.status})"


class OwnerResponse(models.Model):
    review = models.OneToOneField(Review, related_name="owner_response", on_delete=models.CASCADE)
    claim = models.ForeignKey(BusinessClaim, related_name="responses", on_delete=models.CASCADE)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Response to review #{self.review_id}"
