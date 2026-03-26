/**
 * Collaborations view filter and sort helpers.
 * @module collaborations.view.filters
 */

/**
 * @param {Array} collaborations
 * @param {string} filterText
 * @param {string} filterRole
 * @returns {Array}
 */
export const getFilteredCollaborations = (
	collaborations,
	filterText,
	filterRole,
) => {
	const query = filterText.toLowerCase();
	return collaborations.filter((collab) => {
		const matchText =
			!query ||
			collab.login.toLowerCase().includes(query) ||
			collab.displayName.toLowerCase().includes(query) ||
			collab.projects.some((project) =>
				project.name.toLowerCase().includes(query),
			);
		const matchRole =
			!filterRole || collab.byRole.some((role) => role.role === filterRole);
		return matchText && matchRole;
	});
};

/**
 * @param {Array} collaborations
 * @param {'login'|'project'|'role'|'date'|'totalCollaborations'} sortField
 * @param {'asc'|'desc'} sortDir
 * @param {string} filterText
 * @param {string} filterRole
 * @returns {Array}
 */
export const getSortedCollaborations = (
	collaborations,
	sortField,
	sortDir,
	filterText,
	filterRole,
) => {
	const filtered = getFilteredCollaborations(
		collaborations,
		filterText,
		filterRole,
	);

	return filtered.toSorted((a, b) => {
		if (sortField === "date") {
			return sortDir === "asc"
				? a.latestTs - b.latestTs
				: b.latestTs - a.latestTs;
		}

		if (sortField === "totalCollaborations") {
			const getVal = (collab) =>
				filterRole
					? collab.byRole.find((role) => role.role === filterRole)?.count || 0
					: collab.totalCollaborations;
			return sortDir === "asc"
				? getVal(a) - getVal(b)
				: getVal(b) - getVal(a);
		}

		let av = "";
		let bv = "";
		if (sortField === "project") {
			av = a.projects.map((project) => project.name).join(", ");
			bv = b.projects.map((project) => project.name).join(", ");
		} else if (sortField === "role") {
			if (filterRole) {
				const aVal = a.byRole.find((role) => role.role === filterRole)?.count || 0;
				const bVal = b.byRole.find((role) => role.role === filterRole)?.count || 0;
				return sortDir === "asc" ? aVal - bVal : bVal - aVal;
			}
			av = a.byRole.map((role) => role.role).join(", ");
			bv = b.byRole.map((role) => role.role).join(", ");
		} else {
			av = a[sortField] || "";
			bv = b[sortField] || "";
		}

		return sortDir === "asc"
			? String(av).localeCompare(String(bv))
			: String(bv).localeCompare(String(av));
	});
};
