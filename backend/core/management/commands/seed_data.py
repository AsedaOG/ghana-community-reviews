"""Seed the database with Ghana geography, categories, badges, and demo content.

Usage: python manage.py seed_data
Idempotent — safe to run more than once. Geography comes from the real
gh_locations.csv fixture (see import_locations), not a hand-typed list.
"""
import random

from django.core.management import call_command
from django.core.management.base import BaseCommand

from accounts.models import Badge, ReviewerProfile
from billing.models import MarketReport, SubscriptionPlan
from core.models import Area, Category, Listing
from reviews.models import Review

CATEGORIES = [
    ("Apartments", "🏢", "Rentals, hostels and residential compounds", True),
    ("Landlords", "🔑", "Property owners and managers", True),
    ("Workplaces", "💼", "Employers across Ghana — photo uploads disabled", False),
    ("Schools", "🎓", "Kindergarten, Primary and JHS", True),
    ("Hospitals", "🏥", "Hospitals, clinics and health centres", True),
    ("Gyms", "💪", "Fitness centres and sports clubs", True),
]

BADGES = [
    ("First Voice", "first-voice", "Published a first review", "🌱", 1),
    ("Community Guide", "community-guide", "Published 5 reviews", "🧭", 5),
    ("Trusted Voice", "trusted-voice", "Published 10 reviews", "🏅", 10),
]

# (name, category, region, district, area, address, description)
# region/district/area are verified to exist in gh_locations.csv — the real
# imported geography, not invented names.
LISTINGS = [
    ("Sunrise Court Apartments", "Apartments", "Greater Accra", "Accra", "Dansoman",
     "12 High Street, Dansoman", "Two-bedroom self-contained apartments with backup water supply."),
    ("Adabraka Palm Hostel", "Apartments", "Greater Accra", "Accra", "Adabraka",
     "Near Workers' College", "Budget hostel rooms popular with young professionals."),
    ("Ahodwo Ridge Residences", "Apartments", "Ashanti", "Kumasi", "Ahodwo",
     "Ahodwo Roundabout", "Gated community with standby generator and parking."),
    ("Mr. K. Mensah (Landlord)", "Landlords", "Greater Accra", "La Nkwantanang Madina",
     "La Nkwantanang Madina", "Madina Estate",
     "Owns several compound houses around Madina and Ashongman."),
    ("Auntie Efua Properties", "Landlords", "Central", "Abura/Asebu/Kwamankese", "Abura",
     "Abura Junction", "Family-run rentals near the university corridor."),
    ("GoldLine Logistics Ltd", "Workplaces", "Greater Accra", "Tema Metropolitan District", "Tema",
     "Harbour Area", "Freight and haulage company operating from Tema Port."),
    ("Kumasi SoftWorks", "Workplaces", "Ashanti", "Kumasi", "Asokwa",
     "Prempeh II Street", "Software agency building products for local banks."),
    ("Little Stars Preparatory", "Schools", "Greater Accra", "Ga East", "Haatso",
     "Haatso-Atomic Road", "KG through JHS with an emphasis on STEM clubs."),
    ("Ho Dome Anglican JHS", "Schools", "Volta", "Ho", "Dome",
     "Dome Street", "Public JHS with a strong BECE track record."),
    ("Peace Haven Hospital", "Hospitals", "Greater Accra", "Accra", "Cantonments",
     "3rd Circular Road", "Private hospital with 24/7 emergency and maternity wards."),
    ("Tamale West Clinic", "Hospitals", "Northern", "Tamale", "Nyohini",
     "Nyohini Main Road", "Community clinic offering outpatient and lab services."),
    ("IronHouse Fitness", "Gyms", "Greater Accra", "Accra", "Osu",
     "Oxford Street", "Full weights floor, spin classes and personal trainers."),
    ("Sunyani Flex Gym", "Gyms", "Bono", "Sunyani", "Nkwabini",
     "Nkwabini Road", "Neighbourhood gym with early-morning aerobics sessions."),
]

