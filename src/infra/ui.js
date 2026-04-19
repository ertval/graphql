/**
 * UI helpers shared across feature views.
 * @module infra.ui
 */

const PLATFORM_ORIGIN = "https://platform.zone01.gr";

const toIsoDatePart = (isoDate) =>
	typeof isoDate === "string" ? isoDate.split("T")?.[0] : undefined;

const formatTemporalDate = (
	isoDate,
	localeOptions,
	fallback,
	fallbackToIsoDate,
) => {
	try {
		const zdt = Temporal.Instant.from(isoDate).toZonedDateTimeISO(
			Temporal.Now.timeZoneId(),
		);
		return zdt.toLocaleString("en", localeOptions);
	} catch {
		if (fallbackToIsoDate) {
			return toIsoDatePart(isoDate) ?? fallback;
		}
		return fallback;
	}
};

export const $ = (sel) => document.querySelector(sel);

export const getActiveUserLogin = () => {
	const loginText = $("#user-login")?.textContent?.trim() ?? "";
	if (!loginText) return "";
	return loginText.startsWith("@") ? loginText.slice(1) : loginText;
};

export const getActiveUserDisplayName = () => {
	const fullNameText = $("#user-fullname")?.textContent?.trim() ?? "";
	if (fullNameText) return fullNameText;

	const login = getActiveUserLogin();
	if (!login) return "";

	return login
		.split(/[._-]+/)
		.filter(Boolean)
		.map((part) => part[0].toUpperCase() + part.slice(1))
		.join(" ");
};

export const toProjectUrl = (pathValue) => {
	if (typeof pathValue !== "string" || !pathValue.trim()) return null;

	try {
		const url = pathValue.startsWith("/")
			? new URL(pathValue, PLATFORM_ORIGIN)
			: new URL(pathValue);
		if (url.protocol !== "https:") return null;
		if (url.origin !== PLATFORM_ORIGIN) return null;
		return url.toString();
	} catch {
		return null;
	}
};

/**
 * Formats an ISO datetime to a medium local date string.
 * Falls back to the raw ISO date part when formatting fails.
 * @param {string} isoDate
 * @param {string} [fallback="—"]
 */
export const formatLocalDate = (isoDate, fallback = "—") =>
	formatTemporalDate(isoDate, { dateStyle: "medium" }, fallback, true);

/**
 * Formats an ISO datetime to a short local date string.
 * @param {string} isoDate
 * @param {string} [fallback=""]
 */
export const formatShortLocalDate = (isoDate, fallback = "") =>
	formatTemporalDate(
		isoDate,
		{ month: "short", day: "numeric", year: "numeric" },
		fallback,
		false,
	);

/**
 * Formats an ISO datetime to a long local date string.
 * @param {string} isoDate
 * @param {string} [fallback="—"]
 */
export const formatLongLocalDate = (isoDate, fallback = "—") =>
	formatTemporalDate(isoDate, { dateStyle: "long" }, fallback, false);
