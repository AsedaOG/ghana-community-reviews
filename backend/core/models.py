from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Region(models.Model):
    """Top level of Ghana's geographic hierarchy: Ghana → Region → District → Area."""

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=110, unique=True, blank=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class District(models.Model):
    region = models.ForeignKey(Region, related_name="districts", on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=130, blank=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("region", "name")]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name}, {self.region.name}"


class Area(models.Model):
    district = models.ForeignKey(District, related_name="areas", on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=130, blank=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("district", "name")]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name}, {self.district.name}"


class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True, blank=True)
    description = models.CharField(max_length=255, blank=True)
    icon = models.CharField(max_length=8, blank=True, help_text="Emoji shown in the UI")
    # Workplace reviews must not carry photos (reviewer-safety requirement).
    allows_photos = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class ListingRequest(models.Model):
    """A member's suggestion for a new listing. Direct creation via the API is
    staff-only; everyone else goes through this queue for admin review."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="listing_requests", on_delete=models.CASCADE
    )
    category = models.ForeignKey(Category, related_name="listing_requests", on_delete=models.PROTECT)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    address = models.CharField(max_length=255, blank=True)

    region = models.ForeignKey(Region, related_name="listing_requests", on_delete=models.PROTECT)
    district = models.ForeignKey(District, related_name="listing_requests", on_delete=models.PROTECT)
    area = models.ForeignKey(
        Area, related_name="listing_requests", null=True, blank=True, on_delete=models.SET_NULL
    )
    # Used instead of `area` when the requester's area isn't in the system yet.
    new_area_name = models.CharField(max_length=120, blank=True)

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    admin_note = models.CharField(max_length=255, blank=True)
    # String reference: Listing is defined later in this file.
    resolved_listing = models.ForeignKey(
        "Listing", related_name="from_request", null=True, blank=True, on_delete=models.SET_NULL
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.status})"


class Listing(models.Model):
    """A reviewable place: apartment, landlord, workplace, school, hospital, or gym."""

    category = models.ForeignKey(Category, related_name="listings", on_delete=models.PROTECT)
    area = models.ForeignKey(Area, related_name="listings", on_delete=models.PROTECT)
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    description = models.TextField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    is_claimed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(f"{self.name}-{self.area.name}")
            slug = base
            n = 2
            while Listing.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
