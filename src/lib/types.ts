// Menu types (matching scraper output shape)

export interface MenuCourse {
	name: string;
	options: string[];
}

export interface MealMenu {
	meal_type: string;
	price: number | null;
	courses: MenuCourse[];
}

export interface RestaurantMenu {
	menus: MealMenu[];
}

// Database row types (matching Supabase schema)

export interface Restaurant {
	id: number;
	slug: string;
	name: string;
	cuisine: string[] | null;
	neighborhood: string | null;
	address: string | null;
	phone: string | null;
	website: string | null;
	detail_url: string | null;
	image_url: string | null;
	lunch_price: number | null;
	dinner_price: number | null;
	brunch_price: number | null;
	menu: RestaurantMenu | null;
	features: string[] | null;
	created_at: string;
	updated_at: string;
}

export interface SessionFilters {
	cuisines?: string[];
	neighborhoods?: string[];
}

export interface Session {
	id: string;
	name: string | null;
	filters: SessionFilters | null;
	created_at: string;
	expires_at: string;
}

export interface SessionMember {
	id: string;
	session_id: string;
	name: string;
	created_at: string;
}

export interface Vote {
	id: number;
	session_id: string;
	member_id: string;
	restaurant_id: number;
	vote: boolean;
	created_at: string;
}

// API response types

export interface CreateSessionResponse {
	id: string;
	name: string;
	shareUrl: string;
}

export interface MemberProgress {
	id: string;
	name: string;
	votesCount: number;
	totalRestaurants: number;
	done: boolean;
}

export interface SessionDetailResponse {
	id: string;
	name: string | null;
	filters: SessionFilters | null;
	createdAt: string;
	expiresAt: string;
	members: MemberProgress[];
	totalRestaurants: number;
	matchCount: number;
}

export interface JoinSessionResponse {
	memberId: string;
	token: string;
	name: string;
	sessionId: string;
}

export interface VoteRequest {
	restaurantId: number;
	vote: boolean;
}

export interface VoteResponse {
	id: number;
	restaurantId: number;
	vote: boolean;
}

export interface MatchedRestaurant {
	restaurant: Restaurant;
	likedBy: string[];
}

export interface MatchesResponse {
	matches: MatchedRestaurant[];
	totalRestaurants: number;
	allMembersComplete: boolean;
}

export interface MyVotesResponse {
	votedRestaurantIds: number[];
}
