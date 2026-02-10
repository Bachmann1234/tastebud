import type { SessionFilters } from "@/lib/types";

// biome-ignore lint/suspicious/noExplicitAny: Supabase query builder types are deeply recursive and cause "excessively deep" TS errors with bounded generics
type SupabaseQuery = any;

/**
 * Applies session cuisine/neighborhood filters to a Supabase query on the restaurants table.
 * Returns the (possibly modified) query builder.
 */
export function applySessionFilters(
	query: SupabaseQuery,
	filters: SessionFilters | null,
): SupabaseQuery {
	if (!filters) return query;

	if (filters.cuisines && filters.cuisines.length > 0) {
		query = query.overlaps("cuisine", filters.cuisines);
	}

	if (filters.neighborhoods && filters.neighborhoods.length > 0) {
		query = query.in("neighborhood", filters.neighborhoods);
	}

	return query;
}
