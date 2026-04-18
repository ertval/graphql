/**
 * Network infrastructure helpers for timeout-bound request control.
 * @module infra.network
 */

const DEFAULT_REQUEST_TIMEOUT_MS = 12_000;

/**
 * Builds an AbortController that auto-cancels after the timeout.
 * Designed for `using` declaration cleanup via Symbol.dispose.
 * @param {number} [timeoutMs=12000]
 * @returns {{controller:AbortController,[Symbol.dispose]:()=>void}}
 */
export const createRequestController = (
	timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
) => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	return {
		controller,
		[Symbol.dispose]: () => clearTimeout(timeoutId),
	};
};
