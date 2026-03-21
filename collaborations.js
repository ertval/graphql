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

const hasText = (value) => typeof value === "string" && value.trim().length > 0;

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

const toProjectUrl = (pathValue) => {
	if (!hasText(pathValue)) return null;
	if (pathValue.startsWith("http://") || pathValue.startsWith("https://")) {
		return pathValue;
	}
	if (!pathValue.startsWith("/")) return null;
	return `https://platform.zone01.gr${pathValue}`;
};

/**
 * @template T
 * @param {{ok: true, data: T} | {ok: false, error: Error}} result
 * @returns {T}
 */
const unwrapResult = (result) => {
	if (result.ok) return result.data;
	throw result.error;
};

const isLetter = (char) => /\p{L}/u.test(char);

/**
 * Normalizes a single name token (e.g. "o'cONNOR" -> "O'Connor").
 * @param {string} token
 * @returns {string}
 */
const toReadableNameToken = (token) => {
	const lowered = token.toLowerCase();
	let capitalizeNext = true;
	let result = "";

	for (const char of lowered) {
		if (isLetter(char)) {
			result += capitalizeNext ? char.toUpperCase() : char;
			capitalizeNext = false;
			continue;
		}

		result += char;
		capitalizeNext = char === "-" || char === "'" || char === "’";
	}

	return result;
};

/**
 * Converts any mixed/all-caps name string into readable title casing.
 * @param {string} value
 * @returns {string}
 */
const toReadableName = (value) => {
	if (!hasText(value)) return "";
	return value
		.trim()
		.split(/\s+/u)
		.map((token) => toReadableNameToken(token))
		.join(" ");
};

/**
 * Ensures each login has a consistent first/last name pair across roles.
 * Missing names are enriched from any other record with the same login.
 * @param {Array<{id: string, login: string, firstName: string, lastName: string, campus: string, project: string, role: string, date: string, ts: number}>} collabs
 * @returns {Array<{id: string, login: string, firstName: string, lastName: string, campus: string, project: string, role: string, date: string, ts: number}>}
 */
export const normalizeCollaboratorNamesByLogin = (collabs) => {
	const canonicalByLogin = collabs.reduce((map, collab) => {
		const current = map.get(collab.login) ?? { firstName: "", lastName: "" };
		const candidate = {
			firstName: toReadableName(collab.firstName),
			lastName: toReadableName(collab.lastName),
		};

		const hasCurrentFull = hasText(current.firstName) && hasText(current.lastName);
		const hasCandidateFull =
			hasText(candidate.firstName) && hasText(candidate.lastName);

		if (!hasCurrentFull && hasCandidateFull) {
			map.set(collab.login, candidate);
			return map;
		}

		if (!hasCurrentFull) {
			map.set(collab.login, {
				firstName: hasText(current.firstName)
					? current.firstName
					: candidate.firstName,
				lastName: hasText(current.lastName)
					? current.lastName
					: candidate.lastName,
			});
		}

		return map;
	}, new Map());

	return collabs.map((collab) => {
		const canonical = canonicalByLogin.get(collab.login);
		if (!canonical) return collab;

		return {
			...collab,
			firstName: canonical.firstName,
			lastName: canonical.lastName,
		};
	});
};

/**
 * Builds a collaborator summary from existing collaboration records.
 * @param {Array<{id: string, login: string, firstName: string, lastName: string, campus: string, project: string, role: string, date: string, ts: number}>} collabs
 * @param {string} login
 */
