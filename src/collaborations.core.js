/**
 * Collaborations domain logic — name normalisation, summary building,
 * date formatting, and project URL construction.
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

// ── Name normalisation across login records ────────────────────────
/**
 * Ensures every record for the same login shares the best-available
 * firstName/lastName, normalised to readable casing.
 * @param {Array<{id: string, login: string, firstName: string, lastName: string, campus: string, project: string, role: string, date: string, ts: number}>} collabs
 */
export const normalizeCollaboratorNamesByLogin = (collabs) => {
	const canonicalByLogin = collabs.reduce((map, collab) => {
		const current = map.get(collab.login) ?? { firstName: "", lastName: "" };
		const candidate = {
			firstName: toReadableName(collab.firstName),
			lastName: toReadableName(collab.lastName),
		};

		const hasCurrentFull =
			hasText(current.firstName) && hasText(current.lastName);
		const hasCandidateFull =
			hasText(candidate.firstName) && hasText(candidate.lastName);

		// Prefer a record that has both parts filled
		if (!hasCurrentFull && hasCandidateFull) {
			map.set(collab.login, candidate);
			return map;
		}

		// Fill in any missing parts from the candidate
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

	// Apply canonical names back to every record
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
	const byRole = matches.reduce((map, collab) => {
		map.set(collab.role, (map.get(collab.role) ?? 0) + 1);
		return map;
	}, new Map());

	// Aggregate project details including roles per project
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
		latestTs: primary.ts,
		latestDate: primary.date,
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

// ── Date and URL utilities ─────────────────────────────────────────

/** Format an ISO date to a localised medium-style date string. */
export const toLocalDate = (isoDate) => {
	try {
		const zdt = Temporal.Instant.from(isoDate).toZonedDateTimeISO(
			Temporal.Now.timeZoneId(),
		);
		return zdt.toLocaleString("en", { dateStyle: "medium" });
	} catch {
		return isoDate?.split("T")?.[0] ?? "—";
	}
};

/** Build a full platform URL from a relative project path. */
export const toProjectUrl = (pathValue) => {
	if (!hasText(pathValue)) return null;
	if (pathValue.startsWith("http://") || pathValue.startsWith("https://")) {
		return pathValue;
	}
	if (!pathValue.startsWith("/")) return null;
	return `https://platform.zone01.gr${pathValue}`;
};
