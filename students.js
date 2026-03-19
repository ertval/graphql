/**
 * Students Leaderboard Module
 * Displays all school students with sorting, filtering, and pagination.
 * Clicking a student opens their profile in a dedicated view.
 * @module students
 */

import {
	fetchAllStudents,
	fetchProgress,
	fetchResults,
	fetchSkills,
	fetchStudentInfo,
	fetchStudentXPAndLevel,
	fetchXPTransactions,
} from "./api.js";
import {
	renderAuditDonutChart,
	renderPassFailPieChart,
	renderProjectBarChart,
	renderXPLineChart,
} from "./graphs.js";

/* -------------------------------------------------------------------
   State
   ------------------------------------------------------------------- */

/** @type {Array<{id:number,login:string,firstName:string,lastName:string,campus:string,auditRatio:number,totalUp:number,totalDown:number,totalXP:number,level:number}>} */
let allStudents = [];

/** @type {'login'|'level'|'totalXP'|'auditRatio'} */
let sortField = "level";
let sortDir = /** @type {'asc'|'desc'} */ ("desc");

let filterText = "";
let filterCampus = "";

const PAGE_SIZE = 20;
let currentPage = 1;

/* -------------------------------------------------------------------
   DOM helpers
   ------------------------------------------------------------------- */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

/* -------------------------------------------------------------------
   Formatting helpers
   ------------------------------------------------------------------- */

/**
 * Formats bytes to human-readable XP.
 * @param {number} bytes
 * @returns {string}
 */
const formatXP = (bytes) => {
	if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
	if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} kB`;
	return `${bytes} B`;
};

/* -------------------------------------------------------------------
   Filter & Sort pipeline
   ------------------------------------------------------------------- */

/** @returns {typeof allStudents} */
const getFiltered = () => {
	const query = filterText.toLowerCase();
	return allStudents.filter((s) => {
		const matchText =
			!query ||
			s.login.toLowerCase().includes(query) ||
			(s.firstName?.toLowerCase() ?? "").includes(query) ||
			(s.lastName?.toLowerCase() ?? "").includes(query);
		const matchCampus = !filterCampus || s.campus === filterCampus;
		return matchText && matchCampus;
	});
};

/** @returns {typeof allStudents} */
const getSorted = () => {
	const filtered = getFiltered();
	return filtered.toSorted((a, b) => {
		const av = a[sortField] ?? 0;
		const bv = b[sortField] ?? 0;
		if (typeof av === "string") {
			return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
		}
		return sortDir === "asc" ? av - bv : bv - av;
	});
};

/* -------------------------------------------------------------------
   Render Students Table
   ------------------------------------------------------------------- */

/** Renders the students table rows for the current page. */
export const renderStudentsList = () => {
	const tbody = $("#students-tbody");
	if (!tbody) return;

	const sorted = getSorted();
	const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
	currentPage = Math.min(currentPage, totalPages);

	const pageSlice = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

	tbody.innerHTML = "";
	if (!pageSlice.length) {
		tbody.innerHTML = `<tr><td colspan="6" class="students-empty">No students match your search.</td></tr>`;
		renderPagination(totalPages);
		return;
	}

	for (const [rank, student] of pageSlice.entries()) {
		const globalRank = (currentPage - 1) * PAGE_SIZE + rank + 1;
		const initials =
			`${(student.firstName?.[0] ?? "").toUpperCase()}${(student.lastName?.[0] ?? "").toUpperCase()}` ||
			student.login[0].toUpperCase();
		const displayName =
			[student.firstName, student.lastName].filter(Boolean).join(" ") || student.login;

		const tr = document.createElement("tr");
		tr.className = "student-row";
		tr.setAttribute("data-id", String(student.id));
		tr.setAttribute("tabindex", "0");
		tr.setAttribute("role", "button");
		tr.setAttribute("aria-label", `View ${displayName}'s profile`);
		tr.innerHTML = `
      <td class="td-rank">
        <span class="rank-num ${globalRank <= 3 ? `rank-top rank-${globalRank}` : ""}">${globalRank}</span>
      </td>
      <td class="td-avatar-name">
        <div class="student-avatar-mini">${initials}</div>
        <div class="student-name-col">
          <span class="student-display-name">${displayName}</span>
          <span class="student-login-tag">@${student.login}</span>
        </div>
      </td>
      <td class="td-campus">${student.campus ? `<span class="campus-tag">${student.campus}</span>` : "—"}</td>
      <td class="td-level"><span class="level-badge">Lvl ${student.level}</span></td>
      <td class="td-xp">${formatXP(student.totalXP)}</td>
      <td class="td-ratio">
        <span class="ratio-chip ${student.auditRatio >= 1 ? "ratio-good" : "ratio-low"}">${(student.auditRatio ?? 0).toFixed(2)}</span>
      </td>
    `;

		tr.addEventListener("click", () => openStudentProfile(student.id));
		tr.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				openStudentProfile(student.id);
			}
		});
		tbody.append(tr);
	}

	renderPagination(totalPages);
	updateSortHeaders();
	renderCampusFilter();
	updateStudentCount(sorted.length);
};

