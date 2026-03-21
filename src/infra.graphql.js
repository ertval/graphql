/**
 * GraphQL HTTP transport — executes queries against the platform API.
 * Handles auth headers, response validation, and token expiry detection.
 * @module infra.graphql
 */

import { fail, ok } from "./infra.result.js";

// ── Constants ──────────────────────────────────────────────────────
const PLATFORM = "https://platform.zone01.gr";
const GRAPHQL_URL = `${PLATFORM}/api/graphql-engine/v1/graphql`;
const REQUEST_TIMEOUT_MS = 12_000;

const graphqlAuth = {
	getToken: () => null,
	clearToken: () => {},
};

/**
 * Injects auth adapter functions used by GraphQL transport.
 * @param {{getToken?:()=>string|null, clearToken?:()=>void}} auth
 */
export const configureGraphqlAuth = (auth) => {
	if (typeof auth?.getToken === "function")
		graphqlAuth.getToken = auth.getToken;
	if (typeof auth?.clearToken === "function")
		graphqlAuth.clearToken = auth.clearToken;
};

/** Builds an AbortController that auto-cancels after the timeout. */
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

// ── Public query executor ──────────────────────────────────────────
/**
 * Sends a GraphQL query and returns a Result<data>.
 * Automatically clears the token on 401/403 or auth-related errors.
 * @param {string} query
 * @param {object} [variables={}]
 * @returns {Promise<{ok:true,data:object}|{ok:false,error:Error}>}
 */
export const graphqlQuery = async (query, variables = {}) => {
	let requestControl;
	try {
		const token = graphqlAuth.getToken();
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

		// Expired / revoked session — clear token and report
		if (response.status === 401 || response.status === 403) {
			graphqlAuth.clearToken();
			return fail(new Error("Session expired. Please log in again."));
		}
		if (!response.ok) {
			return fail(new Error(`GraphQL request failed (${response.status}).`));
		}

		// Validate content type before parsing
		const contentType = (
			response.headers.get("content-type") ?? ""
		).toLowerCase();
		if (
			!contentType.includes("application/json") &&
			!contentType.includes("application/graphql-response+json")
		) {
			return fail(new Error("Invalid response format from server."));
		}

		const result = await response.json();

		// GraphQL-level errors — clear token if auth-related
		if (result.errors?.length) {
			const messages = result.errors.map((e) => e.message).join("; ");
			if (isAuthErrorMessage(messages)) {
				graphqlAuth.clearToken();
				return fail(new Error("Session expired. Please log in again."));
			}
			return fail(new Error("Unable to load data right now."));
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
