/**
 * Collaborator Detail Popup - renders the overlay with collaborator stats, roles, and shared projects.
 * @module collaborations.popup
 */

import { buildCollaboratorSummary } from "./collaborations.core.js";

const PLATFORM_ORIGIN = "https://platform.zone01.gr";

const $ = (sel) => document.querySelector(sel);
let selectedProjectName = "";

const getActiveUserLogin = () => {
	const loginText = $("#user-login")?.textContent?.trim() ?? "";
	if (!loginText) return "";
	return loginText.startsWith("@") ? loginText.slice(1) : loginText;
};

/** @param {string} isoDate */
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

/** @param {string} pathValue */
const toProjectUrl = (pathValue) => {
	if (typeof pathValue !== "string" || !pathValue.trim()) return null;

	try {
		const url = pathValue.startsWith("/")
			? new URL(pathValue, PLATFORM_ORIGIN)
			: new URL(pathValue);
		if (url.protocol !== "https:") return null;
		if (url.origin !== PLATFORM_ORIGIN) return null;
		return url.toString();
	} catch {
		return null;
	}
};

const buildDisplayNameByLogin = (allCollabs) =>
	allCollabs.reduce((map, collab) => {
		if (map.has(collab.login)) return map;
		const fullName = [collab.firstName, collab.lastName].filter(Boolean).join(" ");
		map.set(collab.login, fullName || collab.login);
		return map;
	}, new Map());

const getProjectMembers = (
	projectName,
	allCollabs,
	collaboratorLogin,
	projectRoles,
	activeUserLogin,
) => {
	const namesByLogin = buildDisplayNameByLogin(allCollabs);
	if (activeUserLogin && !namesByLogin.has(activeUserLogin)) {
		namesByLogin.set(activeUserLogin, activeUserLogin);
	}

	const projectRecords = allCollabs.filter(
		(collab) => collab.login === collaboratorLogin && collab.project === projectName,
	);

	const teamRoles = projectRoles.includes("Auditor")
		? new Set(["Auditor"])
		: new Set(["Partner", "Captain", "Auditee", "Member"]);

	const teamLogins = projectRecords
		.filter((record) => teamRoles.has(record.role))
		.flatMap((record) => record.teamMembers ?? [])
		.map((member) => member.login)
		.filter(Boolean);

	if (!teamLogins.length) {
		teamLogins.push(collaboratorLogin);
	}

	if (!projectRoles.includes("Auditor") && activeUserLogin) {
		teamLogins.push(activeUserLogin);
	}

	const uniqueLogins = [...new Set(teamLogins)].toSorted((a, b) =>
		(namesByLogin.get(a) ?? a).localeCompare(namesByLogin.get(b) ?? b),
	);

	return uniqueLogins.map((login) => ({
		login,
		label: namesByLogin.get(login) ?? login,
	}));
};

const resetProjectPanel = (refs) => {
	const { panel, panelBody, layout } = refs;
	layout.classList.remove("sp-layout-expanded");
	panel.classList.remove("active");
	panelBody.replaceChildren();
	const hint = document.createElement("p");
	hint.className = "sp-project-hint";
	hint.textContent = "Click a shared project to expand details.";
	panelBody.append(hint);
};

const openProjectDetail = (
	project,
	refs,
	allCollabs,
	collaboratorLogin,
	activeUserLogin,
) => {
	const { panel, panelTitle, panelBody, layout } = refs;
	if (!panel || !panelTitle || !panelBody || !layout) return;

	if (
		selectedProjectName === project.name &&
		panel.classList.contains("active")
	) {
		selectedProjectName = "";
		resetProjectPanel(refs);
		return;
	}

	selectedProjectName = project.name;

	panelTitle.textContent = project.name;
	panelBody.replaceChildren();

	const grid = document.createElement("div");
	grid.className = "sp-project-grid";

	const appendStat = (value, label) => {
		const stat = document.createElement("div");
		stat.className = "sp-project-stat";

		const statValue = document.createElement("span");
		statValue.className = "stat-value";
		statValue.textContent = value;

		const statLabel = document.createElement("span");
		statLabel.className = "stat-label";
		statLabel.textContent = label;

		stat.append(statValue, statLabel);
		grid.append(stat);
	};

	appendStat(String(project.count), "Shared Records");
	appendStat(project.roles.join(", ") || "—", "Roles");
	appendStat(toLocalDate(project.latestDate), "Latest Shared");
	appendStat(project.path ? "Available" : "—", "Project Link");
	panelBody.append(grid);

	const members = getProjectMembers(
		project.name,
		allCollabs,
		collaboratorLogin,
		project.roles,
		activeUserLogin,
	);
	const membersTitle = document.createElement("h4");
	membersTitle.className = "sp-project-subtitle";
	membersTitle.textContent = "Project Members";

	const membersList = document.createElement("ul");
	membersList.className = "sp-project-members";
	for (const member of members) {
		const item = document.createElement("li");
		item.className = "sp-project-member";
		item.textContent =
			member.login === activeUserLogin ? `${member.label} (you)` : member.label;
		membersList.append(item);
	}

	panelBody.append(membersTitle, membersList);

	if (project.path) {
		const pathLabel = document.createElement("p");
		pathLabel.className = "stat-label";
		pathLabel.style.marginBottom = "0.25rem";
		pathLabel.textContent = "Project Path";

		const pathValue = document.createElement("div");
		pathValue.className = "sp-project-path";
		pathValue.textContent = project.path;

		panelBody.append(pathLabel, pathValue);

		const projectUrl = toProjectUrl(project.path);
		if (projectUrl) {
			const link = document.createElement("a");
			link.href = projectUrl;
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			link.textContent = "Open project";
			link.className = "sp-project-link";
			panelBody.append(link);
		}
	}

	layout.classList.add("sp-layout-expanded");
	panel.classList.add("active");
};