export const buildCollaboratorSummary = (collabs, login) => {
	const matches = collabs
		.filter((collab) => collab.login === login)
		.toSorted((a, b) => b.ts - a.ts);

	if (!matches.length) return null;

	const primary = matches[0];
	const bestName = matches.reduce(
		(acc, collab) => ({
			firstName: acc.firstName || collab.firstName || "",
			lastName: acc.lastName || collab.lastName || "",
		}),
		{ firstName: "", lastName: "" },
	);
	const displayName =
		[bestName.firstName, bestName.lastName].filter(Boolean).join(" ") || login;

	const byRole = matches.reduce((map, collab) => {
		map.set(collab.role, (map.get(collab.role) ?? 0) + 1);
		return map;
	}, new Map());

	const projects = [
		...matches
			.reduce((map, collab) => {
				const current = map.get(collab.project);
				if (!current) {
					map.set(collab.project, {
						name: collab.project,
						path: collab.projectPath ?? "",
						roles: new Set([collab.role]),
						latestTs: collab.ts,
						latestDate: collab.date,
						count: 1,
					});
					return map;
				}

				map.set(collab.project, {
					...current,
					path: current.path || collab.projectPath || "",
					roles: current.roles.union(new Set([collab.role])),
					latestTs: Math.max(current.latestTs, collab.ts),
					latestDate:
						collab.ts >= current.latestTs ? collab.date : current.latestDate,
					count: current.count + 1,
				});
				return map;
			}, new Map())
			.values(),
	].toSorted((a, b) => b.latestTs - a.latestTs);

	return {
		login,
		displayName,
		campus: primary.campus || "—",
		totalCollaborations: matches.length,
		totalProjects: projects.length,
		byRole: [...byRole.entries()]
			.toSorted(([a], [b]) => a.localeCompare(b))
			.map(([role, count]) => ({ role, count })),
		projects: projects.map((project) => ({
			name: project.name,
			path: project.path,
			roles: [...project.roles].toSorted(),
			latestDate: project.latestDate,
			count: project.count,
		})),
	};
};

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
		const tr = document.createElement("tr");
		const td = document.createElement("td");
		td.colSpan = 5;
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

		const tr = document.createElement("tr");
		tr.className = "student-row collab-row-action";
		tr.setAttribute("role", "button");
		tr.setAttribute("tabindex", "0");
		tr.setAttribute(
			"aria-label",
			`Open collaborator details for ${displayName}`,
		);
		tr.addEventListener("click", () => openCollaboratorDetail(collab.login));
		tr.addEventListener("keydown", (event) => {
			if (event.key !== "Enter" && event.key !== " ") return;
			event.preventDefault();
			openCollaboratorDetail(collab.login);
		});

		const rankCell = document.createElement("td");
		rankCell.className = "td-rank";
		const rankNum = document.createElement("span");
		rankNum.className = "rank-num";
		rankNum.textContent = String(globalRank);
		rankCell.append(rankNum);

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

		const projectCell = document.createElement("td");
		projectCell.className = "td-campus";
		const projectTag = document.createElement("span");
		projectTag.className = "campus-tag";
		projectTag.style.background = "rgba(255,255,255,0.05)";
		projectTag.textContent = collab.project;
		projectCell.append(projectTag);

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

		const dateCell = document.createElement("td");
		dateCell.className = "td-date";
		dateCell.style.fontSize = "0.85rem";
		dateCell.style.color = "var(--text-muted)";
		dateCell.textContent = collab.date.split("T")[0];

		tr.append(rankCell, avatarNameCell, projectCell, roleCell, dateCell);
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

const closeCollaboratorDetail = () => {
	const overlay = $("#student-profile-overlay");
	overlay?.classList.remove("active");
};

