import { SwipePage } from "@/components/SwipePage";

export default async function SwipeRoute({
	params,
}: {
	params: Promise<{ sessionId: string }>;
}) {
	const { sessionId } = await params;
	return <SwipePage sessionId={sessionId} />;
}
