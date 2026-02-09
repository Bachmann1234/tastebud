import { expect, test } from "@playwright/test";

const SESSION_ID = "swipe-session-123";
const MEMBER_TOKEN = "member-token-abc";
const MEMBER_NAME = "Alice";

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
		menu: {
			menus: [
				{
					meal_type: "dinner",
					price: 40,
					courses: [
						{ name: "Appetizer", options: ["Bruschetta", "Caesar Salad"] },
						{
							name: "Entree",
							options: ["Margherita Pizza", "Pasta Carbonara"],
						},
					],
				},
			],
		},
		features: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
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
		dinner_price: 38,
		brunch_price: null,
		menu: null,
		features: null,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	},
];

function setupSwipeMocks(page: import("@playwright/test").Page) {
	return Promise.all([
		page.route("**/api/restaurants", (route) => {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockRestaurants),
			});
		}),
		page.route(`**/api/sessions/${SESSION_ID}/my-votes`, (route) => {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ votedRestaurantIds: [] }),
			});
		}),
		page.route(`**/api/sessions/${SESSION_ID}/vote`, (route) => {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ id: 1, restaurantId: 1, vote: true }),
			});
		}),
	]);
}

function setMemberStorage(page: import("@playwright/test").Page) {
	return page.addInitScript(
		({ sessionId, token, name }) => {
			localStorage.setItem(`tastebud_${sessionId}_token`, token);
			localStorage.setItem(`tastebud_${sessionId}_name`, name);
		},
		{ sessionId: SESSION_ID, token: MEMBER_TOKEN, name: MEMBER_NAME },
	);
}

test.describe("Swipe Page", () => {
	test("loads and shows restaurant cards with progress bar", async ({
		page,
	}) => {
		await setMemberStorage(page);
		await setupSwipeMocks(page);

		await page.goto(`/s/${SESSION_ID}/swipe`);

		// Progress bar visible
		await expect(page.getByText("Alice")).toBeVisible();
		await expect(page.getByText("0 / 2")).toBeVisible();

		// Only one restaurant card is rendered at a time (order is shuffled)
		const card1 = page.getByRole("heading", { name: "Pizza Palace" });
		const card2 = page.getByRole("heading", { name: "Sushi Spot" });
		await expect(card1.or(card2)).toBeVisible();
		expect((await card1.count()) + (await card2.count())).toBe(1);

		// Action buttons
		await expect(page.getByRole("button", { name: "Like" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Nope" })).toBeVisible();
	});

	test("clicking Like advances to next restaurant", async ({ page }) => {
		await setMemberStorage(page);
		await setupSwipeMocks(page);

		await page.goto(`/s/${SESSION_ID}/swipe`);

		await expect(page.getByText("0 / 2")).toBeVisible();

		await page.getByRole("button", { name: "Like" }).click();

		// Progress updates
		await expect(page.getByText("1 / 2")).toBeVisible();
	});

	test("clicking Nope advances to next restaurant", async ({ page }) => {
		await setMemberStorage(page);
		await setupSwipeMocks(page);

		await page.goto(`/s/${SESSION_ID}/swipe`);

		await expect(page.getByText("0 / 2")).toBeVisible();

		await page.getByRole("button", { name: "Nope" }).click();

		await expect(page.getByText("1 / 2")).toBeVisible();
	});

	test("shows all-done state after voting on all restaurants", async ({
		page,
	}) => {
		await setMemberStorage(page);
		await setupSwipeMocks(page);

		await page.goto(`/s/${SESSION_ID}/swipe`);

		// Vote on both restaurants
		await page.getByRole("button", { name: "Like" }).click();
		await expect(page.getByText("1 / 2")).toBeVisible();

		await page.getByRole("button", { name: "Nope" }).click();

		// Should show done state
		await expect(
			page.getByRole("heading", { name: "All done!" }),
		).toBeVisible();
		await expect(
			page.getByText("You've voted on all 2 restaurants."),
		).toBeVisible();
		await expect(
			page.getByRole("link", { name: "Back to Session" }),
		).toBeVisible();
	});

	test("unauthenticated user redirects back to session page", async ({
		page,
	}) => {
		// Do NOT set localStorage — simulate unauthenticated user
		await page.route("**/api/restaurants", (route) => {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(mockRestaurants),
			});
		});

		// Mock session detail for the redirect target
		await page.route(`**/api/sessions/${SESSION_ID}`, (route) => {
			return route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({
					id: SESSION_ID,
					name: "Test Session",
					createdAt: new Date().toISOString(),
					expiresAt: new Date(Date.now() + 86400000).toISOString(),
					members: [],
					totalRestaurants: 2,
					matchCount: 0,
				}),
			});
		});

		await page.goto(`/s/${SESSION_ID}/swipe`);

		// Should redirect to the session join page
		await page.waitForURL(`**/s/${SESSION_ID}`);
		await expect(page).toHaveURL(`/s/${SESSION_ID}`);
	});
});
