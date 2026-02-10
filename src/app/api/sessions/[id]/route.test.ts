import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

let mockFromImpl: (table: string) => unknown;

vi.mock("@/lib/supabase/server", () => ({
	createSupabaseServer: () => ({
		from: (table: string) => mockFromImpl(table),
	}),
}));

function makeParams(id: string) {
	return { params: Promise.resolve({ id }) };
}

const SESSION_ID = "550e8400-e29b-41d4-a716-446655440000";

function makeSessionMock(
	data: Record<string, unknown> | null,
	error: Record<string, unknown> | null = null,
) {
	return {
		select: () => ({
			eq: () => ({
				single: () => Promise.resolve({ data, error }),
			}),
		}),
	};
}

describe("GET /api/sessions/[id]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns session with member progress and match count", async () => {
		const futureDate = new Date(
			Date.now() + 30 * 24 * 60 * 60 * 1000,
		).toISOString();

		mockFromImpl = (table: string) => {
			if (table === "sessions") {
				return makeSessionMock({
					id: SESSION_ID,
					name: "Date Night",
					filters: null,
					created_at: "2025-01-01T00:00:00Z",
					expires_at: futureDate,
				});
			}
			if (table === "session_members") {
				return {
					select: () => ({
						eq: () =>
							Promise.resolve({
								data: [
									{ id: "m1", session_id: SESSION_ID, name: "Alice" },
									{ id: "m2", session_id: SESSION_ID, name: "Bob" },
								],
								error: null,
							}),
					}),
				};
			}
			if (table === "restaurants") {
				return {
					select: (_sel: string, opts?: { count?: string; head?: boolean }) => {
						if (opts?.count === "exact") {
							return Promise.resolve({ count: 10, error: null });
						}
						return Promise.resolve({ data: [], error: null });
					},
				};
			}
			if (table === "votes") {
				return {
					select: () => ({
						eq: () =>
							Promise.resolve({
								data: [
									{ member_id: "m1", restaurant_id: 1, vote: true },
									{ member_id: "m1", restaurant_id: 2, vote: false },
									{ member_id: "m2", restaurant_id: 1, vote: true },
								],
								error: null,
							}),
					}),
				};
			}
			return {};
		};

		const request = new Request(`http://localhost/api/sessions/${SESSION_ID}`);
		const response = await GET(request, makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.id).toBe(SESSION_ID);
		expect(body.name).toBe("Date Night");
		expect(body.filters).toBeNull();
		expect(body.totalRestaurants).toBe(10);
		expect(body.members).toHaveLength(2);

		const alice = body.members.find(
			(m: { name: string }) => m.name === "Alice",
		);
		expect(alice.votesCount).toBe(2);
		expect(alice.totalRestaurants).toBe(10);
		expect(alice.done).toBe(false);

		const bob = body.members.find((m: { name: string }) => m.name === "Bob");
		expect(bob.votesCount).toBe(1);
		expect(bob.done).toBe(false);

		// matchCount: restaurant 1 has yes from both Alice and Bob = 1 match
		expect(body.matchCount).toBe(1);
	});

	it("includes filters in response when session has filters", async () => {
		const futureDate = new Date(
			Date.now() + 30 * 24 * 60 * 60 * 1000,
		).toISOString();

		const sessionFilters = {
			cuisines: ["Italian"],
			neighborhoods: ["Back Bay"],
		};

		let overlapsCalledWith: unknown[] = [];

		mockFromImpl = (table: string) => {
			if (table === "sessions") {
				return makeSessionMock({
					id: SESSION_ID,
					name: "Filtered Session",
					filters: sessionFilters,
					created_at: "2025-01-01T00:00:00Z",
					expires_at: futureDate,
				});
			}
			if (table === "session_members") {
				return {
					select: () => ({
						eq: () => Promise.resolve({ data: [], error: null }),
					}),
				};
			}
			if (table === "restaurants") {
				return {
					select: (_sel: string, opts?: { count?: string; head?: boolean }) => {
						if (opts?.count === "exact") {
							return {
								overlaps: (...args: unknown[]) => {
									overlapsCalledWith = args;
									return {
										in: () => Promise.resolve({ count: 3, error: null }),
									};
								},
							};
						}
						return Promise.resolve({ data: [], error: null });
					},
				};
			}
			if (table === "votes") {
				return {
					select: () => ({
						eq: () => Promise.resolve({ data: [], error: null }),
					}),
				};
			}
			return {};
		};

		const request = new Request(`http://localhost/api/sessions/${SESSION_ID}`);
		const response = await GET(request, makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.filters).toEqual(sessionFilters);
		expect(body.totalRestaurants).toBe(3);
		expect(overlapsCalledWith).toEqual(["cuisine", ["Italian"]]);
	});

	it("returns 404 when session not found", async () => {
		mockFromImpl = () => makeSessionMock(null, { code: "PGRST116" });

		const request = new Request(`http://localhost/api/sessions/${SESSION_ID}`);
		const response = await GET(request, makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.error).toBeDefined();
	});

	it("returns 410 when session is expired", async () => {
		const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

		mockFromImpl = () =>
			makeSessionMock({
				id: SESSION_ID,
				name: "Old Session",
				filters: null,
				created_at: "2024-01-01T00:00:00Z",
				expires_at: pastDate,
			});

		const request = new Request(`http://localhost/api/sessions/${SESSION_ID}`);
		const response = await GET(request, makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(410);
		expect(body.error).toBeDefined();
	});

	it("handles session with zero members", async () => {
		const futureDate = new Date(
			Date.now() + 30 * 24 * 60 * 60 * 1000,
		).toISOString();

		mockFromImpl = (table: string) => {
			if (table === "sessions") {
				return makeSessionMock({
					id: SESSION_ID,
					name: "Empty",
					filters: null,
					created_at: "2025-01-01T00:00:00Z",
					expires_at: futureDate,
				});
			}
			if (table === "session_members") {
				return {
					select: () => ({
						eq: () => Promise.resolve({ data: [], error: null }),
					}),
				};
			}
			if (table === "restaurants") {
				return {
					select: (_sel: string, opts?: { count?: string; head?: boolean }) => {
						if (opts?.count === "exact") {
							return Promise.resolve({ count: 5, error: null });
						}
						return Promise.resolve({ data: [], error: null });
					},
				};
			}
			if (table === "votes") {
				return {
					select: () => ({
						eq: () => Promise.resolve({ data: [], error: null }),
					}),
				};
			}
			return {};
		};

		const request = new Request(`http://localhost/api/sessions/${SESSION_ID}`);
		const response = await GET(request, makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.members).toEqual([]);
		expect(body.matchCount).toBe(0);
		expect(body.totalRestaurants).toBe(5);
	});
});
