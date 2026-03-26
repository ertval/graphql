/**
 * Collaborations view table row renderer.
 * @module collaborations.view.table
 */

/**
 * @param {{
 * 	tbody: HTMLElement,
 * 	pageSlice: Array,
 * 	currentPage: number,
 * 	pageSize: number,
 * 	filterRole: string,
 * 	allCollabs: Array,
 * 	onOpenCollaboratorDetail: (login: string, allCollabs: Array) => void,
 * 	formatDate: (isoDate: string) => string,
 * }} args
 * @returns {boolean}
 */
export const renderCollabsTableBody = ({
	tbody,
	pageSlice,
	currentPage,
	pageSize,
	filterRole,
	allCollabs,
	onOpenCollaboratorDetail,
	formatDate,
}) => {
	tbody.replaceChildren();
	if (!pageSlice.length) {
		const tr = document.createElement("tr");
		const td = document.createElement("td");
		td.colSpan = 6;
		td.className = "students-empty";
		td.textContent = "No collaborations match your search.";
		tr.append(td);
		tbody.append(tr);
		return false;
	}

	for (const [rank, collab] of pageSlice.entries()) {
		const globalRank = (currentPage - 1) * pageSize + rank + 1;
		const firstPart = collab.displayName.split(" ")[0];
		const secondPart = collab.displayName.split(" ")[1];
		const initials =
			`${firstPart?.[0] ?? ""}${secondPart?.[0] ?? ""}`.toUpperCase() ||
			collab.login[0].toUpperCase();
		const displayName = collab.displayName || collab.login;

		const tr = document.createElement("tr");
		tr.className = "student-row collab-row-action";
		tr.setAttribute("role", "button");
		tr.setAttribute("tabindex", "0");
		tr.setAttribute(
			"aria-label",
			`Open collaborator details for ${displayName}`,
		);
		tr.addEventListener("click", () =>
			onOpenCollaboratorDetail(collab.login, allCollabs),
		);
		tr.addEventListener("keydown", (event) => {
			if (event.key !== "Enter" && event.key !== " ") return;
			event.preventDefault();
			onOpenCollaboratorDetail(collab.login, allCollabs);
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

		const totalCell = document.createElement("td");
		totalCell.className = "td-total td-total-centered";
		const totalBadge = document.createElement("span");
		totalBadge.className = "total-badge";
		const displayedCollabsCount = filterRole
			? collab.byRole.find((role) => role.role === filterRole)?.count || 0
			: collab.totalCollaborations;
		totalBadge.textContent = String(displayedCollabsCount);
		totalCell.append(totalBadge);

		const projectCell = document.createElement("td");
		projectCell.className = "td-campus";
		const projectWrap = document.createElement("div");
		projectWrap.className = "collab-tag-wrap";
		const displayedProjects = filterRole
			? collab.projects.filter((project) => project.roles.includes(filterRole))
			: collab.projects;

		const maxProjects = 4;
		const visibleProjects = displayedProjects.slice(0, maxProjects);
		for (const project of visibleProjects) {
			const projectTag = document.createElement("span");
			projectTag.className = "campus-tag collab-project-tag";
			projectTag.textContent =
				project.count > 1 ? `${project.name} x${project.count}` : project.name;
			projectWrap.append(projectTag);
		}
		if (displayedProjects.length > maxProjects) {
			const overflowTag = document.createElement("span");
			overflowTag.className = "campus-tag collab-project-tag-overflow";
			overflowTag.textContent = "...";
			projectWrap.append(overflowTag);
		}
		projectCell.append(projectWrap);

		const roleCell = document.createElement("td");
		roleCell.className = "td-level";
		const roleWrap = document.createElement("div");
		roleWrap.className = "collab-role-wrap";
		const displayedRoles = filterRole
			? collab.byRole.filter((role) => role.role === filterRole)
			: collab.byRole;

		for (const roleSummary of displayedRoles) {
			const roleBadge = document.createElement("span");
			const roleClass =
				roleSummary.role === "Partner"
					? "role-partner"
					: roleSummary.role === "Captain"
						? "role-captain"
						: roleSummary.role === "Auditor"
							? "role-auditor"
							: "role-member";
			roleBadge.className = `level-badge ${roleClass}`;
			roleBadge.textContent =
				roleSummary.count > 1
					? `${roleSummary.role} x${roleSummary.count}`
					: roleSummary.role;
			roleWrap.append(roleBadge);
		}
		roleCell.append(roleWrap);

		const dateCell = document.createElement("td");
		dateCell.className = "td-date collab-date-cell";
		dateCell.textContent = formatDate(collab.latestDate);

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

	return true;
};
