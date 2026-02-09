import { MatchesPage } from "@/components/MatchesPage";

export default async function MatchesRoute({
	params,
}: {
	params: Promise<{ sessionId: string }>;
}) {
	const { sessionId } = await params;
	return <MatchesPage sessionId={sessionId} />;
}
