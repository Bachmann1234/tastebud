import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LandingPage } from "./LandingPage";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

describe("LandingPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.restoreAllMocks();
	});

	it("renders hero content", () => {
		render(<LandingPage />);

		expect(screen.getByText("TasteBud")).toBeInTheDocument();
		expect(
			screen.getByText("Swipe your way through Restaurant Week Boston"),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Start a Session" }),
		).toBeInTheDocument();
	});

	it("renders how-it-works steps", () => {
		render(<LandingPage />);

		expect(screen.getByText("How it works")).toBeInTheDocument();
		expect(screen.getByText("Create")).toBeInTheDocument();
		expect(screen.getByText("Share")).toBeInTheDocument();
		expect(screen.getByText("Swipe")).toBeInTheDocument();
		expect(screen.getByText("Match")).toBeInTheDocument();
	});

	it("submits with custom name", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValueOnce(
			Response.json({ id: "session-123" }, { status: 201 }),
		);

		render(<LandingPage />);

		await user.type(
			screen.getByPlaceholderText("Restaurant Week Session"),
			"Date Night",
		);
		await user.click(screen.getByRole("button", { name: "Start a Session" }));

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith("/api/sessions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Date Night" }),
			});
		});
	});

	it("submits with default name when input is empty", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValueOnce(
			Response.json({ id: "session-123" }, { status: 201 }),
		);

		render(<LandingPage />);

		await user.click(screen.getByRole("button", { name: "Start a Session" }));

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith("/api/sessions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Restaurant Week Session" }),
			});
		});
	});

	it("submits with default name when input is whitespace", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValueOnce(
			Response.json({ id: "session-123" }, { status: 201 }),
		);

		render(<LandingPage />);

		await user.type(
			screen.getByPlaceholderText("Restaurant Week Session"),
			"   ",
		);
		await user.click(screen.getByRole("button", { name: "Start a Session" }));

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith("/api/sessions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: "Restaurant Week Session" }),
			});
		});
	});

	it("redirects on success", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValueOnce(
			Response.json({ id: "session-456" }, { status: 201 }),
		);

		render(<LandingPage />);

		await user.click(screen.getByRole("button", { name: "Start a Session" }));

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledWith("/s/session-456?creator=true");
		});
	});

	it("shows loading state during submission", async () => {
		const user = userEvent.setup();
		let resolveFetch!: (value: Response | PromiseLike<Response>) => void;
		vi.spyOn(global, "fetch").mockReturnValueOnce(
			new Promise<Response>((resolve) => {
				resolveFetch = resolve;
			}),
		);

		render(<LandingPage />);

		await user.click(screen.getByRole("button", { name: "Start a Session" }));

		const button = screen.getByRole("button", { name: "Creating..." });
		expect(button).toBeDisabled();

		resolveFetch(Response.json({ id: "session-123" }, { status: 201 }));

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalled();
		});
	});

	it("shows server error message on API failure", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValueOnce(
			Response.json(
				{ error: "Name must be 255 characters or less" },
				{ status: 400 },
			),
		);

		render(<LandingPage />);

		await user.click(screen.getByRole("button", { name: "Start a Session" }));

		await waitFor(() => {
			expect(
				screen.getByText("Name must be 255 characters or less"),
			).toBeInTheDocument();
		});
	});

	it("shows default error when API returns no error message", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValueOnce(
			Response.json({}, { status: 500 }),
		);

		render(<LandingPage />);

		await user.click(screen.getByRole("button", { name: "Start a Session" }));

		await waitFor(() => {
			expect(
				screen.getByText("Failed to create session. Please try again."),
			).toBeInTheDocument();
		});
	});

	it("shows error message on network failure", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));

		render(<LandingPage />);

		await user.click(screen.getByRole("button", { name: "Start a Session" }));

		await waitFor(() => {
			expect(
				screen.getByText("Failed to create session. Please try again."),
			).toBeInTheDocument();
		});
	});

	it("re-enables form after error", async () => {
		const user = userEvent.setup();
		vi.spyOn(global, "fetch").mockResolvedValueOnce(
			Response.json({ error: "fail" }, { status: 500 }),
		);

		render(<LandingPage />);

		await user.click(screen.getByRole("button", { name: "Start a Session" }));

		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: "Start a Session" }),
			).toBeEnabled();
		});
	});

	it("prevents double submission", async () => {
		const user = userEvent.setup();
		let resolveFetch!: (value: Response | PromiseLike<Response>) => void;
		vi.spyOn(global, "fetch").mockReturnValueOnce(
			new Promise<Response>((resolve) => {
				resolveFetch = resolve;
			}),
		);

		render(<LandingPage />);

		const button = screen.getByRole("button", { name: "Start a Session" });
		await user.click(button);

		// Button is now disabled, so clicking again shouldn't trigger another fetch
		expect(screen.getByRole("button", { name: "Creating..." })).toBeDisabled();
		expect(global.fetch).toHaveBeenCalledTimes(1);

		resolveFetch(Response.json({ id: "session-123" }, { status: 201 }));

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalled();
		});
	});
});
