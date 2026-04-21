import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

import {
	clearBodyScrollLocks,
	lockBodyScroll,
	unlockBodyScroll,
} from "../src/infra/ui.js";

const originalDocument = globalThis.document;
const originalGetComputedStyle = globalThis.getComputedStyle;
const originalInnerWidth = globalThis.innerWidth;
const originalScrollTo = globalThis.scrollTo;
const originalScrollY = globalThis.scrollY;

let scrollCalls = [];

beforeEach(() => {
	scrollCalls = [];

	globalThis.document = {
		body: {
			style: {
				overflow: "scroll",
				paddingRight: "4px",
				position: "relative",
				top: "7px",
				left: "1px",
				right: "2px",
				width: "auto",
			},
		},
		documentElement: {
			clientWidth: 980,
			style: {
				overscrollBehavior: "auto",
			},
		},
	};

	globalThis.innerWidth = 1000;
	globalThis.scrollY = 120;
	globalThis.getComputedStyle = () => ({
		paddingRight: "4px",
	});
	globalThis.scrollTo = (x, y) => {
		scrollCalls.push({ x, y });
	};

	clearBodyScrollLocks();
});

afterEach(() => {
	clearBodyScrollLocks();
	globalThis.document = originalDocument;
	globalThis.getComputedStyle = originalGetComputedStyle;
	globalThis.innerWidth = originalInnerWidth;
	globalThis.scrollTo = originalScrollTo;
	globalThis.scrollY = originalScrollY;
});

test("lockBodyScroll applies lock styles once and keeps body width stable", () => {
	lockBodyScroll("overlay-collaborator");
	assert.equal(globalThis.document.body.style.overflow, "hidden");
	assert.equal(globalThis.document.body.style.position, "fixed");
	assert.equal(globalThis.document.body.style.top, "-120px");
	assert.equal(globalThis.document.body.style.left, "0");
	assert.equal(globalThis.document.body.style.right, "0");
	assert.equal(globalThis.document.body.style.width, "100%");
	assert.equal(globalThis.document.body.style.paddingRight, "24px");
	assert.equal(
		globalThis.document.documentElement.style.overscrollBehavior,
		"none",
	);

	lockBodyScroll("overlay-collaborator");
	assert.equal(globalThis.document.body.style.paddingRight, "24px");
	assert.deepEqual(scrollCalls, []);
});

test("unlockBodyScroll waits for all locks, then restores body state", () => {
	lockBodyScroll("overlay-collaborator");
	lockBodyScroll("overlay-role");

	unlockBodyScroll("overlay-collaborator");
	assert.equal(globalThis.document.body.style.overflow, "hidden");
	assert.deepEqual(scrollCalls, []);

	unlockBodyScroll("overlay-role");
	assert.equal(globalThis.document.body.style.overflow, "scroll");
	assert.equal(globalThis.document.body.style.paddingRight, "4px");
	assert.equal(globalThis.document.body.style.position, "relative");
	assert.equal(globalThis.document.body.style.top, "7px");
	assert.equal(globalThis.document.body.style.left, "1px");
	assert.equal(globalThis.document.body.style.right, "2px");
	assert.equal(globalThis.document.body.style.width, "auto");
	assert.equal(
		globalThis.document.documentElement.style.overscrollBehavior,
		"auto",
	);
	assert.deepEqual(scrollCalls, [{ x: 0, y: 120 }]);
});

test("clearBodyScrollLocks force-releases all outstanding overlay locks", () => {
	lockBodyScroll("overlay-a");
	lockBodyScroll("overlay-b");
	clearBodyScrollLocks();

	assert.equal(globalThis.document.body.style.overflow, "scroll");
	assert.equal(globalThis.document.body.style.position, "relative");
	assert.deepEqual(scrollCalls, [{ x: 0, y: 120 }]);
});
