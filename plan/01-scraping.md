# Phase 1: Data Scraping

## Objective
Extract all restaurant data from restaurantweekboston.com into a structured JSON format.

## Data Source Analysis

### Listing Pages
- URL pattern: `https://www.restaurantweekboston.com/?page=N`
- 11 pages of results, ~10 restaurants per page
- Contains: name, cuisine, neighborhood, address, pricing, availability

### Detail Pages
- URL pattern: `https://www.restaurantweekboston.com/restaurant/[slug]/`
- Contains: full menu (lunch/dinner), additional details

## Data to Extract

```json
{
  "slug": "restaurant-name",
  "name": "Restaurant Name",
  "cuisine": ["Italian", "Mediterranean"],
  "neighborhood": "Back Bay",
  "address": "123 Main St, Boston, MA",
  "phone": "(617) 555-1234",
  "coordinates": { "lat": 42.123, "lng": -71.456 },
  "pricing": {
    "lunch": 27,
    "dinner": 42
  },
  "availability": {
    "lunch": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "dinner": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  },
  "menu": {
    "lunch": {
      "courses": [
        {
          "name": "First Course",
          "options": ["Option A", "Option B", "Option C"]
        }
      ]
    },
    "dinner": { ... }
  },
  "features": ["outdoor_seating", "vegetarian", "mbta_accessible"],
  "reservationUrl": "https://www.opentable.com/...",
  "imageUrl": "https://..."
}
```

## Implementation

### Step 1: List Scraper
```python
# Pseudocode
for page in range(1, 12):
    html = fetch(f"https://www.restaurantweekboston.com/?page={page}")
    restaurants = parse_listing_page(html)
    for r in restaurants:
        save_basic_info(r)
```

### Step 2: Detail Scraper
```python
# Pseudocode
for restaurant in all_restaurants:
    html = fetch(f"https://www.restaurantweekboston.com/restaurant/{slug}/")
    menu = parse_menu(html)
    update_restaurant(slug, menu)
```

### Step 3: Data Enrichment (Optional)
- Fetch coordinates via Google Geocoding API
- Fetch photos via Google Places API

## Technical Considerations

### Rate Limiting
- Add 1-2 second delay between requests
- Use proper User-Agent header
- Be respectful of the site

### Error Handling
- Retry failed requests with exponential backoff
- Log failures for manual review
- Handle missing data gracefully

### Menu Parsing Challenges
- Menus may be in various HTML structures
- Some might be images/PDFs (need manual handling or OCR)
- Watch for special characters and encoding

## Output
- `data/restaurants.json` - Full structured data
- `data/restaurants_raw/` - Raw HTML for debugging

## Dependencies
```
requests
beautifulsoup4
lxml
```

## Validation Checklist
- [ ] All 100+ restaurants captured
- [ ] All menus parsed correctly
- [ ] Addresses are complete
- [ ] Pricing is accurate
- [ ] No duplicate entries
