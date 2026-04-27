/**
 * Auth Domain Core Logic
 * @module features/auth/core
 */

export const toPublicErrorMessage = (error, scope) => {
	const message =
		typeof error?.message === "string" ? error.message.toLowerCase() : "";
	if (message.includes("invalid")) return "Invalid username/email or password.";
	if (message.includes("timed out"))
		return "Request timed out. Please try again.";
	if (message.includes("session") || message.includes("authenticate")) {
		return "Session expired. Please sign in again.";
	}
	return scope === "auth"
		? "Sign-in failed. Please try again."
		: "Unable to load data right now.";
};
