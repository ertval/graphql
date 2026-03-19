/**
 * Collaborations Module
 * Displays all peers the user has collaborated with (groups and audits).
 * @module collaborations
 */

import { fetchCollaborations } from "./api.js";

/* -------------------------------------------------------------------
   State
   ------------------------------------------------------------------- */

/** @type {Array<{id: string, login: string, firstName: string, lastName: string, campus: string, project: string, role: string, date: string, ts: number}>} */
let allCollabs = [];

/** @type {'login'|'project'|'role'|'date'} */
let sortField = "date";
let sortDir = /** @type {'asc'|'desc'} */ ("desc");

let filterText = "";
let filterRole = "";

const PAGE_SIZE = 20;
let currentPage = 1;

/* -------------------------------------------------------------------
   DOM helpers
   ------------------------------------------------------------------- */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

/* -------------------------------------------------------------------
   Filter & Sort pipeline
   ------------------------------------------------------------------- */

/** @returns {typeof allCollabs} */
const getFiltered = () => {
	const query = filterText.toLowerCase();
	return allCollabs.filter((c) => {
		const matchText =
			!query ||
			c.login.toLowerCase().includes(query) ||
			(c.firstName?.toLowerCase() ?? "").includes(query) ||
			(c.lastName?.toLowerCase() ?? "").includes(query) ||
			c.project.toLowerCase().includes(query);
		const matchRole = !filterRole || c.role === filterRole;
		return matchText && matchRole;
	});
};

/** @returns {typeof allCollabs} */
const getSorted = () => {
	const filtered = getFiltered();
	return filtered.toSorted((a, b) => {
		if (sortField === "date")
			return sortDir === "asc" ? a.ts - b.ts : b.ts - a.ts;

		const av = a[sortField] || "";
		const bv = b[sortField] || "";
		return sortDir === "asc"
			? String(av).localeCompare(String(bv))
			: String(bv).localeCompare(String(av));
	});
};

/* -------------------------------------------------------------------
   Render List
   ------------------------------------------------------------------- */

/** Renders the collaborations table rows. */
export const renderCollabsList = () => {
	const tbody = $("#collabs-tbody");
	if (!tbody) return;

	const sorted = getSorted();
	const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
	currentPage = Math.min(currentPage, totalPages);

	const pageSlice = sorted.slice(
		(currentPage - 1) * PAGE_SIZE,
		currentPage * PAGE_SIZE,
	);

	tbody.innerHTML = "";
	if (!pageSlice.length) {
		tbody.innerHTML = `<tr><td colspan="5" class="students-empty">No collaborations match your search.</td></tr>`;
		renderPagination(totalPages);
		return;
	}

	for (const [rank, collab] of pageSlice.entries()) {
		const globalRank = (currentPage - 1) * PAGE_SIZE + rank + 1;
		const initials =
			`${(collab.firstName?.[0] ?? "").toUpperCase()}${(collab.lastName?.[0] ?? "").toUpperCase()}` ||
			collab.login[0].toUpperCase();
		const displayName =
			[collab.firstName, collab.lastName].filter(Boolean).join(" ") ||
			collab.login;

		const tr = document.createElement("tr");
		tr.className = "student-row";
		tr.innerHTML = `
      <td class="td-rank"><span class="rank-num">${globalRank}</span></td>
      <td class="td-avatar-name">
        <div class="student-avatar-mini">${initials}</div>
        <div class="student-name-col">
          <span class="student-display-name">${displayName}</span>
          <span class="student-login-tag">@${collab.login}</span>
        </div>
      </td>
      <td class="td-campus"><span class="campus-tag" style="background:rgba(255,255,255,0.05)">${collab.project}</span></td>
      <td class="td-level"><span class="level-badge" style="background: ${collab.role === "Partner" ? "var(--accent-start)" : "rgba(255,255,255,0.1)"}; color: ${collab.role === "Partner" ? "#fff" : "var(--text-secondary)"}">${collab.role}</span></td>
      <td class="td-date" style="font-size: 0.85rem; color: var(--text-muted)">${collab.date.split("T")[0]}</td>
    `;
		tbody.append(tr);
	}

	renderPagination(totalPages);
	updateSortHeaders();
	updateCount(sorted.length);
};

/* -------------------------------------------------------------------
   Pagination
   ------------------------------------------------------------------- */

/** @param {number} totalPages */
const renderPagination = (totalPages) => {
	const container = $("#collabs-pagination");
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
			renderCollabsList();
			$("#collaborations-view")?.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		});
		return btn;
	};

	container.append(mkBtn("‹", currentPage - 1, currentPage === 1));
	const start = Math.max(1, currentPage - 3);
	const end = Math.min(totalPages, currentPage + 3);

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
		th.setAttribute(
			"aria-sort",
			field === sortField
				? sortDir === "asc"
					? "ascending"
					: "descending"
				: "none",
		);
		const indicator = th.querySelector(".sort-indicator");
		if (indicator) {
			indicator.textContent =
				field === sortField ? (sortDir === "asc" ? "↑" : "↓") : "⇅";
		}
	});
};

