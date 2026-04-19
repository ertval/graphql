/**
 * Dashboard Core Domain Logic.
 * Pure functions for data transformation and math.
 * @module dashboard.core
 */

export { isAuthFailureError } from "../../infra/errors.js";

/**
 * Computes total XP and the number of completed projects from raw data.
 * @param {Array<{amount:number}>} transactions
 * @param {Array<{grade:number, object:{type:string}}>} progress
 * @returns {{totalXP:number, completedProjects:number}}
 */
export const computeXpSummary = (transactions, progress) => {
	const totalXP = transactions.reduce((sum, tx) => sum + tx.amount, 0);
	const completedProjects = progress.filter(
		(project) => project.grade >= 1 && project.object?.type === "project",
	).length;

	return { totalXP, completedProjects };
};

/**
 * Deduplicates skill transactions, keeps the highest amount per type,
 * and sorts them descending, returning the top N skills.
 * @param {Array<{type:string, amount:number}>} skills
 * @param {number} limit
 * @returns {Array<[string, number]>}
 */
export const computeTopSkills = (skills, limit = 8) => {
	const skillMap = new Map();
	for (const s of skills) {
		const name = s.type.replace("skill_", "");
		const existing = skillMap.get(name);
		if (!existing || s.amount > existing) skillMap.set(name, s.amount);
	}

	return [...skillMap.entries()]
		.toSorted(([, a], [, b]) => b - a)
		.slice(0, limit);
};

/** @param {string | null | undefined} isoDate */
const toEpochMsSafe = (isoDate) => {
	if (!isoDate) return 0;
	try {
		return Temporal.Instant.from(isoDate).epochMilliseconds;
	} catch {
		return 0;
	}
};

/** @param {number | null | undefined} objectId @param {string} name */
const toProjectKey = (objectId, name) =>
	typeof objectId === "number"
		? `id:${objectId}`
		: `name:${name.toLowerCase()}`;

/**
 * @param {Array<{
 *  role:'Captain'|'Partner'|'Auditor',
 *  objectId:number|null,
 *  name:string,
 *  path:string,
 *  date:string,
 *  ts:number,
 *  teamMembers:Array<{login:string, displayName:string}>,
 *  captainLogin:string,
 * }>} records
 */
const aggregateRoleProjects = (records) => {
	if (!records.length) return [];

	const grouped = Map.groupBy(records, (record) =>
		toProjectKey(record.objectId, record.name),
	);

	return Array.from(grouped.entries())
		.map(([key, items]) => {
			const latest = items.reduce((best, current) =>
				current.ts >= best.ts ? current : best,
			);

			return {
				key,
				name: latest.name,
				objectId: latest.objectId,
				path: latest.path,
				role: latest.role,
				roles: [latest.role],
				latestDate: latest.date,
				latestTs: latest.ts,
				count: items.length,
				teamMembers: latest.teamMembers,
				captainLogin: latest.captainLogin,
			};
		})
		.toSorted((a, b) => b.latestTs - a.latestTs);
};

/**
 * Builds dashboard role counters and role-specific project lists.
 * Auditor count is deduplicated by project so repeated audits on the same
 * project do not inflate the role counter.
 * @param {Array<{createdAt?:string, updatedAt?:string, path?:string, object?:{id?:number, name?:string, type?:string}}>} completedProjects
 * @param {Map<string, {captainLogin?:string, members?:Array<{login:string, displayName:string}>}>} teamsByProject
 * @param {string} userLogin
 * @param {Array<{createdAt?:string, objectId?:number|null, projectName?:string, projectPath?:string, captainLogin?:string, teamMembers?:Array<{login:string, displayName:string}>}>} auditorAudits
 * @returns {{
 *  stats:{captain:number, partner:number, auditor:number},
 *  projectsByRole:{Captain:Array, Partner:Array, Auditor:Array},
 * }}
 */
export const computeDashboardRoleData = (
	completedProjects,
	teamsByProject,
	userLogin,
	auditorAudits = [],
) => {
	const captainRecords = [];
	const partnerRecords = [];

	for (const project of completedProjects) {
		const objectId =
			typeof project.object?.id === "number" ? project.object.id : null;
		const teamInfo =
			objectId !== null
				? (teamsByProject.get(String(objectId)) ?? {
						captainLogin: "",
						members: [],
					})
				: {
						captainLogin: "",
						members: [],
					};

		const baseRecord = {
			objectId,
			name: project.object?.name ?? "Unknown Project",
			path: project.path ?? "",
			date: project.updatedAt ?? project.createdAt ?? "",
			ts: toEpochMsSafe(project.updatedAt ?? project.createdAt),
			teamMembers: teamInfo.members ?? [],
			captainLogin: teamInfo.captainLogin ?? "",
		};

		if (teamInfo.captainLogin === userLogin) {
			captainRecords.push({ ...baseRecord, role: "Captain" });
		} else {
			partnerRecords.push({ ...baseRecord, role: "Partner" });
		}
	}

	const auditorRecords = auditorAudits
		.filter(
			(audit) => typeof audit.projectName === "string" && audit.projectName,
		)
		.map((audit) => ({
			role: "Auditor",
			objectId: typeof audit.objectId === "number" ? audit.objectId : null,
			name: audit.projectName ?? "Unknown Project",
			path: audit.projectPath ?? "",
			date: audit.createdAt ?? "",
			ts: toEpochMsSafe(audit.createdAt),
			teamMembers: audit.teamMembers ?? [],
			captainLogin: audit.captainLogin ?? "",
		}));

	const captainProjects = aggregateRoleProjects(captainRecords);
	const partnerProjects = aggregateRoleProjects(partnerRecords);
	const auditorProjects = aggregateRoleProjects(auditorRecords);

	return {
		stats: {
			captain: captainRecords.length,
			partner: partnerRecords.length,
			auditor: auditorProjects.length,
		},
		projectsByRole: {
			Captain: captainProjects,
			Partner: partnerProjects,
			Auditor: auditorProjects,
		},
	};
};

/**
 * Computes cumulative role counters for dashboard audit tile.
 * Captain/Partner are derived from completed projects to keep totals aligned.
 * @param {Array<{object?: {id?: number}}>} completedProjects
 * @param {Map<string, {captainLogin?: string}>} teamsByProject
 * @param {string} userLogin
 * @param {number} auditorCount
 * @returns {{captain:number, partner:number, auditor:number}}
 */
export const computeAuditRoleStats = (
	completedProjects,
	teamsByProject,
	userLogin,
	auditorCount,
) => {
	const completedCount = completedProjects.length;
	const captain = completedProjects.reduce((count, project) => {
		const projectId = project.object?.id;
		if (typeof projectId !== "number") return count;
		const teamInfo = teamsByProject.get(String(projectId));
		return teamInfo?.captainLogin === userLogin ? count + 1 : count;
	}, 0);

	return {
		captain,
		partner: Math.max(completedCount - captain, 0),
		auditor: Number.isFinite(auditorCount) ? auditorCount : 0,
	};
};