/* -------------------------------------------------------------------
   Pagination
   ------------------------------------------------------------------- */

/** @param {number} totalPages */
const renderPagination = (totalPages) => {
	const container = $("#students-pagination");
	if (!container) return;
	container.innerHTML = "";

	if (totalPages <= 1) return;

	const mkBtn = (label, page, disabled = false, active = false) => {
		const btn = document.createElement("button");
		btn.className = `page-btn${active ? " page-active" : ""}`;
		btn.textContent = label;
		btn.disabled = disabled;
		btn.addEventListener("click", () => {
			currentPage = page;
			renderStudentsList();
			$("#students-view")?.scrollIntoView({ behavior: "smooth", block: "start" });
		});
		return btn;
	};

	container.append(mkBtn("‹", currentPage - 1, currentPage === 1));

	// Show at most 7 page buttons
	const range = 3;
	const start = Math.max(1, currentPage - range);
	const end = Math.min(totalPages, currentPage + range);

	if (start > 1) {
		container.append(mkBtn("1", 1));
		if (start > 2) {
			const dots = document.createElement("span");
			dots.className = "page-dots";
			dots.textContent = "…";
			container.append(dots);
		}
	}
	for (let p = start; p <= end; p++) {
		container.append(mkBtn(String(p), p, false, p === currentPage));
	}
	if (end < totalPages) {
		if (end < totalPages - 1) {
			const dots = document.createElement("span");
			dots.className = "page-dots";
			dots.textContent = "…";
			container.append(dots);
		}
		container.append(mkBtn(String(totalPages), totalPages));
	}

	container.append(mkBtn("›", currentPage + 1, currentPage === totalPages));
};

/* -------------------------------------------------------------------
   Sort Headers
   ------------------------------------------------------------------- */

const updateSortHeaders = () => {
	$$(".th-sortable").forEach((th) => {
		const field = th.getAttribute("data-sort");
		th.setAttribute("aria-sort", field === sortField ? (sortDir === "asc" ? "ascending" : "descending") : "none");
		const indicator = th.querySelector(".sort-indicator");
		if (indicator) {
			indicator.textContent = field === sortField ? (sortDir === "asc" ? "↑" : "↓") : "⇅";
		}
	});
};

/* -------------------------------------------------------------------
   Campus Filter Dropdown
   ------------------------------------------------------------------- */

const renderCampusFilter = () => {
	const select = $("#campus-filter");
	if (!select || select.dataset.loaded) return;
	select.dataset.loaded = "1";

	const campuses = [...new Set(allStudents.map((s) => s.campus).filter(Boolean))].toSorted();
	campuses.forEach((campus) => {
		const opt = document.createElement("option");
		opt.value = campus;
		opt.textContent = campus;
		select.append(opt);
	});
};

const updateStudentCount = (count) => {
	const el = $("#students-count");
	if (el) el.textContent = `${count} student${count !== 1 ? "s" : ""}`;
};

/* -------------------------------------------------------------------
   Leaderboard Initialization
   ------------------------------------------------------------------- */

/**
 * Loads all students (with basic XP and level enrichment) and renders the leaderboard.
 * XP and level are fetched in parallel batches to avoid overwhelming the API.
 */
