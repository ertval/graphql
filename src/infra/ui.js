/**
 * UI helpers shared across feature views.
 * @module infra.ui
 */

const PLATFORM_ORIGIN = "https://platform.zone01.gr";

const BODY_SCROLL_LOCK_STATE = {
	keys: new Set(),
	snapshot: null,
};

const DEFAULT_SCROLL_LOCK_KEY = "overlay-default";

const normalizeScrollLockKey = (lockKey) => {
	if (typeof lockKey !== "string") return DEFAULT_SCROLL_LOCK_KEY;
	const trimmed = lockKey.trim();
	return trimmed || DEFAULT_SCROLL_LOCK_KEY;
};

const parsePixelValue = (value) => {
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : 0;
};

const getBody = () => globalThis.document?.body ?? null;

const getDocumentElement = () => globalThis.document?.documentElement ?? null;

const captureBodyScrollSnapshot = (body, documentElement) => ({
	scrollY: Number(globalThis.scrollY ?? 0),
	overflow: body.style.overflow,
	paddingRight: body.style.paddingRight,
	position: body.style.position,
	top: body.style.top,
	left: body.style.left,
	right: body.style.right,
	width: body.style.width,
	overscrollBehavior: documentElement?.style.overscrollBehavior ?? "",
});

const applyBodyScrollLock = () => {
	if (BODY_SCROLL_LOCK_STATE.snapshot) return;

	const body = getBody();
	const documentElement = getDocumentElement();
	if (!body) return;

	const snapshot = captureBodyScrollSnapshot(body, documentElement);
	BODY_SCROLL_LOCK_STATE.snapshot = snapshot;

	const computedPaddingRight = parsePixelValue(
		globalThis.getComputedStyle?.(body)?.paddingRight ?? body.style.paddingRight,
	);
	const viewportWidth = Number(globalThis.innerWidth ?? 0);
	const layoutWidth = Number(documentElement?.clientWidth ?? 0);
	const scrollbarWidth = Math.max(0, viewportWidth - layoutWidth);

	if (scrollbarWidth > 0) {
		body.style.paddingRight = `${computedPaddingRight + scrollbarWidth}px`;
	}

	body.style.overflow = "hidden";
	body.style.position = "fixed";
	body.style.top = `-${snapshot.scrollY}px`;
	body.style.left = "0";
	body.style.right = "0";
	body.style.width = "100%";

	if (documentElement) {
		documentElement.style.overscrollBehavior = "none";
	}
};

const restoreBodyScrollLock = () => {
	const snapshot = BODY_SCROLL_LOCK_STATE.snapshot;
	if (!snapshot) return;

	const body = getBody();
	const documentElement = getDocumentElement();

	if (body) {
		body.style.overflow = snapshot.overflow;
		body.style.paddingRight = snapshot.paddingRight;
		body.style.position = snapshot.position;
		body.style.top = snapshot.top;
		body.style.left = snapshot.left;
		body.style.right = snapshot.right;
		body.style.width = snapshot.width;
	}

	if (documentElement) {
		documentElement.style.overscrollBehavior = snapshot.overscrollBehavior;
	}

	BODY_SCROLL_LOCK_STATE.snapshot = null;

	if (typeof globalThis.scrollTo === "function") {
		globalThis.scrollTo(0, snapshot.scrollY);
	}
};

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

/**
 * Locks body scroll for active overlays/modals.
 * Uses a keyed reference-count so multiple overlays can coexist safely.
 * @param {string} [lockKey]
 */
export const lockBodyScroll = (lockKey = DEFAULT_SCROLL_LOCK_KEY) => {
	const body = getBody();
	if (!body) return;

	const normalizedKey = normalizeScrollLockKey(lockKey);
	if (BODY_SCROLL_LOCK_STATE.keys.has(normalizedKey)) return;

	BODY_SCROLL_LOCK_STATE.keys.add(normalizedKey);
	if (BODY_SCROLL_LOCK_STATE.keys.size === 1) {
		applyBodyScrollLock();
	}
};

/**
 * Unlocks body scroll for the provided overlay/modal lock key.
 * @param {string} [lockKey]
 */
export const unlockBodyScroll = (lockKey = DEFAULT_SCROLL_LOCK_KEY) => {
	const normalizedKey = normalizeScrollLockKey(lockKey);
	if (!BODY_SCROLL_LOCK_STATE.keys.has(normalizedKey)) return;

	BODY_SCROLL_LOCK_STATE.keys.delete(normalizedKey);
	if (BODY_SCROLL_LOCK_STATE.keys.size === 0) {
		restoreBodyScrollLock();
	}
};

/** Clears all active body-scroll locks. */
export const clearBodyScrollLocks = () => {
	if (BODY_SCROLL_LOCK_STATE.keys.size === 0 && !BODY_SCROLL_LOCK_STATE.snapshot) {
		return;
	}

	BODY_SCROLL_LOCK_STATE.keys.clear();
	restoreBodyScrollLock();
};

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
