import { expect, test } from "@playwright/test";

test.describe("Landing Page", () => {
	test("renders hero, how-it-works, and session form", async ({ page }) => {
		await page.goto("/");

		await expect(page).toHaveTitle(/TasteBud/i);
		await expect(page.getByRole("heading", { name: "TasteBud" })).toBeVisible();
		await expect(
			page.getByText("Swipe your way through Restaurant Week Boston"),
		).toBeVisible();

		// How it works section
		await expect(page.getByText("How it works")).toBeVisible();
		for (const step of ["Create", "Share", "Swipe", "Match"]) {
			await expect(page.getByText(step, { exact: true })).toBeVisible();
		}

		// Session form
		await expect(
			page.getByPlaceholder("Restaurant Week Session"),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Start a Session" }),
		).toBeVisible();
	});

	test("successful session creation redirects to session page", async ({
		page,
	}) => {
		const sessionId = "abc-123";

		await page.route("**/api/sessions", (route, request) => {
			if (request.method() === "POST") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						id: sessionId,
						name: "My Session",
						shareUrl: `/s/${sessionId}`,
					}),
				});
			}
			return route.continue();
		});

		// Mock the session detail endpoint that the join page will call
		await page.route(`**/api/sessions/${sessionId}`, (route) => {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					id: sessionId,
					name: "My Session",
					createdAt: new Date().toISOString(),
					expiresAt: new Date(Date.now() + 86400000).toISOString(),
					members: [],
					totalRestaurants: 50,
					matchCount: 0,
				}),
			});
		});

		await page.goto("/");
		await page.getByPlaceholder("Restaurant Week Session").fill("My Session");
		await page.getByRole("button", { name: "Start a Session" }).click();

		await page.waitForURL(`**/s/${sessionId}?creator=true`);
		await expect(page).toHaveURL(`/s/${sessionId}?creator=true`);
	});

	test("shows error message when API fails", async ({ page }) => {
		await page.route("**/api/sessions", (route, request) => {
			if (request.method() === "POST") {
				return route.fulfill({
					status: 500,
					contentType: "application/json",
					body: JSON.stringify({ error: "Internal server error" }),
				});
			}
			return route.continue();
		});

		await page.goto("/");
		await page.getByRole("button", { name: "Start a Session" }).click();

		await expect(page.getByText("Internal server error")).toBeVisible();
	});

	test("shows default error when API returns non-JSON error", async ({
		page,
	}) => {
		await page.route("**/api/sessions", (route, request) => {
			if (request.method() === "POST") {
				return route.fulfill({
					status: 500,
					contentType: "text/plain",
					body: "Server Error",
				});
			}
			return route.continue();
		});

		await page.goto("/");
		await page.getByRole("button", { name: "Start a Session" }).click();

		await expect(
			page.getByText("Failed to create session. Please try again."),
		).toBeVisible();
	});

	test("submitting with empty name sends default session name", async ({
		page,
	}) => {
		let capturedBody: { name: string } | null = null;

		await page.route("**/api/sessions", (route, request) => {
			if (request.method() === "POST") {
				capturedBody = JSON.parse(request.postData() ?? "{}");
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						id: "test-id",
						name: "Restaurant Week Session",
						shareUrl: "/s/test-id",
					}),
				});
			}
			return route.continue();
		});

		// Mock session detail for redirect target
		await page.route("**/api/sessions/test-id", (route) => {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					id: "test-id",
					name: "Restaurant Week Session",
					createdAt: new Date().toISOString(),
					expiresAt: new Date(Date.now() + 86400000).toISOString(),
					members: [],
					totalRestaurants: 50,
					matchCount: 0,
				}),
			});
		});

		await page.goto("/");
		// Leave input empty, just click submit
		await page.getByRole("button", { name: "Start a Session" }).click();

		await page.waitForURL("**/s/test-id?creator=true");
		expect(capturedBody).not.toBeNull();
		expect(capturedBody?.name).toBe("Restaurant Week Session");
	});
});