export const initStudentsView = async () => {
	const loadingEl = $("#students-loading");
	const tableWrap = $("#students-table-wrap");

	if (loadingEl) loadingEl.hidden = false;
	if (tableWrap) tableWrap.hidden = true;

	try {
		const users = await fetchAllStudents();

		// Enrich with XP+level in parallel (batch of 10 at a time)
		const BATCH = 10;
		/** @type {typeof allStudents} */
		const enriched = [];

		for (let i = 0; i < users.length; i += BATCH) {
			const batch = users.slice(i, i + BATCH);
			const results = await Promise.allSettled(
				batch.map((u) => fetchStudentXPAndLevel(u.id)),
			);
			for (const [j, result] of results.entries()) {
				const u = batch[j];
				const { totalXP = 0, level = 0 } =
					result.status === "fulfilled" ? result.value : {};
				enriched.push({ ...u, totalXP, level });
			}
		}

		allStudents = enriched;

		if (loadingEl) loadingEl.hidden = true;
		if (tableWrap) tableWrap.hidden = false;

		renderStudentsList();
		bindLeaderboardEvents();
	} catch (err) {
		console.error("Students load error:", err);
		if (loadingEl) {
			loadingEl.textContent = `Failed to load students: ${err.message}`;
		}
	}
};

/* -------------------------------------------------------------------
   Event bindings for the leaderboard controls
   ------------------------------------------------------------------- */

let eventsbound = false;

const bindLeaderboardEvents = () => {
	if (eventsbound) return;
	eventsbound = true;

	// Sort by column header
	$$(".th-sortable").forEach((th) => {
		th.addEventListener("click", () => {
			const field = /** @type {typeof sortField} */ (th.getAttribute("data-sort"));
			if (sortField === field) {
				sortDir = sortDir === "asc" ? "desc" : "asc";
			} else {
				sortField = field;
				sortDir = "desc";
			}
			currentPage = 1;
			renderStudentsList();
		});
	});

	// Search filter
	const searchInput = $("#students-search");
	searchInput?.addEventListener("input", () => {
		filterText = searchInput.value;
		currentPage = 1;
		renderStudentsList();
	});

	// Campus filter
	const campusSelect = $("#campus-filter");
	campusSelect?.addEventListener("change", () => {
		filterCampus = campusSelect.value;
		currentPage = 1;
		renderStudentsList();
	});

	// Reset
	const resetBtn = $("#students-reset");
	resetBtn?.addEventListener("click", () => {
		filterText = "";
		filterCampus = "";
		sortField = "level";
		sortDir = "desc";
		currentPage = 1;
		if ($("#students-search")) $("#students-search").value = "";
		if ($("#campus-filter")) $("#campus-filter").value = "";
		renderStudentsList();
	});
};

/* -------------------------------------------------------------------
   Student Profile View
   ------------------------------------------------------------------- */

/**
 * Opens and populates the student profile overlay for the given userId.
 * Reuses the same rendering logic as the main dashboard.
 * @param {number} userId
 */
const openStudentProfile = async (userId) => {
	const overlay = $("#student-profile-overlay");
	const content = $("#student-profile-content");
	if (!overlay || !content) return;

	// Show overlay with loading state
	overlay.classList.add("active");
	content.innerHTML = `
    <div class="student-profile-loading">
      <svg class="spinner" viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none"
          stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
      </svg>
      <p>Loading profile…</p>
    </div>
  `;

	try {
		const [user, xpAndLevel, progress, skills, results] = await Promise.all([
			fetchStudentInfo(userId),
			fetchStudentXPAndLevel(userId),
			fetchProgress(userId),
			fetchSkills(userId),
			fetchResults(userId),
		]);

		if (!user) throw new Error("Student not found.");

		const xpTransactions = await fetchXPTransactions(userId);

		renderStudentProfileContent(content, user, xpAndLevel, xpTransactions, progress, skills, results);
	} catch (err) {
		content.innerHTML = `<div class="student-profile-error">
      <p>⚠️ Could not load student profile: ${err.message}</p>
      <p style="font-size:0.85rem;color:var(--text-muted);margin-top:0.5rem">
        Note: The API may restrict access to other students' detailed data.
      </p>
    </div>`;
	}
};

/**
 * Renders the full student profile content into the overlay content container.
 * @param {HTMLElement} content
 * @param {object} user
 * @param {{totalXP:number, level:number}} xpAndLevel
 * @param {Array} xpTransactions
 * @param {Array} progress
 * @param {Array} skills
 * @param {Array} results
 */
