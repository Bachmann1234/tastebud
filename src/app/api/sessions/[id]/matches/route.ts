import { NextResponse } from "next/server";
import { errorResponse, gone, notFound } from "@/lib/api/errors";
import { applySessionFilters } from "@/lib/supabase/filters";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { MatchesResponse, Restaurant } from "@/lib/types";

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

	// Fetch members, restaurants (filtered), and votes in parallel
	const restaurantsQuery = applySessionFilters(
		supabase.from("restaurants").select("*", { count: "exact" }),
		session.filters,
	);

	const [membersResult, restaurantsResult, votesResult] = await Promise.all([
		supabase.from("session_members").select("*").eq("session_id", sessionId),
		restaurantsQuery,
		supabase.from("votes").select("*").eq("session_id", sessionId),
	]);

	if (membersResult.error || restaurantsResult.error || votesResult.error) {
		return errorResponse("Failed to fetch match data", 500);
	}

	const members = membersResult.data ?? [];
	const restaurants = restaurantsResult.data ?? [];
	const totalRestaurants = restaurantsResult.count ?? restaurants.length;
	const votes = votesResult.data ?? [];

	// Build a member ID → name map
	const memberNameMap = new Map<string, string>();
	for (const m of members) {
		memberNameMap.set(m.id, m.name);
	}

	// Build a restaurant ID → restaurant map
	const restaurantMap = new Map<number, Restaurant>();
	for (const r of restaurants) {
		restaurantMap.set(r.id, r as Restaurant);
	}

	// Group positive votes by restaurant
	const yesVotesByRestaurant = new Map<number, Set<string>>();
	for (const vote of votes) {
		if (vote.vote) {
			const existing = yesVotesByRestaurant.get(vote.restaurant_id);
			if (existing) {
				existing.add(vote.member_id);
			} else {
				yesVotesByRestaurant.set(vote.restaurant_id, new Set([vote.member_id]));
			}
		}
	}

	// Find matches: restaurants where ALL members voted yes
	const matches: MatchesResponse["matches"] = [];
	if (members.length > 0) {
		for (const [restaurantId, voterIds] of yesVotesByRestaurant) {
			if (voterIds.size === members.length) {
				const restaurant = restaurantMap.get(restaurantId);
				if (restaurant) {
					const likedBy = [...voterIds]
						.map((id) => memberNameMap.get(id))
						.filter(Boolean) as string[];
					matches.push({ restaurant, likedBy });
				}
			}
		}
	}

	// Check if all members have completed voting
	const votesPerMember = new Map<string, number>();
	for (const vote of votes) {
		votesPerMember.set(
			vote.member_id,
			(votesPerMember.get(vote.member_id) ?? 0) + 1,
		);
	}
	const allMembersComplete =
		members.length > 0 &&
		members.every((m) => (votesPerMember.get(m.id) ?? 0) >= totalRestaurants);

	const response: MatchesResponse = {
		matches,
		totalRestaurants,
		allMembersComplete,
	};

	return NextResponse.json(response);
}
