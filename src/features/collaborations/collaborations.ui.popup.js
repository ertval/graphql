/**
 * Collaborator Detail Popup - renders the overlay with collaborator stats, roles, and shared projects.
 * @module collaborations.popup
 */

import {
	$,
	formatLocalDate,
	getActiveUserDisplayName,
	getActiveUserLogin,
	toProjectUrl,
} from "../../infra/ui.js";
import {
	createProjectMembersSection,
	createProjectPathAndLinkSection,
	createProjectRoleSection,
	createProjectStatGrid,
} from "../../shared/ui/popup.shared.js";
import { buildCollaboratorSummary } from "./collaborations.core.js";
import {
	createCollaboratorHeader,
	createCollaboratorRolesSection,
} from "./collaborations.ui.popup.profile.js";
import { createProjectDetailPanelElements } from "./collaborations.ui.popup.project-panel.js";

let selectedProjectName = "";

const buildDisplayNameByLogin = (allCollabs) =>
	allCollabs.reduce((map, collab) => {
		if (map.has(collab.login)) return map;
		const fullName = [collab.firstName, collab.lastName]
			.filter(Boolean)
			.join(" ");
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
	if (activeUserLogin) {
		const activeUserDisplayName = getActiveUserDisplayName();
		const existingName = namesByLogin.get(activeUserLogin) ?? "";
		if (
			activeUserDisplayName &&
			(!existingName || existingName === activeUserLogin)
		) {
			namesByLogin.set(activeUserLogin, activeUserDisplayName);
		} else if (!existingName) {
			namesByLogin.set(activeUserLogin, activeUserLogin);
		}
	}

	const projectRecords = allCollabs.filter(
		(collab) =>
			collab.login === collaboratorLogin && collab.project === projectName,
	);

	const hasSharedTeamMembership = projectRecords.some(
		(record) =>
			record.relationType === "group_member" || record.role === "Partner",
	);

	const availableProjectRoles = new Set(projectRoles);

	const teamLogins = projectRecords
		.filter((record) => availableProjectRoles.has(record.role))
		.flatMap((record) => record.teamMembers ?? [])
		.map((member) => member.login)
		.filter(Boolean);

	if (!teamLogins.length) {
		teamLogins.push(collaboratorLogin);
	}

	if (hasSharedTeamMembership && activeUserLogin) {
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

const getActiveUserProjectRole = (
	projectName,
	allCollabs,
	collaboratorLogin,
	activeUserLogin,
) => {
	if (!activeUserLogin) return "Partner";

	const projectRecords = allCollabs.filter(
		(collab) =>
			collab.login === collaboratorLogin && collab.project === projectName,
	);

	const activeRoles = projectRecords.reduce((roles, record) => {
		if (record.relationType === "audit_given") {
			roles.add("Auditor");
			return roles;
		}

		if (
			record.relationType === "group_member" ||
			record.relationType === "audit_received"
		) {
			if (record.teamCaptainLogin === activeUserLogin) {
				roles.add("Captain");
			} else {
				roles.add("Partner");
			}
		}

		return roles;
	}, new Set());

	if (!activeRoles.size) return "Partner";

	const orderedRoles = ["Auditor", "Captain", "Partner"].filter((role) =>
		activeRoles.has(role),
	);

	return orderedRoles.join(", ");
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

const renderProjectPanelContent = (
	project,
	panelBody,
	allCollabs,
	collaboratorLogin,
	activeUserLogin,
) => {
	panelBody.replaceChildren();

	const grid = createProjectStatGrid([
		{ value: String(project.count), label: "Shared Records" },
		{ value: project.roles.join(", ") || "—", label: "Roles" },
		{ value: formatLocalDate(project.latestDate), label: "Latest Shared" },
		{ value: project.path ? "Available" : "—", label: "Project Link" },
	]);
	panelBody.append(grid);

	const members = getProjectMembers(
		project.name,
		allCollabs,
		collaboratorLogin,
		project.roles,
		activeUserLogin,
	);
	const [membersTitle, membersList] = createProjectMembersSection(
		members,
		activeUserLogin,
		{ titleText: "Project Members" },
	);

	panelBody.append(membersTitle, membersList);

	const [activeRoleTitle, activeRoleValue] = createProjectRoleSection(
		getActiveUserProjectRole(
			project.name,
			allCollabs,
			collaboratorLogin,
			activeUserLogin,
		),
		{ titleText: "My Role" },
	);

	panelBody.append(activeRoleTitle, activeRoleValue);

	const pathNodes = createProjectPathAndLinkSection(project.path, toProjectUrl);
	if (pathNodes.length) {
		panelBody.append(...pathNodes);
	}
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
	const isPanelAlreadyExpanded =
		panel.classList.contains("active") &&
		layout.classList.contains("sp-layout-expanded");

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
	if (isPanelAlreadyExpanded) {
		renderProjectPanelContent(
			project,
			panelBody,
			allCollabs,
			collaboratorLogin,
			activeUserLogin,
		);
		return;
	}

	requestAnimationFrame(() => {
		renderProjectPanelContent(
			project,
			panelBody,
			allCollabs,
			collaboratorLogin,
			activeUserLogin,
		);

		layout.classList.add("sp-layout-expanded");
		requestAnimationFrame(() => {
			panel.classList.add("active");
		});
	});
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

	const header = createCollaboratorHeader(summary);
	const rolesSection = createCollaboratorRolesSection(summary);

	// Shared projects list
	const projectsSection = document.createElement("section");
	projectsSection.className = "sp-skills";
	const projectsTitle = document.createElement("h3");
	projectsTitle.textContent = "Recent Shared Projects";
	projectsSection.append(projectsTitle);

	const list = document.createElement("div");
	list.className = "collab-project-list";

	const {
		panel: detailPanel,
		panelTitle: detailPanelTitle,
		panelBody: detailPanelBody,
	} = createProjectDetailPanelElements();

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
		meta.textContent = `${project.count}x • ${project.roles.join(", ")} • ${formatLocalDate(project.latestDate)}`;

		item.append(projectName, meta);
		list.append(item);
	}

	projectsSection.append(list);
	mainColumn.append(header, rolesSection, projectsSection);
	layout.append(mainColumn, detailPanel);
	content.append(layout);

	overlay.classList.add("active");
};
