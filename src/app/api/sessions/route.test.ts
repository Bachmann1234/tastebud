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
		expect(mockInsert).toHaveBeenCalledWith({
			name: "Date Night",
			filters: null,
		});
	});

	it("creates a session with filters", async () => {
		const session = {
			id: "abc-123",
			name: "Italian Night",
			created_at: "2025-01-01T00:00:00Z",
			expires_at: "2025-01-31T00:00:00Z",
		};
		mockSingle.mockResolvedValue({ data: session, error: null });

		const filters = {
			cuisines: ["Italian", "Pizza"],
			neighborhoods: ["Back Bay"],
		};
		const response = await POST(
			jsonRequest({ name: "Italian Night", filters }),
		);
		const body = await response.json();

		expect(response.status).toBe(201);
		expect(body.id).toBe("abc-123");
		expect(mockInsert).toHaveBeenCalledWith({
			name: "Italian Night",
			filters: { cuisines: ["Italian", "Pizza"], neighborhoods: ["Back Bay"] },
		});
	});

	it("stores null filters when none provided", async () => {
		const session = {
			id: "abc-123",
			name: "No Filters",
			created_at: "2025-01-01T00:00:00Z",
			expires_at: "2025-01-31T00:00:00Z",
		};
		mockSingle.mockResolvedValue({ data: session, error: null });

		const response = await POST(jsonRequest({ name: "No Filters" }));

		expect(response.status).toBe(201);
		expect(mockInsert).toHaveBeenCalledWith({
			name: "No Filters",
			filters: null,
		});
	});

	it("stores null filters when filters has only empty arrays", async () => {
		const session = {
			id: "abc-123",
			name: "Empty Filters",
			created_at: "2025-01-01T00:00:00Z",
			expires_at: "2025-01-31T00:00:00Z",
		};
		mockSingle.mockResolvedValue({ data: session, error: null });

		const response = await POST(
			jsonRequest({
				name: "Empty Filters",
				filters: { cuisines: [], neighborhoods: [] },
			}),
		);

		expect(response.status).toBe(201);
		expect(mockInsert).toHaveBeenCalledWith({
			name: "Empty Filters",
			filters: null,
		});
	});

	it("returns 400 for invalid filters format (non-string array)", async () => {
		const response = await POST(
			jsonRequest({
				name: "Bad Filters",
				filters: { cuisines: [123] },
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toBe("Invalid filters format");
	});

	it("returns 400 for invalid filters format (not an object)", async () => {
		const response = await POST(
			jsonRequest({
				name: "Bad Filters",
				filters: "italian",
			}),
		);
		const body = await response.json();

		expect(response.status).toBe(400);
		expect(body.error).toBe("Invalid filters format");
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

	it("returns 400 when name is too long", async () => {
		const response = await POST(jsonRequest({ name: "A".repeat(256) }));
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
