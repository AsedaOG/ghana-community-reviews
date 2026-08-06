from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from reviews.models import Review

from .models import Badge, ReviewerBadge, ReviewerProfile


def recompute_reviewer_stats(profile: ReviewerProfile) -> None:
    """+10 reputation per published review. Awards badges at review-count
    thresholds and revokes any the reviewer no longer qualifies for — e.g.
    after a threshold is tightened, a review is removed/flagged, or deleted
    outright."""
    published = profile.reviews.filter(status=Review.Status.PUBLISHED).count()
    profile.reputation = published * 10
    profile.save(update_fields=["reputation"])

    qualifying = Badge.objects.filter(min_reviews__lte=published, min_reviews__gt=0)
    for badge in qualifying:
        ReviewerBadge.objects.get_or_create(profile=profile, badge=badge)
    ReviewerBadge.objects.filter(profile=profile).exclude(badge__in=qualifying).delete()


@receiver(post_save, sender=Review)
def update_reputation_and_badges(sender, instance, created, **kwargs):
    recompute_reviewer_stats(instance.reviewer)


@receiver(post_delete, sender=Review)
def update_reputation_and_badges_on_delete(sender, instance, **kwargs):
    recompute_reviewer_stats(instance.reviewer)
