import { NextResponse } from "next/server";
import { errorResponse, gone, notFound } from "@/lib/api/errors";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { SessionDetailResponse } from "@/lib/types";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	const supabase = createSupabaseServer();

	// Fetch session
	const { data: session, error: sessionError } = await supabase
		.from("sessions")
		.select("*")
		.eq("id", id)
		.single();

	if (sessionError || !session) {
		return notFound("Session not found");
	}

	// Check expiry
	if (new Date(session.expires_at) < new Date()) {
		return gone("Session has expired");
	}

	// Fetch members, restaurant count, and votes in parallel
	const [membersResult, countResult, votesResult] = await Promise.all([
		supabase.from("session_members").select("*").eq("session_id", id),
		supabase.from("restaurants").select("*", { count: "exact", head: true }),
		supabase.from("votes").select("*").eq("session_id", id),
	]);

	if (membersResult.error || countResult.error || votesResult.error) {
		return errorResponse("Failed to fetch session details", 500);
	}

	const members = membersResult.data ?? [];
	const totalRestaurants = countResult.count ?? 0;
	const votes = votesResult.data ?? [];

	// Pre-group vote counts by member
	const voteCountsByMember = new Map<string, number>();
	for (const vote of votes) {
		voteCountsByMember.set(
			vote.member_id,
			(voteCountsByMember.get(vote.member_id) ?? 0) + 1,
		);
	}

	// Compute per-member progress
	const memberProgress = members.map((member) => {
		const votesCount = voteCountsByMember.get(member.id) ?? 0;
		return {
			id: member.id,
			name: member.name,
			votesCount,
			totalRestaurants,
			done: votesCount >= totalRestaurants,
		};
	});

	// Compute match count: restaurants where ALL members voted yes
	let matchCount = 0;
	if (members.length > 0) {
		const yesVotesByRestaurant = new Map<number, Set<string>>();
		for (const vote of votes) {
			if (vote.vote) {
				const existing = yesVotesByRestaurant.get(vote.restaurant_id);
				if (existing) {
					existing.add(vote.member_id);
				} else {
					yesVotesByRestaurant.set(
						vote.restaurant_id,
						new Set([vote.member_id]),
					);
				}
			}
		}
		for (const voterSet of yesVotesByRestaurant.values()) {
			if (voterSet.size === members.length) {
				matchCount++;
			}
		}
	}

	const response: SessionDetailResponse = {
		id: session.id,
		name: session.name,
		createdAt: session.created_at,
		expiresAt: session.expires_at,
		members: memberProgress,
		totalRestaurants,
		matchCount,
	};

	return NextResponse.json(response);
}
