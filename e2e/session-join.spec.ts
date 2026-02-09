import { expect, test } from "@playwright/test";

const SESSION_ID = "test-session-abc";

const mockSessionResponse = {
	id: SESSION_ID,
	name: "Friday Dinner Crew",
	createdAt: new Date().toISOString(),
	expiresAt: new Date(Date.now() + 86400000).toISOString(),
	members: [
		{
			id: "member-1",
			name: "Alice",
			votesCount: 5,
			totalRestaurants: 50,
			done: false,
		},
		{
			id: "member-2",
			name: "Bob",
			votesCount: 10,
			totalRestaurants: 50,
			done: false,
		},
	],
	totalRestaurants: 50,
	matchCount: 3,
};

function mockSessionRoute(page: import("@playwright/test").Page) {
	return page.route(`**/api/sessions/${SESSION_ID}`, (route) => {
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify(mockSessionResponse),
		});
	});
}

test.describe("Session Join Page", () => {
	test("loads and shows session details", async ({ page }) => {
		await mockSessionRoute(page);
		await page.goto(`/s/${SESSION_ID}`);

		await expect(
			page.getByRole("heading", { name: "Friday Dinner Crew" }),
		).toBeVisible();
		await expect(page.getByText("2 members")).toBeVisible();
		await expect(page.getByText("50 restaurants")).toBeVisible();
	});

	test("join form: enter name and submit shows confirmation", async ({
		page,
	}) => {
		await mockSessionRoute(page);

		// Mock the join endpoint
		await page.route(`**/api/sessions/${SESSION_ID}/join`, (route, request) => {
			if (request.method() === "POST") {
				return route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify({
						memberId: "member-3",
						token: "member-3",
						name: "Charlie",
						sessionId: SESSION_ID,
					}),
				});
			}
			return route.continue();
		});

		// After join, re-fetch returns updated members
		let joinCallCount = 0;
		await page.route(`**/api/sessions/${SESSION_ID}`, (route) => {
			joinCallCount++;
			const members = [
				...mockSessionResponse.members,
				...(joinCallCount > 1
					? [
							{
								id: "member-3",
								name: "Charlie",
								votesCount: 0,
								totalRestaurants: 50,
								done: false,
							},
						]
					: []),
			];
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ ...mockSessionResponse, members }),
			});
		});

		await page.goto(`/s/${SESSION_ID}`);

		await page.getByPlaceholder("Your name").fill("Charlie");
		await page.getByRole("button", { name: "Join Session" }).click();

		await expect(page.getByText("You're in, Charlie!")).toBeVisible();
		await expect(page.getByText("Start Swiping")).toBeVisible();
	});

	test("join form: empty name shows validation error", async ({ page }) => {
		await mockSessionRoute(page);
		await page.goto(`/s/${SESSION_ID}`);

		// Wait for join form to appear
		await expect(
			page.getByRole("button", { name: "Join Session" }),
		).toBeVisible();

		// Submit without entering a name
		await page.getByRole("button", { name: "Join Session" }).click();

		await expect(page.getByText("Name is required")).toBeVisible();
	});

	test("creator banner appears with ?creator=true", async ({ page }) => {
		await mockSessionRoute(page);
		await page.goto(`/s/${SESSION_ID}?creator=true`);

		await expect(
			page.getByText("Session created! Enter your name to join."),
		).toBeVisible();
	});

	test("session not found (404) shows not-found state", async ({ page }) => {
		await page.route(`**/api/sessions/nonexistent`, (route) => {
			return route.fulfill({
				status: 404,
				contentType: "application/json",
				body: JSON.stringify({ error: "Not found" }),
			});
		});

		await page.goto("/s/nonexistent");

		await expect(
			page.getByRole("heading", { name: "Session not found" }),
		).toBeVisible();
		await expect(
			page.getByText("This session doesn't exist or the link is incorrect."),
		).toBeVisible();
		await expect(page.getByRole("link", { name: "Go Home" })).toBeVisible();
	});

	test("session expired (410) shows expired state", async ({ page }) => {
		await page.route(`**/api/sessions/expired-session`, (route) => {
			return route.fulfill({
				status: 410,
				contentType: "application/json",
				body: JSON.stringify({ error: "Session expired" }),
			});
		});

		await page.goto("/s/expired-session");

		await expect(
			page.getByRole("heading", { name: "Session expired" }),
		).toBeVisible();
		await expect(
			page.getByText("This session is no longer active."),
		).toBeVisible();
		await expect(page.getByRole("link", { name: "Go Home" })).toBeVisible();
	});
});
