"use client";

import {
	Check,
	ClipboardCopy,
	Loader2,
	Users,
	UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
	type FormEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { clearStorage, readStorage, writeStorage } from "@/lib/session-storage";
import type { SessionDetailResponse } from "@/lib/types";

type PageStatus =
	| "loading"
	| "join"
	| "joining"
	| "joined"
	| "not-found"
	| "expired"
	| "error";

export function SessionJoinPage({ sessionId }: { sessionId: string }) {
	const searchParams = useSearchParams();
	const isCreator = searchParams.get("creator") === "true";

	const [pageStatus, setPageStatus] = useState<PageStatus>("loading");
	const [session, setSession] = useState<SessionDetailResponse | null>(null);
	const [memberName, setMemberName] = useState("");
	const [joinedName, setJoinedName] = useState("");
	const [errorMessage, setErrorMessage] = useState("");
	const [nameError, setNameError] = useState("");
	const [copied, setCopied] = useState(false);
	const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

	useEffect(() => {
		return () => {
			if (copiedTimeoutRef.current) {
				clearTimeout(copiedTimeoutRef.current);
			}
		};
	}, []);

	const fetchSession = useCallback(async () => {
		try {
			const response = await fetch(`/api/sessions/${sessionId}`);

			if (response.status === 404) {
				setPageStatus("not-found");
				return null;
			}
			if (response.status === 410) {
				setPageStatus("expired");
				return null;
			}
			if (!response.ok) {
				setPageStatus("error");
				setErrorMessage("Something went wrong loading this session.");
				return null;
			}

			const data: SessionDetailResponse = await response.json();
			setSession(data);
			return data;
		} catch {
			setPageStatus("error");
			setErrorMessage("Something went wrong loading this session.");
			return null;
		}
	}, [sessionId]);

	const initSession = useCallback(async () => {
		const data = await fetchSession();
		if (!data) return;

		const stored = readStorage(sessionId);
		if (stored.token) {
			const isMember = data.members.some((m) => m.id === stored.token);
			if (isMember && stored.name) {
				setJoinedName(stored.name);
				setPageStatus("joined");
				return;
			}
			clearStorage(sessionId);
		}

		setPageStatus("join");
	}, [sessionId, fetchSession]);

	useEffect(() => {
		initSession();
	}, [initSession]);

	async function handleJoin(e: FormEvent) {
		e.preventDefault();
		if (pageStatus === "joining") return;

		const trimmed = memberName.trim();
		if (!trimmed) {
			setNameError("Name is required");
			return;
		}

		setNameError("");
		setPageStatus("joining");

		try {
			const response = await fetch(`/api/sessions/${sessionId}/join`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: trimmed }),
			});

			if (response.status === 404) {
				setPageStatus("not-found");
				return;
			}
			if (response.status === 410) {
				setPageStatus("expired");
				return;
			}
			if (!response.ok) {
				let message = "Failed to join session. Please try again.";
				try {
					const body = await response.json();
					if (typeof body.error === "string") {
						message = body.error;
					}
				} catch {
					// Fall back to default message
				}
				setErrorMessage(message);
				setPageStatus("error");
				return;
			}

			const data = await response.json();
			writeStorage(sessionId, data.token, data.name);
			setJoinedName(data.name);

			// Re-fetch session to get updated member list
			const updated = await fetchSession();
			if (updated) {
				setPageStatus("joined");
			}
		} catch {
			setErrorMessage("Failed to join session. Please try again.");
			setPageStatus("error");
		}
	}

	async function handleCopyLink() {
		try {
			const shareUrl = `${window.location.origin}/s/${sessionId}`;
			await navigator.clipboard.writeText(shareUrl);
			if (copiedTimeoutRef.current) {
				clearTimeout(copiedTimeoutRef.current);
			}
			setCopied(true);
			copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
		} catch {
			// Clipboard API unavailable
		}
	}

	function handleRetry() {
		setPageStatus("loading");
		setErrorMessage("");
		initSession();
	}

	// Loading state
	if (pageStatus === "loading") {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
				<Loader2 className="h-8 w-8 animate-spin text-orange-500" />
				<p className="mt-3 text-zinc-500 dark:text-zinc-400">
					Loading session...
				</p>
			</div>
		);
	}

	// Not found
	if (pageStatus === "not-found") {
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
	if (pageStatus === "expired") {
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

	// Error state (with retry)
	if (pageStatus === "error") {
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
						onClick={handleRetry}
						className="inline-block rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-3 font-semibold text-white shadow-md transition-opacity hover:opacity-90"
					>
						Try Again
					</button>
				</main>
			</div>
		);
	}

	// Joined / confirmation state
	if (pageStatus === "joined" && session) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
				<main className="w-full max-w-md space-y-8 py-16">
					{/* Header */}
					<div className="flex flex-col items-center gap-3 text-center">
						<UtensilsCrossed
							className="h-12 w-12 text-orange-500"
							aria-hidden="true"
						/>
						<h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
							You're in, {joinedName}!
						</h1>
						{session.name && (
							<p className="text-lg text-zinc-600 dark:text-zinc-400">
								{session.name}
							</p>
						)}
					</div>

					{/* Members */}
					<div className="space-y-3">
						<h2 className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
							<Users className="h-4 w-4" aria-hidden="true" />
							Members ({session.members.length})
						</h2>
						<ul className="space-y-2">
							{session.members.map((member) => (
								<li
									key={member.id}
									className="rounded-xl bg-white px-4 py-3 shadow-sm dark:bg-zinc-900"
								>
									<span className="font-medium text-zinc-900 dark:text-zinc-50">
										{member.name}
									</span>
								</li>
							))}
						</ul>
					</div>

					{/* Share link */}
					<div className="space-y-3">
						<h2 className="text-center text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
							Share this session
						</h2>
						<button
							type="button"
							onClick={handleCopyLink}
							className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
						>
							{copied ? (
								<>
									<Check
										className="h-4 w-4 text-green-500"
										aria-hidden="true"
									/>
									Copied!
								</>
							) : (
								<>
									<ClipboardCopy
										className="h-4 w-4 text-zinc-400"
										aria-hidden="true"
									/>
									Copy Link
								</>
							)}
						</button>
					</div>

					{/* Start swiping */}
					<Link
						href={`/s/${sessionId}/swipe`}
						className="block w-full rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 py-3 text-center font-semibold text-white shadow-md transition-opacity hover:opacity-90"
					>
						Start Swiping
					</Link>
				</main>
			</div>
		);
	}

	// Join form (pageStatus === "join" or "joining")
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
			<main className="w-full max-w-md space-y-8 py-16">
				{/* Header */}
				<div className="flex flex-col items-center gap-3 text-center">
					<UtensilsCrossed
						className="h-12 w-12 text-orange-500"
						aria-hidden="true"
					/>
					<h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
						{session?.name ?? "TasteBud Session"}
					</h1>
					{session && (
						<div className="flex gap-4 text-sm text-zinc-500 dark:text-zinc-400">
							<span className="flex items-center gap-1">
								<Users className="h-4 w-4" aria-hidden="true" />
								{session.members.length}{" "}
								{session.members.length === 1 ? "member" : "members"}
							</span>
							<span>
								{session.totalRestaurants}{" "}
								{session.totalRestaurants === 1 ? "restaurant" : "restaurants"}
							</span>
						</div>
					)}
				</div>

				{/* Creator banner */}
				{isCreator && (
					<div className="rounded-xl bg-orange-50 px-4 py-3 text-center text-sm font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
						Session created! Enter your name to join.
					</div>
				)}

				{/* Join form */}
				<form onSubmit={handleJoin} className="space-y-3">
					<label htmlFor="member-name" className="sr-only">
						Your name
					</label>
					<input
						id="member-name"
						type="text"
						value={memberName}
						onChange={(e) => {
							setMemberName(e.target.value);
							if (nameError) setNameError("");
						}}
						placeholder="Your name"
						maxLength={100}
						className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
					/>
					{nameError && (
						<p className="text-center text-sm text-red-500">{nameError}</p>
					)}
					<button
						type="submit"
						disabled={pageStatus === "joining"}
						className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 py-3 font-semibold text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
					>
						{pageStatus === "joining" ? "Joining..." : "Join Session"}
					</button>
				</form>
			</main>
		</div>
	);
}