const renderStudentProfileContent = (content, user, xpAndLevel, xpTransactions, progress, skills, results) => {
	const { totalXP, level } = xpAndLevel;
	const completedProjects = progress.filter(
		(p) => p.grade >= 1 && p.object?.type === "project",
	).length;

	const initials =
		`${(user.firstName?.[0] ?? "").toUpperCase()}${(user.lastName?.[0] ?? "").toUpperCase()}` ||
		user.login[0].toUpperCase();
	const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.login;

	// Build skill map (top 8)
	const skillMap = new Map();
	for (const s of skills) {
		const name = s.type.replace("skill_", "");
		const existing = skillMap.get(name);
		if (!existing || s.amount > existing) skillMap.set(name, s.amount);
	}
	const topSkills = [...skillMap.entries()].toSorted(([, a], [, b]) => b - a).slice(0, 8);
	const maxSkillAmt = Math.max(...topSkills.map(([, v]) => v), 1);

	const skillsHTML = topSkills.length
		? topSkills.map(([name, amt]) => `
      <div class="skill-item">
        <span class="skill-name">${name}</span>
        <div class="skill-bar-track">
          <div class="skill-bar-fill" style="width:${(amt / maxSkillAmt) * 100}%"></div>
        </div>
        <span class="skill-value">${amt}%</span>
      </div>`).join("")
		: `<p style="color:var(--text-muted);font-size:0.875rem">No skill data available.</p>`;

	content.innerHTML = `
    <div class="sp-header">
      <div class="sp-avatar">${initials}</div>
      <div class="sp-identity">
        <h2 class="sp-name">${displayName}</h2>
        <p class="sp-login">@${user.login}</p>
        ${user.campus ? `<p class="sp-campus">📍 ${user.campus}</p>` : ""}
      </div>
    </div>

    <div class="sp-stats-grid">
      <div class="sp-stat">
        <span class="stat-value">${formatXP(totalXP)}</span>
        <span class="stat-label">Total XP</span>
      </div>
      <div class="sp-stat">
        <span class="stat-value">${level}</span>
        <span class="stat-label">Level</span>
      </div>
      <div class="sp-stat">
        <span class="stat-value">${completedProjects}</span>
        <span class="stat-label">Projects Done</span>
      </div>
      <div class="sp-stat">
        <span class="stat-value">${(user.auditRatio ?? 0).toFixed(2)}</span>
        <span class="stat-label">Audit Ratio</span>
      </div>
    </div>

    <div class="sp-graphs-row">
      <div class="sp-graph-panel">
        <h3>XP Progress</h3>
        <div class="sp-graph-container" id="sp-xp-chart"></div>
      </div>
      <div class="sp-graph-panel">
        <h3>Audit Ratio</h3>
        <div class="sp-graph-container" id="sp-audit-donut"></div>
      </div>
      <div class="sp-graph-panel">
        <h3>Pass / Fail</h3>
        <div class="sp-graph-container" id="sp-passfail-pie"></div>
      </div>
      <div class="sp-graph-panel">
        <h3>XP by Project</h3>
        <div class="sp-graph-container" id="sp-bar-chart"></div>
      </div>
    </div>

    <div class="sp-skills">
      <h3>Top Skills</h3>
      <div class="skills-list">${skillsHTML}</div>
    </div>
  `;

	// Render graphs
	const xpChartEl = content.querySelector("#sp-xp-chart");
	const auditDonutEl = content.querySelector("#sp-audit-donut");
	const passFailEl = content.querySelector("#sp-passfail-pie");
	const barChartEl = content.querySelector("#sp-bar-chart");

	if (xpChartEl) renderXPLineChart(xpChartEl, xpTransactions);
	if (auditDonutEl) renderAuditDonutChart(auditDonutEl, user.totalUp ?? 0, user.totalDown ?? 0);
	if (passFailEl) renderPassFailPieChart(passFailEl, results);
	if (barChartEl) renderProjectBarChart(barChartEl, xpTransactions);
};

/* -------------------------------------------------------------------
   Close overlay
   ------------------------------------------------------------------- */

export const initStudentOverlayClose = () => {
	const overlay = $("#student-profile-overlay");
	const closeBtn = $("#student-profile-close");

	closeBtn?.addEventListener("click", () => overlay?.classList.remove("active"));
	overlay?.addEventListener("click", (e) => {
		if (e.target === overlay) overlay.classList.remove("active");
	});
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") overlay?.classList.remove("active");
	});
};

/** Resets module state (called on logout). */
export const resetStudentsState = () => {
	allStudents = [];
	sortField = "level";
	sortDir = "desc";
	filterText = "";
	filterCampus = "";
	currentPage = 1;
	eventsbound = false;
	const tbody = $("#students-tbody");
	if (tbody) tbody.innerHTML = "";
	const pagination = $("#students-pagination");
	if (pagination) pagination.innerHTML = "";
};
