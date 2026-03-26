/**
 * Dashboard role projects popup.
 * @module dashboard.popup.roles
 */

import { createProjectDetailPanelElements } from "./collaborations.popup.project-panel.js";
import { $, formatLocalDate, getActiveUserLogin, toProjectUrl } from "./infra.ui.js";
import {
	createProjectMembersSection,
	createProjectPathAndLinkSection,
	createProjectRoleSection,
	createProjectStatGrid,
} from "./popup.shared.js";

const ROLE_ORDER = ["Captain", "Partner", "Auditor"];
let selectedProjectKey = "";
let getRoleProjectsByRole = () => ({ Captain: [], Partner: [], Auditor: [] });
let eventsBound = false;

const resetProjectPanel = (refs) => {
	const { panel, panelBody, layout } = refs;
	layout.classList.remove("sp-layout-expanded");
	panel.classList.remove("active");
	panelBody.replaceChildren();
	const hint = document.createElement("p");
	hint.className = "sp-project-hint";
	hint.textContent = "Click a project to expand details.";
	panelBody.append(hint);
};

const renderProjectPanelContent = (project, panelBody, activeUserLogin) => {
	panelBody.replaceChildren();

	const grid = createProjectStatGrid([
		{ value: String(project.count ?? 1), label: "Records" },
		{ value: project.roles?.join(", ") ?? project.role ?? "—", label: "Role" },
		{ value: formatLocalDate(project.latestDate), label: "Latest Activity" },
		{ value: project.path ? "Available" : "—", label: "Project Link" },
	]);
	panelBody.append(grid);

	const members = (project.teamMembers ?? []).map((member) => ({
		login: member.login ?? "",
		label: member.displayName ?? member.login ?? "Unknown",
	}));

	const [membersTitle, membersList] = createProjectMembersSection(
		members,
		activeUserLogin,
		{ titleText: "Project Members", emptyText: "Team data unavailable" },
	);
	panelBody.append(membersTitle, membersList);

	const [roleTitle, roleValue] = createProjectRoleSection(
		project.role ?? "Partner",
		{ titleText: "My Role" },
	);
	panelBody.append(roleTitle, roleValue);

	const pathNodes = createProjectPathAndLinkSection(project.path ?? "", toProjectUrl);
	if (pathNodes.length) {
		panelBody.append(...pathNodes);
	}
};

const openProjectDetail = (project, refs, activeUserLogin) => {
	const { panel, panelTitle, panelBody, layout } = refs;
	if (!panel || !panelTitle || !panelBody || !layout) return;
	const alreadyExpanded =
		panel.classList.contains("active") &&
		layout.classList.contains("sp-layout-expanded");

	if (selectedProjectKey === project.key && panel.classList.contains("active")) {
		selectedProjectKey = "";
		resetProjectPanel(refs);
		return;
	}

	selectedProjectKey = project.key;
	panelTitle.textContent = project.name;

	if (alreadyExpanded) {
		renderProjectPanelContent(project, panelBody, activeUserLogin);
		return;
	}

	requestAnimationFrame(() => {
		renderProjectPanelContent(project, panelBody, activeUserLogin);
		layout.classList.add("sp-layout-expanded");
		requestAnimationFrame(() => {
			panel.classList.add("active");
		});
	});
};

export const closeRoleProjectsPopup = () => {
	const overlay = $("#role-projects-overlay");
	overlay?.classList.remove("active");

	const layout = $("#role-projects-content .sp-layout");
	const panel = $("#role-projects-content .sp-project-panel");
	const panelBody = $("#role-projects-content .sp-project-body");
	selectedProjectKey = "";

	if (layout && panel && panelBody) {
		resetProjectPanel({ layout, panel, panelBody });
	}
};

const openRoleProjectsPopup = (role) => {
	const overlay = $("#role-projects-overlay");
	const title = $("#role-projects-title");
	const content = $("#role-projects-content");
	if (!overlay || !title || !content) return;

	const activeUserLogin = getActiveUserLogin();
	const projectsByRole = getRoleProjectsByRole();
	const projects = projectsByRole[role] ?? [];

	title.textContent = `${role} Projects`;
	content.replaceChildren();
	selectedProjectKey = "";

	const layout = document.createElement("div");
	layout.className = "sp-layout";

	const mainColumn = document.createElement("div");
	mainColumn.className = "sp-main-column";

	const projectsSection = document.createElement("section");
	projectsSection.className = "sp-skills";
	const projectsTitle = document.createElement("h3");
	projectsTitle.textContent = `${role} Role History`;
	projectsSection.append(projectsTitle);

	const list = document.createElement("div");
	list.className = "collab-project-list";
	projectsSection.append(list);

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

	if (!projects.length) {
		const empty = document.createElement("p");
		empty.className = "sp-project-hint";
		empty.textContent = `No projects found for role ${role}.`;
		list.append(empty);
	} else {
		for (const project of projects) {
			const item = document.createElement("div");
			item.className = "collab-project-item";
			item.setAttribute("role", "button");
			item.setAttribute("tabindex", "0");
			item.setAttribute("aria-label", `View details for ${project.name}`);
			item.addEventListener("click", () =>
				openProjectDetail(project, detailRefs, activeUserLogin),
			);
			item.addEventListener("keydown", (event) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				openProjectDetail(project, detailRefs, activeUserLogin);
			});

			const projectName = document.createElement("span");
			projectName.className = "collab-project-name";
			projectName.textContent = project.name;

			const meta = document.createElement("span");
			meta.className = "collab-project-meta";
			meta.textContent = `${project.count}x • ${formatLocalDate(project.latestDate)}`;

			item.append(projectName, meta);
			list.append(item);
		}
	}

	mainColumn.append(projectsSection);
	layout.append(mainColumn, detailPanel);
	content.append(layout);
	resetProjectPanel(detailRefs);
	overlay.classList.add("active");
};

export const initRoleProjectsPopup = (roleProjectsGetter) => {
	getRoleProjectsByRole = roleProjectsGetter;
	if (eventsBound) return;
	eventsBound = true;

	for (const role of ROLE_ORDER) {
		const button = $(`#role-counter-${role.toLowerCase()}`);
		button?.addEventListener("click", () => openRoleProjectsPopup(role));
		button?.addEventListener("keydown", (event) => {
			if (event.key !== "Enter" && event.key !== " ") return;
			event.preventDefault();
			openRoleProjectsPopup(role);
		});
	}

	const closeBtn = $("#role-projects-close");
	closeBtn?.addEventListener("click", closeRoleProjectsPopup);

	const overlay = $("#role-projects-overlay");
	overlay?.addEventListener("click", (event) => {
		if (event.target === overlay) {
			closeRoleProjectsPopup();
		}
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && overlay?.classList.contains("active")) {
			closeRoleProjectsPopup();
		}
	});
};
