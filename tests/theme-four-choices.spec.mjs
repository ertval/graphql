import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
	setTheme,
	THEME_CONFIG,
	THEMES,
	toggleTheme,
} from "../src/features/shell/shell.theme.js";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const themeCss = read("css/theme.css");
const navCss = read("css/nav.css");
const indexHtml = read("index.html");

test("THEMES constant exposes exactly 4 distinct themes", () => {
	assert.deepEqual(THEMES, ["dark", "light", "synthwave", "matrix"]);
	assert.equal(THEMES.length, 4);
});

test("THEME_CONFIG provides human-readable names and cycling metadata for all 4 themes", () => {
	for (const theme of THEMES) {
		assert.ok(THEME_CONFIG[theme], `Missing config for theme: ${theme}`);
		assert.ok(THEME_CONFIG[theme].name, `Missing name for theme: ${theme}`);
		assert.ok(THEME_CONFIG[theme].label, `Missing label for theme: ${theme}`);
		assert.ok(
			THEME_CONFIG[theme].next,
			`Missing next pointer for theme: ${theme}`,
		);
	}
	assert.equal(THEME_CONFIG.dark.next, "light");
	assert.equal(THEME_CONFIG.light.next, "synthwave");
	assert.equal(THEME_CONFIG.synthwave.next, "matrix");
	assert.equal(THEME_CONFIG.matrix.next, "dark");
});

test("theme cycling transitions sequentially through all 4 choices", () => {
	const storage = new Map();
	let currentThemeAttr = "dark";

	globalThis.localStorage = {
		getItem: (key) => storage.get(key) ?? null,
		setItem: (key, val) => storage.set(key, String(val)),
	};

	globalThis.document = {
		documentElement: {
			getAttribute: () => currentThemeAttr,
			setAttribute: (_, val) => {
				currentThemeAttr = val;
			},
		},
		querySelector: () => null,
		dispatchEvent: () => true,
	};

	// Cycle 1: dark -> light
	currentThemeAttr = "dark";
	toggleTheme();
	assert.equal(currentThemeAttr, "light");
	assert.equal(storage.get("theme"), "light");

	// Cycle 2: light -> synthwave
	toggleTheme();
	assert.equal(currentThemeAttr, "synthwave");
	assert.equal(storage.get("theme"), "synthwave");

	// Cycle 3: synthwave -> matrix
	toggleTheme();
	assert.equal(currentThemeAttr, "matrix");
	assert.equal(storage.get("theme"), "matrix");

	// Cycle 4: matrix -> dark (wraps back)
	toggleTheme();
	assert.equal(currentThemeAttr, "dark");
	assert.equal(storage.get("theme"), "dark");

	// Direct setTheme works
	setTheme("synthwave");
	assert.equal(currentThemeAttr, "synthwave");
	assert.equal(storage.get("theme"), "synthwave");
});

test("css/theme.css defines tokens for all 4 themes", () => {
	assert.match(themeCss, /:root\s*\{/);
	assert.match(themeCss, /:root\[data-theme="light"\]/);
	assert.match(themeCss, /:root\[data-theme="synthwave"\]/);
	assert.match(themeCss, /:root\[data-theme="matrix"\]/);

	// Synthwave defines hot fuchsia and ultraviolet accents
	assert.match(themeCss, /--accent-start:\s*#f43f5e/);
	assert.match(themeCss, /--accent-end:\s*#8b5cf6/);

	// Matrix defines terminal emerald accents
	assert.match(themeCss, /--accent-start:\s*#10b981/);
	assert.match(themeCss, /--accent-end:\s*#06b6d4/);
});

test("index.html contains 4-theme anti-flicker initialization and 4 SVG icons", () => {
	assert.match(
		indexHtml,
		/validThemes\s*=\s*\['dark',\s*'light',\s*'synthwave',\s*'matrix'\]/,
	);
	assert.match(indexHtml, /id="theme-toggle"/);
	assert.match(indexHtml, /class="theme-icon icon-moon"/);
	assert.match(indexHtml, /class="theme-icon icon-sun"/);
	assert.match(indexHtml, /class="theme-icon icon-synthwave"/);
	assert.match(indexHtml, /class="theme-icon icon-matrix"/);
});

test("css/nav.css defines transitions and active states for all 4 theme icons", () => {
	assert.match(navCss, /\.btn-theme-toggle \.icon-moon/);
	assert.match(
		navCss,
		/:root\[data-theme="light"\] \.btn-theme-toggle \.icon-sun/,
	);
	assert.match(
		navCss,
		/:root\[data-theme="synthwave"\] \.btn-theme-toggle \.icon-synthwave/,
	);
	assert.match(
		navCss,
		/:root\[data-theme="matrix"\] \.btn-theme-toggle \.icon-matrix/,
	);
});
