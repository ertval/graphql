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

/* -------------------------------------------------------------------
   GRAPH 3: Donut Chart — Audit Ratio (Done vs Received)
   ------------------------------------------------------------------- */

/**
 * Renders an animated donut chart for audit data (bytes done vs bytes received).
 * @param {HTMLElement} container - The container to render into
 * @param {number} totalUp - Bytes audited (done by user)
 * @param {number} totalDown - Bytes received / audited on user
 */
export const renderAuditDonutChart = (container, totalUp, totalDown) => {
	container.innerHTML = "";

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

	const defs = svgEl("defs");
	const gUp = svgEl("linearGradient", { id: "donut-up", x1: "0%", y1: "0%", x2: "100%", y2: "100%" });
	gUp.append(
		svgEl("stop", { offset: "0%", "stop-color": "#6366f1" }),
		svgEl("stop", { offset: "100%", "stop-color": "#818cf8" }),
	);
	const gDown = svgEl("linearGradient", { id: "donut-down", x1: "0%", y1: "0%", x2: "100%", y2: "100%" });
	gDown.append(
		svgEl("stop", { offset: "0%", "stop-color": "#a855f7" }),
		svgEl("stop", { offset: "100%", "stop-color": "#c084fc" }),
	);
	defs.append(gUp, gDown);
	svg.append(defs);

	svg.append(makeSlice(sliceCoords(upFrac, 0), "url(#donut-up)", `Done: ${fmt(totalUp)}`));
	svg.append(makeSlice(sliceCoords(downFrac, upFrac * 2 * Math.PI), "url(#donut-down)", `Received: ${fmt(totalDown)}`));

	// Center label
	const ratioVal = svgEl("text", {
		x: cx, y: cy - 10,
		class: "donut-center-value",
		"text-anchor": "middle",
		"dominant-baseline": "middle",
	});
	ratioVal.textContent = (totalUp / (totalDown || 1)).toFixed(2);
	const ratioLbl = svgEl("text", { x: cx, y: cy + 18, class: "donut-center-label", "text-anchor": "middle" });
	ratioLbl.textContent = "Audit Ratio";
	svg.append(ratioVal, ratioLbl);

	// Legend
	[
		{ color: "#6366f1", label: `Done: ${fmt(totalUp)}` },
		{ color: "#a855f7", label: `Received: ${fmt(totalDown)}` },
	].forEach(({ color, label }, i) => {
		const rect = svgEl("rect", { x: 20, y: height - 50 + i * 22, width: 14, height: 14, rx: 3, fill: color });
		const text = svgEl("text", { x: 42, y: height - 39 + i * 22, class: "graph-label", "dominant-baseline": "middle" });
		text.textContent = label;
		svg.append(rect, text);
	});

	container.append(svg);
};

/* -------------------------------------------------------------------
   GRAPH 4: Pie Chart — Pass / Fail Project Ratio
   ------------------------------------------------------------------- */

/**
 * Renders an animated donut-style pie chart for PASS vs FAIL project ratio.
 * @param {HTMLElement} container - The container to render into
 * @param {Array<{grade:number, object:{type:string}}>} results - Result records
 */
export const renderPassFailPieChart = (container, results) => {
	container.innerHTML = "";

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

	const defs = svgEl("defs");
	const gPass = svgEl("linearGradient", { id: "pie-pass", x1: "0%", y1: "0%", x2: "100%", y2: "100%" });
	gPass.append(
		svgEl("stop", { offset: "0%", "stop-color": "#34d399" }),
		svgEl("stop", { offset: "100%", "stop-color": "#6ee7b7" }),
	);
	const gFail = svgEl("linearGradient", { id: "pie-fail", x1: "0%", y1: "0%", x2: "100%", y2: "100%" });
	gFail.append(
		svgEl("stop", { offset: "0%", "stop-color": "#f87171" }),
		svgEl("stop", { offset: "100%", "stop-color": "#fca5a5" }),
	);
	defs.append(gPass, gFail);
	svg.append(defs);

	const passFrac = passed / total;
	const failFrac = failed / total;

	if (passFrac > 0) {
		const passPath = svgEl("path", { d: arcPath(passFrac, 0), fill: "url(#pie-pass)", class: "donut-slice" });
		const t = svgEl("title"); t.textContent = `Passed: ${passed}`;
		passPath.append(t);
		svg.append(passPath);
	}
	if (failFrac > 0) {
		const failPath = svgEl("path", { d: arcPath(failFrac, passFrac * 2 * Math.PI), fill: "url(#pie-fail)", class: "donut-slice" });
		const t = svgEl("title"); t.textContent = `Failed: ${failed}`;
		failPath.append(t);
		svg.append(failPath);
	}

	// Center text
	const pct = Math.round(passFrac * 100);
	const centerVal = svgEl("text", { x: cx, y: cy - 10, class: "donut-center-value", "text-anchor": "middle", "dominant-baseline": "middle" });
	centerVal.textContent = `${pct}%`;
	const centerLbl = svgEl("text", { x: cx, y: cy + 18, class: "donut-center-label", "text-anchor": "middle" });
	centerLbl.textContent = "Pass Rate";
	svg.append(centerVal, centerLbl);

	// Legend
	[
		{ color: "#34d399", label: `Passed: ${passed}` },
		{ color: "#f87171", label: `Failed: ${failed}` },
	].forEach(({ color, label }, i) => {
		const rect = svgEl("rect", { x: 20, y: height - 50 + i * 22, width: 14, height: 14, rx: 3, fill: color });
		const text = svgEl("text", { x: 42, y: height - 39 + i * 22, class: "graph-label", "dominant-baseline": "middle" });
		text.textContent = label;
		svg.append(rect, text);
	});

	container.append(svg);
};
