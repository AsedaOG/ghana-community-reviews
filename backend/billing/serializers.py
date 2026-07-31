from rest_framework import serializers

from .models import MarketReport, Payment, Subscription, SubscriptionPlan


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = ["id", "name", "slug", "price_ghs", "interval", "description", "features"]


class SubscriptionSerializer(serializers.ModelSerializer):
    plan = SubscriptionPlanSerializer(read_only=True)

    class Meta:
        model = Subscription
        fields = ["id", "plan", "status", "started_at", "current_period_end", "created_at"]


class MarketReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketReport
        fields = ["id", "title", "slug", "description", "price_ghs", "created_at"]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "purpose", "amount_ghs", "currency", "provider", "reference",
                  "status", "created_at"]
