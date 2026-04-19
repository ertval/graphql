/**
 * XP Line Chart — cumulative XP progress over time.
 * Renders an SVG area + line chart with interactive tooltip dots.
 * @module graphs.line
 */

import { createTooltip, formatDateLabel, formatXP, svgEl } from "./helpers.js";

// ── Public renderer ────────────────────────────────────────────────
/**
 * Renders a cumulative XP line chart into the given container.
 * @param {HTMLElement} container - Target container
 * @param {Array<{amount:number, createdAt:string, object:{name:string}}>} transactions
 */
export const renderXPLineChart = (container, transactions) => {
	container.replaceChildren();

	if (!transactions.length) {
		container.textContent = "No XP data available.";
		return;
	}

	// Build cumulative data points from transactions
	let cumulative = 0;
	const points = transactions.map((tx) => {
		cumulative += tx.amount;
		return {
			date: tx.createdAt,
			total: cumulative,
			name: tx.object?.name ?? "Unknown",
			amount: tx.amount,
		};
	});

	// Chart dimensions and padding
	const width = 600;
	const height = 300;
	const padding = { top: 20, right: 30, bottom: 50, left: 70 };
	const chartW = width - padding.left - padding.right;
	const chartH = height - padding.top - padding.bottom;

	const maxXP = Math.max(...points.map((p) => p.total));
	const minDate = Temporal.Instant.from(points[0].date).epochMilliseconds;
	const maxDate = Temporal.Instant.from(points.at(-1).date).epochMilliseconds;
	const dateRange = maxDate - minDate || 1;

	// Scale helpers
	const scaleX = (isoStr) => {
		const ms = Temporal.Instant.from(isoStr).epochMilliseconds;
		return padding.left + ((ms - minDate) / dateRange) * chartW;
	};
	const scaleY = (val) => padding.top + chartH - (val / maxXP) * chartH;

	// Create SVG root
	const svg = svgEl("svg", {
		viewBox: `0 0 ${width} ${height}`,
		preserveAspectRatio: "xMidYMid meet",
	});

	// Gradient definitions
	const defs = svgEl("defs");
	const lineGrad = svgEl("linearGradient", {
		id: "line-gradient",
		x1: "0%",
		y1: "0%",
		x2: "100%",
		y2: "0%",
	});
	lineGrad.append(
		svgEl("stop", { offset: "0%", "stop-color": "#0ea5e9" }),
		svgEl("stop", { offset: "100%", "stop-color": "#06b6d4" }),
	);
	const areaGrad = svgEl("linearGradient", {
		id: "area-gradient",
		x1: "0",
		y1: "0",
		x2: "0",
		y2: "1",
	});
	areaGrad.append(
		svgEl("stop", {
			offset: "0%",
			"stop-color": "#0ea5e9",
			"stop-opacity": "0.3",
		}),
		svgEl("stop", {
			offset: "100%",
			"stop-color": "#0ea5e9",
			"stop-opacity": "0.0",
		}),
	);
	defs.append(lineGrad, areaGrad);
	svg.append(defs);

	// Horizontal grid lines with Y-axis labels
	const gridSteps = 5;
	for (let i = 0; i <= gridSteps; i++) {
		const y = padding.top + (i / gridSteps) * chartH;
		const val = maxXP - (i / gridSteps) * maxXP;
		svg.append(
			svgEl("line", {
				x1: padding.left,
				y1: y,
				x2: padding.left + chartW,
				y2: y,
				class: "graph-grid-line",
			}),
		);
		const label = svgEl("text", {
			x: padding.left - 8,
			y: y + 4,
			class: "graph-label",
			"text-anchor": "end",
		});
		label.textContent = formatXP(val);
		svg.append(label);
	}

	// X and Y axes
	svg.append(
		svgEl("line", {
			x1: padding.left,
			y1: padding.top + chartH,
			x2: padding.left + chartW,
			y2: padding.top + chartH,
			class: "graph-axis-line",
		}),
	);
	svg.append(
		svgEl("line", {
			x1: padding.left,
			y1: padding.top,
			x2: padding.left,
			y2: padding.top + chartH,
			class: "graph-axis-line",
		}),
	);

	// Date labels on X axis (max ~6 labels)
	const labelCount = Math.min(points.length, 6);
	const labelStep = Math.max(1, Math.floor(points.length / labelCount));
	for (let i = 0; i < points.length; i += labelStep) {
		const p = points[i];
		const x = scaleX(p.date);
		const label = svgEl("text", {
			x,
			y: padding.top + chartH + 20,
			class: "graph-label",
			"text-anchor": "middle",
		});
		label.textContent = formatDateLabel(p.date);
		svg.append(label);
	}

	// Filled area path under the line
	const areaCoords = points
		.map((p) => `${scaleX(p.date)},${scaleY(p.total)}`)
		.join(" L");
	const areaPath = svgEl("path", {
		d: `M${scaleX(points[0].date)},${scaleY(0)} L${areaCoords} L${scaleX(points.at(-1).date)},${scaleY(0)} Z`,
		class: "line-area",
	});
	svg.append(areaPath);

	// Main line path
	const lineCoords = points
		.map((p) => `${scaleX(p.date)},${scaleY(p.total)}`)
		.join(" L");
	const linePath = svgEl("path", {
		d: `M${lineCoords}`,
		class: "line-path",
	});
	svg.append(linePath);

	// Tooltip element
	const tooltip = createTooltip(container);

	// Sampled data dots (max 30 for performance)
	const dotStep = Math.max(1, Math.floor(points.length / 30));
	for (let i = 0; i < points.length; i += dotStep) {
		const p = points[i];
		const cx = scaleX(p.date);
		const cy = scaleY(p.total);
		const dot = svgEl("circle", { cx, cy, r: 3.5, class: "line-dot" });

		dot.addEventListener("mouseenter", (e) => {
			tooltip.textContent = `${p.name}: +${formatXP(p.amount)} (Total: ${formatXP(p.total)})`;
			tooltip.classList.add("visible");
			const rect = container.getBoundingClientRect();
			tooltip.style.left = `${e.clientX - rect.left + 10}px`;
			tooltip.style.top = `${e.clientY - rect.top - 30}px`;
		});
		dot.addEventListener("mouseleave", () =>
			tooltip.classList.remove("visible"),
		);

		svg.append(dot);
	}

	// Always show the last dot as a larger point
	if (points.length > 1) {
		const last = points.at(-1);
		const dot = svgEl("circle", {
			cx: scaleX(last.date),
			cy: scaleY(last.total),
			r: 4.5,
			class: "line-dot",
		});
		dot.addEventListener("mouseenter", (e) => {
			tooltip.textContent = `Total: ${formatXP(last.total)}`;
			tooltip.classList.add("visible");
			const rect = container.getBoundingClientRect();
			tooltip.style.left = `${e.clientX - rect.left + 10}px`;
			tooltip.style.top = `${e.clientY - rect.top - 30}px`;
		});
		dot.addEventListener("mouseleave", () =>
			tooltip.classList.remove("visible"),
		);
		svg.append(dot);
	}

	container.prepend(svg);
};
