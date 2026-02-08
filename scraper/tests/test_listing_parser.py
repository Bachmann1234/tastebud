"""Tests for listing page parser."""

from scraper.parser import ListingParser


class TestListingParser:
    def test_parse_restaurants(self, sample_listing_html):
        parser = ListingParser()
        restaurants = parser.parse(sample_listing_html)

        assert len(restaurants) == 2

        capital_grille = next(r for r in restaurants if r.slug == "the-capital-grille")
        assert capital_grille.name == "The Capital Grille"
        assert capital_grille.cuisine == "Steakhouse"
        assert capital_grille.neighborhood == "Back Bay"
        assert capital_grille.pricing.lunch == 28
        assert capital_grille.pricing.dinner == 45

    def test_parse_availability(self, sample_listing_html):
        parser = ListingParser()
        restaurants = parser.parse(sample_listing_html)

        capital_grille = next(r for r in restaurants if r.slug == "the-capital-grille")
        assert capital_grille.availability.lunch is True
        assert capital_grille.availability.dinner is True

    def test_parse_image_url(self, sample_listing_html):
        parser = ListingParser()
        restaurants = parser.parse(sample_listing_html)

        capital_grille = next(r for r in restaurants if r.slug == "the-capital-grille")
        assert capital_grille.image_url is not None
        assert "capital-grille.gif" in capital_grille.image_url

    def test_get_total_pages(self, sample_listing_html):
        parser = ListingParser()
        total_pages = parser.get_total_pages(sample_listing_html)
        assert total_pages == 3

    def test_parse_empty_html(self):
        parser = ListingParser()
        restaurants = parser.parse("<html><body></body></html>")
        assert len(restaurants) == 0

    def test_detail_url_construction(self, sample_listing_html):
        parser = ListingParser()
        restaurants = parser.parse(sample_listing_html)

        capital_grille = next(r for r in restaurants if r.slug == "the-capital-grille")
        assert "restaurantweekboston.com" in capital_grille.detail_url
        assert "the-capital-grille" in capital_grille.detail_url

    def test_parse_address(self, sample_listing_html):
        parser = ListingParser()
        restaurants = parser.parse(sample_listing_html)

        capital_grille = next(r for r in restaurants if r.slug == "the-capital-grille")
        assert capital_grille.address is not None
        assert "900 Boylston Street" in capital_grille.address

    def test_parse_features(self, sample_listing_html):
        parser = ListingParser()
        restaurants = parser.parse(sample_listing_html)

        capital_grille = next(r for r in restaurants if r.slug == "the-capital-grille")
        assert "outdoor dining" in capital_grille.features
