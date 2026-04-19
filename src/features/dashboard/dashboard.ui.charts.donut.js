/**
 * Audit Donut Chart — visualises audit ratio (bytes done vs received).
 * Renders two arc slices around an inner ring with a center ratio label.
 * @module graphs.donut
 */

import { svgEl } from "./helpers.js";

// ── Public renderer ────────────────────────────────────────────────
/**
 * Renders an animated donut chart for audit data.
 * @param {HTMLElement} container - Target container
 * @param {number} totalUp   - Bytes audited (done by user)
 * @param {number} totalDown - Bytes received / audited on user
 */
export const renderAuditDonutChart = (container, totalUp, totalDown) => {
	container.replaceChildren();

	if (!totalUp && !totalDown) {
		container.textContent = "No audit data available.";
		return;
	}

	const width = 320;
	const height = 320;
	const cx = width / 2;
	const cy = height / 2;
	const outerR = 110;
	const innerR = 70;

	const total = totalUp + totalDown || 1;
	const upFrac = totalUp / total;
	const downFrac = totalDown / total;

	// Compute slice arc coordinates for a donut segment
	/** @param {number} frac @param {number} startAngle */
	const sliceCoords = (frac, startAngle) => {
		const endAngle = startAngle + frac * 2 * Math.PI;
		const x1 = cx + outerR * Math.cos(startAngle - Math.PI / 2);
		const y1 = cy + outerR * Math.sin(startAngle - Math.PI / 2);
		const x2 = cx + outerR * Math.cos(endAngle - Math.PI / 2);
		const y2 = cy + outerR * Math.sin(endAngle - Math.PI / 2);
		const ix1 = cx + innerR * Math.cos(endAngle - Math.PI / 2);
		const iy1 = cy + innerR * Math.sin(endAngle - Math.PI / 2);
		const ix2 = cx + innerR * Math.cos(startAngle - Math.PI / 2);
		const iy2 = cy + innerR * Math.sin(startAngle - Math.PI / 2);
		const largeArc = frac > 0.5 ? 1 : 0;
		return { x1, y1, x2, y2, ix1, iy1, ix2, iy2, largeArc };
	};

	// Build an SVG path element for one donut slice
	const makeSlice = (c, fill, titleText) => {
		const d = `M ${c.x1} ${c.y1} A ${outerR} ${outerR} 0 ${c.largeArc} 1 ${c.x2} ${c.y2} L ${c.ix1} ${c.iy1} A ${innerR} ${innerR} 0 ${c.largeArc} 0 ${c.ix2} ${c.iy2} Z`;
		const path = svgEl("path", { d, fill, class: "donut-slice" });
		const t = svgEl("title");
		t.textContent = titleText;
		path.append(t);
		return path;
	};

	/** @param {number} bytes @returns {string} */
	const fmt = (bytes) => {
		if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
		if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} kB`;
		return `${bytes} B`;
	};

	const svg = svgEl("svg", {
		viewBox: `0 0 ${width} ${height}`,
		preserveAspectRatio: "xMidYMid meet",
		"aria-label": "Audit ratio donut chart",
		role: "img",
	});

	// Gradient definitions for the two slices
	const defs = svgEl("defs");
	const gUp = svgEl("linearGradient", {
		id: "donut-up",
		x1: "0%",
		y1: "0%",
		x2: "100%",
		y2: "100%",
	});
	gUp.append(
		svgEl("stop", { offset: "0%", "stop-color": "#0ea5e9" }),
		svgEl("stop", { offset: "100%", "stop-color": "#38bdf8" }),
	);
	const gDown = svgEl("linearGradient", {
		id: "donut-down",
		x1: "0%",
		y1: "0%",
		x2: "100%",
		y2: "100%",
	});
	gDown.append(
		svgEl("stop", { offset: "0%", "stop-color": "#06b6d4" }),
		svgEl("stop", { offset: "100%", "stop-color": "#22d3ee" }),
	);
	defs.append(gUp, gDown);
	svg.append(defs);

	// Render both arc slices
	svg.append(
		makeSlice(
			sliceCoords(upFrac, 0),
			"url(#donut-up)",
			`Done: ${fmt(totalUp)}`,
		),
	);
	svg.append(
		makeSlice(
			sliceCoords(downFrac, upFrac * 2 * Math.PI),
			"url(#donut-down)",
			`Received: ${fmt(totalDown)}`,
		),
	);

	// Center ratio value and label
	const ratioVal = svgEl("text", {
		x: cx,
		y: cy - 10,
		class: "donut-center-value",
		"text-anchor": "middle",
		"dominant-baseline": "middle",
	});
	ratioVal.textContent = (totalUp / (totalDown || 1)).toFixed(2);
	const ratioLbl = svgEl("text", {
		x: cx,
		y: cy + 18,
		class: "donut-center-label",
		"text-anchor": "middle",
	});
	ratioLbl.textContent = "Audit Ratio";
	svg.append(ratioVal, ratioLbl);

	// Legend entries
	[
		{ color: "#6366f1", label: `Done: ${fmt(totalUp)}` },
		{ color: "#a855f7", label: `Received: ${fmt(totalDown)}` },
	].forEach(({ color, label }, i) => {
		const rect = svgEl("rect", {
			x: 20,
			y: height - 50 + i * 22,
			width: 14,
			height: 14,
			rx: 3,
			fill: color,
		});
		const text = svgEl("text", {
			x: 42,
			y: height - 39 + i * 22,
			class: "graph-label",
			"dominant-baseline": "middle",
		});
		text.textContent = label;
		svg.append(rect, text);
	});

	container.append(svg);
};
