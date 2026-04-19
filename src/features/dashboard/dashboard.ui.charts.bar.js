/**
 * Project Bar Chart — horizontal bars showing XP earned per project.
 * Includes bar layout computation and clickable project labels.
 * @module graphs.bar
 */

import { createTooltip, formatXP, svgEl } from "./helpers.js";

// ── Layout computation (also used by tests) ────────────────────────
/**
 * Computes dynamic row sizing for the XP-by-project bar chart.
 * @param {number} projectCount
 * @returns {{rowCount:number,barHeight:number,barGap:number,totalHeight:number,padding:{top:number,right:number,bottom:number,left:number}}}
 */
export const computeProjectBarLayout = (projectCount) => {
	const padding = { top: 10, right: 80, bottom: 12, left: 140 };
	const safeProjectCount = Math.max(0, Math.floor(projectCount));
	if (!safeProjectCount) {
		return {
			rowCount: 0,
			barHeight: 24,
			barGap: 8,
			totalHeight: padding.top + padding.bottom,
			padding,
		};
	}

	const maxRowsToDisplay = 28;
	const rowCount = Math.min(safeProjectCount, maxRowsToDisplay);
	const barHeight = 24;
	const barGap = 8;
	const chartHeight = rowCount * barHeight + Math.max(0, rowCount - 1) * barGap;

	return {
		rowCount,
		barHeight,
		barGap,
		totalHeight: padding.top + padding.bottom + chartHeight,
		padding,
	};
};

// ── Public renderer ────────────────────────────────────────────────
/**
 * Renders a horizontal bar chart showing XP earned per project.
 * @param {HTMLElement} container - Target container
 * @param {Array<{amount:number, object:{name:string}}>} transactions
 */
export const renderProjectBarChart = (container, transactions) => {
	container.replaceChildren();

	if (!transactions.length) {
		container.textContent = "No project data available.";
		return;
	}

	// Aggregate XP by stable project identity (object id when available).
	const xpByProject = Object.groupBy(transactions, (tx) => {
		const objectId = tx.object?.id;
		if (typeof objectId === "number") {
			return `id:${objectId}`;
		}
		return `name:${tx.object?.name ?? "Unknown"}`;
	});
	const projectEntries = Object.entries(xpByProject)
		.map(([key, txs]) => ({
			name: txs[0]?.object?.name ?? "Unknown",
			objectId:
				typeof txs[0]?.object?.id === "number" ? txs[0].object.id : null,
			key,
			total: txs.reduce((sum, tx) => sum + tx.amount, 0),
		}))
		.toSorted((a, b) => b.total - a.total);

	// Chart dimensions determined by content
	const width = 600;
	const layout = computeProjectBarLayout(projectEntries.length);
	const { rowCount, barHeight, barGap, totalHeight, padding } = layout;
	const visibleProjects = projectEntries.slice(0, rowCount);
	const chartW = width - padding.left - padding.right;
	const height = totalHeight;

	const maxXP = Math.max(...visibleProjects.map((p) => p.total));

	const svg = svgEl("svg", {
		viewBox: `0 0 ${width} ${height}`,
		preserveAspectRatio: "xMidYMid meet",
	});

	// Bar gradient definition
	const defs = svgEl("defs");
	const barGrad = svgEl("linearGradient", {
		id: "bar-grad",
		x1: "0%",
		y1: "0%",
		x2: "100%",
		y2: "0%",
	});
	barGrad.append(
		svgEl("stop", { offset: "0%", "stop-color": "#0ea5e9" }),
		svgEl("stop", { offset: "100%", "stop-color": "#06b6d4" }),
	);
	defs.append(barGrad);
	svg.append(defs);

	// Tooltip for bar hover
	const tooltip = createTooltip(container);

	visibleProjects.forEach((project, i) => {
		const y = padding.top + i * (barHeight + barGap);
		const barW = (project.total / maxXP) * chartW;

		// Custom event emitter for project detail integration
		const emitProjectClick = () => {
			container.dispatchEvent(
				new CustomEvent("projectClick", {
					detail: {
						name: project.name,
						objectId: project.objectId,
						totalXP: project.total,
					},
					bubbles: true,
				}),
			);
		};

		// Clickable project name label (truncated if long)
		const label = svgEl("text", {
			x: padding.left - 8,
			y: y + barHeight / 2 + 4,
			class: "graph-label",
			"text-anchor": "end",
			tabindex: 0,
			role: "button",
			"aria-label": `View details for ${project.name}`,
		});
		label.textContent =
			project.name.length > 18 ? `${project.name.slice(0, 16)}…` : project.name;
		label.classList.add("graph-project-label");
		label.addEventListener("click", emitProjectClick);
		label.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				emitProjectClick();
			}
		});
		svg.append(label);

		// Background track
		svg.append(
			svgEl("rect", {
				x: padding.left,
				y,
				width: chartW,
				height: barHeight,
				fill: "rgba(255,255,255,0.02)",
				rx: 4,
				ry: 4,
			}),
		);

		// Animated value bar
		const bar = svgEl("rect", {
			x: padding.left,
			y,
			width: 0,
			height: barHeight,
			fill: "url(#bar-grad)",
			class: "bar-rect",
		});
		svg.append(bar);

		requestAnimationFrame(() => {
			bar.setAttribute("width", String(barW));
			bar.style.transition = "width 0.8s cubic-bezier(0.4,0,0.2,1)";
		});

		// XP value label to the right of the bar
		const valLabel = svgEl("text", {
			x: padding.left + barW + 8,
			y: y + barHeight / 2 + 4,
			class: "graph-label",
			"text-anchor": "start",
		});
		valLabel.textContent = formatXP(project.total);
		svg.append(valLabel);

		// Hover tooltip on bars
		bar.addEventListener("mouseenter", (e) => {
			tooltip.textContent = `${project.name}: ${formatXP(project.total)}`;
			tooltip.classList.add("visible");
			const rect = container.getBoundingClientRect();
			tooltip.style.left = `${e.clientX - rect.left + 10}px`;
			tooltip.style.top = `${e.clientY - rect.top - 30}px`;
		});
		bar.addEventListener("mouseleave", () =>
			tooltip.classList.remove("visible"),
		);
		bar.addEventListener("click", emitProjectClick);
	});

	container.prepend(svg);
};