const openCollaboratorDetail = (login) => {
	const summary = buildCollaboratorSummary(allCollabs, login);
	if (!summary) return;

	const overlay = $("#student-profile-overlay");
	const content = $("#student-profile-content");
	const title = $("#student-profile-title");
	if (!overlay || !content || !title) return;

	title.textContent = summary.displayName;
	content.innerHTML = "";

	const header = document.createElement("div");
	header.className = "sp-header";

	const initialsEl = document.createElement("div");
	initialsEl.className = "sp-avatar";
	const firstInitial = summary.displayName[0] ?? "";
	const secondInitial = summary.displayName.split(" ")[1]?.[0] ?? "";
	initialsEl.textContent =
		`${firstInitial}${secondInitial}`.toUpperCase() ||
		summary.login[0].toUpperCase();

	const identity = document.createElement("div");
	const name = document.createElement("h3");
	name.className = "sp-name";
	name.textContent = summary.displayName;
	const loginTag = document.createElement("p");
	loginTag.className = "sp-login";
	loginTag.textContent = `@${summary.login}`;
	const campus = document.createElement("p");
	campus.className = "sp-campus";
	campus.textContent = `Campus: ${summary.campus}`;
	identity.append(name, loginTag, campus);
	header.append(initialsEl, identity);

	const stats = document.createElement("div");
	stats.className = "sp-stats-grid collab-stats-grid";

	const appendStat = (value, label) => {
		const stat = document.createElement("div");
		stat.className = "sp-stat";

		const valueEl = document.createElement("span");
		valueEl.className = "stat-value";
		valueEl.textContent = value;

		const labelEl = document.createElement("span");
		labelEl.className = "stat-label";
		labelEl.textContent = label;

		stat.append(valueEl, labelEl);
		stats.append(stat);
	};

	appendStat(String(summary.totalProjects), "Shared Projects");
	appendStat(String(summary.totalCollaborations), "Shared Interactions");

	const rolesSection = document.createElement("section");
	rolesSection.className = "sp-skills";
	const rolesTitle = document.createElement("h3");
	rolesTitle.textContent = "Collaboration Roles";
	rolesSection.append(rolesTitle);

	const rolesList = document.createElement("ul");
	rolesList.className = "collab-role-list";
	for (const roleSummary of summary.byRole) {
		const roleItem = document.createElement("li");
		roleItem.className = "collab-role-item";
		roleItem.textContent = `${roleSummary.role}: ${roleSummary.count}`;
		rolesList.append(roleItem);
	}
	rolesSection.append(rolesList);

	const projectsSection = document.createElement("section");
	projectsSection.className = "sp-skills";

	const projectsTitle = document.createElement("h3");
	projectsTitle.textContent = "Recent Shared Projects";
	projectsSection.append(projectsTitle);

	const list = document.createElement("div");
	list.className = "collab-project-list";
	for (const project of summary.projects) {
		const projectUrl = toProjectUrl(project.path);
		const item = document.createElement(projectUrl ? "a" : "div");
		item.className = "collab-project-item";
		if (projectUrl) {
			item.setAttribute("href", projectUrl);
			item.setAttribute("target", "_blank");
			item.setAttribute("rel", "noopener noreferrer");
		}

		const projectName = document.createElement("span");
		projectName.className = "collab-project-name";
		projectName.textContent = project.name;

		const meta = document.createElement("span");
		meta.className = "collab-project-meta";
		meta.textContent = `${project.count}x • ${project.roles.join(", ")} • ${toLocalDate(project.latestDate)}`;

		item.append(projectName, meta);
		list.append(item);
	}

	projectsSection.append(list);
	content.append(header, stats, rolesSection, projectsSection);

	overlay.classList.add("active");
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
		const { groups, auditsGiven, auditsReceived } = unwrapResult(
			await fetchCollaborations(userId),
		);

		const collabs = [];

		const toEpochMs = (isoDate) =>
			Temporal.Instant.from(isoDate).epochMilliseconds;

		// Groups (Partners)
		for (const g of groups) {
			const prjName = g.group?.object?.name || "Unknown Project";
			const projectPath = g.group?.path ?? g.path ?? "";
			for (const member of g.group?.members || []) {
				if (member.userId !== userId && member.user) {
					collabs.push({
						id: `u_${member.userId}_${g.createdAt}`,
						login: member.user.login,
						firstName: member.user.firstName,
						lastName: member.user.lastName,
						campus: member.user.campus,
						project: prjName,
						projectPath,
						role: "Partner",
						date: g.createdAt,
						ts: toEpochMs(g.createdAt),
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
					projectPath: a.group?.path ?? "",
					role: "Captain",
					date: a.createdAt,
					ts: toEpochMs(a.createdAt),
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
					projectPath: a.group?.path ?? "",
					role: "Auditor",
					date: a.createdAt,
					ts: toEpochMs(a.createdAt),
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

		allCollabs = normalizeCollaboratorNamesByLogin(unique);

		if (loadingEl) loadingEl.hidden = true;
		if (tableWrap) tableWrap.hidden = false;

		renderCollabsList();
		bindEvents();
	} catch (err) {
		if (loadingEl) {
			loadingEl.innerHTML = "";
			const errorMsg = document.createElement("p");
			errorMsg.style.color = "var(--danger)";
			errorMsg.textContent = `Failed to load data: ${err instanceof Error ? err.message : "Unexpected error"}`;
			loadingEl.append(errorMsg);
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
