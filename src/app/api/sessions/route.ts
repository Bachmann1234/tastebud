import { NextResponse } from "next/server";
import { badRequest, errorResponse } from "@/lib/api/errors";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function POST(request: Request) {
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
	if (name.length > 255) {
		return badRequest("Name must be 255 characters or less");
	}

	const supabase = createSupabaseServer();

	const { data, error } = await supabase
		.from("sessions")
		.insert({ name })
		.select()
		.single();

	if (error || !data) {
		return errorResponse("Failed to create session", 500);
	}

	return NextResponse.json(
		{
			id: data.id,
			name: data.name,
			shareUrl: `/s/${data.id}`,
		},
		{ status: 201 },
	);
}
