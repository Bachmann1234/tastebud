import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
	const supabase = createSupabaseServer();

	const { data, error } = await supabase.from("restaurants").select("*");

	if (error) {
		return errorResponse("Failed to fetch restaurants", 500);
	}

	return NextResponse.json(data);
}
