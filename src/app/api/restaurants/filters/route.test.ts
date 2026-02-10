import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mockSelect = vi.fn();
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase/server", () => ({
	createSupabaseServer: () => ({ from: mockFrom }),
}));

describe("GET /api/restaurants/filters", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns sorted, deduplicated cuisines and neighborhoods", async () => {
		mockSelect.mockResolvedValue({
			data: [
				{ cuisine: ["Italian", "Pizza"], neighborhood: "Back Bay" },
				{ cuisine: ["Japanese"], neighborhood: "Seaport" },
				{ cuisine: ["Italian"], neighborhood: "Back Bay" },
				{ cuisine: ["Mexican"], neighborhood: "South End" },
			],
			error: null,
		});

		const response = await GET();
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.cuisines).toEqual(["Italian", "Japanese", "Mexican", "Pizza"]);
		expect(body.neighborhoods).toEqual(["Back Bay", "Seaport", "South End"]);
	});

	it("handles restaurants with null cuisine and neighborhood", async () => {
		mockSelect.mockResolvedValue({
			data: [
				{ cuisine: null, neighborhood: null },
				{ cuisine: ["Italian"], neighborhood: "Back Bay" },
			],
			error: null,
		});

		const response = await GET();
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.cuisines).toEqual(["Italian"]);
		expect(body.neighborhoods).toEqual(["Back Bay"]);
	});

	it("returns empty arrays when no restaurants exist", async () => {
		mockSelect.mockResolvedValue({ data: [], error: null });

		const response = await GET();
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.cuisines).toEqual([]);
		expect(body.neighborhoods).toEqual([]);
	});

	it("returns 500 on database error", async () => {
		mockSelect.mockResolvedValue({
			data: null,
			error: { message: "db error" },
		});

		const response = await GET();
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body.error).toBeDefined();
	});
});
