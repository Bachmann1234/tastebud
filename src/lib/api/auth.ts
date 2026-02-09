import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionMember } from "@/lib/types";

export async function validateMemberToken(
	supabase: SupabaseClient,
	sessionId: string,
	token: string,
): Promise<SessionMember | null> {
	const { data, error } = await supabase
		.from("session_members")
		.select("*")
		.eq("id", token)
		.eq("session_id", sessionId)
		.single();

	if (error || !data) {
		return null;
	}

	return data as SessionMember;
}
