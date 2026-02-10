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

const mockRestaurants = [
	{ id: 1, name: "Pizza Place", slug: "pizza-place", cuisine: ["Italian"] },
	{ id: 2, name: "Sushi Spot", slug: "sushi-spot", cuisine: ["Japanese"] },
];

describe("GET /api/sessions/[id]/restaurants", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns all restaurants for session with no filters", async () => {
		mockFromImpl = (table: string) => {
			if (table === "sessions") {
				return makeSessionMock({
					id: SESSION_ID,
					name: "Test",
					filters: null,
					expires_at: "2099-01-01T00:00:00Z",
				});
			}
			if (table === "restaurants") {
				return {
					select: () => Promise.resolve({ data: mockRestaurants, error: null }),
				};
			}
			return {};
		};

		const request = new Request(
			`http://localhost/api/sessions/${SESSION_ID}/restaurants`,
		);
		const response = await GET(request, makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toHaveLength(2);
	});

	it("applies filters for session with cuisine filter", async () => {
		let overlapsArgs: unknown[] = [];
		mockFromImpl = (table: string) => {
			if (table === "sessions") {
				return makeSessionMock({
					id: SESSION_ID,
					name: "Test",
					filters: { cuisines: ["Italian"] },
					expires_at: "2099-01-01T00:00:00Z",
				});
			}
			if (table === "restaurants") {
				return {
					select: () => ({
						overlaps: (...args: unknown[]) => {
							overlapsArgs = args;
							return Promise.resolve({
								data: [mockRestaurants[0]],
								error: null,
							});
						},
					}),
				};
			}
			return {};
		};

		const request = new Request(
			`http://localhost/api/sessions/${SESSION_ID}/restaurants`,
		);
		const response = await GET(request, makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toHaveLength(1);
		expect(overlapsArgs).toEqual(["cuisine", ["Italian"]]);
	});

	it("returns 404 when session not found", async () => {
		mockFromImpl = () => makeSessionMock(null, { code: "PGRST116" });

		const request = new Request(
			`http://localhost/api/sessions/${SESSION_ID}/restaurants`,
		);
		const response = await GET(request, makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.error).toBeDefined();
	});

	it("returns 410 when session is expired", async () => {
		mockFromImpl = () =>
			makeSessionMock({
				id: SESSION_ID,
				name: "Old",
				filters: null,
				expires_at: "2020-01-01T00:00:00Z",
			});

		const request = new Request(
			`http://localhost/api/sessions/${SESSION_ID}/restaurants`,
		);
		const response = await GET(request, makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(410);
		expect(body.error).toBeDefined();
	});

	it("returns 500 on restaurant fetch error", async () => {
		mockFromImpl = (table: string) => {
			if (table === "sessions") {
				return makeSessionMock({
					id: SESSION_ID,
					name: "Test",
					filters: null,
					expires_at: "2099-01-01T00:00:00Z",
				});
			}
			if (table === "restaurants") {
				return {
					select: () =>
						Promise.resolve({ data: null, error: { message: "db error" } }),
				};
			}
			return {};
		};

		const request = new Request(
			`http://localhost/api/sessions/${SESSION_ID}/restaurants`,
		);
		const response = await GET(request, makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body.error).toBeDefined();
	});
});
