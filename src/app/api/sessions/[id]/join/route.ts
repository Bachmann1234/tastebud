import { NextResponse } from "next/server";
import { badRequest, errorResponse, notFound } from "@/lib/api/errors";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	let body: { name?: string };
	try {
		body = await request.json();
	} catch {
		return badRequest("Invalid JSON");
	}

	const name = body.name?.trim();
	if (!name) {
		return badRequest("Name is required");
	}
	if (name.length > 100) {
		return badRequest("Name must be 100 characters or less");
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

	// Try to find existing member with this name
	const { data: existing } = await supabase
		.from("session_members")
		.select("*")
		.eq("session_id", sessionId)
		.eq("name", name)
		.single();

	if (existing) {
		return NextResponse.json({
			memberId: existing.id,
			token: existing.id,
			name: existing.name,
			sessionId,
		});
	}

	// Insert new member
	const { data: member, error: insertError } = await supabase
		.from("session_members")
		.insert({ session_id: sessionId, name })
		.select()
		.single();

	if (insertError || !member) {
		return errorResponse("Failed to join session", 500);
	}

	return NextResponse.json(
		{
			memberId: member.id,
			token: member.id,
			name: member.name,
			sessionId,
		},
		{ status: 201 },
	);
}
