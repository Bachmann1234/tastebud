import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SwipePage } from "./SwipePage";

const SESSION_ID = "abc-123";
const MEMBER_TOKEN = "member-token-1";
const MEMBER_NAME = "Alice";

// Track swipe callbacks per instance
let tinderCardInstances: {
	onSwipe: (dir: string) => void;
	onCardLeftScreen: () => void;
	swipeFn: (dir: string) => Promise<void>;
}[];

vi.mock("react-tinder-card", () => {
	const { forwardRef, useImperativeHandle, useRef } = require("react");
	return {
		__esModule: true,
		default: forwardRef(function MockTinderCard(
			props: {
				children: React.ReactNode;
				onSwipe?: (dir: string) => void;
				onCardLeftScreen?: () => void;
				preventSwipe?: string[];
				className?: string;
			},
			ref: React.Ref<{ swipe: (dir: string) => Promise<void> }>,
		) {
			const onSwipeRef = useRef(props.onSwipe);
			const onCardLeftScreenRef = useRef(props.onCardLeftScreen);
			onSwipeRef.current = props.onSwipe;
			onCardLeftScreenRef.current = props.onCardLeftScreen;

			const swipeFn = async (dir: string) => {
				onSwipeRef.current?.(dir);
			};

			useImperativeHandle(ref, () => ({ swipe: swipeFn }));

			const instance = {
				onSwipe: (dir: string) => onSwipeRef.current?.(dir),
				onCardLeftScreen: () => onCardLeftScreenRef.current?.(),
				swipeFn,
			};
			tinderCardInstances.push(instance);

			return <div data-testid="tinder-card">{props.children}</div>;
		}),
	};
});

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: mockReplace }),
}));

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
		slug: "restaurant-a",
		name: "Restaurant A",
		cuisine: ["Italian"],
		neighborhood: "Back Bay",
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
		slug: "restaurant-b",
		name: "Restaurant B",
		cuisine: ["Japanese"],
		neighborhood: "Seaport",
		address: "456 Harbor Blvd",
		phone: null,
		website: null,
		detail_url: null,
		image_url: null,
		lunch_price: 30,
		dinner_price: null,
		brunch_price: null,
		menu: null,
		features: null,
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
	{
		id: 3,
		slug: "restaurant-c",
		name: "Restaurant C",
		cuisine: ["Mexican"],
		neighborhood: "South End",
		address: "789 Elm St",
		phone: null,
		website: null,
		detail_url: null,
		image_url: null,
		lunch_price: null,
		dinner_price: 35,
		brunch_price: null,
		menu: null,
		features: null,
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
	},
];

function createMockStorage(): Storage {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
		get length() {
			return Object.keys(store).length;
		},
		key: (index: number) => Object.keys(store)[index] ?? null,
	};
}

function setupStorage(token = MEMBER_TOKEN, name = MEMBER_NAME) {
	localStorage.setItem(`tastebud_${SESSION_ID}_token`, token);
	localStorage.setItem(`tastebud_${SESSION_ID}_name`, name);
}

function mockFetchFor(options: {
	restaurants?: typeof mockRestaurants;
	votedIds?: number[];
	restaurantsStatus?: number;
	votesStatus?: number;
}) {
	const {
		restaurants = mockRestaurants,
		votedIds = [],
		restaurantsStatus = 200,
		votesStatus = 200,
	} = options;

	return vi.spyOn(global, "fetch").mockImplementation(async (input) => {
		const url = typeof input === "string" ? input : (input as Request).url;

		if (
			url.includes("/restaurants") &&
			!url.includes("/my-votes") &&
			!url.includes("/vote")
		) {
			if (restaurantsStatus !== 200) {
				return Response.json({ error: "fail" }, { status: restaurantsStatus });
			}
			return Response.json(restaurants);
		}

		if (url.includes("/my-votes")) {
			if (votesStatus !== 200) {
				return Response.json({ error: "fail" }, { status: votesStatus });
			}
			return Response.json({ votedRestaurantIds: votedIds });
		}

		if (url.includes("/vote")) {
			return Response.json(
				{ id: 1, restaurantId: 1, vote: true },
				{ status: 201 },
			);
		}

		return Response.json({});
	});
}

