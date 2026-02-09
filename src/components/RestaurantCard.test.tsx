import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Restaurant } from "@/lib/types";
import { RestaurantCard } from "./RestaurantCard";

vi.mock("next/image", () => ({
	// biome-ignore lint/performance/noImgElement: test mock for next/image
	// biome-ignore lint/a11y/useAltText: props are spread from caller
	default: (props: ComponentProps<"img">) => <img {...props} />,
}));

function makeRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
	return {
		id: 1,
		slug: "test-restaurant",
		name: "Test Restaurant",
		cuisine: ["Italian", "Seafood"],
		neighborhood: "Back Bay",
		address: "123 Newbury St, Boston, MA",
		phone: "617-555-1234",
		website: "https://example.com",
		detail_url: "https://restaurantweekboston.com/test-restaurant",
		image_url: "https://example.com/photo.jpg",
		lunch_price: 28,
		dinner_price: 45,
		brunch_price: null,
		menu: {
			menus: [
				{
					meal_type: "dinner",
					price: 45,
					courses: [
						{
							name: "First Course",
							options: ["Burrata", "Caesar Salad"],
						},
						{
							name: "Entrée",
							options: ["Grilled Salmon", "Filet Mignon"],
						},
						{
							name: "Dessert",
							options: ["Tiramisu", "Panna Cotta"],
						},
					],
				},
			],
		},
		features: ["outdoor-dining"],
		created_at: "2025-01-01T00:00:00Z",
		updated_at: "2025-01-01T00:00:00Z",
		...overrides,
	};
}

describe("RestaurantCard", () => {
	it("renders restaurant name, cuisine tags, and neighborhood", () => {
		render(<RestaurantCard restaurant={makeRestaurant()} />);

		expect(screen.getByText("Test Restaurant")).toBeInTheDocument();
		expect(screen.getByText("Italian")).toBeInTheDocument();
		expect(screen.getByText("Seafood")).toBeInTheDocument();
		expect(screen.getByText("Back Bay")).toBeInTheDocument();
	});

	it("renders price info for dinner", () => {
		render(
			<RestaurantCard
				restaurant={makeRestaurant({ dinner_price: 45, lunch_price: null })}
			/>,
		);

		expect(screen.getByText("$45 dinner")).toBeInTheDocument();
	});

	it("renders price info for lunch", () => {
		render(
			<RestaurantCard
				restaurant={makeRestaurant({
					lunch_price: 28,
					dinner_price: null,
				})}
			/>,
		);

		expect(screen.getByText("$28 lunch")).toBeInTheDocument();
	});

	it("renders price info for brunch", () => {
		render(
			<RestaurantCard
				restaurant={makeRestaurant({
					brunch_price: 35,
					dinner_price: null,
					lunch_price: null,
				})}
			/>,
		);

		expect(screen.getByText("$35 brunch")).toBeInTheDocument();
	});

	it("renders multiple prices", () => {
		render(
			<RestaurantCard
				restaurant={makeRestaurant({
					lunch_price: 28,
					dinner_price: 45,
					brunch_price: 35,
				})}
			/>,
		);

		expect(screen.getByText("$28 lunch")).toBeInTheDocument();
		expect(screen.getByText("$45 dinner")).toBeInTheDocument();
		expect(screen.getByText("$35 brunch")).toBeInTheDocument();
	});

	it("renders menu courses and options", () => {
		render(<RestaurantCard restaurant={makeRestaurant()} />);

		expect(screen.getByText("First Course")).toBeInTheDocument();
		expect(screen.getByText("Burrata")).toBeInTheDocument();
		expect(screen.getByText("Caesar Salad")).toBeInTheDocument();
		expect(screen.getByText("Entrée")).toBeInTheDocument();
		expect(screen.getByText("Grilled Salmon")).toBeInTheDocument();
		expect(screen.getByText("Filet Mignon")).toBeInTheDocument();
		expect(screen.getByText("Dessert")).toBeInTheDocument();
		expect(screen.getByText("Tiramisu")).toBeInTheDocument();
		expect(screen.getByText("Panna Cotta")).toBeInTheDocument();
	});

	it("hides meal type heading when only one menu exists", () => {
		render(<RestaurantCard restaurant={makeRestaurant()} />);

		expect(screen.queryByText("dinner")).not.toBeInTheDocument();
	});

	it("shows meal type headings when multiple menus exist", () => {
		render(
			<RestaurantCard
				restaurant={makeRestaurant({
					menu: {
						menus: [
							{
								meal_type: "lunch",
								price: 28,
								courses: [{ name: "Starter", options: ["Soup"] }],
							},
							{
								meal_type: "dinner",
								price: 45,
								courses: [{ name: "Main", options: ["Steak"] }],
							},
						],
					},
				})}
			/>,
		);

		expect(screen.getByText("lunch")).toBeInTheDocument();
		expect(screen.getByText("dinner")).toBeInTheDocument();
	});

	it("handles missing optional fields gracefully", () => {
		render(
			<RestaurantCard
				restaurant={makeRestaurant({
					cuisine: null,
					neighborhood: null,
					address: null,
					image_url: null,
					menu: null,
					lunch_price: null,
					dinner_price: null,
					brunch_price: null,
				})}
			/>,
		);

		expect(screen.getByText("Test Restaurant")).toBeInTheDocument();
		expect(screen.queryByText("Italian")).not.toBeInTheDocument();
		expect(screen.queryByText("Back Bay")).not.toBeInTheDocument();
		expect(screen.queryByText("First Course")).not.toBeInTheDocument();
	});

	it("renders image when image_url is present", () => {
		render(<RestaurantCard restaurant={makeRestaurant()} />);

		const img = screen.getByRole("img", { name: "Test Restaurant" });
		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");
	});

	it("renders gradient fallback when image_url is absent", () => {
		const { container } = render(
			<RestaurantCard restaurant={makeRestaurant({ image_url: null })} />,
		);

		expect(screen.queryByRole("img")).not.toBeInTheDocument();
		const header = container.querySelector("[data-testid='card-header']");
		expect(header).toBeInTheDocument();
	});

	it("renders address when present", () => {
		render(<RestaurantCard restaurant={makeRestaurant()} />);

		expect(screen.getByText("123 Newbury St, Boston, MA")).toBeInTheDocument();
	});

	it("does not render address when absent", () => {
		render(<RestaurantCard restaurant={makeRestaurant({ address: null })} />);

		expect(
			screen.queryByText("123 Newbury St, Boston, MA"),
		).not.toBeInTheDocument();
	});
});
