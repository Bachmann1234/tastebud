import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

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

function jsonRequest(body: unknown, token?: string) {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (token) {
		headers["X-Member-Token"] = token;
	}
	return new Request(`http://localhost/api/sessions/${SESSION_ID}/vote`, {
		method: "POST",
		headers,
		body: JSON.stringify(body),
	});
}

function makeParams(id: string) {
	return { params: Promise.resolve({ id }) };
}

describe("POST /api/sessions/[id]/vote", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("records a vote and returns 201", async () => {
		mockFromImpl = (table: string) => {
			if (table === "sessions") {
				return {
					select: () => ({
						eq: () => ({
							single: () =>
								Promise.resolve({
									data: { id: SESSION_ID, expires_at: "2099-01-01T00:00:00Z" },
									error: null,
								}),
						}),
					}),
				};
			}
			if (table === "votes") {
				return {
					insert: () => ({
						select: () => ({
							single: () =>
								Promise.resolve({
									data: {
										id: 1,
										session_id: SESSION_ID,
										member_id: MEMBER_ID,
										restaurant_id: 42,
										vote: true,
									},
									error: null,
								}),
						}),
					}),
				};
			}
			return {};
		};

		mockValidateToken.mockResolvedValue({
			id: MEMBER_ID,
			session_id: SESSION_ID,
			name: "Alice",
			created_at: "2025-01-01T00:00:00Z",
		});

		const response = await POST(
			jsonRequest({ restaurantId: 42, vote: true }, MEMBER_ID),
			makeParams(SESSION_ID),
		);
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body).toEqual({
			id: 1,
			restaurantId: 42,
			vote: true,
		});
	});

	it("returns 401 when token is missing", async () => {
		const response = await POST(
			jsonRequest({ restaurantId: 42, vote: true }),
			makeParams(SESSION_ID),
		);
		const body = await response.json();

		expect(response.status).toBe(401);
		expect(body.error).toBeDefined();
	});

	it("returns 401 when token is invalid", async () => {
		mockFromImpl = (table: string) => {
			if (table === "sessions") {
				return {
					select: () => ({
						eq: () => ({
							single: () =>
								Promise.resolve({
									data: { id: SESSION_ID, expires_at: "2099-01-01T00:00:00Z" },
									error: null,
								}),
						}),
					}),
				};
			}
			return {};
		};

		mockValidateToken.mockResolvedValue(null);

		const response = await POST(
			jsonRequest({ restaurantId: 42, vote: true }, "bad-token"),
			makeParams(SESSION_ID),
		);
		const body = await response.json();

		expect(response.status).toBe(401);
		expect(body.error).toBeDefined();
	});

	it("returns 404 when session not found", async () => {
		mockFromImpl = (table: string) => {
			if (table === "sessions") {
				return {
					select: () => ({
						eq: () => ({
							single: () =>
								Promise.resolve({
									data: null,
									error: { code: "PGRST116" },
								}),
						}),
					}),
				};
			}
			return {};
		};

		const response = await POST(
			jsonRequest({ restaurantId: 42, vote: true }, MEMBER_ID),
			makeParams(SESSION_ID),
		);
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.error).toBeDefined();
	});

	it("returns 410 when session is expired", async () => {
		mockFromImpl = (table: string) => {
			if (table === "sessions") {
				return {
					select: () => ({
						eq: () => ({
							single: () =>
								Promise.resolve({
									data: {
										id: SESSION_ID,
										expires_at: "2020-01-01T00:00:00Z",
									},
									error: null,
								}),
						}),
					}),
				};
			}
			return {};
		};

		const response = await POST(
			jsonRequest({ restaurantId: 42, vote: true }, MEMBER_ID),
			makeParams(SESSION_ID),
		);
		const body = await response.json();

		expect(response.status).toBe(410);
		expect(body.error).toBeDefined();
	});

	it("returns 409 when vote already exists (unique constraint)", async () => {
		mockFromImpl = (table: string) => {
			if (table === "sessions") {
				return {
					select: () => ({
						eq: () => ({
							single: () =>
								Promise.resolve({
									data: { id: SESSION_ID, expires_at: "2099-01-01T00:00:00Z" },
									error: null,
								}),
						}),
					}),
				};
			}
			if (table === "votes") {
				return {
					insert: () => ({
						select: () => ({
							single: () =>
								Promise.resolve({
									data: null,
									error: { code: "23505", message: "unique violation" },
								}),
						}),
					}),
				};
			}
			return {};
		};

		mockValidateToken.mockResolvedValue({
			id: MEMBER_ID,
			session_id: SESSION_ID,
			name: "Alice",
			created_at: "2025-01-01T00:00:00Z",
		});

		const response = await POST(
			jsonRequest({ restaurantId: 42, vote: true }, MEMBER_ID),
			makeParams(SESSION_ID),
		);
		const body = await response.json();

		expect(response.status).toBe(409);
		expect(body.error).toBeDefined();
	});

	it("returns 400 when body is invalid", async () => {
		mockFromImpl = (table: string) => {
			if (table === "sessions") {
				return {
					select: () => ({
						eq: () => ({
							single: () =>
								Promise.resolve({
									data: { id: SESSION_ID, expires_at: "2099-01-01T00:00:00Z" },
									error: null,
								}),
						}),
					}),
				};
			}
			return {};
		};

		mockValidateToken.mockResolvedValue({
			id: MEMBER_ID,
			session_id: SESSION_ID,
			name: "Alice",
			created_at: "2025-01-01T00:00:00Z",
		});

		const response = await POST(
			jsonRequest({ restaurantId: "not-a-number", vote: true }, MEMBER_ID),
			makeParams(SESSION_ID),
		);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toBeDefined();
	});
});
