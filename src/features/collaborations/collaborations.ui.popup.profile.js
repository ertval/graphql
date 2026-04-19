/**
 * Collaborator profile popup shared DOM builders.
 * @module collaborations.popup.profile
 */

/**
 * @param {object} summary
 * @returns {HTMLElement}
 */
export const createCollaboratorHeader = (summary) => {
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

	return header;
};

/**
 * @param {object} summary
 * @returns {HTMLElement}
 */
export const createCollaboratorRolesSection = (summary) => {
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

	return rolesSection;
};
