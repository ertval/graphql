/**
 * SVG Graph Generation Module
 * Creates dynamic SVG charts programmatically using vanilla JS.
 * No external charting libraries — pure SVG via document.createElementNS.
 * @module graphs
 */

const SVG_NS = "http://www.w3.org/2000/svg";

/* -------------------------------------------------------------------
   SVG Helpers
   ------------------------------------------------------------------- */

/**
 * Creates an SVG element with given attributes.
 * @param {string} tag - SVG element tag name
 * @param {Object<string,string|number>} attrs - Attribute key/value pairs
 * @returns {SVGElement}
 */
const svgEl = (tag, attrs = {}) => {
	const el = document.createElementNS(SVG_NS, tag);
	for (const [k, v] of Object.entries(attrs)) {
		el.setAttribute(k, String(v));
	}
	return el;
};

/**
 * Formats bytes to human-readable XP (kB, MB).
 * @param {number} bytes
 * @returns {string}
 */
const formatXP = (bytes) => {
	if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
	if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} kB`;
	return `${bytes} B`;
};

/**
 * Formats a date string to short label.
 * @param {string} isoStr
 * @returns {string}
 */
const formatDateLabel = (isoStr) => {
	const instant = Temporal.Instant.from(isoStr);
	const zdt = instant.toZonedDateTimeISO(Temporal.Now.timeZoneId());
	return `${zdt.toLocaleString("en", { month: "short" })} ${zdt.year.toString().slice(-2)}`;
};

/* -------------------------------------------------------------------
   GRAPH 1: Line Chart — XP Progress Over Time
   ------------------------------------------------------------------- */

/**
 * Renders a line chart showing cumulative XP over time.
 * @param {HTMLElement} container - The container to render into
 * @param {Array<{amount:number, createdAt:string, object:{name:string}}>} transactions - XP transactions sorted by date
 */
export const renderXPLineChart = (container, transactions) => {
	container.innerHTML = "";

	if (!transactions.length) {
		container.textContent = "No XP data available.";
		return;
	}

	// Build cumulative data points
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

	// Chart dimensions
	const width = 600;
	const height = 300;
	const padding = { top: 20, right: 30, bottom: 50, left: 70 };
	const chartW = width - padding.left - padding.right;
	const chartH = height - padding.top - padding.bottom;

	const maxXP = Math.max(...points.map((p) => p.total));
	const minDate = Temporal.Instant.from(points[0].date).epochMilliseconds;
	const maxDate = Temporal.Instant.from(points.at(-1).date).epochMilliseconds;
	const dateRange = maxDate - minDate || 1;

	// Scale functions
	const scaleX = (isoStr) => {
		const ms = Temporal.Instant.from(isoStr).epochMilliseconds;
		return padding.left + ((ms - minDate) / dateRange) * chartW;
	};
	const scaleY = (val) => padding.top + chartH - (val / maxXP) * chartH;

	// SVG root
	const svg = svgEl("svg", {
		viewBox: `0 0 ${width} ${height}`,
		preserveAspectRatio: "xMidYMid meet",
	});

	// Defs: gradients
	const defs = svgEl("defs");
	const lineGrad = svgEl("linearGradient", {
		id: "line-gradient",
		x1: "0%",
		y1: "0%",
		x2: "100%",
		y2: "0%",
	});
	lineGrad.append(
		svgEl("stop", { offset: "0%", "stop-color": "#6366f1" }),
		svgEl("stop", { offset: "100%", "stop-color": "#a855f7" }),
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
			"stop-color": "#6366f1",
			"stop-opacity": "0.3",
		}),
		svgEl("stop", {
			offset: "100%",
			"stop-color": "#6366f1",
			"stop-opacity": "0.0",
		}),
	);
	defs.append(lineGrad, areaGrad);
	svg.append(defs);

	// Grid lines (horizontal)
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

	// Axes
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

	// Date labels on X axis (show ~6 labels max)
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

	// Area path
	const areaCoords = points
		.map((p) => `${scaleX(p.date)},${scaleY(p.total)}`)
		.join(" L");
	const areaPath = svgEl("path", {
		d: `M${scaleX(points[0].date)},${scaleY(0)} L${areaCoords} L${scaleX(points.at(-1).date)},${scaleY(0)} Z`,
		class: "line-area",
	});
	svg.append(areaPath);

	// Line path
	const lineCoords = points
		.map((p) => `${scaleX(p.date)},${scaleY(p.total)}`)
		.join(" L");
	const linePath = svgEl("path", {
		d: `M${lineCoords}`,
		class: "line-path",
	});
	svg.append(linePath);

	// Tooltip element
	const tooltip = document.createElement("div");
	tooltip.className = "graph-tooltip";
	container.style.position = "relative";
	container.append(tooltip);

	// Data dots (sample for performance — max 30 dots)
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
	// Always show last dot
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

/* -------------------------------------------------------------------
   GRAPH 2: Bar Chart — XP by Project (Top N)
   ------------------------------------------------------------------- */

/**
 * Renders a horizontal bar chart showing XP earned per project.
 * @param {HTMLElement} container - The container to render into
 * @param {Array<{amount:number, object:{name:string}}>} transactions - XP transactions
 */
export const renderProjectBarChart = (container, transactions) => {
	container.innerHTML = "";

	if (!transactions.length) {
		container.textContent = "No project data available.";
		return;
	}

	// Aggregate XP by project name
	const xpByProject = Object.groupBy(
		transactions,
		(tx) => tx.object?.name ?? "Unknown",
	);
	const projectEntries = Object.entries(xpByProject)
		.map(([name, txs]) => ({
			name,
			total: txs.reduce((sum, tx) => sum + tx.amount, 0),
		}))
		.toSorted((a, b) => b.total - a.total)
		.slice(0, 15); // Top 15

	// Chart dimensions
	const barHeight = 28;
	const barGap = 8;
	const width = 600;
	const padding = { top: 10, right: 80, bottom: 10, left: 140 };
	const chartW = width - padding.left - padding.right;
	const height =
		padding.top + padding.bottom + projectEntries.length * (barHeight + barGap);

	const maxXP = Math.max(...projectEntries.map((p) => p.total));

	const svg = svgEl("svg", {
		viewBox: `0 0 ${width} ${height}`,
		preserveAspectRatio: "xMidYMid meet",
	});

	// Defs: bar gradient
	const defs = svgEl("defs");
	const barGrad = svgEl("linearGradient", {
		id: "bar-grad",
		x1: "0%",
		y1: "0%",
		x2: "100%",
		y2: "0%",
	});
	barGrad.append(
		svgEl("stop", { offset: "0%", "stop-color": "#6366f1" }),
		svgEl("stop", { offset: "100%", "stop-color": "#a855f7" }),
	);
	defs.append(barGrad);
	svg.append(defs);

	// Tooltip
	const tooltip = document.createElement("div");
	tooltip.className = "graph-tooltip";
	container.style.position = "relative";
	container.append(tooltip);

	projectEntries.forEach((project, i) => {
		const y = padding.top + i * (barHeight + barGap);
		const barW = (project.total / maxXP) * chartW;

		// Project label
		const label = svgEl("text", {
			x: padding.left - 8,
			y: y + barHeight / 2 + 4,
			class: "graph-label",
			"text-anchor": "end",
		});
		// Truncate long names
		label.textContent =
			project.name.length > 18 ? `${project.name.slice(0, 16)}…` : project.name;
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

		// Value bar
		const bar = svgEl("rect", {
			x: padding.left,
			y,
			width: 0,
			height: barHeight,
			fill: "url(#bar-grad)",
			class: "bar-rect",
		});
		svg.append(bar);

		// Animate bar width
		requestAnimationFrame(() => {
			bar.setAttribute("width", String(barW));
			bar.style.transition = "width 0.8s cubic-bezier(0.4,0,0.2,1)";
		});

		// Value label
		const valLabel = svgEl("text", {
			x: padding.left + barW + 8,
			y: y + barHeight / 2 + 4,
			class: "graph-label",
			"text-anchor": "start",
		});
		valLabel.textContent = formatXP(project.total);
		svg.append(valLabel);

		// Hover tooltip
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
	});

	container.prepend(svg);
};
