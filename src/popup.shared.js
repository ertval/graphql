/**
 * Shared popup DOM builders used by dashboard and collaborations detail views.
 * @module popup.shared
 */

/**
 * @param {Array<{value:string, label:string}>} stats
 * @param {{
 *   gridClassName?: string,
 *   statClassName?: string,
 *   valueClassName?: string,
 *   labelClassName?: string,
 * }} [options]
 * @returns {HTMLDivElement}
 */
export const createProjectStatGrid = (stats, options = {}) => {
	const {
		gridClassName = "sp-project-grid",
		statClassName = "sp-project-stat",
		valueClassName = "stat-value",
		labelClassName = "stat-label",
	} = options;

	const grid = document.createElement("div");
	grid.className = gridClassName;

	for (const { value, label } of stats) {
		const stat = document.createElement("div");
		stat.className = statClassName;

		const statValue = document.createElement("span");
		statValue.className = valueClassName;
		statValue.textContent = value;

		const statLabel = document.createElement("span");
		statLabel.className = labelClassName;
		statLabel.textContent = label;

		stat.append(statValue, statLabel);
		grid.append(stat);
	}

	return grid;
};

/**
 * @param {Array<{login:string, label:string}>} members
 * @param {string} activeUserLogin
 * @param {{
 *   titleText?: string,
 *   titleClassName?: string,
 *   listClassName?: string,
 *   itemClassName?: string,
 *   currentUserClassName?: string,
 *   emptyText?: string,
 * }} [options]
 * @returns {[HTMLHeadingElement, HTMLUListElement]}
 */
export const createProjectMembersSection = (
	members,
	activeUserLogin,
	options = {},
) => {
	const {
		titleText = "Project Members",
		titleClassName = "sp-project-subtitle",
		listClassName = "sp-project-members",
		itemClassName = "sp-project-member",
		currentUserClassName = "sp-project-member-current-user",
		emptyText = "",
	} = options;

	const membersTitle = document.createElement("h4");
	membersTitle.className = titleClassName;
	membersTitle.textContent = titleText;

	const membersList = document.createElement("ul");
	membersList.className = listClassName;

	if (!members.length && emptyText) {
		const item = document.createElement("li");
		item.className = itemClassName;
		item.textContent = emptyText;
		membersList.append(item);
		return [membersTitle, membersList];
	}

	for (const member of members) {
		const item = document.createElement("li");
		const isCurrentUser = member.login === activeUserLogin;
		item.className = `${itemClassName}${isCurrentUser ? ` ${currentUserClassName}` : ""}`;
		item.textContent = member.label;
		membersList.append(item);
	}

	return [membersTitle, membersList];
};

/**
 * @param {string} roleText
 * @param {{
 *   titleText?: string,
 *   titleClassName?: string,
 *   valueClassName?: string,
 * }} [options]
 * @returns {[HTMLHeadingElement, HTMLDivElement]}
 */
export const createProjectRoleSection = (roleText, options = {}) => {
	const {
		titleText = "My Role",
		titleClassName = "sp-project-subtitle",
		valueClassName = "sp-project-my-role",
	} = options;

	const roleTitle = document.createElement("h4");
	roleTitle.className = titleClassName;
	roleTitle.textContent = titleText;

	const roleValue = document.createElement("div");
	roleValue.className = valueClassName;
	roleValue.textContent = roleText;

	return [roleTitle, roleValue];
};

/**
 * @param {string} path
 * @param {(path: string) => string} resolveProjectUrl
 * @param {{
 *   labelClassName?: string,
 *   pathClassName?: string,
 *   linkClassName?: string,
 *   labelText?: string,
 *   linkText?: string,
 * }} [options]
 * @returns {Array<HTMLElement>}
 */
export const createProjectPathAndLinkSection = (
	path,
	resolveProjectUrl,
	options = {},
) => {
	if (!path) return [];

	const {
		labelClassName = "stat-label sp-path-label",
		pathClassName = "sp-project-path",
		linkClassName = "sp-project-link",
		labelText = "Project Path",
		linkText = "Open project",
	} = options;

	const pathLabel = document.createElement("p");
	pathLabel.className = labelClassName;
	pathLabel.textContent = labelText;

	const pathValue = document.createElement("div");
	pathValue.className = pathClassName;
	pathValue.textContent = path;

	const nodes = [pathLabel, pathValue];
	const projectUrl = resolveProjectUrl(path);
	if (projectUrl) {
		const link = document.createElement("a");
		link.href = projectUrl;
		link.target = "_blank";
		link.rel = "noopener noreferrer";
		link.textContent = linkText;
		link.className = linkClassName;
		nodes.push(link);
	}

	return nodes;
};