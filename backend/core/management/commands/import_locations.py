"""Import the real Ghana Region → District → Area hierarchy from
core/data/gh_locations.csv (~21k rows, sourced from an enriched GPS-tagged
locations dataset). Purely additive and safe to re-run: existing Regions,
Districts and Areas are matched by name and left untouched, only missing
rows are inserted.

Districts with no name in the source data are grouped under "Unknown" per
region, so every Area still has a home in the Region → District → Area shape
the rest of the app expects.

Usage: python manage.py import_locations
"""
import csv
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from core.models import Area, District, Region

CSV_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "gh_locations.csv"
BATCH_SIZE = 2000


class Command(BaseCommand):
    help = "Import the full Region/District/Area geography from gh_locations.csv"

    def handle(self, *args, **options):
        if not CSV_PATH.exists():
            self.stderr.write(self.style.ERROR(f"Missing fixture: {CSV_PATH}"))
            return

        with open(CSV_PATH, newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        self.stdout.write(f"Read {len(rows)} rows from {CSV_PATH.name}")

        region_names = {r["region"] for r in rows}
        district_keys = {(r["region"], r["district"]) for r in rows}
        area_keys = {(r["region"], r["district"], r["area"]) for r in rows}

        with transaction.atomic():
            # --- Regions -------------------------------------------------
            existing_regions = {r.name: r for r in Region.objects.all()}
            new_regions = [
                Region(name=name, slug=slugify(name))
                for name in region_names
                if name not in existing_regions
            ]
            Region.objects.bulk_create(new_regions, ignore_conflicts=True)
            regions_by_name = {r.name: r for r in Region.objects.all()}
            self.stdout.write(
                f"Regions: {len(existing_regions)} existing, {len(new_regions)} added"
            )

            # --- Districts -------------------------------------------------
            existing_districts = {
                (d.region_id, d.name): d
                for d in District.objects.select_related("region").all()
            }
            new_districts = []
            seen_new = set()
            for region_name, district_name in district_keys:
                region = regions_by_name[region_name]
                key = (region.id, district_name)
                if key in existing_districts or key in seen_new:
                    continue
                seen_new.add(key)
                new_districts.append(
                    District(region=region, name=district_name, slug=slugify(district_name))
                )
            for i in range(0, len(new_districts), BATCH_SIZE):
                District.objects.bulk_create(
                    new_districts[i : i + BATCH_SIZE], ignore_conflicts=True
                )
            districts_by_key = {
                (d.region_id, d.name): d
                for d in District.objects.select_related("region").all()
            }
            self.stdout.write(
                f"Districts: {len(existing_districts)} existing, {len(new_districts)} added"
            )

            # --- Areas -------------------------------------------------
            existing_areas = set(
                Area.objects.values_list("district_id", "name")
            )
            new_areas = []
            seen_new = set()
            for region_name, district_name, area_name in area_keys:
                district = districts_by_key[(regions_by_name[region_name].id, district_name)]
                key = (district.id, area_name)
                if key in existing_areas or key in seen_new:
                    continue
                seen_new.add(key)
                new_areas.append(
                    Area(district=district, name=area_name, slug=slugify(area_name))
                )
            for i in range(0, len(new_areas), BATCH_SIZE):
                Area.objects.bulk_create(new_areas[i : i + BATCH_SIZE], ignore_conflicts=True)
            self.stdout.write(
                f"Areas: {len(existing_areas)} existing, {len(new_areas)} added"
            )

        self.stdout.write(self.style.SUCCESS(
            f"Done. Totals — Regions: {Region.objects.count()}, "
            f"Districts: {District.objects.count()}, Areas: {Area.objects.count()}"
        ))
