import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(root, relPath), "utf8");

const loginCss = read("css/login.css");

test("login inputs define WebKit/Chromium autofill dark-theme selectors", () => {
	assert.match(loginCss, /input:-webkit-autofill/);
	assert.match(loginCss, /input:-webkit-autofill:hover/);
	assert.match(loginCss, /input:-webkit-autofill:focus/);
	assert.match(loginCss, /input:autofill/);
});

test("autofilled login inputs keep themed text, caret, and background", () => {
	assert.match(loginCss, /-webkit-text-fill-color:\s*var\(--text-primary\)/);
	assert.match(loginCss, /caret-color:\s*var\(--text-primary\)/);
	assert.match(loginCss, /box-shadow:\s*0 0 0 1000px\s+rgba\(255,\s*255,\s*255,\s*0\.04\)\s+inset/);
});
