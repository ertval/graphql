/**
 * Collaborations View — table rendering, pagination, sort headers,
 * collaborator detail popup, data loading, and event bindings.
 * Orchestrates the full collaborations tab lifecycle.
 * @module collaborations.view
 */

import { loadCollaborationsData } from "./collaborations.api.js";
import { buildCollaboratorSummary } from "./collaborations.core.js";
import {
	closeCollaboratorDetail,
	openCollaboratorDetail,
} from "./collaborations.popup.js";

// ── Module state ───────────────────────────────────────────────────
/** @type {Array<{id: string, login: string, firstName: string, lastName: string, campus: string, project: string, role: string, date: string, ts: number}>} */
export let allCollabs = [];
let uniqueCollabs = [];

export const setAllCollabsData = (data) => {
	allCollabs = data;
	const logins = [...new Set(data.map((c) => c.login))];
	uniqueCollabs = logins.map((login) => buildCollaboratorSummary(data, login));
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

const toLocalDate = (isoDate) => {
	try {
		const zdt = Temporal.Instant.from(isoDate).toZonedDateTimeISO(
			Temporal.Now.timeZoneId(),
		);
		return zdt.toLocaleString("en", { dateStyle: "medium" });
	} catch {
		return isoDate?.split("T")?.[0] ?? "—";
	}
};

// ── Filter & Sort pipeline ─────────────────────────────────────────

/** @returns {typeof uniqueCollabs} Filtered subset matching search and role. */
const getFiltered = () => {
	const query = filterText.toLowerCase();
	return uniqueCollabs.filter((c) => {
		const matchText =
			!query ||
			c.login.toLowerCase().includes(query) ||
			c.displayName.toLowerCase().includes(query) ||
			c.projects.some((p) => p.name.toLowerCase().includes(query));
		const matchRole =
			!filterRole || c.byRole.some((r) => r.role === filterRole);
		return matchText && matchRole;
	});
};

/** @returns {typeof uniqueCollabs} Filtered and sorted collaborations. */
const getSorted = () => {
	const filtered = getFiltered();
	return filtered.toSorted((a, b) => {
		if (sortField === "date")
			return sortDir === "asc"
				? a.latestTs - b.latestTs
				: b.latestTs - a.latestTs;
		if (sortField === "totalCollaborations") {
			const getVal = (c) =>
				filterRole
					? c.byRole.find((r) => r.role === filterRole)?.count || 0
					: c.totalCollaborations;
			return sortDir === "asc" ? getVal(a) - getVal(b) : getVal(b) - getVal(a);
		}

		let av = "";
		let bv = "";
		if (sortField === "project") {
			av = a.projects.map((p) => p.name).join(", ");
			bv = b.projects.map((p) => p.name).join(", ");
		} else if (sortField === "role") {
			if (filterRole) {
				const aVal = a.byRole.find((r) => r.role === filterRole)?.count || 0;
				const bVal = b.byRole.find((r) => r.role === filterRole)?.count || 0;
				return sortDir === "asc" ? aVal - bVal : bVal - aVal;
			}
			av = a.byRole.map((r) => r.role).join(", ");
			bv = b.byRole.map((r) => r.role).join(", ");
		} else {
			av = a[sortField] || "";
			bv = b[sortField] || "";
		}

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
	tbody.replaceChildren();
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
		const firstPart = collab.displayName.split(" ")[0];
		const secondPart = collab.displayName.split(" ")[1];
		const initials =
			`${firstPart?.[0] ?? ""}${secondPart?.[0] ?? ""}`.toUpperCase() ||
			collab.login[0].toUpperCase();
		const displayName = collab.displayName || collab.login;

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
		const displayedCollabsCount = filterRole
			? collab.byRole.find((r) => r.role === filterRole)?.count || 0
			: collab.totalCollaborations;
		totalBadge.textContent = String(displayedCollabsCount);
		totalCell.append(totalBadge);

		// Project cell
		const projectCell = document.createElement("td");
		projectCell.className = "td-campus";

		const projectWrap = document.createElement("div");
		projectWrap.style.display = "flex";
		projectWrap.style.flexWrap = "wrap";
		projectWrap.style.gap = "6px";

		const displayedProjects = filterRole
			? collab.projects.filter((p) => p.roles.includes(filterRole))
			: collab.projects;

		const maxProjects = 4;
		const visibleProjects = displayedProjects.slice(0, maxProjects);
		for (const proj of visibleProjects) {
			const projectTag = document.createElement("span");
			projectTag.className = "campus-tag";
			projectTag.style.background = "rgba(255,255,255,0.05)";
			projectTag.textContent =
				proj.count > 1 ? `${proj.name} x${proj.count}` : proj.name;
			projectWrap.append(projectTag);
		}

		if (displayedProjects.length > maxProjects) {
			const overflowTag = document.createElement("span");
			overflowTag.className = "campus-tag";
			overflowTag.style.background = "rgba(255,255,255,0.02)";
			overflowTag.textContent = "...";
			projectWrap.append(overflowTag);
		}

		projectCell.append(projectWrap);

		// Role cell with conditional styling
		const roleCell = document.createElement("td");
		roleCell.className = "td-level";

		const roleWrap = document.createElement("div");
		roleWrap.style.display = "flex";
		roleWrap.style.flexWrap = "wrap";
		roleWrap.style.gap = "6px";

		const displayedRoles = filterRole
			? collab.byRole.filter((r) => r.role === filterRole)
			: collab.byRole;

		for (const r of displayedRoles) {
			const roleBadge = document.createElement("span");
			roleBadge.className = "level-badge";

			if (r.role === "Partner") {
				roleBadge.style.background = "var(--accent-start)";
				roleBadge.style.color = "#fff";
				roleBadge.style.borderColor = "transparent";
			} else if (r.role === "Captain") {
				roleBadge.style.background = "rgba(99, 102, 241, 0.18)";
				roleBadge.style.color = "#a5b4fc";
				roleBadge.style.borderColor = "rgba(129, 140, 248, 0.35)";
			} else if (r.role === "Auditor") {
				roleBadge.style.background = "rgba(59, 130, 246, 0.15)";
				roleBadge.style.color = "#60a5fa";
				roleBadge.style.borderColor = "rgba(59, 130, 246, 0.3)";
			} else {
				roleBadge.style.background = "rgba(255, 255, 255, 0.1)";
				roleBadge.style.color = "var(--text-secondary)";
				roleBadge.style.borderColor = "rgba(255, 255, 255, 0.15)";
			}

			roleBadge.textContent = r.count > 1 ? `${r.role} x${r.count}` : r.role;
			roleWrap.append(roleBadge);
		}

		roleCell.append(roleWrap);

		// Date cell
		const dateCell = document.createElement("td");
		dateCell.className = "td-date";
		dateCell.style.fontSize = "0.85rem";
		dateCell.style.color = "var(--text-muted)";
		dateCell.textContent = toLocalDate(collab.latestDate);

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
	container.replaceChildren();
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

let eventsBound = false;

/** Binds sort, search, filter, and overlay events (once). */
export const bindEvents = () => {
	if (eventsBound) return;
	eventsBound = true;

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

/** Fetches collaboration data and initializes the collaborations tab UI. */
export const initCollaborationsView = async (userId) => {
	const loadingEl = $("#collabs-loading");
	const tableWrap = $("#collabs-table-wrap");
	const showLoadError = () => {
		if (!loadingEl) return;
		loadingEl.replaceChildren();
		const errorMsg = document.createElement("p");
		errorMsg.style.color = "var(--danger)";
		errorMsg.textContent = "Failed to load collaborations data.";
		loadingEl.append(errorMsg);
	};

	if (loadingEl) loadingEl.hidden = false;
	if (tableWrap) tableWrap.hidden = true;

	const collabsResult = await loadCollaborationsData(userId);
	if (!collabsResult.ok) {
		showLoadError();
		return collabsResult;
	}

	if (loadingEl) loadingEl.hidden = true;
	if (tableWrap) tableWrap.hidden = false;

	setAllCollabsData(collabsResult.data);
	renderCollabsList();
	bindEvents();

	return { ok: true, data: true };
};

// ── Public API ─────────────────────────────────────────────────────

/** Resets all collaborations state for logout / view teardown. */
export const resetCollabsState = () => {
	allCollabs = [];
	uniqueCollabs = [];
	sortField = "date";
	sortDir = "desc";
	filterText = "";
	filterRole = "";
	currentPage = 1;
	eventsBound = false;
	const tbody = $("#collabs-tbody");
	if (tbody) tbody.replaceChildren();
	const pagination = $("#collabs-pagination");
	if (pagination) pagination.replaceChildren();
	closeCollaboratorDetail();
};
