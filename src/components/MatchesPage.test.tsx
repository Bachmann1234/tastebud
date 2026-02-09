import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MatchesPage } from "./MatchesPage";

const SESSION_ID = "match-session-123";

vi.mock("next/image", () => ({
	__esModule: true,
	default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
		// biome-ignore lint/performance/noImgElement: test mock for next/image
		<img {...props} alt={props.alt} />
	),
}));

const mockRestaurants = [
	{
		id: 1,
		slug: "pizza-palace",
		name: "Pizza Palace",
		cuisine: ["Italian"],
		neighborhood: "North End",
		address: "123 Main St",
		phone: null,
		website: null,
		detail_url: null,
		image_url: null,
		lunch_price: 25,
		dinner_price: 40,
		brunch_price: null,
		menu: null,
		features: null,
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: 2,
		slug: "sushi-spot",
		name: "Sushi Spot",
		cuisine: ["Japanese"],
		neighborhood: "Back Bay",
		address: "456 Boylston St",
		phone: null,
		website: null,
		detail_url: null,
		image_url: null,
		lunch_price: 22,
		dinner_price: null,
		brunch_price: null,
		menu: null,
		features: null,
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
];

function mockMatchesFetch(options: {
	matches?: {
		restaurant: (typeof mockRestaurants)[number];
		likedBy: string[];
	}[];
	totalRestaurants?: number;
	allMembersComplete?: boolean;
	status?: number;
	networkError?: boolean;
}) {
	const {
		matches = [],
		totalRestaurants = 10,
		allMembersComplete = true,
		status = 200,
		networkError = false,
	} = options;

	return vi.spyOn(global, "fetch").mockImplementation(async () => {
		if (networkError) {
			throw new Error("Network error");
		}
		if (status !== 200) {
			return Response.json({ error: "fail" }, { status });
		}
		return Response.json({ matches, totalRestaurants, allMembersComplete });
	});
}

describe("MatchesPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it("shows loading state initially", () => {
		vi.spyOn(global, "fetch").mockReturnValue(new Promise(() => {}));

		render(<MatchesPage sessionId={SESSION_ID} />);

		expect(screen.getByText("Loading matches...")).toBeInTheDocument();
	});

	it("renders match cards with restaurant names", async () => {
		mockMatchesFetch({
			matches: [
				{ restaurant: mockRestaurants[0], likedBy: ["Alice", "Bob"] },
				{ restaurant: mockRestaurants[1], likedBy: ["Alice", "Bob"] },
			],
		});

		render(<MatchesPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Pizza Palace")).toBeInTheDocument();
		});
		expect(screen.getByText("Sushi Spot")).toBeInTheDocument();
	});

	it("renders likedBy names for each match", async () => {
		mockMatchesFetch({
			matches: [{ restaurant: mockRestaurants[0], likedBy: ["Alice", "Bob"] }],
		});

		render(<MatchesPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Liked by Alice, Bob")).toBeInTheDocument();
		});
	});

	it("shows plural match count heading", async () => {
		mockMatchesFetch({
			matches: [
				{ restaurant: mockRestaurants[0], likedBy: ["Alice"] },
				{ restaurant: mockRestaurants[1], likedBy: ["Alice"] },
			],
		});

		render(<MatchesPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("2 Matches")).toBeInTheDocument();
		});
	});

	it("shows singular match count heading", async () => {
		mockMatchesFetch({
			matches: [{ restaurant: mockRestaurants[0], likedBy: ["Alice"] }],
		});

		render(<MatchesPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("1 Match")).toBeInTheDocument();
		});
	});

	it("shows final empty state when no matches and all complete", async () => {
		mockMatchesFetch({ matches: [], allMembersComplete: true });

		render(<MatchesPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("No Matches")).toBeInTheDocument();
		});
		expect(
			screen.getByText("No restaurants matched — better luck next time!"),
		).toBeInTheDocument();
	});

	it("shows in-progress empty state when no matches and still swiping", async () => {
		mockMatchesFetch({ matches: [], allMembersComplete: false });

		render(<MatchesPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("No Matches Yet")).toBeInTheDocument();
		});
		expect(
			screen.getByText("No matches yet — keep swiping!"),
		).toBeInTheDocument();
	});

	it("shows still-swiping banner when not all members complete", async () => {
		mockMatchesFetch({
			matches: [{ restaurant: mockRestaurants[0], likedBy: ["Alice"] }],
			allMembersComplete: false,
		});

		render(<MatchesPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(
				screen.getByText(
					"Some members are still swiping — matches may change!",
				),
			).toBeInTheDocument();
		});
	});

	it("hides still-swiping banner when all members complete", async () => {
		mockMatchesFetch({
			matches: [{ restaurant: mockRestaurants[0], likedBy: ["Alice"] }],
			allMembersComplete: true,
		});

		render(<MatchesPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("1 Match")).toBeInTheDocument();
		});
		expect(
			screen.queryByText(
				"Some members are still swiping — matches may change!",
			),
		).not.toBeInTheDocument();
	});

	it("shows not-found state on 404", async () => {
		mockMatchesFetch({ status: 404 });

		render(<MatchesPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Session not found")).toBeInTheDocument();
		});
		expect(
			screen.getByText("This session doesn't exist or the link is incorrect."),
		).toBeInTheDocument();
	});

	it("shows expired state on 410", async () => {
		mockMatchesFetch({ status: 410 });

		render(<MatchesPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Session expired")).toBeInTheDocument();
		});
		expect(
			screen.getByText("This session is no longer active."),
		).toBeInTheDocument();
	});

	it("shows error state on 500", async () => {
		mockMatchesFetch({ status: 500 });

		render(<MatchesPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		});
		expect(screen.getByText("Failed to load matches.")).toBeInTheDocument();
	});

	it("shows error state on network failure", async () => {
		mockMatchesFetch({ networkError: true });

		render(<MatchesPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		});
		expect(screen.getByText("Failed to load matches.")).toBeInTheDocument();
	});

	it("retries fetch on Try Again button click", async () => {
		const fetchSpy = mockMatchesFetch({ status: 500 });

		render(<MatchesPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		});

		// Now mock a successful response
		fetchSpy.mockImplementation(async () => {
			return Response.json({
				matches: [{ restaurant: mockRestaurants[0], likedBy: ["Alice"] }],
				totalRestaurants: 10,
				allMembersComplete: true,
			});
		});

		await userEvent.click(screen.getByText("Try Again"));

		await waitFor(() => {
			expect(screen.getByText("Pizza Palace")).toBeInTheDocument();
		});
	});

	it("has Continue Swiping link with correct href", async () => {
		mockMatchesFetch({ matches: [] });

		render(<MatchesPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Continue Swiping")).toBeInTheDocument();
		});

		const link = screen.getByText("Continue Swiping");
		expect(link.closest("a")).toHaveAttribute("href", `/s/${SESSION_ID}/swipe`);
	});

	it("has Back to Session link with correct href", async () => {
		mockMatchesFetch({ matches: [] });

		render(<MatchesPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Back to Session")).toBeInTheDocument();
		});

		const link = screen.getByText("Back to Session");
		expect(link.closest("a")).toHaveAttribute("href", `/s/${SESSION_ID}`);
	});
});
