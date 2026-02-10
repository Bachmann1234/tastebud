import { describe, expect, it, vi } from "vitest";
import { applySessionFilters } from "./filters";

function makeMockQuery() {
	const calls: { method: string; args: unknown[] }[] = [];

	const query = {
		overlaps: vi.fn((...args: unknown[]) => {
			calls.push({ method: "overlaps", args });
			return query;
		}),
		in: vi.fn((...args: unknown[]) => {
			calls.push({ method: "in", args });
			return query;
		}),
		_calls: calls,
	};
	return query;
}

describe("applySessionFilters", () => {
	it("returns query unchanged when filters is null", () => {
		const query = makeMockQuery();
		const result = applySessionFilters(query, null);

		expect(result).toBe(query);
		expect(query.overlaps).not.toHaveBeenCalled();
		expect(query.in).not.toHaveBeenCalled();
	});

	it("returns query unchanged when filters has empty arrays", () => {
		const query = makeMockQuery();
		const result = applySessionFilters(query, {
			cuisines: [],
			neighborhoods: [],
		});

		expect(result).toBe(query);
		expect(query.overlaps).not.toHaveBeenCalled();
		expect(query.in).not.toHaveBeenCalled();
	});

	it("applies overlaps for cuisines", () => {
		const query = makeMockQuery();
		applySessionFilters(query, { cuisines: ["Italian", "Japanese"] });

		expect(query.overlaps).toHaveBeenCalledWith("cuisine", [
			"Italian",
			"Japanese",
		]);
		expect(query.in).not.toHaveBeenCalled();
	});

	it("applies in for neighborhoods", () => {
		const query = makeMockQuery();
		applySessionFilters(query, { neighborhoods: ["Back Bay", "Seaport"] });

		expect(query.overlaps).not.toHaveBeenCalled();
		expect(query.in).toHaveBeenCalledWith("neighborhood", [
			"Back Bay",
			"Seaport",
		]);
	});

	it("applies both cuisine and neighborhood filters", () => {
		const query = makeMockQuery();
		applySessionFilters(query, {
			cuisines: ["Italian"],
			neighborhoods: ["Back Bay"],
		});

		expect(query.overlaps).toHaveBeenCalledWith("cuisine", ["Italian"]);
		expect(query.in).toHaveBeenCalledWith("neighborhood", ["Back Bay"]);
	});

	it("skips cuisines when undefined", () => {
		const query = makeMockQuery();
		applySessionFilters(query, { neighborhoods: ["Seaport"] });

		expect(query.overlaps).not.toHaveBeenCalled();
		expect(query.in).toHaveBeenCalledWith("neighborhood", ["Seaport"]);
	});

	it("skips neighborhoods when undefined", () => {
		const query = makeMockQuery();
		applySessionFilters(query, { cuisines: ["Mexican"] });

		expect(query.overlaps).toHaveBeenCalledWith("cuisine", ["Mexican"]);
		expect(query.in).not.toHaveBeenCalled();
	});
});
