import { NextResponse } from "next/server";
import { errorResponse, gone, notFound } from "@/lib/api/errors";
import { applySessionFilters } from "@/lib/supabase/filters";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id: sessionId } = await params;
	const supabase = createSupabaseServer();

	// Fetch session
	const { data: session, error: sessionError } = await supabase
		.from("sessions")
		.select("*")
		.eq("id", sessionId)
		.single();

	if (sessionError || !session) {
		return notFound("Session not found");
	}

	// Check expiry
	if (new Date(session.expires_at) < new Date()) {
		return gone("Session has expired");
	}

	// Fetch restaurants with session filters applied
	const query = applySessionFilters(
		supabase.from("restaurants").select("*"),
		session.filters,
	);

	const { data, error } = await query;

	if (error) {
		return errorResponse("Failed to fetch restaurants", 500);
	}

	return NextResponse.json(data);
}
