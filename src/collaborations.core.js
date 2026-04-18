/**
 * Collaborations domain logic — name normalisation, summary building,
 * and collaborator summary construction.
 * Pure functions with zero DOM or I/O dependencies.
 * @module collaborations.core
 */

// ── Text helpers ───────────────────────────────────────────────────

/** @param {string} value @returns {boolean} */
const hasText = (value) => typeof value === "string" && value.trim().length > 0;

/** @param {string} char @returns {boolean} */
const isLetter = (char) => /\p{L}/u.test(char);

/** Capitalise a name token respecting hyphens and apostrophes. */
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
		capitalizeNext = char === "-" || char === "'" || char === "\u2019";
	}

	return result;
};

/** Normalise a full name string to readable Title Case. */
const toReadableName = (value) => {
	if (!hasText(value)) return "";
	return value
		.trim()
		.split(/\s+/u)
		.map((token) => toReadableNameToken(token))
		.join(" ");
};

const VERIFIED_ROLES = new Set(["Partner", "Captain", "Auditor"]);

/** @param {string} campus @returns {boolean} */
const hasCampus = (campus) => hasText(campus) && campus !== "—";

/**
 * Filters collaboration rows down to verified, real teammate records.
 * Records must have a recognised role, a project, and a login. When a campus
 * is available on both sides, the collaborator must match the signed-in user.
 * @param {Array<{id: string, login: string, firstName: string, lastName: string, campus: string, project: string, role: string, date: string, ts: number}>} collabs
 * @param {string} userCampus
 */
export const filterVerifiedCollaborations = (collabs, userCampus = "") => {
	const normalizedCampus = hasCampus(userCampus) ? userCampus : "";

	return collabs.filter((collab) => {
		if (!hasText(collab?.login)) return false;
		if (!hasText(collab?.project)) return false;
		if (!hasText(collab?.role)) return false;
		if (!collab?.date || typeof collab.ts !== "number") return false;
		if (!VERIFIED_ROLES.has(collab.role)) return false;
		if (!hasCampus(collab.campus)) return false;
		if (normalizedCampus && collab.campus !== normalizedCampus) {
			return false;
		}
		return true;
	});
};

// ── Name normalisation across login records ────────────────────────
/**
 * Ensures every record for the same login shares the best-available
 * firstName/lastName, normalised to readable casing.
 * @param {Array<{id: string, login: string, firstName: string, lastName: string, campus: string, project: string, role: string, date: string, ts: number}>} collabs
 */
export const normalizeCollaboratorNamesByLogin = (collabs) => {
	const canonicalByLogin = new Map();

	for (const collab of collabs) {
		const current = canonicalByLogin.get(collab.login) ?? {
			firstName: "",
			lastName: "",
		};

		if (!hasText(current.firstName) || !hasText(current.lastName)) {
			canonicalByLogin.set(collab.login, {
				firstName: current.firstName || toReadableName(collab.firstName),
				lastName: current.lastName || toReadableName(collab.lastName),
			});
		}
	}

	return collabs.map((collab) => ({
		...collab,
		...canonicalByLogin.get(collab.login),
	}));
};

// ── Collaborator summary builder ───────────────────────────────────
/**
 * Aggregates all records for a login into a summary object
 * with role counts, project list, and display name.
 * @param {Array<{id: string, login: string, firstName: string, lastName: string, campus: string, project: string, role: string, date: string, ts: number}>} collabs
 * @param {string} login
 */
export const buildCollaboratorSummary = (collabs, login) => {
	const matches = collabs
		.filter((collab) => collab.login === login)
		.toSorted((a, b) => b.ts - a.ts);

	if (!matches.length) return null;

	const primary = matches[0];

	// Pick the best non-empty name across all records
	const bestName = matches.reduce(
		(acc, collab) => ({
			firstName: acc.firstName || collab.firstName || "",
			lastName: acc.lastName || collab.lastName || "",
		}),
		{ firstName: "", lastName: "" },
	);
	const displayName =
		[bestName.firstName, bestName.lastName].filter(Boolean).join(" ") || login;

	// Count collaborations grouped by role
	const byRole = Object.groupBy(matches, (m) => m.role);
	const roleCounts = Object.entries(byRole)
		.map(([role, items]) => ({ role, count: items.length }))
		.toSorted((a, b) => a.role.localeCompare(b.role));

	// Aggregate project details including roles per project
	const groupedProjects = Map.groupBy(matches, (m) => m.project);
	const projects = Array.from(groupedProjects.values())
		.map((projectMatches) => {
			const latest = projectMatches.reduce((a, b) => (a.ts >= b.ts ? a : b));
			return {
				name: latest.project,
				path: projectMatches.find((m) => m.projectPath)?.projectPath ?? "",
				roles: [...new Set(projectMatches.map((m) => m.role))].toSorted(),
				latestDate: latest.date,
				latestTs: latest.ts,
				count: projectMatches.length,
			};
		})
		.toSorted((a, b) => b.latestTs - a.latestTs);

	return {
		login,
		displayName,
		campus: primary.campus || "—",
		totalCollaborations: matches.length,
		totalProjects: projects.length,
		latestTs: primary.ts,
		latestDate: primary.date,
		byRole: roleCounts,
		projects: projects.map(({ name, path, roles, latestDate, count }) => ({
			name,
			path,
			roles,
			latestDate,
			count,
		})),
	};
};
