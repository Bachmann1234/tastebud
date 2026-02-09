import Image from "next/image";
import type { Restaurant } from "@/lib/types";

interface RestaurantCardProps {
	restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
	const prices = [
		restaurant.lunch_price != null ? `$${restaurant.lunch_price} lunch` : null,
		restaurant.dinner_price != null
			? `$${restaurant.dinner_price} dinner`
			: null,
		restaurant.brunch_price != null
			? `$${restaurant.brunch_price} brunch`
			: null,
	].filter((price): price is string => price !== null);

	const menu = restaurant.menu;

	return (
		<div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-lg">
			{/* Header: image or gradient fallback */}
			<div
				data-testid="card-header"
				className="relative h-48 w-full overflow-hidden"
			>
				{restaurant.image_url ? (
					<Image
						src={restaurant.image_url}
						alt={restaurant.name}
						fill
						className="object-cover"
						sizes="(max-width: 640px) 100vw, 400px"
					/>
				) : (
					<div className="h-full w-full bg-gradient-to-br from-orange-400 to-rose-500" />
				)}
				<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
				<h2 className="absolute bottom-3 left-4 right-4 text-2xl font-bold text-white">
					{restaurant.name}
				</h2>
			</div>

			{/* Info bar */}
			<div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
				{restaurant.cuisine?.map((tag) => (
					<span
						key={tag}
						className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800"
					>
						{tag}
					</span>
				))}
				{restaurant.neighborhood && (
					<span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
						{restaurant.neighborhood}
					</span>
				)}
				{prices.map((price) => (
					<span
						key={price}
						className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
					>
						{price}
					</span>
				))}
			</div>

			{/* Address */}
			{restaurant.address && (
				<p className="border-b border-gray-100 px-4 py-2 text-sm text-gray-500">
					{restaurant.address}
				</p>
			)}

			{/* Menu section */}
			{menu && menu.menus.length > 0 && (
				<div className="max-h-64 overflow-y-auto px-4 py-3">
					{menu.menus.map((meal) => (
						<div key={meal.meal_type} className="mb-3 last:mb-0">
							{menu.menus.length > 1 && (
								<h3 className="mb-1 text-sm font-semibold capitalize text-gray-700">
									{meal.meal_type}
								</h3>
							)}
							{meal.courses.map((course, courseIdx) => (
								<div
									key={`${course.name}-${courseIdx}`}
									className="mb-2 last:mb-0"
								>
									<h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
										{course.name}
									</h4>
									<ul className="mt-0.5">
										{course.options.map((option) => (
											<li key={option} className="text-sm text-gray-600">
												{option}
											</li>
										))}
									</ul>
								</div>
							))}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
