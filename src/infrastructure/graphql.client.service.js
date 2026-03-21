import { clearToken, getToken } from "./graphql.auth.service.js";
import { fail, ok } from "./graphql.result.core.js";

const PLATFORM = "https://platform.zone01.gr";
const GRAPHQL_URL = `${PLATFORM}/api/graphql-engine/v1/graphql`;
const REQUEST_TIMEOUT_MS = 12_000;

const createRequestController = () => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	return {
		controller,
		release: () => clearTimeout(timeoutId),
	};
};

/** @param {string} message */
const isAuthErrorMessage = (message) => {
	const normalized = message.toLowerCase();
	return (
		normalized.includes("not authenticated") ||
		normalized.includes("unauthorized") ||
		normalized.includes("forbidden") ||
		normalized.includes("jwt") ||
		normalized.includes("token") ||
		normalized.includes("access denied")
	);
};

/**
 * @param {string} query
 * @param {object} [variables={}]
 * @returns {Promise<{ok:true,data:object}|{ok:false,error:Error}>}
 */
export const graphqlQuery = async (query, variables = {}) => {
	let requestControl;
	try {
		const token = getToken();
		if (!token) {
			return fail(new Error("Not authenticated. Please log in."));
		}

		requestControl = createRequestController();
		const response = await fetch(GRAPHQL_URL, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ query, variables }),
			mode: "cors",
			credentials: "omit",
			cache: "no-store",
			redirect: "error",
			referrerPolicy: "no-referrer",
			signal: requestControl.controller.signal,
		});

		if (response.status === 401 || response.status === 403) {
			clearToken();
			return fail(new Error("Session expired. Please log in again."));
		}
		if (!response.ok) {
			return fail(new Error(`GraphQL request failed (${response.status}).`));
		}

		const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
		if (
			!contentType.includes("application/json") &&
			!contentType.includes("application/graphql-response+json")
		) {
			return fail(new Error("Invalid response format from server."));
		}

		const result = await response.json();
		if (result.errors?.length) {
			const messages = result.errors.map((e) => e.message).join("; ");
			if (isAuthErrorMessage(messages)) {
				clearToken();
			}
			return fail(new Error(`GraphQL Error: ${messages}`));
		}

		return ok(result.data);
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			return fail(new Error("Request timed out. Please try again."));
		}
		return fail(error);
	} finally {
		requestControl?.release();
	}
};
