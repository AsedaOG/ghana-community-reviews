from rest_framework import permissions


class IsReviewOwner(permissions.BasePermission):
    """Only the reviewer who wrote a review may edit or delete it."""

    def has_object_permission(self, request, view, obj):
        return obj.reviewer.user_id is not None and obj.reviewer.user_id == request.user.id
