import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const SESSION_ID = "550e8400-e29b-41d4-a716-446655440000";

let mockFromImpl: (table: string) => unknown;

vi.mock("@/lib/supabase/server", () => ({
	createSupabaseServer: () => ({
		from: (table: string) => mockFromImpl(table),
	}),
}));

function makeParams(id: string) {
	return { params: Promise.resolve({ id }) };
}

function makeSessionMock(exists: boolean, expired = false) {
	return {
		select: () => ({
			eq: () => ({
				single: () =>
					Promise.resolve(
						exists
							? {
									data: {
										id: SESSION_ID,
										name: "Test",
										expires_at: expired
											? "2020-01-01T00:00:00Z"
											: "2099-01-01T00:00:00Z",
									},
									error: null,
								}
							: { data: null, error: { code: "PGRST116" } },
					),
			}),
		}),
	};
}

function makeRestaurantsMock(
	restaurants: { id: number; name: string; slug: string }[],
) {
	return {
		select: () =>
			Promise.resolve({
				data: restaurants,
				count: restaurants.length,
				error: null,
			}),
	};
}

describe("GET /api/sessions/[id]/matches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns matches when all members vote yes on same restaurant", async () => {
		const restaurants = [
			{ id: 1, name: "Pizza Place", slug: "pizza-place" },
			{ id: 2, name: "Sushi Spot", slug: "sushi-spot" },
			{ id: 3, name: "Taco Town", slug: "taco-town" },
		];

		mockFromImpl = (table: string) => {
			if (table === "sessions") return makeSessionMock(true);
			if (table === "session_members") {
				return {
					select: () => ({
						eq: () =>
							Promise.resolve({
								data: [
									{ id: "m1", name: "Alice", session_id: SESSION_ID },
									{ id: "m2", name: "Bob", session_id: SESSION_ID },
								],
								error: null,
							}),
					}),
				};
			}
			if (table === "restaurants") return makeRestaurantsMock(restaurants);
			if (table === "votes") {
				return {
					select: () => ({
						eq: () =>
							Promise.resolve({
								data: [
									// Both like Pizza Place
									{ member_id: "m1", restaurant_id: 1, vote: true },
									{ member_id: "m2", restaurant_id: 1, vote: true },
									// Only Alice likes Sushi
									{ member_id: "m1", restaurant_id: 2, vote: true },
									{ member_id: "m2", restaurant_id: 2, vote: false },
									// Both like Taco Town
									{ member_id: "m1", restaurant_id: 3, vote: true },
									{ member_id: "m2", restaurant_id: 3, vote: true },
								],
								error: null,
							}),
					}),
				};
			}
			return {};
		};

		const request = new Request(
			`http://localhost/api/sessions/${SESSION_ID}/matches`,
		);
		const response = await GET(request, makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.matches).toHaveLength(2);
		expect(body.totalRestaurants).toBe(3);
		expect(body.allMembersComplete).toBe(true);

		const matchNames = body.matches.map(
			(m: { restaurant: { name: string } }) => m.restaurant.name,
		);
		expect(matchNames).toContain("Pizza Place");
		expect(matchNames).toContain("Taco Town");
		expect(matchNames).not.toContain("Sushi Spot");

		// Check likedBy names
		const pizzaMatch = body.matches.find(
			(m: { restaurant: { name: string } }) =>
				m.restaurant.name === "Pizza Place",
		);
		expect(pizzaMatch.likedBy).toEqual(
			expect.arrayContaining(["Alice", "Bob"]),
		);
	});

	it("returns empty matches when no unanimous yes votes", async () => {
		mockFromImpl = (table: string) => {
			if (table === "sessions") return makeSessionMock(true);
			if (table === "session_members") {
				return {
					select: () => ({
						eq: () =>
							Promise.resolve({
								data: [
									{ id: "m1", name: "Alice", session_id: SESSION_ID },
									{ id: "m2", name: "Bob", session_id: SESSION_ID },
								],
								error: null,
							}),
					}),
				};
			}
			if (table === "restaurants")
				return makeRestaurantsMock([{ id: 1, name: "Pizza", slug: "pizza" }]);
			if (table === "votes") {
				return {
					select: () => ({
						eq: () =>
							Promise.resolve({
								data: [
									{ member_id: "m1", restaurant_id: 1, vote: true },
									{ member_id: "m2", restaurant_id: 1, vote: false },
								],
								error: null,
							}),
					}),
				};
			}
			return {};
		};

		const request = new Request(
			`http://localhost/api/sessions/${SESSION_ID}/matches`,
		);
		const response = await GET(request, makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.matches).toEqual([]);
	});

	it("returns 410 when session is expired", async () => {
		mockFromImpl = (table: string) => {
			if (table === "sessions") return makeSessionMock(true, true);
			return {};
		};

		const request = new Request(
			`http://localhost/api/sessions/${SESSION_ID}/matches`,
		);
		const response = await GET(request, makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(410);
		expect(body.error).toBeDefined();
	});

	it("returns 404 when session not found", async () => {
		mockFromImpl = (table: string) => {
			if (table === "sessions") return makeSessionMock(false);
			return {};
		};

		const request = new Request(
			`http://localhost/api/sessions/${SESSION_ID}/matches`,
		);
		const response = await GET(request, makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.error).toBeDefined();
	});

	it("sets allMembersComplete correctly when not all members have voted on every restaurant", async () => {
		mockFromImpl = (table: string) => {
			if (table === "sessions") return makeSessionMock(true);
			if (table === "session_members") {
				return {
					select: () => ({
						eq: () =>
							Promise.resolve({
								data: [
									{ id: "m1", name: "Alice", session_id: SESSION_ID },
									{ id: "m2", name: "Bob", session_id: SESSION_ID },
								],
								error: null,
							}),
					}),
				};
			}
			if (table === "restaurants")
				return makeRestaurantsMock([
					{ id: 1, name: "Pizza", slug: "pizza" },
					{ id: 2, name: "Sushi", slug: "sushi" },
				]);
			if (table === "votes") {
				return {
					select: () => ({
						eq: () =>
							Promise.resolve({
								data: [
									// Alice voted on both, Bob only voted on 1
									{ member_id: "m1", restaurant_id: 1, vote: true },
									{ member_id: "m1", restaurant_id: 2, vote: true },
									{ member_id: "m2", restaurant_id: 1, vote: true },
								],
								error: null,
							}),
					}),
				};
			}
			return {};
		};

		const request = new Request(
			`http://localhost/api/sessions/${SESSION_ID}/matches`,
		);
		const response = await GET(request, makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.allMembersComplete).toBe(false);
	});

	it("handles single member session — their yes votes are all matches", async () => {
		const restaurants = [
			{ id: 1, name: "Pizza", slug: "pizza" },
			{ id: 2, name: "Sushi", slug: "sushi" },
		];

		mockFromImpl = (table: string) => {
			if (table === "sessions") return makeSessionMock(true);
			if (table === "session_members") {
				return {
					select: () => ({
						eq: () =>
							Promise.resolve({
								data: [{ id: "m1", name: "Alice", session_id: SESSION_ID }],
								error: null,
							}),
					}),
				};
			}
			if (table === "restaurants") return makeRestaurantsMock(restaurants);
			if (table === "votes") {
				return {
					select: () => ({
						eq: () =>
							Promise.resolve({
								data: [
									{ member_id: "m1", restaurant_id: 1, vote: true },
									{ member_id: "m1", restaurant_id: 2, vote: false },
								],
								error: null,
							}),
					}),
				};
			}
			return {};
		};

		const request = new Request(
			`http://localhost/api/sessions/${SESSION_ID}/matches`,
		);
		const response = await GET(request, makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.matches).toHaveLength(1);
		expect(body.matches[0].restaurant.name).toBe("Pizza");
		expect(body.matches[0].likedBy).toEqual(["Alice"]);
		expect(body.allMembersComplete).toBe(true);
	});

	it("includes correct likedBy names for matches", async () => {
		const restaurants = [{ id: 1, name: "Pizza", slug: "pizza" }];

		mockFromImpl = (table: string) => {
			if (table === "sessions") return makeSessionMock(true);
			if (table === "session_members") {
				return {
					select: () => ({
						eq: () =>
							Promise.resolve({
								data: [
									{ id: "m1", name: "Alice", session_id: SESSION_ID },
									{ id: "m2", name: "Bob", session_id: SESSION_ID },
								],
								error: null,
							}),
					}),
				};
			}
			if (table === "restaurants") return makeRestaurantsMock(restaurants);
			if (table === "votes") {
				return {
					select: () => ({
						eq: () =>
							Promise.resolve({
								data: [
									{ member_id: "m1", restaurant_id: 1, vote: true },
									{ member_id: "m2", restaurant_id: 1, vote: true },
								],
								error: null,
							}),
					}),
				};
			}
			return {};
		};

		const request = new Request(
			`http://localhost/api/sessions/${SESSION_ID}/matches`,
		);
		const response = await GET(request, makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.matches[0].likedBy).toHaveLength(2);
		expect(body.matches[0].likedBy).toContain("Alice");
		expect(body.matches[0].likedBy).toContain("Bob");
	});
});
