/**
 * Dashboard metrics — XP formatting and summary computation.
 * Pure functions that transform raw transaction/progress data
 * into display-ready values for the dashboard cards.
 * @module dashboard.metrics
 */

// ── Byte-size formatter ────────────────────────────────────────────
/**
 * Formats bytes to human-readable XP (kB, MB).
 * @param {number} bytes
 * @returns {string}
 */
export const formatXP = (bytes) => {
	if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
	if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} kB`;
	return `${bytes} B`;
};

// ── XP summary aggregation ─────────────────────────────────────────
/**
 * Computes total XP and number of completed projects from raw data.
 * @param {Array<{amount:number}>} transactions
 * @param {Array<{grade:number, object?:{type?:string}}>} progress
 * @returns {{totalXP: number, completedProjects: number}}
 */
export const computeXpSummary = (transactions, progress) => {
	const totalXP = transactions.reduce((sum, tx) => sum + tx.amount, 0);
	const completedProjects = progress.filter(
		(project) => project.grade >= 1 && project.object?.type === "project",
	).length;

	return { totalXP, completedProjects };
};
