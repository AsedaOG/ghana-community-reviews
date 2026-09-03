import random
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

# Ghana-flavoured word pools for anonymous handles, e.g. "KenteEagle412".
ADJECTIVES = [
    "Kente", "Golden", "Adinkra", "Baobab", "Savanna", "Harmattan", "Atlantic",
    "Highlife", "Cocoa", "Shea", "Volta", "Ashanti", "Coral", "Sunlit", "Brave",
]
NOUNS = [
    "Eagle", "Lion", "Sankofa", "Drummer", "Weaver", "Falcon", "Antelope",
    "Star", "Voyager", "Baker", "Runner", "Scholar", "Trader", "Fisher", "Pilot",
]


def generate_username():
    for _ in range(50):
        candidate = f"{random.choice(ADJECTIVES)}{random.choice(NOUNS)}{random.randint(10, 999)}"
        if not ReviewerProfile.objects.filter(username=candidate).exists():
            return candidate
    return f"Reviewer{uuid.uuid4().hex[:8]}"


class ReviewerProfile(models.Model):
    """An anonymous reviewer. The generated username is the only public
    identity. Identity is carried either by the device token alone, or by an
    optional linked User account (email + password) — the email is never shown
    anywhere public."""

    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, related_name="reviewer_profile",
        on_delete=models.SET_NULL, null=True, blank=True,
    )
    username = models.CharField(max_length=60, unique=True)
    reputation = models.PositiveIntegerField(default=0)
    is_trusted = models.BooleanField(
        default=False, help_text="Trusted Reviewer status granted by admins"
    )
    is_blocked = models.BooleanField(
        default=False, help_text="Blocked reviewers cannot submit new reviews"
    )
    strikes = models.PositiveIntegerField(
        default=0,
        help_text="One strike per reported review. Auto-blocked at STRIKES_TO_BLOCK.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    STRIKES_TO_BLOCK = 3

    class Meta:
        ordering = ["-reputation"]

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = generate_username()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username


class Badge(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True)
    description = models.CharField(max_length=255)
    icon = models.CharField(max_length=8, blank=True)
    min_reviews = models.PositiveIntegerField(
        default=0, help_text="Published reviews required to earn this badge automatically"
    )

    class Meta:
        ordering = ["min_reviews"]

    def __str__(self):
        return self.name


class OwnerAccount(models.Model):
    """Business-owner identity on top of Django's User. The User starts
    inactive; a verification email activates it."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, related_name="owner_account", on_delete=models.CASCADE
    )
    business_name = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} ({self.business_name or 'owner'})"


class EmailVerificationToken(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="verification_tokens", on_delete=models.CASCADE
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    VALID_HOURS = 48

    @property
    def is_valid(self):
        age = timezone.now() - self.created_at
        return self.used_at is None and age.total_seconds() < self.VALID_HOURS * 3600

    def __str__(self):
        return f"Verification for {self.user.email}"


class PasswordResetToken(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="password_reset_tokens", on_delete=models.CASCADE
    )
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    VALID_HOURS = 2

    @property
    def is_valid(self):
        age = timezone.now() - self.created_at
        return self.used_at is None and age.total_seconds() < self.VALID_HOURS * 3600

    def __str__(self):
        return f"Password reset for {self.user.email}"


class ReviewerBadge(models.Model):
    profile = models.ForeignKey(ReviewerProfile, related_name="badges", on_delete=models.CASCADE)
    badge = models.ForeignKey(Badge, related_name="holders", on_delete=models.CASCADE)
    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("profile", "badge")]

    def __str__(self):
        return f"{self.profile.username} — {self.badge.name}"
