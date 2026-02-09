import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const SESSION_ID = "550e8400-e29b-41d4-a716-446655440000";
const MEMBER_ID = "660e8400-e29b-41d4-a716-446655440001";

let mockFromImpl: (table: string) => unknown;

vi.mock("@/lib/supabase/server", () => ({
	createSupabaseServer: () => ({
		from: (table: string) => mockFromImpl(table),
	}),
}));

vi.mock("@/lib/api/auth", () => ({
	validateMemberToken: vi.fn(),
}));

import { validateMemberToken } from "@/lib/api/auth";

const mockValidateToken = vi.mocked(validateMemberToken);

function makeRequest(token?: string) {
	const headers: Record<string, string> = {};
	if (token) {
		headers["X-Member-Token"] = token;
	}
	return new Request(`http://localhost/api/sessions/${SESSION_ID}/my-votes`, {
		method: "GET",
		headers,
	});
}

function makeParams(id: string) {
	return { params: Promise.resolve({ id }) };
}

function sessionsTable(data: unknown, error: unknown = null) {
	return {
		select: () => ({
			eq: () => ({
				single: () => Promise.resolve({ data, error }),
			}),
		}),
	};
}

function votesTable(data: unknown, error: unknown = null) {
	return {
		select: () => ({
			eq: () => ({
				eq: () => Promise.resolve({ data, error }),
			}),
		}),
	};
}

describe("GET /api/sessions/[id]/my-votes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns voted restaurant IDs", async () => {
		mockFromImpl = (table: string) => {
			if (table === "sessions") {
				return sessionsTable({
					id: SESSION_ID,
					expires_at: "2099-01-01T00:00:00Z",
				});
			}
			if (table === "votes") {
				return votesTable([
					{ restaurant_id: 1 },
					{ restaurant_id: 5 },
					{ restaurant_id: 12 },
				]);
			}
			return {};
		};

		mockValidateToken.mockResolvedValue({
			id: MEMBER_ID,
			session_id: SESSION_ID,
			name: "Alice",
			created_at: "2025-01-01T00:00:00Z",
		});

		const response = await GET(makeRequest(MEMBER_ID), makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({ votedRestaurantIds: [1, 5, 12] });
	});

	it("returns empty array when no votes exist", async () => {
		mockFromImpl = (table: string) => {
			if (table === "sessions") {
				return sessionsTable({
					id: SESSION_ID,
					expires_at: "2099-01-01T00:00:00Z",
				});
			}
			if (table === "votes") {
				return votesTable([]);
			}
			return {};
		};

		mockValidateToken.mockResolvedValue({
			id: MEMBER_ID,
			session_id: SESSION_ID,
			name: "Alice",
			created_at: "2025-01-01T00:00:00Z",
		});

		const response = await GET(makeRequest(MEMBER_ID), makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({ votedRestaurantIds: [] });
	});

	it("returns 401 when token is missing", async () => {
		const response = await GET(makeRequest(), makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(401);
		expect(body.error).toBeDefined();
	});

	it("returns 401 when token is invalid", async () => {
		mockFromImpl = (table: string) => {
			if (table === "sessions") {
				return sessionsTable({
					id: SESSION_ID,
					expires_at: "2099-01-01T00:00:00Z",
				});
			}
			return {};
		};

		mockValidateToken.mockResolvedValue(null);

		const response = await GET(
			makeRequest("bad-token"),
			makeParams(SESSION_ID),
		);
		const body = await response.json();

		expect(response.status).toBe(401);
		expect(body.error).toBeDefined();
	});

	it("returns 404 when session not found", async () => {
		mockFromImpl = (table: string) => {
			if (table === "sessions") {
				return sessionsTable(null, { code: "PGRST116" });
			}
			return {};
		};

		const response = await GET(makeRequest(MEMBER_ID), makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.error).toBeDefined();
	});

	it("returns 410 when session is expired", async () => {
		mockFromImpl = (table: string) => {
			if (table === "sessions") {
				return sessionsTable({
					id: SESSION_ID,
					expires_at: "2020-01-01T00:00:00Z",
				});
			}
			return {};
		};

		const response = await GET(makeRequest(MEMBER_ID), makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(410);
		expect(body.error).toBeDefined();
	});

	it("returns 500 on database error", async () => {
		mockFromImpl = (table: string) => {
			if (table === "sessions") {
				return sessionsTable({
					id: SESSION_ID,
					expires_at: "2099-01-01T00:00:00Z",
				});
			}
			if (table === "votes") {
				return votesTable(null, { message: "db error" });
			}
			return {};
		};

		mockValidateToken.mockResolvedValue({
			id: MEMBER_ID,
			session_id: SESSION_ID,
			name: "Alice",
			created_at: "2025-01-01T00:00:00Z",
		});

		const response = await GET(makeRequest(MEMBER_ID), makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body.error).toBeDefined();
	});
});
