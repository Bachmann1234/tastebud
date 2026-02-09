import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockInsert = vi.fn(() => ({ select: mockSelect }));
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

vi.mock("@/lib/supabase/server", () => ({
	createSupabaseServer: () => ({ from: mockFrom }),
}));

function jsonRequest(body: unknown) {
	return new Request("http://localhost/api/sessions", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/sessions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("creates a session with a name and returns 201", async () => {
		const session = {
			id: "abc-123",
			name: "Date Night",
			created_at: "2025-01-01T00:00:00Z",
			expires_at: "2025-01-31T00:00:00Z",
		};
		mockSingle.mockResolvedValue({ data: session, error: null });

		const response = await POST(jsonRequest({ name: "Date Night" }));
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body).toEqual({
			id: "abc-123",
			name: "Date Night",
			shareUrl: "/s/abc-123",
		});
		expect(mockInsert).toHaveBeenCalledWith({ name: "Date Night" });
	});

	it("returns 400 when name is missing", async () => {
		const response = await POST(jsonRequest({}));
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toBeDefined();
	});

	it("returns 400 when name is empty string", async () => {
		const response = await POST(jsonRequest({ name: "" }));
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toBeDefined();
	});

	it("returns 400 for invalid JSON", async () => {
		const request = new Request("http://localhost/api/sessions", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: "not json",
		});

		const response = await POST(request);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toBeDefined();
	});

	it("returns 500 on database error", async () => {
		mockSingle.mockResolvedValue({
			data: null,
			error: { message: "db error" },
		});

		const response = await POST(jsonRequest({ name: "Test" }));
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body.error).toBeDefined();
	});
});
