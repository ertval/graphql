/**
 * Collaborator Detail Popup - renders the overlay with collaborator stats, roles, and shared projects.
 * @module collaborations.popup
 */

import {
	buildCollaboratorSummary,
	toLocalDate,
	toProjectUrl,
} from "./collaborations.core.js";

const $ = (sel) => document.querySelector(sel);

/** Close the collaborator profile overlay. */
export const closeCollaboratorDetail = () => {
	const overlay = $("#student-profile-overlay");
	overlay?.classList.remove("active");
};

/** Open the detail popup for a given collaborator login. */
export const openCollaboratorDetail = (login, allCollabs) => {
	const summary = buildCollaboratorSummary(allCollabs, login);
	if (!summary) return;

	const overlay = $("#student-profile-overlay");
	const content = $("#student-profile-content");
	const title = $("#student-profile-title");
	if (!overlay || !content || !title) return;

	title.textContent = summary.displayName;
	content.innerHTML = "";

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
	const stat = document.createElement("div");
	stat.className = "sp-stat";
	const valueEl = document.createElement("span");
	valueEl.className = "stat-value";
	valueEl.textContent = String(summary.totalProjects);
	const labelEl = document.createElement("span");
	labelEl.className = "stat-label";
	labelEl.textContent = "Shared Projects";
	stat.append(valueEl, labelEl);
	statsRight.append(stat);

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
	content.append(header, rolesSection, projectsSection);

	overlay.classList.add("active");
};
