/**
 * Shell Theme Manager — Handles Dark/Light mode logic and persistence.
 * @module features/shell/theme
 */

import { $ } from "../../infra/ui.js";

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
		toggleBtn.addEventListener("click", toggleTheme);

		// Listen for system preference changes
		window
			.matchMedia("(prefers-color-scheme: dark)")
			.addEventListener("change", (e) => {
				if (!localStorage.getItem("theme")) {
					applyTheme(e.matches ? "dark" : "light");
				}
			});

		const currentTheme =
			document.documentElement.getAttribute("data-theme") || "dark";
		return { ok: true, theme: currentTheme };
	});
};

/**
 * Toggles between light and dark themes.
 */
export const toggleTheme = () => {
	const currentTheme =
		document.documentElement.getAttribute("data-theme") || "dark";
	const newTheme = currentTheme === "light" ? "dark" : "light";
	applyTheme(newTheme);
	localStorage.setItem("theme", newTheme);
};

/**
 * Applies the theme to the document.
 * @param {string} theme - 'light' or 'dark'
 */
const applyTheme = (theme) => {
	document.documentElement.setAttribute("data-theme", theme);
};
