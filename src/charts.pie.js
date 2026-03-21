/**
 * Pass/Fail Pie Chart — donut-style chart for project pass rate.
 * Colour-coded slices with a center percentage label and legend.
 * @module graphs.pie
 */

import { svgEl } from "./charts.helpers.js";

// ── Public renderer ────────────────────────────────────────────────
/**
 * Renders an animated donut-style pie chart for PASS vs FAIL ratio.
 * @param {HTMLElement} container - Target container
 * @param {Array<{grade:number, object:{type:string}}>} results
 */
export const renderPassFailPieChart = (container, results) => {
	container.replaceChildren();

	const projects = results.filter((r) => r.object?.type === "project");
	if (!projects.length) {
		container.textContent = "No project data available.";
		return;
	}

	const passed = projects.filter((r) => r.grade >= 1).length;
	const failed = projects.length - passed;
	const total = projects.length;

	const width = 320;
	const height = 320;
	const cx = width / 2;
	const cy = height / 2;
	const outerR = 110;
	const innerR = 65;

	// Build the arc path for a donut segment
	/** @param {number} frac @param {number} startAngle @returns {string} */
	const arcPath = (frac, startAngle) => {
		const endAngle = startAngle + frac * 2 * Math.PI;
		const x1 = cx + outerR * Math.cos(startAngle - Math.PI / 2);
		const y1 = cy + outerR * Math.sin(startAngle - Math.PI / 2);
		const x2 = cx + outerR * Math.cos(endAngle - Math.PI / 2);
		const y2 = cy + outerR * Math.sin(endAngle - Math.PI / 2);
		const ix1 = cx + innerR * Math.cos(endAngle - Math.PI / 2);
		const iy1 = cy + innerR * Math.sin(endAngle - Math.PI / 2);
		const ix2 = cx + innerR * Math.cos(startAngle - Math.PI / 2);
		const iy2 = cy + innerR * Math.sin(startAngle - Math.PI / 2);
		const la = frac > 0.5 ? 1 : 0;
		return `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${la} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${la} 0 ${ix2} ${iy2} Z`;
	};

	const svg = svgEl("svg", {
		viewBox: `0 0 ${width} ${height}`,
		preserveAspectRatio: "xMidYMid meet",
		"aria-label": "Pass/Fail ratio pie chart",
		role: "img",
	});

	// Gradient definitions for pass/fail colours
	const defs = svgEl("defs");
	const gPass = svgEl("linearGradient", {
		id: "pie-pass",
		x1: "0%",
		y1: "0%",
		x2: "100%",
		y2: "100%",
	});
	gPass.append(
		svgEl("stop", { offset: "0%", "stop-color": "#34d399" }),
		svgEl("stop", { offset: "100%", "stop-color": "#6ee7b7" }),
	);
	const gFail = svgEl("linearGradient", {
		id: "pie-fail",
		x1: "0%",
		y1: "0%",
		x2: "100%",
		y2: "100%",
	});
	gFail.append(
		svgEl("stop", { offset: "0%", "stop-color": "#f87171" }),
		svgEl("stop", { offset: "100%", "stop-color": "#fca5a5" }),
	);
	defs.append(gPass, gFail);
	svg.append(defs);

	const passFrac = passed / total;
	const failFrac = failed / total;

	// Render pass slice
	if (passFrac > 0) {
		const passPath = svgEl("path", {
			d: arcPath(passFrac, 0),
			fill: "url(#pie-pass)",
			class: "donut-slice",
		});
		const t = svgEl("title");
		t.textContent = `Passed: ${passed}`;
		passPath.append(t);
		svg.append(passPath);
	}

	// Render fail slice
	if (failFrac > 0) {
		const failPath = svgEl("path", {
			d: arcPath(failFrac, passFrac * 2 * Math.PI),
			fill: "url(#pie-fail)",
			class: "donut-slice",
		});
		const t = svgEl("title");
		t.textContent = `Failed: ${failed}`;
		failPath.append(t);
		svg.append(failPath);
	}

	// Center percentage label
	const pct = Math.round(passFrac * 100);
	const centerVal = svgEl("text", {
		x: cx,
		y: cy - 10,
		class: "donut-center-value",
		"text-anchor": "middle",
		"dominant-baseline": "middle",
	});
	centerVal.textContent = `${pct}%`;
	const centerLbl = svgEl("text", {
		x: cx,
		y: cy + 18,
		class: "donut-center-label",
		"text-anchor": "middle",
	});
	centerLbl.textContent = "Pass Rate";
	svg.append(centerVal, centerLbl);

	// Legend entries
	[
		{ color: "#34d399", label: `Passed: ${passed}` },
		{ color: "#f87171", label: `Failed: ${failed}` },
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
