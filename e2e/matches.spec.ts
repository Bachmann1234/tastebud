import { expect, test } from "@playwright/test";

const SESSION_ID = "matches-session-123";

const mockMatches = [
	{
		restaurant: {
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
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		},
		likedBy: ["Alice", "Bob"],
	},
	{
		restaurant: {
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
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		},
		likedBy: ["Alice", "Bob"],
	},
];

function setupMatchesMock(
	page: import("@playwright/test").Page,
	options?: {
		matches?: typeof mockMatches;
		allMembersComplete?: boolean;
		status?: number;
	},
) {
	const {
		matches = mockMatches,
		allMembersComplete = true,
		status = 200,
	} = options ?? {};

	return page.route(`**/api/sessions/${SESSION_ID}/matches`, (route) => {
		if (status !== 200) {
			return route.fulfill({
				status,
				contentType: "application/json",
				body: JSON.stringify({ error: "fail" }),
			});
		}
		return route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				matches,
				totalRestaurants: 10,
				allMembersComplete,
			}),
		});
	});
}

test.describe("Matches Page", () => {
	test("shows match count and restaurant names", async ({ page }) => {
		await setupMatchesMock(page);

		await page.goto(`/s/${SESSION_ID}/matches`);

		await expect(
			page.getByRole("heading", { name: "2 Matches" }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Pizza Palace" }),
		).toBeVisible();
		await expect(
			page.getByRole("heading", { name: "Sushi Spot" }),
		).toBeVisible();
	});

	test("shows likedBy info for each match", async ({ page }) => {
		await setupMatchesMock(page);

		await page.goto(`/s/${SESSION_ID}/matches`);

		await expect(page.getByText("Liked by Alice, Bob").first()).toBeVisible();
	});

	test("shows empty state when no matches", async ({ page }) => {
		await setupMatchesMock(page, { matches: [] });

		await page.goto(`/s/${SESSION_ID}/matches`);

		await expect(
			page.getByRole("heading", { name: "No Matches Yet" }),
		).toBeVisible();
		await expect(
			page.getByText("No matches yet — keep swiping!"),
		).toBeVisible();
	});

	test("shows still-swiping banner when not all members complete", async ({
		page,
	}) => {
		await setupMatchesMock(page, { allMembersComplete: false });

		await page.goto(`/s/${SESSION_ID}/matches`);

		await expect(
			page.getByText("Some members are still swiping — matches may change!"),
		).toBeVisible();
	});

	test("hides still-swiping banner when all members complete", async ({
		page,
	}) => {
		await setupMatchesMock(page, { allMembersComplete: true });

		await page.goto(`/s/${SESSION_ID}/matches`);

		await expect(
			page.getByRole("heading", { name: "2 Matches" }),
		).toBeVisible();
		await expect(
			page.getByText("Some members are still swiping — matches may change!"),
		).not.toBeVisible();
	});

	test("has navigation links with correct hrefs", async ({ page }) => {
		await setupMatchesMock(page);

		await page.goto(`/s/${SESSION_ID}/matches`);

		const continueLink = page.getByRole("link", { name: "Continue Swiping" });
		await expect(continueLink).toBeVisible();
		await expect(continueLink).toHaveAttribute(
			"href",
			`/s/${SESSION_ID}/swipe`,
		);

		const sessionLink = page.getByRole("link", { name: "Back to Session" });
		await expect(sessionLink).toBeVisible();
		await expect(sessionLink).toHaveAttribute("href", `/s/${SESSION_ID}`);
	});

	test("shows not-found state on 404", async ({ page }) => {
		await setupMatchesMock(page, { status: 404 });

		await page.goto(`/s/${SESSION_ID}/matches`);

		await expect(
			page.getByRole("heading", { name: "Session not found" }),
		).toBeVisible();
	});

	test("shows expired state on 410", async ({ page }) => {
		await setupMatchesMock(page, { status: 410 });

		await page.goto(`/s/${SESSION_ID}/matches`);

		await expect(
			page.getByRole("heading", { name: "Session expired" }),
		).toBeVisible();
	});
});
