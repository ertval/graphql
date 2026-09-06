/**
 * Shell Theme Manager — Handles 4-theme mode logic, persistence, and transitions.
 * Themes: Dark (Ocean) -> Light (Day) -> Synthwave (Neon) -> Matrix (Cyber).
 * @module features/shell/theme
 */

import { $ } from "../../infra/ui.js";

/** @type {readonly ["dark", "light", "synthwave", "matrix"]} */
export const THEMES = Object.freeze(["dark", "light", "synthwave", "matrix"]);

/**
 * Metadata for each theme including human-readable name and accessible action labels.
 */
export const THEME_CONFIG = Object.freeze({
	dark: {
		name: "Dark (Ocean)",
		next: "light",
		label: "Current theme: Dark. Switch to Light theme.",
	},
	light: {
		name: "Light (Day)",
		next: "synthwave",
		label: "Current theme: Light. Switch to Synthwave theme.",
	},
	synthwave: {
		name: "Synthwave (Neon)",
		next: "matrix",
		label: "Current theme: Synthwave. Switch to Matrix theme.",
	},
	matrix: {
		name: "Matrix (Cyber)",
		next: "dark",
		label: "Current theme: Matrix. Switch to Dark theme.",
	},
});

/**
 * @typedef {Object} ThemeResult
 * @property {boolean} ok
 * @property {string} [theme]
 * @property {string} [error]
 */

/**
 * Initializes the theme based on localStorage or system preference.
 * @returns {Promise<ThemeResult>}
 */
export const initTheme = async () => {
	return Promise.try(() => {
		const toggleBtn = $("#theme-toggle");
		if (!toggleBtn) {
			return { ok: false, error: "Theme toggle button not found" };
		}

		// Listen for click
		toggleBtn.addEventListener("click", () => {
			toggleTheme();
		});

		// Listen for system preference changes (only applies if user has not chosen a theme)
		window
			.matchMedia("(prefers-color-scheme: dark)")
			.addEventListener("change", (e) => {
				if (!localStorage.getItem("theme")) {
					applyTheme(e.matches ? "dark" : "light");
				}
			});

		const savedTheme = localStorage.getItem("theme");
		const initialTheme =
			savedTheme && THEMES.includes(savedTheme)
				? savedTheme
				: document.documentElement.getAttribute("data-theme") || "dark";

		applyTheme(initialTheme);
		return { ok: true, theme: initialTheme };
	});
};

/**
 * Toggles sequentially through the 4 themes.
 */
export const toggleTheme = () => {
	const currentTheme =
		document.documentElement.getAttribute("data-theme") || "dark";
	const currentIndex = THEMES.indexOf(currentTheme);
	const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % THEMES.length : 0;
	const newTheme = THEMES[nextIndex];

	applyTheme(newTheme);
	try {
		localStorage.setItem("theme", newTheme);
	} catch {
		// Ignore storage failures
	}
};

/**
 * Directly sets a specific theme.
 * @param {"dark"|"light"|"synthwave"|"matrix"} theme
 */
export const setTheme = (theme) => {
	if (!THEMES.includes(theme)) return;
	applyTheme(theme);
	try {
		localStorage.setItem("theme", theme);
	} catch {
		// Ignore storage failures
	}
};

/**
 * Applies the theme to the document and updates the toggle button.
 * @param {string} theme
 */
const applyTheme = (theme) => {
	const validTheme = THEMES.includes(theme) ? theme : "dark";
	document.documentElement.setAttribute("data-theme", validTheme);

	const toggleBtn = $("#theme-toggle");
	if (toggleBtn) {
		const config = THEME_CONFIG[validTheme] ?? THEME_CONFIG.dark;
		toggleBtn.setAttribute("aria-label", config.label);
		toggleBtn.setAttribute("title", `Theme: ${config.name} (click to cycle)`);
		toggleBtn.classList.remove("theme-spin");
		void toggleBtn.offsetWidth; // Trigger reflow for animation restart
		toggleBtn.classList.add("theme-spin");
	}

	document.dispatchEvent(
		new CustomEvent("theme:change", { detail: { theme: validTheme } }),
	);
};
