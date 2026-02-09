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

function jsonRequest(body: unknown) {
	return new Request(`http://localhost/api/sessions/${SESSION_ID}/join`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

function makeParams(id: string) {
	return { params: Promise.resolve({ id }) };
}

describe("POST /api/sessions/[id]/join", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("creates a new member and returns 201", async () => {
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
			if (table === "session_members") {
				return {
					select: () => ({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: () =>
									Promise.resolve({
										data: null,
										error: { code: "PGRST116" },
									}),
							}),
						}),
					}),
					insert: () => ({
						select: () => ({
							single: () =>
								Promise.resolve({
									data: {
										id: MEMBER_ID,
										session_id: SESSION_ID,
										name: "Alice",
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
			jsonRequest({ name: "Alice" }),
			makeParams(SESSION_ID),
		);
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body).toEqual({
			memberId: MEMBER_ID,
			token: MEMBER_ID,
			name: "Alice",
			sessionId: SESSION_ID,
		});
	});

	it("returns existing member with 200 on rejoin (idempotent)", async () => {
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
			if (table === "session_members") {
				return {
					select: () => ({
						eq: vi.fn().mockReturnValue({
							eq: vi.fn().mockReturnValue({
								single: () =>
									Promise.resolve({
										data: {
											id: MEMBER_ID,
											session_id: SESSION_ID,
											name: "Alice",
										},
										error: null,
									}),
							}),
						}),
					}),
				};
			}
			return {};
		};

		const response = await POST(
			jsonRequest({ name: "Alice" }),
			makeParams(SESSION_ID),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({
			memberId: MEMBER_ID,
			token: MEMBER_ID,
			name: "Alice",
			sessionId: SESSION_ID,
		});
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
			jsonRequest({ name: "Alice" }),
			makeParams(SESSION_ID),
		);
		const body = await response.json();

		expect(response.status).toBe(404);
		expect(body.error).toBeDefined();
	});

	it("returns 400 when name is missing", async () => {
		const response = await POST(jsonRequest({}), makeParams(SESSION_ID));
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toBeDefined();
	});

	it("returns 400 when name is too long", async () => {
		const response = await POST(
			jsonRequest({ name: "A".repeat(101) }),
			makeParams(SESSION_ID),
		);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toBeDefined();
	});
});
