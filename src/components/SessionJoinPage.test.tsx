import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SessionJoinPage } from "./SessionJoinPage";

let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
	useSearchParams: () => mockSearchParams,
}));

const SESSION_ID = "abc-123";

const mockSession = {
	id: SESSION_ID,
	name: "Date Night",
	createdAt: "2025-01-01T00:00:00Z",
	expiresAt: "2025-12-31T23:59:59Z",
	members: [
		{
			id: "m1",
			name: "Alice",
			votesCount: 0,
			totalRestaurants: 10,
			done: false,
		},
		{ id: "m2", name: "Bob", votesCount: 5, totalRestaurants: 10, done: false },
	],
	totalRestaurants: 10,
	matchCount: 0,
};

function mockSessionResponse(overrides = {}) {
	return Response.json({ ...mockSession, ...overrides });
}

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

describe("SessionJoinPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
		mockSearchParams = new URLSearchParams();
		Object.defineProperty(window, "localStorage", {
			value: createMockStorage(),
			writable: true,
		});
	});

	it("shows loading state on mount", () => {
		vi.spyOn(global, "fetch").mockReturnValueOnce(new Promise(() => {}));

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		expect(screen.getByText("Loading session...")).toBeInTheDocument();
	});

	it("shows join form after session loads", async () => {
		vi.spyOn(global, "fetch").mockResolvedValueOnce(mockSessionResponse());

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Date Night")).toBeInTheDocument();
		});
		expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Join Session" }),
		).toBeInTheDocument();
	});

	it("displays member count and restaurant count", async () => {
		vi.spyOn(global, "fetch").mockResolvedValueOnce(mockSessionResponse());

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("2 members")).toBeInTheDocument();
		});
		expect(screen.getByText("10 restaurants")).toBeInTheDocument();
	});

	it("uses singular form for 1 member", async () => {
		vi.spyOn(global, "fetch").mockResolvedValueOnce(
			mockSessionResponse({
				members: [
					{
						id: "m1",
						name: "Alice",
						votesCount: 0,
						totalRestaurants: 10,
						done: false,
					},
				],
			}),
		);

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("1 member")).toBeInTheDocument();
		});
	});

	it("shows not-found state on 404", async () => {
		vi.spyOn(global, "fetch").mockResolvedValueOnce(
			Response.json({ error: "Session not found" }, { status: 404 }),
		);

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Session not found")).toBeInTheDocument();
		});
		expect(screen.getByText("Go Home")).toBeInTheDocument();
	});

	it("shows expired state on 410", async () => {
		vi.spyOn(global, "fetch").mockResolvedValueOnce(
			Response.json({ error: "Session has expired" }, { status: 410 }),
		);

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Session expired")).toBeInTheDocument();
		});
		expect(screen.getByText("Go Home")).toBeInTheDocument();
	});

	it("shows error state on network failure", async () => {
		vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		});
		expect(screen.getByText("Try Again")).toBeInTheDocument();
	});

	it("shows error state on server error", async () => {
		vi.spyOn(global, "fetch").mockResolvedValueOnce(
			Response.json({}, { status: 500 }),
		);

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		});
	});

	it("retries on error", async () => {
		const user = userEvent.setup();
		const fetchSpy = vi.spyOn(global, "fetch");

		fetchSpy.mockRejectedValueOnce(new Error("Network error"));

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Try Again")).toBeInTheDocument();
		});

		fetchSpy.mockResolvedValueOnce(mockSessionResponse());

		await user.click(screen.getByText("Try Again"));

		await waitFor(() => {
			expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
		});
	});

	it("shows client-side error for empty name", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValueOnce(mockSessionResponse());

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "Join Session" }),
			).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Join Session" }));

		expect(screen.getByText("Name is required")).toBeInTheDocument();
		// Should not have called the join API
		expect(global.fetch).toHaveBeenCalledTimes(1); // Only the session fetch
	});

	it("clears name error when typing", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValueOnce(mockSessionResponse());

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "Join Session" }),
			).toBeInTheDocument();
		});

		await user.click(screen.getByRole("button", { name: "Join Session" }));
		expect(screen.getByText("Name is required")).toBeInTheDocument();

		await user.type(screen.getByPlaceholderText("Your name"), "A");
		expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
	});

	it("submits join form and shows confirmation", async () => {
		const user = userEvent.setup();
		const fetchSpy = vi.spyOn(global, "fetch");

		// Initial session load
		fetchSpy.mockResolvedValueOnce(mockSessionResponse());

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
		});

		// Join API response
		fetchSpy.mockResolvedValueOnce(
			Response.json(
				{ memberId: "m3", token: "m3", name: "Charlie", sessionId: SESSION_ID },
				{ status: 201 },
			),
		);

		// Re-fetch session after join
		fetchSpy.mockResolvedValueOnce(
			mockSessionResponse({
				members: [
					...mockSession.members,
					{
						id: "m3",
						name: "Charlie",
						votesCount: 0,
						totalRestaurants: 10,
						done: false,
					},
				],
			}),
		);

		await user.type(screen.getByPlaceholderText("Your name"), "Charlie");
		await user.click(screen.getByRole("button", { name: "Join Session" }));

		await waitFor(() => {
			expect(screen.getByText("You're in, Charlie!")).toBeInTheDocument();
		});

		// Verify join API was called correctly
		expect(fetchSpy).toHaveBeenCalledWith(`/api/sessions/${SESSION_ID}/join`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "Charlie" }),
		});
	});

	it("shows joining disabled state during submission", async () => {
		const user = userEvent.setup();
		const fetchSpy = vi.spyOn(global, "fetch");

		fetchSpy.mockResolvedValueOnce(mockSessionResponse());

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
		});

		let resolveJoin!: (value: Response | PromiseLike<Response>) => void;
		fetchSpy.mockReturnValueOnce(
			new Promise<Response>((resolve) => {
				resolveJoin = resolve;
			}),
		);

		await user.type(screen.getByPlaceholderText("Your name"), "Charlie");
		await user.click(screen.getByRole("button", { name: "Join Session" }));

		const button = screen.getByRole("button", { name: "Joining..." });
		expect(button).toBeDisabled();

		// Resolve with join response
		resolveJoin(
			Response.json(
				{ memberId: "m3", token: "m3", name: "Charlie", sessionId: SESSION_ID },
				{ status: 201 },
			),
		);

		// Re-fetch session
		fetchSpy.mockResolvedValueOnce(
			mockSessionResponse({
				members: [
					...mockSession.members,
					{
						id: "m3",
						name: "Charlie",
						votesCount: 0,
						totalRestaurants: 10,
						done: false,
					},
				],
			}),
		);

		await waitFor(() => {
			expect(screen.getByText("You're in, Charlie!")).toBeInTheDocument();
		});
	});

	it("writes token and name to localStorage on join", async () => {
		const user = userEvent.setup();
		const fetchSpy = vi.spyOn(global, "fetch");

		fetchSpy.mockResolvedValueOnce(mockSessionResponse());

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
		});

		fetchSpy.mockResolvedValueOnce(
			Response.json(
				{ memberId: "m3", token: "m3", name: "Charlie", sessionId: SESSION_ID },
				{ status: 201 },
			),
		);
		fetchSpy.mockResolvedValueOnce(
			mockSessionResponse({
				members: [
					...mockSession.members,
					{
						id: "m3",
						name: "Charlie",
						votesCount: 0,
						totalRestaurants: 10,
						done: false,
					},
				],
			}),
		);

		await user.type(screen.getByPlaceholderText("Your name"), "Charlie");
		await user.click(screen.getByRole("button", { name: "Join Session" }));

		await waitFor(() => {
			expect(screen.getByText("You're in, Charlie!")).toBeInTheDocument();
		});

		expect(localStorage.getItem(`tastebud_${SESSION_ID}_token`)).toBe("m3");
		expect(localStorage.getItem(`tastebud_${SESSION_ID}_name`)).toBe("Charlie");
	});

	it("auto-rejoins with valid token in localStorage", async () => {
		localStorage.setItem(`tastebud_${SESSION_ID}_token`, "m1");
		localStorage.setItem(`tastebud_${SESSION_ID}_name`, "Alice");

		vi.spyOn(global, "fetch").mockResolvedValueOnce(mockSessionResponse());

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("You're in, Alice!")).toBeInTheDocument();
		});
	});

	it("shows join form when stored token does not match any member", async () => {
		localStorage.setItem(`tastebud_${SESSION_ID}_token`, "invalid-token");
		localStorage.setItem(`tastebud_${SESSION_ID}_name`, "Nobody");

		vi.spyOn(global, "fetch").mockResolvedValueOnce(mockSessionResponse());

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
		});

		// localStorage should be cleared
		expect(localStorage.getItem(`tastebud_${SESSION_ID}_token`)).toBeNull();
	});

	it("shows creator banner with ?creator=true", async () => {
		mockSearchParams = new URLSearchParams("creator=true");
		vi.spyOn(global, "fetch").mockResolvedValueOnce(mockSessionResponse());

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(
				screen.getByText("Session created! Enter your name to join."),
			).toBeInTheDocument();
		});
	});

	it("does not show creator banner without query param", async () => {
		vi.spyOn(global, "fetch").mockResolvedValueOnce(mockSessionResponse());

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
		});

		expect(
			screen.queryByText("Session created! Enter your name to join."),
		).not.toBeInTheDocument();
	});

	it("shows member list in joined state", async () => {
		localStorage.setItem(`tastebud_${SESSION_ID}_token`, "m1");
		localStorage.setItem(`tastebud_${SESSION_ID}_name`, "Alice");

		vi.spyOn(global, "fetch").mockResolvedValueOnce(mockSessionResponse());

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("You're in, Alice!")).toBeInTheDocument();
		});

		expect(screen.getByText("Alice")).toBeInTheDocument();
		expect(screen.getByText("Bob")).toBeInTheDocument();
		expect(screen.getByText("Members (2)")).toBeInTheDocument();
	});

	it("copies link to clipboard", async () => {
		const user = userEvent.setup();
		localStorage.setItem(`tastebud_${SESSION_ID}_token`, "m1");
		localStorage.setItem(`tastebud_${SESSION_ID}_name`, "Alice");

		const writeTextMock = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText: writeTextMock },
			writable: true,
			configurable: true,
		});

		vi.spyOn(global, "fetch").mockResolvedValueOnce(mockSessionResponse());

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Copy Link")).toBeInTheDocument();
		});

		await user.click(screen.getByText("Copy Link"));

		expect(writeTextMock).toHaveBeenCalledWith(window.location.href);
		expect(screen.getByText("Copied!")).toBeInTheDocument();
	});

	it("shows swiping coming soon placeholder", async () => {
		localStorage.setItem(`tastebud_${SESSION_ID}_token`, "m1");
		localStorage.setItem(`tastebud_${SESSION_ID}_name`, "Alice");

		vi.spyOn(global, "fetch").mockResolvedValueOnce(mockSessionResponse());

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("Swiping coming soon...")).toBeInTheDocument();
		});
	});

	it("shows error when join API fails", async () => {
		const user = userEvent.setup();
		const fetchSpy = vi.spyOn(global, "fetch");

		fetchSpy.mockResolvedValueOnce(mockSessionResponse());

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
		});

		fetchSpy.mockResolvedValueOnce(
			Response.json({ error: "Failed to join session" }, { status: 500 }),
		);

		await user.type(screen.getByPlaceholderText("Your name"), "Charlie");
		await user.click(screen.getByRole("button", { name: "Join Session" }));

		await waitFor(() => {
			expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		});
	});

	it("shows session name as fallback title", async () => {
		vi.spyOn(global, "fetch").mockResolvedValueOnce(
			mockSessionResponse({ name: null }),
		);

		render(<SessionJoinPage sessionId={SESSION_ID} />);

		await waitFor(() => {
			expect(screen.getByText("TasteBud Session")).toBeInTheDocument();
		});
	});
});
