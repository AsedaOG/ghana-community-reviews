from django.db.models.signals import post_save
from django.dispatch import receiver

from reviews.models import Review

from .models import Badge, ReviewerBadge


@receiver(post_save, sender=Review)
def update_reputation_and_badges(sender, instance, created, **kwargs):
    """+10 reputation per review; badges unlock at review-count thresholds."""
    profile = instance.reviewer
    published = profile.reviews.filter(status=Review.Status.PUBLISHED).count()
    profile.reputation = published * 10
    profile.save(update_fields=["reputation"])

    for badge in Badge.objects.filter(min_reviews__lte=published, min_reviews__gt=0):
        ReviewerBadge.objects.get_or_create(profile=profile, badge=badge)
