import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
	const supabase = createSupabaseServer();

	const { data, error } = await supabase
		.from("restaurants")
		.select("cuisine, neighborhood");

	if (error) {
		return errorResponse("Failed to fetch filter options", 500);
	}

	const cuisineSet = new Set<string>();
	const neighborhoodSet = new Set<string>();

	for (const row of data ?? []) {
		if (Array.isArray(row.cuisine)) {
			for (const c of row.cuisine) {
				if (c) cuisineSet.add(c);
			}
		}
		if (row.neighborhood) {
			neighborhoodSet.add(row.neighborhood);
		}
	}

	return NextResponse.json({
		cuisines: [...cuisineSet].sort(),
		neighborhoods: [...neighborhoodSet].sort(),
	});
}
