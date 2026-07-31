from django.contrib import admin

from .models import Area, Category, District, Listing, ListingRequest, Region


class DistrictInline(admin.TabularInline):
    model = District
    extra = 0


class AreaInline(admin.TabularInline):
    model = Area
    extra = 0


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ["name"]
    inlines = [DistrictInline]


@admin.register(District)
class DistrictAdmin(admin.ModelAdmin):
    list_display = ["name", "region"]
    list_filter = ["region"]
    inlines = [AreaInline]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "allows_photos"]


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "area", "is_claimed", "created_at"]
    list_filter = ["category", "is_claimed", "area__district__region"]
    search_fields = ["name", "address"]
    prepopulated_fields = {"slug": ["name"]}


@admin.register(ListingRequest)
class ListingRequestAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "requester", "status", "created_at"]
    list_filter = ["status", "category"]
    search_fields = ["name", "requester__email"]
    readonly_fields = ["requester", "resolved_listing", "created_at"]
