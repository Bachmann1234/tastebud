"use client";

import { ChevronDown, ChevronUp, UtensilsCrossed } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import type { SessionFilters } from "@/lib/types";

const DEFAULT_SESSION_NAME = "Restaurant Week Session";

const steps = [
	{ label: "Create", description: "Start a new session" },
	{ label: "Share", description: "Send the link to friends" },
	{ label: "Swipe", description: "Everyone swipes on restaurants" },
	{ label: "Match", description: "See where you all agree" },
];

const DEFAULT_ERROR_MESSAGE = "Failed to create session. Please try again.";

interface FilterOptions {
	cuisines: string[];
	neighborhoods: string[];
}

export function LandingPage() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [status, setStatus] = useState<"idle" | "creating" | "error">("idle");
	const [errorMessage, setErrorMessage] = useState(DEFAULT_ERROR_MESSAGE);

	// Filter state
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(
		null,
	);
	const [filterLoading, setFilterLoading] = useState(false);
	const [selectedCuisines, setSelectedCuisines] = useState<Set<string>>(
		new Set(),
	);
	const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<
		Set<string>
	>(new Set());

	const activeFilterCount = selectedCuisines.size + selectedNeighborhoods.size;

	const fetchFilterOptions = useCallback(async () => {
		if (filterOptions || filterLoading) return;
		setFilterLoading(true);
		try {
			const res = await fetch("/api/restaurants/filters");
			if (res.ok) {
				const data: FilterOptions = await res.json();
				setFilterOptions(data);
			}
		} catch {
			// Silently fail — filters are optional
		} finally {
			setFilterLoading(false);
		}
	}, [filterOptions, filterLoading]);

	useEffect(() => {
		if (filtersOpen) {
			fetchFilterOptions();
		}
	}, [filtersOpen, fetchFilterOptions]);

	function toggleCuisine(cuisine: string) {
		setSelectedCuisines((prev) => {
			const next = new Set(prev);
			if (next.has(cuisine)) {
				next.delete(cuisine);
			} else {
				next.add(cuisine);
			}
			return next;
		});
	}

	function toggleNeighborhood(neighborhood: string) {
		setSelectedNeighborhoods((prev) => {
			const next = new Set(prev);
			if (next.has(neighborhood)) {
				next.delete(neighborhood);
			} else {
				next.add(neighborhood);
			}
			return next;
		});
	}

	function buildFilters(): SessionFilters | undefined {
		if (selectedCuisines.size === 0 && selectedNeighborhoods.size === 0) {
			return undefined;
		}
		const filters: SessionFilters = {};
		if (selectedCuisines.size > 0) {
			filters.cuisines = [...selectedCuisines];
		}
		if (selectedNeighborhoods.size > 0) {
			filters.neighborhoods = [...selectedNeighborhoods];
		}
		return filters;
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		if (status === "creating") return;

		setStatus("creating");

		const sessionName = name.trim() || DEFAULT_SESSION_NAME;
		const filters = buildFilters();

		try {
			const response = await fetch("/api/sessions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: sessionName,
					...(filters && { filters }),
				}),
			});

			if (!response.ok) {
				let message = DEFAULT_ERROR_MESSAGE;
				try {
					const body = await response.json();
					if (typeof body.error === "string") {
						message = body.error;
					}
				} catch {
					// Fall back to default message
				}
				setErrorMessage(message);
				setStatus("error");
				return;
			}

			const data = await response.json();
			router.push(`/s/${data.id}?creator=true`);
		} catch {
			setErrorMessage(DEFAULT_ERROR_MESSAGE);
			setStatus("error");
		}
	}

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 font-sans dark:bg-black">
			<main className="w-full max-w-md space-y-10 py-16">
				{/* Hero */}
				<div className="flex flex-col items-center gap-3 text-center">
					<UtensilsCrossed
						className="h-12 w-12 text-orange-500"
						aria-hidden="true"
					/>
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
					<label htmlFor="session-name" className="sr-only">
						Session name
					</label>
					<input
						id="session-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder={DEFAULT_SESSION_NAME}
						maxLength={255}
						className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-zinc-900 placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
					/>

					{/* Filter section */}
					<div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
						<button
							type="button"
							onClick={() => setFiltersOpen(!filtersOpen)}
							className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300"
						>
							<span>
								Filter restaurants
								{activeFilterCount > 0 && (
									<span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-semibold text-white">
										{activeFilterCount}
									</span>
								)}
							</span>
							{filtersOpen ? (
								<ChevronUp className="h-4 w-4" />
							) : (
								<ChevronDown className="h-4 w-4" />
							)}
						</button>

						{filtersOpen && (
							<div className="space-y-4 border-t border-zinc-200 px-4 pt-3 pb-4 dark:border-zinc-700">
								{filterLoading && (
									<p className="text-sm text-zinc-400">Loading filters...</p>
								)}

								{filterOptions && (
									<>
										{filterOptions.cuisines.length > 0 && (
											<div>
												<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
													Cuisine
												</p>
												<div className="flex flex-wrap gap-2">
													{filterOptions.cuisines.map((cuisine) => (
														<button
															key={cuisine}
															type="button"
															onClick={() => toggleCuisine(cuisine)}
															className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
																selectedCuisines.has(cuisine)
																	? "bg-orange-500 text-white"
																	: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
															}`}
														>
															{cuisine}
														</button>
													))}
												</div>
											</div>
										)}

										{filterOptions.neighborhoods.length > 0 && (
											<div>
												<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
													Neighborhood
												</p>
												<div className="flex flex-wrap gap-2">
													{filterOptions.neighborhoods.map((neighborhood) => (
														<button
															key={neighborhood}
															type="button"
															onClick={() => toggleNeighborhood(neighborhood)}
															className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
																selectedNeighborhoods.has(neighborhood)
																	? "bg-blue-500 text-white"
																	: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
															}`}
														>
															{neighborhood}
														</button>
													))}
												</div>
											</div>
										)}
									</>
								)}
							</div>
						)}
					</div>

					<button
						type="submit"
						disabled={status === "creating"}
						className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 py-3 font-semibold text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
					>
						{status === "creating" ? "Creating..." : "Start a Session"}
					</button>
					{status === "error" && (
						<p className="text-center text-sm text-red-500">{errorMessage}</p>
					)}
				</form>
			</main>
		</div>
	);
}
