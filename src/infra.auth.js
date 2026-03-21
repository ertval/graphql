/**
 * Authentication service — login, token storage, and JWT utilities.
 * Auth state is session-scoped (memory + sessionStorage fallback).
 * @module infra.auth
 */

import { fail, ok } from "./infra.result.js";

// ── Constants ──────────────────────────────────────────────────────
const PLATFORM = "https://platform.zone01.gr";
const AUTH_URL = `${PLATFORM}/api/auth/signin`;
export const TOKEN_STORAGE_KEY = "graphql_jwt_session";
export const AUTH_SYNC_KEY = "graphql_auth_event";
const REQUEST_TIMEOUT_MS = 12_000;
const TOKEN_EXP_LEEWAY_SECONDS = 30;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const LAST_ACTIVE_KEY = "graphql_jwt_last_active";

let memoryToken = null;
let memoryPayload = null;

const nowEpochSeconds = () =>
	Math.floor(Temporal.Now.instant().epochMilliseconds / 1000);

const nowEpochMs = () => Temporal.Now.instant().epochMilliseconds;

const getSessionStorage = () => {
	try {
		return globalThis.sessionStorage ?? null;
	} catch {
		return null;
	}
};

const parseJwtPayload = (token) => {
	if (typeof token !== "string") return null;
	const parts = token.split(".");
	if (parts.length !== 3) return null;

	try {
		const payload = JSON.parse(atob(parts[1]));
		if (typeof payload?.exp !== "number") return null;
		return payload;
	} catch {
		return null;
	}
};

const hasTimedOutByIdle = (storage) => {
	if (!storage) return false;
	const lastActive = Number(storage.getItem(LAST_ACTIVE_KEY) ?? "0");
	if (!Number.isFinite(lastActive) || lastActive <= 0) return false;
	return nowEpochMs() - lastActive > SESSION_IDLE_TIMEOUT_MS;
};

const touchSessionActivity = (storage) => {
	storage?.setItem(LAST_ACTIVE_KEY, String(nowEpochMs()));
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
				new Error(
					`Authentication failed (${response.status}). Please try again.`,
				),
			);
		}

		// Parse the JWT from either JSON or raw text
		const contentType = (
			response.headers.get("content-type") ?? ""
		).toLowerCase();
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
	const payload = parseJwtPayload(token);
	if (!payload) {
		clearToken();
		return fail(new Error("Invalid session token."));
	}

	memoryToken = token;
	memoryPayload = payload;

	const storage = getSessionStorage();
	storage?.setItem(TOKEN_STORAGE_KEY, token);
	touchSessionActivity(storage);

	return ok(true);
};

/** @returns {string|null} */
export const getToken = () => {
	const storage = getSessionStorage();
	if (hasTimedOutByIdle(storage)) {
		clearToken();
		return null;
	}

	const token = memoryToken ?? storage?.getItem(TOKEN_STORAGE_KEY) ?? null;
	if (!token) return null;

	const payload = memoryPayload ?? parseJwtPayload(token);
	if (!payload || payload.exp <= nowEpochSeconds() + TOKEN_EXP_LEEWAY_SECONDS) {
		clearToken();
		return null;
	}

	memoryToken = token;
	memoryPayload = payload;
	touchSessionActivity(storage);

	return token;
};

/** Remove token from storage (logout / expiry). */
export const clearToken = () => {
	memoryToken = null;
	memoryPayload = null;

	const storage = getSessionStorage();
	storage?.removeItem(TOKEN_STORAGE_KEY);
	storage?.removeItem(LAST_ACTIVE_KEY);
};

// ── JWT inspection ─────────────────────────────────────────────────

/** @returns {boolean} True when a non-expired JWT is stored. */
export const isAuthenticated = () => {
	return decodeToken() !== null;
};

/** @returns {object|null} Decoded JWT payload, or null on failure. */
export const decodeToken = () => {
	const token = getToken();
	if (!token) return null;
	return memoryPayload ?? parseJwtPayload(token);
};
