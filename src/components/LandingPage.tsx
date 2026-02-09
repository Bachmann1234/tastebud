"use client";

import { UtensilsCrossed } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

const DEFAULT_SESSION_NAME = "Restaurant Week Session";

const steps = [
	{ label: "Create", description: "Start a new session" },
	{ label: "Share", description: "Send the link to friends" },
	{ label: "Swipe", description: "Everyone swipes on restaurants" },
	{ label: "Match", description: "See where you all agree" },
];

type Status = "idle" | "creating" | "error";

export function LandingPage() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [status, setStatus] = useState<Status>("idle");

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (status === "creating") return;

		setStatus("creating");

		const sessionName = name.trim() || DEFAULT_SESSION_NAME;

		try {
			const response = await fetch("/api/sessions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: sessionName }),
			});

			if (!response.ok) {
				setStatus("error");
				return;
			}

			const data = await response.json();
			router.push(`/s/${data.id}?creator=true`);
		} catch {
			setStatus("error");
		}
	}

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
			<main className="w-full max-w-md space-y-10 py-16">
				{/* Hero */}
				<div className="flex flex-col items-center gap-3 text-center">
					<UtensilsCrossed className="h-12 w-12 text-orange-500" />
					<h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
						TasteBud
					</h1>
					<p className="text-lg text-zinc-600 dark:text-zinc-400">
						Swipe your way through Restaurant Week Boston
					</p>
				</div>

				{/* How it works */}
				<div className="space-y-4">
					<h2 className="text-center text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
						How it works
					</h2>
					<div className="grid grid-cols-2 gap-3">
						{steps.map((step) => (
							<div
								key={step.label}
								className="rounded-xl bg-white p-4 shadow-sm dark:bg-zinc-900"
							>
								<p className="font-semibold text-zinc-900 dark:text-zinc-50">
									{step.label}
								</p>
								<p className="text-sm text-zinc-500 dark:text-zinc-400">
									{step.description}
								</p>
							</div>
						))}
					</div>
				</div>

				{/* Create session form */}
				<form onSubmit={handleSubmit} className="space-y-3">
					<input
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder={DEFAULT_SESSION_NAME}
						className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
					/>
					<button
						type="submit"
						disabled={status === "creating"}
						className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 py-3 font-semibold text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
					>
						{status === "creating" ? "Creating..." : "Start a Session"}
					</button>
					{status === "error" && (
						<p className="text-center text-sm text-red-500">
							Failed to create session. Please try again.
						</p>
					)}
				</form>
			</main>
		</div>
	);
}
