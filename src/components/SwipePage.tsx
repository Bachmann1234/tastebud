"use client";

import { Heart, Loader2, UtensilsCrossed, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import TinderCard from "react-tinder-card";
import { readStorage } from "@/lib/session-storage";
import type { MyVotesResponse, Restaurant } from "@/lib/types";
import { RestaurantCard } from "./RestaurantCard";

type PageState = "loading" | "swiping" | "done" | "error";

/** Fisher-Yates shuffle (in-place) */
function shuffle<T>(arr: T[]): T[] {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[arr[i], arr[j]] = [arr[j], arr[i]];
	}
	return arr;
}

export function SwipePage({ sessionId }: { sessionId: string }) {
	const router = useRouter();

	const [pageState, setPageState] = useState<PageState>("loading");
	const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
	const [currentIndex, setCurrentIndex] = useState(-1);
	const [totalCount, setTotalCount] = useState(0);
	const [alreadyVotedCount, setAlreadyVotedCount] = useState(0);
	const [errorMessage, setErrorMessage] = useState("");
	const [memberName, setMemberName] = useState("");

	const tokenRef = useRef<string | null>(null);
	const cardRefs = useRef<(React.ComponentRef<typeof TinderCard> | null)[]>([]);
	const currentIndexRef = useRef(-1);

	const votedCount = useMemo(() => {
		if (totalCount === 0) return 0;
		return alreadyVotedCount + (restaurants.length - 1 - currentIndex);
	}, [alreadyVotedCount, restaurants.length, currentIndex, totalCount]);

	const init = useCallback(async () => {
		const stored = readStorage(sessionId);
		if (!stored.token || !stored.name) {
			router.replace(`/s/${sessionId}`);
			return;
		}

		tokenRef.current = stored.token;
		setMemberName(stored.name);

		try {
			const [restaurantsRes, votesRes] = await Promise.all([
				fetch("/api/restaurants"),
				fetch(`/api/sessions/${sessionId}/my-votes`, {
					headers: { "X-Member-Token": stored.token },
				}),
			]);

			if (votesRes.status === 401) {
				router.replace(`/s/${sessionId}`);
				return;
			}

			if (!restaurantsRes.ok || !votesRes.ok) {
				setErrorMessage("Failed to load restaurants.");
				setPageState("error");
				return;
			}

			const allRestaurants: Restaurant[] = await restaurantsRes.json();
			const { votedRestaurantIds }: MyVotesResponse = await votesRes.json();

			const votedSet = new Set(votedRestaurantIds);
			const remaining = allRestaurants.filter((r) => !votedSet.has(r.id));

			setTotalCount(allRestaurants.length);
			setAlreadyVotedCount(votedRestaurantIds.length);

			if (remaining.length === 0) {
				setPageState("done");
				return;
			}

			const shuffled = shuffle([...remaining]);
			setRestaurants(shuffled);
			setCurrentIndex(shuffled.length - 1);
			currentIndexRef.current = shuffled.length - 1;
			cardRefs.current = shuffled.map(() => null);
			setPageState("swiping");
		} catch {
			setErrorMessage("Failed to load restaurants.");
			setPageState("error");
		}
	}, [sessionId, router]);

	useEffect(() => {
		init();
	}, [init]);

	function handleSwipe(direction: string, restaurantId: number) {
		const vote = direction === "right";
		const newIndex = currentIndexRef.current - 1;
		currentIndexRef.current = newIndex;
		setCurrentIndex(newIndex);

		// Fire-and-forget vote submission
		fetch(`/api/sessions/${sessionId}/vote`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Member-Token": tokenRef.current ?? "",
			},
			body: JSON.stringify({ restaurantId, vote }),
		}).catch(() => {
			// Silently swallow — vote loss on network error is acceptable for MVP
		});
	}

	function handleCardLeftScreen() {
		if (currentIndexRef.current < 0) {
			setPageState("done");
		}
	}

	async function handleButtonSwipe(direction: "left" | "right") {
		if (currentIndex < 0) return;
		const ref = cardRefs.current[currentIndex];
		if (ref) {
			await ref.swipe(direction);
		}
	}

	// Loading
	if (pageState === "loading") {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
				<Loader2 className="h-8 w-8 animate-spin text-orange-500" />
				<p className="mt-3 text-zinc-500 dark:text-zinc-400">
					Loading restaurants...
				</p>
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
							init();
						}}
						className="inline-block rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-3 font-semibold text-white shadow-md transition-opacity hover:opacity-90"
					>
						Try Again
					</button>
				</main>
			</div>
		);
	}

	// Done
	if (pageState === "done") {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
				<main className="w-full max-w-md space-y-6 text-center">
					<UtensilsCrossed
						className="mx-auto h-12 w-12 text-orange-500"
						aria-hidden="true"
					/>
					<h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
						All done!
					</h1>
					<p className="text-zinc-500 dark:text-zinc-400">
						You've voted on all {totalCount} restaurants.
					</p>
					<div className="flex flex-col gap-3">
						<Link
							href={`/s/${sessionId}/matches`}
							className="inline-block rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-3 font-semibold text-white shadow-md transition-opacity hover:opacity-90"
						>
							View Matches
						</Link>
						<Link
							href={`/s/${sessionId}`}
							className="inline-block rounded-xl border border-zinc-200 px-6 py-3 font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
						>
							Back to Session
						</Link>
					</div>
				</main>
			</div>
		);
	}

	// Swiping
	const progressPercent =
		totalCount > 0 ? Math.round((votedCount / totalCount) * 100) : 0;

	return (
		<div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 font-sans dark:bg-black">
			{/* Progress bar */}
			<div className="w-full max-w-[400px] pt-6 pb-4">
				<div className="mb-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
					<span>{memberName}</span>
					<span>
						{votedCount} / {totalCount}
					</span>
				</div>
				<div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
					<div
						className="h-full rounded-full bg-gradient-to-r from-orange-500 to-rose-500 transition-all duration-300"
						style={{ width: `${progressPercent}%` }}
						role="progressbar"
						aria-valuenow={votedCount}
						aria-valuemin={0}
						aria-valuemax={totalCount}
					/>
				</div>
			</div>

			{/* Card stack — only render a small window around the current card */}
			<div className="relative h-[500px] w-full max-w-[400px] overflow-x-hidden overflow-y-visible">
				{restaurants.map((restaurant, index) => {
					// Only render the current card and the one animating off-screen
					if (index < currentIndex || index > currentIndex + 1) return null;
					return (
						<TinderCard
							ref={(el) => {
								cardRefs.current[index] = el;
							}}
							key={restaurant.id}
							onSwipe={(dir) => handleSwipe(dir, restaurant.id)}
							onCardLeftScreen={handleCardLeftScreen}
							preventSwipe={["up", "down"]}
							className="absolute inset-0"
						>
							<RestaurantCard restaurant={restaurant} />
						</TinderCard>
					);
				})}
			</div>

			{/* Action buttons */}
			<div className="flex gap-8 pt-6 pb-8">
				<button
					type="button"
					onClick={() => handleButtonSwipe("left")}
					aria-label="Nope"
					className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-300 bg-white shadow-md transition-transform hover:scale-110 active:scale-95 dark:border-red-700 dark:bg-zinc-900"
				>
					<X className="h-8 w-8 text-red-500" />
				</button>
				<button
					type="button"
					onClick={() => handleButtonSwipe("right")}
					aria-label="Like"
					className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-300 bg-white shadow-md transition-transform hover:scale-110 active:scale-95 dark:border-green-700 dark:bg-zinc-900"
				>
					<Heart className="h-8 w-8 text-green-500" />
				</button>
			</div>
		</div>
	);
}
