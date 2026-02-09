import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mockSelect = vi.fn();
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase/server", () => ({
	createSupabaseServer: () => ({ from: mockFrom }),
}));

describe("GET /api/restaurants", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns all restaurants", async () => {
		const restaurants = [
			{ id: 1, slug: "test-restaurant", name: "Test Restaurant" },
			{ id: 2, slug: "another-place", name: "Another Place" },
		];
		mockSelect.mockResolvedValue({ data: restaurants, error: null });

		const response = await GET();
		const body = await response.json();

		expect(mockFrom).toHaveBeenCalledWith("restaurants");
		expect(mockSelect).toHaveBeenCalledWith("*");
		expect(response.status).toBe(200);
		expect(body).toEqual(restaurants);
	});

	it("returns empty array when no restaurants exist", async () => {
		mockSelect.mockResolvedValue({ data: [], error: null });

		const response = await GET();
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual([]);
	});

	it("returns 500 on database error", async () => {
		mockSelect.mockResolvedValue({
			data: null,
			error: { message: "connection failed" },
		});

		const response = await GET();
		const body = await response.json();

		expect(response.status).toBe(500);
		expect(body.error).toBeDefined();
	});
});