/** Close the collaborator profile overlay. */
export const closeCollaboratorDetail = () => {
	const overlay = $("#student-profile-overlay");
	overlay?.classList.remove("active");
	const layout = $(".sp-layout");
	const panel = $(".sp-project-panel");
	selectedProjectName = "";
	const panelBody = $(".sp-project-body");
	if (layout && panel && panelBody) {
		resetProjectPanel({ panel, panelBody, layout });
	}
};

/** Open the detail popup for a given collaborator login. */
export const openCollaboratorDetail = (login, allCollabs) => {
	const summary = buildCollaboratorSummary(allCollabs, login);
	if (!summary) return;
	selectedProjectName = "";

	const overlay = $("#student-profile-overlay");
	const content = $("#student-profile-content");
	const title = $("#student-profile-title");
	if (!overlay || !content || !title) return;

	title.textContent = summary.displayName;
	content.replaceChildren();
	const activeUserLogin = getActiveUserLogin();

	const layout = document.createElement("div");
	layout.className = "sp-layout";

	const mainColumn = document.createElement("div");
	mainColumn.className = "sp-main-column";

	// Header with avatar, identity, and stats
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
	identity.className = "sp-identity";
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

	// Shared projects stat
	const statsRight = document.createElement("div");
	statsRight.className = "sp-stats-right";

	const statProjects = document.createElement("div");
	statProjects.className = "sp-stat";
	const valProjects = document.createElement("span");
	valProjects.className = "stat-value";
	valProjects.textContent = String(summary.totalProjects);
	const lblProjects = document.createElement("span");
	lblProjects.className = "stat-label";
	lblProjects.textContent = "Shared Projects";
	statProjects.append(valProjects, lblProjects);

	const statCollabs = document.createElement("div");
	statCollabs.className = "sp-stat";
	const valCollabs = document.createElement("span");
	valCollabs.className = "stat-value";
	valCollabs.textContent = String(summary.totalCollaborations);
	const lblCollabs = document.createElement("span");
	lblCollabs.className = "stat-label";
	lblCollabs.textContent = "Total Collabs";
	statCollabs.append(valCollabs, lblCollabs);

	statsRight.append(statProjects, statCollabs);

	header.append(initialsEl, identity, statsRight);

	// Roles section
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

	// Shared projects list
	const projectsSection = document.createElement("section");
	projectsSection.className = "sp-skills";
	const projectsTitle = document.createElement("h3");
	projectsTitle.textContent = "Recent Shared Projects";
	projectsSection.append(projectsTitle);

	const list = document.createElement("div");
	list.className = "collab-project-list";

	const detailPanel = document.createElement("aside");
	detailPanel.className = "sp-project-panel";
	const detailPanelTitle = document.createElement("h3");
	detailPanelTitle.className = "sp-project-title";
	detailPanelTitle.textContent = "Project Details";
	const detailPanelBody = document.createElement("div");
	detailPanelBody.className = "sp-project-body";
	const detailHint = document.createElement("p");
	detailHint.className = "sp-project-hint";
	detailHint.textContent = "Click a shared project to expand details.";
	detailPanelBody.append(detailHint);
	detailPanel.append(detailPanelTitle, detailPanelBody);

	const detailRefs = {
		layout,
		panel: detailPanel,
		panelTitle: detailPanelTitle,
		panelBody: detailPanelBody,
	};

	for (const project of summary.projects) {
		const item = document.createElement("div");
		item.className = "collab-project-item";
		item.setAttribute("role", "button");
		item.setAttribute("tabindex", "0");
		item.setAttribute("aria-label", `View details for ${project.name}`);
		item.addEventListener("click", () =>
			openProjectDetail(
				project,
				detailRefs,
				allCollabs,
				summary.login,
				activeUserLogin,
			),
		);
		item.addEventListener("keydown", (event) => {
			if (event.key !== "Enter" && event.key !== " ") return;
			event.preventDefault();
			openProjectDetail(
				project,
				detailRefs,
				allCollabs,
				summary.login,
				activeUserLogin,
			);
		});

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
	mainColumn.append(header, rolesSection, projectsSection);
	layout.append(mainColumn, detailPanel);
	content.append(layout);

	overlay.classList.add("active");
};
