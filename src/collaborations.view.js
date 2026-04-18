/**
 * Collaborations View — table rendering, pagination, sort headers,
 * collaborator detail popup, data loading, and event bindings.
 * Orchestrates the full collaborations tab lifecycle.
 * @module collaborations.view
 */

import { loadCollaborationsData } from "./collaborations.api.js";
import { buildCollaboratorSummaries } from "./collaborations.core.js";
import {
	closeCollaboratorDetail,
	openCollaboratorDetail,
} from "./collaborations.popup.js";
import { getSortedCollaborations } from "./collaborations.view.filters.js";
import { renderCollabsPagination } from "./collaborations.view.pagination.js";
import { renderCollabsTableBody } from "./collaborations.view.table.js";
import { $, formatLocalDate } from "./infra.ui.js";

// ── Module state ───────────────────────────────────────────────────
/** @type {Array<{id: string, login: string, firstName: string, lastName: string, campus: string, project: string, role: string, date: string, ts: number}>} */
export let allCollabs = [];
let uniqueCollabs = [];

export const setAllCollabsData = (data) => {
	allCollabs = data;
	uniqueCollabs = buildCollaboratorSummaries(data);
};

/** @type {'login'|'project'|'role'|'date'} */
let sortField = "date";
let sortDir = /** @type {'asc'|'desc'} */ ("desc");

let filterText = "";
let filterRole = "";

const PAGE_SIZE = 20;
let currentPage = 1;

// ── DOM helpers ────────────────────────────────────────────────────

const $$ = (sel) => [...document.querySelectorAll(sel)];

// ── Table row rendering ────────────────────────────────────────────

/** Renders the collaborations table rows and pagination controls. */
export const renderCollabsList = () => {
	const tbody = $("#collabs-tbody");
	if (!tbody) return;

	const sorted = getSortedCollaborations(
		uniqueCollabs,
		sortField,
		sortDir,
		filterText,
		filterRole,
	);
	const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
	currentPage = Math.min(currentPage, totalPages);

	const pageSlice = sorted.slice(
		(currentPage - 1) * PAGE_SIZE,
		currentPage * PAGE_SIZE,
	);

	const hasRows = renderCollabsTableBody({
		tbody,
		pageSlice,
		currentPage,
		pageSize: PAGE_SIZE,
		filterRole,
		allCollabs,
		onOpenCollaboratorDetail: openCollaboratorDetail,
		formatDate: formatLocalDate,
	});

	if (!hasRows) {
		renderPagination(totalPages);
		return;
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
	renderCollabsPagination({
		container,
		totalPages,
		currentPage,
		onPageChange: (page) => {
			currentPage = page;
			renderCollabsList();
		},
	});
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
		errorMsg.className = "students-error";
		errorMsg.textContent = "Failed to load collaborations data.";
		loadingEl.append(errorMsg);
		loadingEl.hidden = false;
	};

	try {
		if (loadingEl) {
			loadingEl.hidden = false;
		}
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
	} catch (error) {
		showLoadError();
		return { ok: false, error };
	}
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
	const tbody = $("#collabs-tbody");
	if (tbody) tbody.replaceChildren();
	const pagination = $("#collabs-pagination");
	if (pagination) pagination.replaceChildren();
	closeCollaboratorDetail();
};
