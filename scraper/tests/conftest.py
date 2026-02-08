"""Pytest fixtures for scraper tests."""

from pathlib import Path

import pytest

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def fixtures_dir() -> Path:
    """Return the fixtures directory path."""
    return FIXTURES_DIR


@pytest.fixture
def sample_listing_html() -> str:
    """Return sample listing page HTML matching actual site structure."""
    return """
    <!DOCTYPE html>
    <html>
    <head><title>Restaurant Week Boston</title></head>
    <body>
        <div class="paginationControls">page 1 of 3</div>
        <div class="restaurantList">
            <div id="restaurantID-the-capital-grille" class="restaurantEntry">
                <div class="restaurantInfoBasic">
                    <div class="restaurantLogo">
                        <a href="/restaurant/the-capital-grille">
                            <img src="/static/images/capital-grille.gif" alt="logo" />
                        </a>
                    </div>
                    <h4>
                        <a href="/restaurant/the-capital-grille">The Capital Grille</a>
                        <br />
                        <a href="/?cuisine=steakhouse" title="view all Steakhouse restaurants">
                            <span class="restClass">Steakhouse</span>
                        </a>
                        <span class="restClass">|</span>
                        <a href="/?neighborhood=back-bay" title="view all Back Bay restaurants">
                            <span class="restClass">Back Bay</span>
                        </a>
                    </h4>
                    <p>
                        <a href="/map/back-bay/the-capital-grille/#topOfMap" target="_blank">
                            900 Boylston Street, Boston, MA 02115
                        </a>
                    </p>
                    <p>
                        <strong>Lunch</strong>: $28
                        <strong>Dinner</strong>: $45
                    </p>
                </div>
                <div class="restaurantButtons">
                    <a href="/restaurant/the-capital-grille" class="viewMenusButton">view menus</a>
                </div>
                <div class="restaurantFeatureIcons">
                    <img src="/static/images/icon-outdoor.png" alt="outdoor dining" />
                </div>
            </div>

            <div id="restaurantID-legal-sea-foods" class="restaurantEntry">
                <div class="restaurantInfoBasic">
                    <h4>
                        <a href="/restaurant/legal-sea-foods">Legal Sea Foods</a>
                        <br />
                        <a href="/?cuisine=seafood" title="view all Seafood restaurants">
                            <span class="restClass">Seafood</span>
                        </a>
                        <span class="restClass">|</span>
                        <a href="/?neighborhood=seaport" title="view all Seaport restaurants">
                            <span class="restClass">Seaport</span>
                        </a>
                    </h4>
                    <p>
                        <strong>Dinner</strong>: $45
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """


@pytest.fixture
def sample_detail_html() -> str:
    """Return sample detail page HTML."""
    return """
    <!DOCTYPE html>
    <html>
    <head><title>The Capital Grille</title></head>
    <body>
        <article class="restaurant-detail">
            <h1>The Capital Grille</h1>
            <address>900 Boylston Street, Boston, MA 02115</address>
            <a href="tel:617-262-8900">617-262-8900</a>
            <a href="https://www.thecapitalgrille.com" class="website">Visit Website</a>
            <img class="restaurant-photo" src="/images/capital-grille-hero.jpg">

            <div class="menu-section">
                <h2>Dinner Menu - $45</h2>
                <h3>First Course</h3>
                <ul>
                    <li>Lobster Bisque</li>
                    <li>Caesar Salad</li>
                    <li>Shrimp Cocktail</li>
                </ul>
                <h3>Entrée</h3>
                <ul>
                    <li>Filet Mignon</li>
                    <li>Pan-Seared Salmon</li>
                    <li>Grilled Ribeye</li>
                </ul>
                <h3>Dessert</h3>
                <ul>
                    <li>Flourless Chocolate Cake</li>
                    <li>Crème Brûlée</li>
                </ul>
            </div>
        </article>
    </body>
    </html>
    """


@pytest.fixture
def sample_restaurant():
    """Return a sample Restaurant object."""
    from scraper.models import Availability, Pricing, Restaurant

    return Restaurant(
        slug="the-capital-grille",
        name="The Capital Grille",
        cuisine="Steakhouse",
        neighborhood="Back Bay",
        detail_url="https://www.restaurantweekboston.com/restaurant/the-capital-grille/",
        availability=Availability(lunch=True, dinner=True, brunch=False),
        pricing=Pricing(lunch=28, dinner=45, brunch=None),
    )
