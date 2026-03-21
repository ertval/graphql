/**
 * Authentication service — login, token storage, and JWT utilities.
 * All auth state flows through localStorage with the shared TOKEN_KEY.
 * @module graphql.auth
 */

import { fail, ok } from "./graphql.result.js";

// ── Constants ──────────────────────────────────────────────────────
const PLATFORM = "https://platform.zone01.gr";
const AUTH_URL = `${PLATFORM}/api/auth/signin`;
const TOKEN_KEY = "graphql_jwt";
const REQUEST_TIMEOUT_MS = 12_000;

/** Builds an AbortController that auto-cancels after the timeout. */
const createRequestController = () => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	return {
		controller,
		release: () => clearTimeout(timeoutId),
	};
};

// ── Login ──────────────────────────────────────────────────────────
/**
 * Authenticates via Basic auth and returns a Result wrapping the JWT.
 * @param {string} identifier
 * @param {string} password
 * @returns {Promise<{ok:true,data:string}|{ok:false,error:Error}>}
 */
export const login = async (identifier, password) => {
	let requestControl;
	try {
		const credentials = btoa(`${identifier}:${password}`);
		requestControl = createRequestController();

		const response = await fetch(AUTH_URL, {
			method: "POST",
			headers: {
				Authorization: `Basic ${credentials}`,
				"Content-Type": "application/json",
			},
			mode: "cors",
			credentials: "omit",
			cache: "no-store",
			redirect: "error",
			referrerPolicy: "no-referrer",
			signal: requestControl.controller.signal,
		});

		// Reject invalid credentials explicitly
		if (!response.ok) {
			if (response.status === 401 || response.status === 403) {
				return fail(new Error("Invalid username/email or password."));
			}
			return fail(
				new Error(`Authentication failed (${response.status}). Please try again.`),
			);
		}

		// Parse the JWT from either JSON or raw text
		const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
		const bodyText = await response.text();

		let token = "";
		if (contentType.includes("application/json")) {
			const parsed = JSON.parse(bodyText);
			if (typeof parsed === "string") token = parsed.replace(/^"|"$/g, "");
			else if (typeof parsed?.token === "string") token = parsed.token;
		} else {
			token = bodyText.trim().replace(/^"|"$/g, "");
		}

		if (!token) {
			return fail(new Error("No token received from server."));
		}

		return ok(token);
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			return fail(new Error("Request timed out. Please try again."));
		}
		return fail(error);
	} finally {
		requestControl?.release();
	}
};

// ── Token persistence ──────────────────────────────────────────────

/** @param {string} token */
export const saveToken = (token) => {
	localStorage.setItem(TOKEN_KEY, token);
};

/** @returns {string|null} */
export const getToken = () => localStorage.getItem(TOKEN_KEY);

/** Remove token from storage (logout / expiry). */
export const clearToken = () => {
	localStorage.removeItem(TOKEN_KEY);
};

// ── JWT inspection ─────────────────────────────────────────────────

/** @returns {boolean} True when a non-expired JWT is stored. */
export const isAuthenticated = () => {
	const token = getToken();
	if (!token) return false;

	try {
		const payload = JSON.parse(atob(token.split(".")[1]));
		const now = Math.floor(Temporal.Now.instant().epochMilliseconds / 1000);
		return payload.exp > now;
	} catch {
		return false;
	}
};

/** @returns {object|null} Decoded JWT payload, or null on failure. */
export const decodeToken = () => {
	const token = getToken();
	if (!token) return null;
	try {
		return JSON.parse(atob(token.split(".")[1]));
	} catch {
		return null;
	}
};
