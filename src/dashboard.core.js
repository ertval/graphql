/**
 * Dashboard Core Domain Logic.
 * Pure functions for data transformation and math.
 * @module dashboard.core
 */

export { isAuthFailureError } from "./infra.errors.js";

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

