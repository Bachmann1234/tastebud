import { NextResponse } from "next/server";
import { badRequest, errorResponse } from "@/lib/api/errors";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { SessionFilters } from "@/lib/types";

function isStringArray(value: unknown): value is string[] {
	return (
		Array.isArray(value) && value.every((item) => typeof item === "string")
	);
}

function validateFilters(raw: unknown): SessionFilters | null {
	if (raw == null) return null;
	if (typeof raw !== "object" || Array.isArray(raw)) return null;

	const obj = raw as Record<string, unknown>;
	const filters: SessionFilters = {};

	if ("cuisines" in obj) {
		if (!isStringArray(obj.cuisines)) return null;
		if (obj.cuisines.length > 0) filters.cuisines = obj.cuisines;
	}
	if ("neighborhoods" in obj) {
		if (!isStringArray(obj.neighborhoods)) return null;
		if (obj.neighborhoods.length > 0) filters.neighborhoods = obj.neighborhoods;
	}

	if (!filters.cuisines && !filters.neighborhoods) return null;
	return filters;
}

export async function POST(request: Request) {
	let body: { name?: string; filters?: unknown };
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

	// Validate filters and compute parsed value once
	const rawFilters = body.filters;
	let filters: SessionFilters | null = null;

	if (rawFilters !== undefined && rawFilters !== null) {
		if (typeof rawFilters !== "object" || Array.isArray(rawFilters)) {
			return badRequest("Invalid filters format");
		}

		const obj = rawFilters as Record<string, unknown>;
		if (
			("cuisines" in obj && !isStringArray(obj.cuisines)) ||
			("neighborhoods" in obj && !isStringArray(obj.neighborhoods))
		) {
			return badRequest("Invalid filters format");
		}

		filters = validateFilters(rawFilters);
	}

	const supabase = createSupabaseServer();

	const { data, error } = await supabase
		.from("sessions")
		.insert({ name, filters })
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
