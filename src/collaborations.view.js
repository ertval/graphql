/**
 * Collaborations View — table rendering, pagination, sort headers,
 * collaborator detail popup, data loading, and event bindings.
 * Orchestrates the full collaborations tab lifecycle.
 * @module collaborations.view
 */

import {
	closeCollaboratorDetail,
	openCollaboratorDetail,
} from "./collaborations.popup.js";

// ── Module state ───────────────────────────────────────────────────
/** @type {Array<{id: string, login: string, firstName: string, lastName: string, campus: string, project: string, role: string, date: string, ts: number}>} */
export let allCollabs = [];

export const setAllCollabsData = (data) => {
	allCollabs = data;
};

/** @type {'login'|'project'|'role'|'date'} */
let sortField = "date";
let sortDir = /** @type {'asc'|'desc'} */ ("desc");

let filterText = "";
let filterRole = "";

const PAGE_SIZE = 20;
let currentPage = 1;

// ── DOM helpers ────────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// ── Filter & Sort pipeline ─────────────────────────────────────────

/** @returns {typeof allCollabs} Filtered subset matching search and role. */
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

/** @returns {typeof allCollabs} Filtered and sorted collaborations. */
const getSorted = () => {
	const filtered = getFiltered();
	return filtered.toSorted((a, b) => {
		if (sortField === "date")
			return sortDir === "asc" ? a.ts - b.ts : b.ts - a.ts;
		if (sortField === "totalCollaborations")
			return sortDir === "asc"
				? a.totalCollaborations - b.totalCollaborations
				: b.totalCollaborations - a.totalCollaborations;

		const av = a[sortField] || "";
		const bv = b[sortField] || "";
		return sortDir === "asc"
			? String(av).localeCompare(String(bv))
			: String(bv).localeCompare(String(av));
	});
};

// ── Table row rendering ────────────────────────────────────────────

/** Renders the collaborations table rows and pagination controls. */
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

	// Clear and rebuild tbody
	tbody.innerHTML = "";
	if (!pageSlice.length) {
		const tr = document.createElement("tr");
		const td = document.createElement("td");
		td.colSpan = 6;
		td.className = "students-empty";
		td.textContent = "No collaborations match your search.";
		tr.append(td);
		tbody.append(tr);
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

		// Clickable row that opens collaborator detail
		const tr = document.createElement("tr");
		tr.className = "student-row collab-row-action";
		tr.setAttribute("role", "button");
		tr.setAttribute("tabindex", "0");
		tr.setAttribute(
			"aria-label",
			`Open collaborator details for ${displayName}`,
		);
		tr.addEventListener("click", () =>
			openCollaboratorDetail(collab.login, allCollabs),
		);
		tr.addEventListener("keydown", (event) => {
			if (event.key !== "Enter" && event.key !== " ") return;
			event.preventDefault();
			openCollaboratorDetail(collab.login, allCollabs);
		});

		// Rank cell
		const rankCell = document.createElement("td");
		rankCell.className = "td-rank";
		const rankNum = document.createElement("span");
		rankNum.className = "rank-num";
		rankNum.textContent = String(globalRank);
		rankCell.append(rankNum);

		// Avatar + name cell
		const avatarNameCell = document.createElement("td");
		avatarNameCell.className = "td-avatar-name";
		const avatar = document.createElement("div");
		avatar.className = "student-avatar-mini";
		avatar.textContent = initials;
		const nameCol = document.createElement("div");
		nameCol.className = "student-name-col";
		const displayNameEl = document.createElement("span");
		displayNameEl.className = "student-display-name";
		displayNameEl.textContent = displayName;
		const loginTag = document.createElement("span");
		loginTag.className = "student-login-tag";
		loginTag.textContent = `@${collab.login}`;
		nameCol.append(displayNameEl, loginTag);
		avatarNameCell.append(avatar, nameCol);

		// Total Collabs cell
		const totalCell = document.createElement("td");
		totalCell.className = "td-total";
		totalCell.style.textAlign = "center";
		const totalBadge = document.createElement("span");
		totalBadge.className = "total-badge";
		totalBadge.style.background = "rgba(255,255,255,0.05)";
		totalBadge.style.padding = "4px 8px";
		totalBadge.style.borderRadius = "12px";
		totalBadge.textContent = String(collab.totalCollaborations);
		totalCell.append(totalBadge);

		// Project cell
		const projectCell = document.createElement("td");
		projectCell.className = "td-campus";
		const projectTag = document.createElement("span");
		projectTag.className = "campus-tag";
		projectTag.style.background = "rgba(255,255,255,0.05)";
		projectTag.textContent = collab.project;
		projectCell.append(projectTag);

		// Role cell with conditional styling
		const roleCell = document.createElement("td");
		roleCell.className = "td-level";
		const roleBadge = document.createElement("span");
		roleBadge.className = "level-badge";
		roleBadge.style.background =
			collab.role === "Partner"
				? "var(--accent-start)"
				: "rgba(255,255,255,0.1)";
		roleBadge.style.color =
			collab.role === "Partner" ? "#fff" : "var(--text-secondary)";
		roleBadge.textContent = collab.role;
		roleCell.append(roleBadge);

		// Date cell
		const dateCell = document.createElement("td");
		dateCell.className = "td-date";
		dateCell.style.fontSize = "0.85rem";
		dateCell.style.color = "var(--text-muted)";
		dateCell.textContent = collab.date.split("T")[0];

		tr.append(
			rankCell,
			avatarNameCell,
			totalCell,
			projectCell,
			roleCell,
			dateCell,
		);
		tbody.append(tr);
	}

	renderPagination(totalPages);
	updateSortHeaders();
	updateCount(sorted.length);
};

// ── Pagination controls ────────────────────────────────────────────

/** @param {number} totalPages */
const renderPagination = (totalPages) => {
	const container = $("#collabs-pagination");
	if (!container) return;
	container.innerHTML = "";
	if (totalPages <= 1) return;

	// Helper to create a pagination button
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

// ── Sort header indicators ─────────────────────────────────────────

/** Updates th aria-sort attributes and sort arrow indicators. */
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

/** Updates the visible record count badge. */
const updateCount = (count) => {
	const el = $("#collabs-count");
	if (el) el.textContent = `${count} record${count !== 1 ? "s" : ""}`;
};

// ── Data loading and event wiring ──────────────────────────────────

let eventsbound = false;

/** Binds sort, search, filter, and overlay events (once). */
export const bindEvents = () => {
	if (eventsbound) return;
	eventsbound = true;

	// Sort header click toggles direction
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

	// Search text input
	const searchInput = $("#collabs-search");
	searchInput?.addEventListener("input", () => {
		filterText = searchInput.value;
		currentPage = 1;
		renderCollabsList();
	});

	// Role dropdown filter
	const roleSelect = $("#role-filter");
	roleSelect?.addEventListener("change", () => {
		filterRole = roleSelect.value;
		currentPage = 1;
		renderCollabsList();
	});

	// Reset all filters button
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

	// Profile overlay close handlers
	const profileCloseBtn = $("#student-profile-close");
	profileCloseBtn?.addEventListener("click", closeCollaboratorDetail);

	const profileOverlay = $("#student-profile-overlay");
	profileOverlay?.addEventListener("click", (e) => {
		if (e.target === profileOverlay) closeCollaboratorDetail();
	});

	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") closeCollaboratorDetail();
	});
};

// ── Public API ─────────────────────────────────────────────────────

/** Resets all collaborations state for logout / view teardown. */
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
	closeCollaboratorDetail();
};
