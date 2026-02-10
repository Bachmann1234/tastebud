import type { SessionFilters } from "@/lib/types";

/**
 * Applies session cuisine/neighborhood filters to a Supabase query on the restaurants table.
 * Returns the (possibly modified) query builder.
 */
export function applySessionFilters<
	T extends {
		overlaps: (column: string, value: string[]) => T;
		in: (column: string, value: string[]) => T;
	},
>(query: T, filters: SessionFilters | null): T {
	if (!filters) return query;

	if (filters.cuisines && filters.cuisines.length > 0) {
		query = query.overlaps("cuisine", filters.cuisines);
	}

	if (filters.neighborhoods && filters.neighborhoods.length > 0) {
		query = query.in("neighborhood", filters.neighborhoods);
	}

	return query;
}
