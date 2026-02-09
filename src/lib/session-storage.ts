function storageKey(sessionId: string, suffix: "token" | "name") {
	return `tastebud_${sessionId}_${suffix}`;
}

export function readStorage(sessionId: string): {
	token: string | null;
	name: string | null;
} {
	try {
		return {
			token: localStorage.getItem(storageKey(sessionId, "token")),
			name: localStorage.getItem(storageKey(sessionId, "name")),
		};
	} catch {
		return { token: null, name: null };
	}
}

export function writeStorage(sessionId: string, token: string, name: string) {
	try {
		localStorage.setItem(storageKey(sessionId, "token"), token);
		localStorage.setItem(storageKey(sessionId, "name"), name);
	} catch {
		// localStorage unavailable — degrade gracefully
	}
}

export function clearStorage(sessionId: string) {
	try {
		localStorage.removeItem(storageKey(sessionId, "token"));
		localStorage.removeItem(storageKey(sessionId, "name"));
	} catch {
		// localStorage unavailable
	}
}