const updateCount = (count) => {
	const el = $("#collabs-count");
	if (el) el.textContent = `${count} record${count !== 1 ? "s" : ""}`;
};

/* -------------------------------------------------------------------
   Initialization
   ------------------------------------------------------------------- */

export const initCollaborationsView = async (userId) => {
	const loadingEl = $("#collabs-loading");
	const tableWrap = $("#collabs-table-wrap");

	if (loadingEl) loadingEl.hidden = false;
	if (tableWrap) tableWrap.hidden = true;

	try {
		const { groups, auditsGiven, auditsReceived } =
			await fetchCollaborations(userId);

		const collabs = [];

		// Groups (Partners)
		for (const g of groups) {
			const prjName = g.group?.object?.name || "Unknown Project";
			for (const member of g.group?.members || []) {
				if (member.userId !== userId && member.user) {
					collabs.push({
						id: `u_${member.userId}_${g.createdAt}`,
						login: member.user.login,
						firstName: member.user.firstName,
						lastName: member.user.lastName,
						campus: member.user.campus,
						project: prjName,
						role: "Partner",
						date: g.createdAt,
						ts: new Date(g.createdAt).getTime(),
					});
				}
			}
		}

		// Audits Given (So they were the Captain)
		for (const a of auditsGiven) {
			if (a.group?.captainLogin && a.group.captainLogin !== "ekaramet") {
				collabs.push({
					id: `a_${Math.random()}`,
					login: a.group.captainLogin,
					firstName: "",
					lastName: "",
					campus: "",
					project: a.group?.object?.name || "Unknown",
					role: "Captain",
					date: a.createdAt,
					ts: new Date(a.createdAt).getTime(),
				});
			}
		}

		// Audits Received (They were the Auditor)
		for (const a of auditsReceived) {
			if (a.auditor?.login) {
				collabs.push({
					id: `r_${Math.random()}`,
					login: a.auditor.login,
					firstName: a.auditor.firstName,
					lastName: a.auditor.lastName,
					campus: a.auditor.campus,
					project: a.group?.object?.name || "Unknown",
					role: "Auditor",
					date: a.createdAt,
					ts: new Date(a.createdAt).getTime(),
				});
			}
		}

		// Remove duplicate identical records (same user, project, role)
		const unique = [];
		const seen = new Set();
		for (const c of collabs) {
			const key = `${c.login}|${c.project}|${c.role}`;
			if (!seen.has(key)) {
				seen.add(key);
				unique.push(c);
			}
		}

		allCollabs = unique;

		if (loadingEl) loadingEl.hidden = true;
		if (tableWrap) tableWrap.hidden = false;

		renderCollabsList();
		bindEvents();
	} catch (err) {
		console.error("Collaborations load error:", err);
		if (loadingEl) {
			loadingEl.innerHTML = `<p style="color:var(--danger)">Failed to load data: ${err.message}</p>`;
		}
	}
};

/* -------------------------------------------------------------------
   Event bindings
   ------------------------------------------------------------------- */

let eventsbound = false;

const bindEvents = () => {
	if (eventsbound) return;
	eventsbound = true;

	$$(".th-sortable").forEach((th) => {
		th.addEventListener("click", () => {
			const field = /** @type {typeof sortField} */ (
				th.getAttribute("data-sort")
			);
			if (sortField === field) {
				sortDir = sortDir === "asc" ? "desc" : "asc";
			} else {
				sortField = field;
				sortDir = "desc";
			}
			currentPage = 1;
			renderCollabsList();
		});
	});

	const searchInput = $("#collabs-search");
	searchInput?.addEventListener("input", () => {
		filterText = searchInput.value;
		currentPage = 1;
		renderCollabsList();
	});

	const roleSelect = $("#role-filter");
	roleSelect?.addEventListener("change", () => {
		filterRole = roleSelect.value;
		currentPage = 1;
		renderCollabsList();
	});

	const resetBtn = $("#collabs-reset");
	resetBtn?.addEventListener("click", () => {
		filterText = "";
		filterRole = "";
		sortField = "date";
		sortDir = "desc";
		currentPage = 1;
		if ($("#collabs-search")) $("#collabs-search").value = "";
		if ($("#role-filter")) $("#role-filter").value = "";
		renderCollabsList();
	});
};

export const resetCollabsState = () => {
	allCollabs = [];
	sortField = "date";
	sortDir = "desc";
	filterText = "";
	filterRole = "";
	currentPage = 1;
	eventsbound = false;
	const tbody = $("#collabs-tbody");
	if (tbody) tbody.innerHTML = "";
	const pagination = $("#collabs-pagination");
	if (pagination) pagination.innerHTML = "";
};
