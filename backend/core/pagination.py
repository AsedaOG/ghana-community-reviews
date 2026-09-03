from rest_framework.pagination import PageNumberPagination


class SizeControlledPagination(PageNumberPagination):
    """Default DRF pagination, but callers can ask for fewer rows via
    ?page_size=. Lets a preview (e.g. the homepage's "latest 6 reviews")
    fetch and serialize only what it displays instead of the full default
    page for nothing — capped so nobody can request an unbounded page."""

    page_size_query_param = "page_size"
    max_page_size = 50