describe("SwipePage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
		tinderCardInstances = [];
		Object.defineProperty(window, "localStorage", {
			value: createMockStorage(),
			writable: true,
		});
	});

	it("redirects when no token in localStorage", async () => {
		mockFetchFor({});

		render(<SwipePage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(mockReplace).toHaveBeenCalledWith(`/s/${SESSION_ID}`);
		});
	});

	it("shows loading state initially", () => {
		setupStorage();
		vi.spyOn(global, "fetch").mockReturnValue(new Promise(() => {}));

		render(<SwipePage sessionId={SESSION_ID} />);

		expect(screen.getByText("Loading restaurants...")).toBeInTheDocument();
	});

	it("renders restaurant cards after loading", async () => {
		setupStorage();
		mockFetchFor({});

		render(<SwipePage sessionId={SESSION_ID} />);

		// Only the current card (top of shuffled stack) is rendered
		await waitFor(() => {
			const cards = [
				screen.queryByText("Restaurant A"),
				screen.queryByText("Restaurant B"),
				screen.queryByText("Restaurant C"),
			].filter(Boolean);
			expect(cards.length).toBe(1);
		});
	});

	it("filters already-voted restaurants", async () => {
		setupStorage();
		mockFetchFor({ votedIds: [1, 2] });

		render(<SwipePage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Restaurant C")).toBeInTheDocument();
		});
		expect(screen.queryByText("Restaurant A")).not.toBeInTheDocument();
		expect(screen.queryByText("Restaurant B")).not.toBeInTheDocument();
	});

	it("shows done state when all restaurants already voted", async () => {
		setupStorage();
		mockFetchFor({ votedIds: [1, 2, 3] });

		render(<SwipePage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("All done!")).toBeInTheDocument();
		});
		expect(
			screen.getByText("You've voted on all 3 restaurants."),
		).toBeInTheDocument();
		expect(screen.getByText("Back to Session")).toBeInTheDocument();
	});

	it("displays progress bar with correct counts", async () => {
		setupStorage();
		mockFetchFor({ votedIds: [1] });

		render(<SwipePage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("1 / 3")).toBeInTheDocument();
		});
		expect(screen.getByText("Alice")).toBeInTheDocument();
	});

	it("submits like vote on right swipe", async () => {
		setupStorage();
		const fetchSpy = mockFetchFor({});

		render(<SwipePage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getAllByTestId("tinder-card").length).toBeGreaterThan(0);
		});

		// Find the top card's TinderCard instance (last one rendered = top of stack)
		const topInstance = tinderCardInstances[tinderCardInstances.length - 1];
		act(() => {
			topInstance.onSwipe("right");
		});

		await waitFor(() => {
			const voteCalls = fetchSpy.mock.calls.filter((call) =>
				String(call[0]).includes("/vote"),
			);
			expect(voteCalls.length).toBeGreaterThan(0);
			const voteCallInit = voteCalls[0][1] as RequestInit;
			const body = JSON.parse(voteCallInit.body as string);
			expect(body.vote).toBe(true);
		});
	});

	it("submits nope vote on left swipe", async () => {
		setupStorage();
		const fetchSpy = mockFetchFor({});

		render(<SwipePage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getAllByTestId("tinder-card").length).toBeGreaterThan(0);
		});

		const topInstance = tinderCardInstances[tinderCardInstances.length - 1];
		act(() => {
			topInstance.onSwipe("left");
		});

		await waitFor(() => {
			const voteCalls = fetchSpy.mock.calls.filter((call) =>
				String(call[0]).includes("/vote"),
			);
			expect(voteCalls.length).toBeGreaterThan(0);
			const voteCallInit = voteCalls[0][1] as RequestInit;
			const body = JSON.parse(voteCallInit.body as string);
			expect(body.vote).toBe(false);
		});
	});

	it("updates progress after swiping", async () => {
		setupStorage();
		mockFetchFor({});

		render(<SwipePage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("0 / 3")).toBeInTheDocument();
		});

		// Swipe the top card
		const topInstance = tinderCardInstances[tinderCardInstances.length - 1];
		act(() => {
			topInstance.onSwipe("right");
		});

		await waitFor(() => {
			expect(screen.getByText("1 / 3")).toBeInTheDocument();
		});
	});

	it("shows done state after swiping all cards", async () => {
		setupStorage();
		// Only 1 remaining restaurant
		mockFetchFor({ votedIds: [1, 2] });

		render(<SwipePage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Restaurant C")).toBeInTheDocument();
		});

		// Simulate swipe then card leaving screen in separate acts
		const topInstance = tinderCardInstances[tinderCardInstances.length - 1];
		act(() => {
			topInstance.onSwipe("right");
		});

		act(() => {
			topInstance.onCardLeftScreen();
		});

		await waitFor(() => {
			expect(screen.getByText("All done!")).toBeInTheDocument();
		});
	});

	it("nope and like buttons are present and enabled during swiping", async () => {
		setupStorage();
		mockFetchFor({});

		render(<SwipePage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getAllByTestId("tinder-card").length).toBeGreaterThan(0);
		});

		const nopeButton = screen.getByRole("button", { name: "Nope" });
		const likeButton = screen.getByRole("button", { name: "Like" });
		expect(nopeButton).toBeEnabled();
		expect(likeButton).toBeEnabled();
	});

	it("shows error state on restaurant fetch failure", async () => {
		setupStorage();
		mockFetchFor({ restaurantsStatus: 500 });

		render(<SwipePage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		});
		expect(screen.getByText("Failed to load restaurants.")).toBeInTheDocument();
	});

	it("redirects on 401 from my-votes", async () => {
		setupStorage();
		mockFetchFor({ votesStatus: 401 });

		render(<SwipePage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(mockReplace).toHaveBeenCalledWith(`/s/${SESSION_ID}`);
		});
	});

	it("shows error state on network failure", async () => {
		setupStorage();
		vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

		render(<SwipePage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		});
	});

	it("has Matches link in swipe header", async () => {
		setupStorage();
		mockFetchFor({});

		render(<SwipePage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getAllByTestId("tinder-card").length).toBeGreaterThan(0);
		});

		const matchesLink = screen.getByRole("link", { name: /Matches/i });
		expect(matchesLink).toHaveAttribute("href", `/s/${SESSION_ID}/matches`);
	});

	it("has View Matches and Back to Session links on done screen", async () => {
		setupStorage();
		mockFetchFor({ votedIds: [1, 2, 3] });

		render(<SwipePage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("View Matches")).toBeInTheDocument();
		});

		const matchesLink = screen.getByText("View Matches");
		expect(matchesLink.closest("a")).toHaveAttribute(
			"href",
			`/s/${SESSION_ID}/matches`,
		);

		const sessionLink = screen.getByText("Back to Session");
		expect(sessionLink.closest("a")).toHaveAttribute(
			"href",
			`/s/${SESSION_ID}`,
		);
	});
});
