/**
 * Shared error classification helpers.
 * @module infra.errors
 */

const AUTH_FAILURE_MESSAGE_FRAGMENTS = [
	"not authenticated",
	"unauthorized",
	"forbidden",
	"jwt",
	"token",
	"access denied",
];

/**
 * Checks whether a message indicates an authentication/session failure.
 * @param {string} message
 * @returns {boolean}
 */
export const isAuthFailureMessage = (message) => {
	if (typeof message !== "string") {
		return false;
	}

	const normalized = message.toLowerCase();
	return AUTH_FAILURE_MESSAGE_FRAGMENTS.some((fragment) =>
		normalized.includes(fragment),
	);
};

/**
 * Checks whether an error indicates an authentication/session failure.
 * @param {unknown} err
 * @returns {boolean}
 */
export const isAuthFailureError = (err) => {
	if (!(err instanceof Error)) {
		return false;
	}

	const normalized = err.message.toLowerCase();
	return (
		normalized.includes("session expired") || isAuthFailureMessage(normalized)
	);
};
