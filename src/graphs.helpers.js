/**
 * Shared SVG primitives and formatting helpers used by all graph modules.
 * Keeps chart code DRY by centralising SVG element creation and XP formatting.
 * @module graphs.helpers
 */

// ── Namespace constant ─────────────────────────────────────────────
export const SVG_NS = "http://www.w3.org/2000/svg";

// ── SVG element factory ────────────────────────────────────────────
/**
 * Creates an SVG element with the given attributes.
 * @param {string} tag  - SVG element tag name
 * @param {Object<string,string|number>} attrs - Attribute key/value pairs
 * @returns {SVGElement}
 */
export const svgEl = (tag, attrs = {}) => {
	const el = document.createElementNS(SVG_NS, tag);
	for (const [k, v] of Object.entries(attrs)) {
		el.setAttribute(k, String(v));
	}
	return el;
};

// ── Byte-size formatter (XP values) ────────────────────────────────
/**
 * Formats bytes to human-readable XP (kB, MB).
 * @param {number} bytes
 * @returns {string}
 */
export const formatXP = (bytes) => {
	if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
	if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} kB`;
	return `${bytes} B`;
};

// ── Date label formatter for chart axes ────────────────────────────
/**
 * Formats an ISO date string to a short "Mon YY" label.
 * @param {string} isoStr
 * @returns {string}
 */
export const formatDateLabel = (isoStr) => {
	const instant = Temporal.Instant.from(isoStr);
	const zdt = instant.toZonedDateTimeISO(Temporal.Now.timeZoneId());
	return `${zdt.toLocaleString("en", { month: "short" })} ${zdt.year.toString().slice(-2)}`;
};

// ── Tooltip factory ────────────────────────────────────────────────
/**
 * Creates a positioned tooltip div and attaches it to the container.
 * @param {HTMLElement} container
 * @returns {HTMLDivElement}
 */
export const createTooltip = (container) => {
	const tooltip = document.createElement("div");
	tooltip.className = "graph-tooltip";
	container.style.position = "relative";
	container.append(tooltip);
	return tooltip;
};
