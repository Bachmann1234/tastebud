-- Session filters: allow sessions to scope restaurants by cuisine and/or neighborhood
-- Shape: { "cuisines": ["Italian", "Japanese"], "neighborhoods": ["Back Bay"] }
-- NULL = no filters (backward-compatible with existing sessions)

ALTER TABLE sessions ADD COLUMN filters JSONB DEFAULT NULL;

-- GIN index on restaurants.cuisine for efficient overlaps queries
CREATE INDEX idx_restaurants_cuisine ON restaurants USING GIN (cuisine);
