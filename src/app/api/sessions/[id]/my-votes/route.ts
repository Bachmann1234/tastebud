import { NextResponse } from "next/server";
import { validateMemberToken } from "@/lib/api/auth";
import { errorResponse, gone, notFound, unauthorized } from "@/lib/api/errors";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const token = request.headers.get("X-Member-Token");
	if (!token) {
		return unauthorized("X-Member-Token header is required");
	}

	const { id: sessionId } = await params;
	const supabase = createSupabaseServer();

	// Check session exists
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

	// Validate token
	const member = await validateMemberToken(supabase, sessionId, token);
	if (!member) {
		return unauthorized("Invalid member token");
	}

	// Fetch votes for this member in this session
	const { data: votes, error: votesError } = await supabase
		.from("votes")
		.select("restaurant_id")
		.eq("session_id", sessionId)
		.eq("member_id", member.id);

	if (votesError) {
		return errorResponse("Failed to fetch votes", 500);
	}

	return NextResponse.json({
		votedRestaurantIds: (votes ?? []).map(
			(v: { restaurant_id: number }) => v.restaurant_id,
		),
	});
}
