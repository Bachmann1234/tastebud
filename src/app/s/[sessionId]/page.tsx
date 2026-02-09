import { SessionJoinPage } from "@/components/SessionJoinPage";

export default async function SessionPage({
	params,
}: {
	params: Promise<{ sessionId: string }>;
}) {
	const { sessionId } = await params;
	return <SessionJoinPage sessionId={sessionId} />;
}
