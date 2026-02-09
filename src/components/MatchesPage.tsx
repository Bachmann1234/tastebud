"use client";

import { Loader2, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { MatchesResponse } from "@/lib/types";
import { RestaurantCard } from "./RestaurantCard";

type PageState = "loading" | "success" | "not-found" | "expired" | "error";

export function MatchesPage({ sessionId }: { sessionId: string }) {
	const [pageState, setPageState] = useState<PageState>("loading");
	const [data, setData] = useState<MatchesResponse | null>(null);
	const [errorMessage, setErrorMessage] = useState("");

	const fetchMatches = useCallback(async () => {
		try {
			const response = await fetch(`/api/sessions/${sessionId}/matches`);

			if (response.status === 404) {
				setPageState("not-found");
				return;
			}
			if (response.status === 410) {
				setPageState("expired");
				return;
			}
			if (!response.ok) {
				setErrorMessage("Failed to load matches.");
				setPageState("error");
				return;
			}

			const json: MatchesResponse = await response.json();
			setData(json);
			setPageState("success");
		} catch {
			setErrorMessage("Failed to load matches.");
			setPageState("error");
		}
	}, [sessionId]);

	useEffect(() => {
		fetchMatches();
	}, [fetchMatches]);

	// Loading
	if (pageState === "loading") {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
				<Loader2 className="h-8 w-8 animate-spin text-orange-500" />
				<p className="mt-3 text-zinc-500 dark:text-zinc-400">
					Loading matches...
				</p>
			</div>
		);
	}

	// Not found
	if (pageState === "not-found") {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
				<main className="w-full max-w-md space-y-6 text-center">
					<UtensilsCrossed
						className="mx-auto h-12 w-12 text-zinc-400"
						aria-hidden="true"
					/>
					<h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
						Session not found
					</h1>
					<p className="text-zinc-500 dark:text-zinc-400">
						This session doesn't exist or the link is incorrect.
					</p>
					<Link
						href="/"
						className="inline-block rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-3 font-semibold text-white shadow-md transition-opacity hover:opacity-90"
					>
						Go Home
					</Link>
				</main>
			</div>
		);
	}

	// Expired
	if (pageState === "expired") {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
				<main className="w-full max-w-md space-y-6 text-center">
					<UtensilsCrossed
						className="mx-auto h-12 w-12 text-zinc-400"
						aria-hidden="true"
					/>
					<h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
						Session expired
					</h1>
					<p className="text-zinc-500 dark:text-zinc-400">
						This session is no longer active.
					</p>
					<Link
						href="/"
						className="inline-block rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-3 font-semibold text-white shadow-md transition-opacity hover:opacity-90"
					>
						Go Home
					</Link>
				</main>
			</div>
		);
	}

	// Error
	if (pageState === "error") {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
				<main className="w-full max-w-md space-y-6 text-center">
					<UtensilsCrossed
						className="mx-auto h-12 w-12 text-zinc-400"
						aria-hidden="true"
					/>
					<h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
						Something went wrong
					</h1>
					<p className="text-zinc-500 dark:text-zinc-400">{errorMessage}</p>
					<button
						type="button"
						onClick={() => {
							setPageState("loading");
							setErrorMessage("");
							fetchMatches();
						}}
						className="inline-block rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-3 font-semibold text-white shadow-md transition-opacity hover:opacity-90"
					>
						Try Again
					</button>
				</main>
			</div>
		);
	}

	// Success
	const matches = data?.matches ?? [];
	const allMembersComplete = data?.allMembersComplete ?? false;
	const matchCount = matches.length;

	return (
		<div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 font-sans dark:bg-black">
			<main className="w-full max-w-[400px] py-8">
				{/* Header */}
				<div className="mb-6 text-center">
					<UtensilsCrossed
						className="mx-auto h-12 w-12 text-orange-500"
						aria-hidden="true"
					/>
					<h1 className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
						{matchCount === 0
							? allMembersComplete
								? "No Matches"
								: "No Matches Yet"
							: `${matchCount} ${matchCount === 1 ? "Match" : "Matches"}`}
					</h1>
				</div>

				{/* Still swiping banner */}
				{!allMembersComplete && (
					<div className="mb-6 rounded-xl bg-orange-50 px-4 py-3 text-center text-sm font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
						Some members are still swiping — matches may change!
					</div>
				)}

				{/* Match list or empty state */}
				{matchCount === 0 ? (
					<p className="text-center text-zinc-500 dark:text-zinc-400">
						{allMembersComplete
							? "No restaurants matched — better luck next time!"
							: "No matches yet — keep swiping!"}
					</p>
				) : (
					<div className="space-y-6">
						{matches.map((match) => (
							<div
								key={match.restaurant.id}
								className="flex flex-col items-center"
							>
								<RestaurantCard restaurant={match.restaurant} />
								<p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
									Liked by {match.likedBy.join(", ")}
								</p>
							</div>
						))}
					</div>
				)}

				{/* Navigation */}
				<div className="mt-8 flex flex-col gap-3">
					<Link
						href={`/s/${sessionId}/swipe`}
						className="block w-full rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 py-3 text-center font-semibold text-white shadow-md transition-opacity hover:opacity-90"
					>
						Continue Swiping
					</Link>
					<Link
						href={`/s/${sessionId}`}
						className="block w-full rounded-xl border border-zinc-200 py-3 text-center font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
					>
						Back to Session
					</Link>
				</div>
			</main>
		</div>
	);
}
