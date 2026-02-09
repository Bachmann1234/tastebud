import { NextResponse } from "next/server";
import { validateMemberToken } from "@/lib/api/auth";
import {
	badRequest,
	conflict,
	errorResponse,
	gone,
	notFound,
	unauthorized,
} from "@/lib/api/errors";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const token = request.headers.get("X-Member-Token");
	if (!token) {
		return unauthorized("X-Member-Token header is required");
	}

	let body: { restaurantId?: unknown; vote?: unknown };
	try {
		body = await request.json();
	} catch {
		return badRequest("Invalid JSON");
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

	// Validate body
	if (typeof body.restaurantId !== "number" || typeof body.vote !== "boolean") {
		return badRequest("restaurantId (number) and vote (boolean) are required");
	}

	// Insert vote
	const { data: vote, error: voteError } = await supabase
		.from("votes")
		.insert({
			session_id: sessionId,
			member_id: member.id,
			restaurant_id: body.restaurantId,
			vote: body.vote,
		})
		.select()
		.single();

	if (voteError) {
		if (voteError.code === "23505") {
			return conflict("Vote already recorded for this restaurant");
		}
		return errorResponse("Failed to record vote", 500);
	}

	return NextResponse.json(
		{
			id: vote.id,
			restaurantId: vote.restaurant_id,
			vote: vote.vote,
		},
		{ status: 201 },
	);
}