SAMPLE_REVIEWS = [
    (5, "Excellent experience overall",
     "Clean environment, responsive management and everything worked as promised. "
     "I would recommend this place to anyone searching in the area."),
    (4, "Very good, minor issues",
     "Mostly a positive experience. A few small maintenance issues took time to resolve, "
     "but communication was honest throughout."),
    (3, "Average — manage your expectations",
     "Some things were fine, others frustrating. Water pressure and billing clarity "
     "could improve. It is okay value for the price."),
    (2, "Below expectations",
     "Repeated promises were not kept and follow-up was poor. Think carefully and ask "
     "detailed questions before committing."),
    (5, "Genuinely impressed",
     "Staff were welcoming and professional. The facilities are well maintained and "
     "issues get fixed quickly when reported."),
    (4, "Solid choice in this area",
     "Good security and a convenient location close to transport. Slightly pricey, "
     "but you get what you pay for."),
]


PLANS = [
    ("Business Starter", "business-starter", "99.00", "monthly",
     "Everything a small business needs to manage its reputation.",
     ["Respond to unlimited reviews", "Update your profile information",
      "Claimed badge on your listing", "Email support"]),
    ("Business Pro", "business-pro", "249.00", "monthly",
     "For businesses that live on their reputation.",
     ["Everything in Starter", "Review analytics dashboard (coming soon)",
      "Priority claim verification", "Priority support"]),
    ("Business Pro Annual", "business-pro-annual", "2490.00", "yearly",
     "Business Pro, two months free when billed yearly.",
     ["Everything in Business Pro", "2 months free"]),
]

REPORTS = [
    ("Accra Rental Market Report 2026", "accra-rental-market-2026",
     "Rents, tenant satisfaction and landlord ratings across Greater Accra, "
     "broken down by area — from Osu to Madina.", "450.00"),
    ("Ghana Employer Reputation Index 2026", "employer-reputation-index-2026",
     "How employees rate workplaces across sectors: pay punctuality, culture "
     "and management, aggregated from anonymous reviews.", "650.00"),
    ("Private Healthcare Service Quality Review", "healthcare-service-quality-2026",
     "Patient-reported experience across private hospitals and clinics in "
     "Ghana's major cities.", "550.00"),
]


class Command(BaseCommand):
    help = "Seed Ghana geography, categories, badges and demo listings/reviews"

    def handle(self, *args, **options):
        random.seed(42)

        call_command("import_locations")

        for name, icon, desc, allows_photos in CATEGORIES:
            Category.objects.update_or_create(
                name=name,
                defaults={"icon": icon, "description": desc, "allows_photos": allows_photos},
            )
        self.stdout.write(self.style.SUCCESS(f"Categories: {Category.objects.count()}"))

        for name, slug, desc, icon, min_reviews in BADGES:
            Badge.objects.update_or_create(
                slug=slug,
                defaults={"name": name, "description": desc, "icon": icon,
                          "min_reviews": min_reviews},
            )

        for name, cat, region, district, area, address, desc in LISTINGS:
            area_obj = Area.objects.get(
                name=area, district__name=district, district__region__name=region
            )
            Listing.objects.get_or_create(
                name=name,
                defaults={
                    "category": Category.objects.get(name=cat),
                    "area": area_obj,
                    "address": address,
                    "description": desc,
                },
            )
        self.stdout.write(self.style.SUCCESS(f"Listings: {Listing.objects.count()}"))

        for name, slug, price, interval, desc, features in PLANS:
            SubscriptionPlan.objects.update_or_create(
                slug=slug,
                defaults={"name": name, "price_ghs": price, "interval": interval,
                          "description": desc, "features": features},
            )
        for title, slug, desc, price in REPORTS:
            MarketReport.objects.update_or_create(
                slug=slug,
                defaults={"title": title, "description": desc, "price_ghs": price},
            )
        self.stdout.write(self.style.SUCCESS(
            f"Plans: {SubscriptionPlan.objects.count()}, "
            f"Reports: {MarketReport.objects.count()}"
        ))

        if Review.objects.exists():
            self.stdout.write("Reviews already seeded — skipping.")
            return

        reviewers = [ReviewerProfile.objects.create() for _ in range(8)]
        for listing in Listing.objects.all():
            for rating, title, body in random.sample(SAMPLE_REVIEWS, k=random.randint(2, 4)):
                Review.objects.create(
                    listing=listing,
                    reviewer=random.choice(reviewers),
                    rating=rating,
                    title=title,
                    body=body,
                    verification_level=random.choice(
                        [Review.VerificationLevel.COMMUNITY,
                         Review.VerificationLevel.COMMUNITY,
                         Review.VerificationLevel.VERIFIED]
                    ),
                )
        self.stdout.write(self.style.SUCCESS(f"Reviews: {Review.objects.count()}"))
        self.stdout.write(self.style.SUCCESS("Seeding complete."))
