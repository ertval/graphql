/**
 * Dashboard View Controller.
 * Handles DOM rendering specifically for the dashboard tab.
 * @module dashboard.view
 */

import { isAuthenticated } from "../../infra/auth.js";
import { $ } from "../../infra/ui.js";
import {
	fetchAuditXPTransactions,
	fetchProgress,
	fetchProjectTeams,
	fetchResults,
	fetchSkills,
	fetchUserInfo,
	fetchUserLevel,
	fetchUserRoleStats,
	fetchXPTransactions,
} from "./dashboard.api.js";
import {
	computeAuditDetailsProjects,
	computeDashboardRoleData,
	isAuthFailureError,
} from "./dashboard.core.js";
import {
	closeAuditDetailsPopup,
	initAuditDetailsPopup,
} from "./dashboard.ui.popup.audit.js";
import {
	closeProjectDetail,
	initProjectDetailClose,
	renderActivity,
} from "./dashboard.ui.popup.js";
import {
	closeRoleProjectsPopup,
	initRoleProjectsPopup,
} from "./dashboard.ui.popup.roles.js";
import {
	renderAuditSection,
	renderGraphs,
	renderSkills,
	renderUserSection,
	renderXPSection,
} from "./dashboard.ui.view.renderers.js";

// ── DOM References ─────────────────────────────────────────────────
// ── Module-level state (needed for project detail cross-reference) ─
/** @type {Array<{amount:number, createdAt:string, path:string, object:{name:string,type:string}}>} */
let _xpTransactions = [];

/** @type {Array<{grade:number, createdAt:string, object:{name:string,type:string}}>} */
let _results = [];

/** @type {Map<string, {captainLogin:string, members:Array<{login:string, displayName:string}>}>} */
let _teamsByProject = new Map();

/** @type {{Captain:Array, Partner:Array, Auditor:Array}} */
let _roleProjectsByRole = {
	Captain: [],
	Partner: [],
	Auditor: [],
};

/** @type {Array<{key:string,name:string,path:string,latestDate:string,latestTs:number,auditCount:number,totalXP:number}>} */
let _auditDetailsProjects = [];
let dashboardLoadGeneration = 0;

export const invalidateDashboardLoads = () => {
	dashboardLoadGeneration += 1;
};

export const initDashboard = () => {
	initProjectDetailClose(
		() => _xpTransactions,
		() => _results,
		() => _teamsByProject,
	);
	initRoleProjectsPopup(() => _roleProjectsByRole);
	initAuditDetailsPopup(() => _auditDetailsProjects);

	document.addEventListener("auth:login", async () => {
		const result = await loadDashboard(
			() => document.dispatchEvent(new CustomEvent("auth:logout")),
			isAuthenticated,
		);
		if (result?.ok) {
			document.dispatchEvent(
				new CustomEvent("dashboard:loaded", {
					detail: { userId: result.data.userId },
				}),
			);
		}
	});

	document.addEventListener("auth:logout", () => {
		invalidateDashboardLoads();
		resetDashboard();
	});
};

// ── Dashboard Data Loading ─────────────────────────────────────────

/** Clears all dashboard UI elements back to empty state. */
export const resetDashboard = () => {
	invalidateDashboardLoads();
	const textOf = (id, val) => {
		const el = $(id);
		if (el) el.textContent = val;
	};
	textOf("#avatar-initials", "");
	textOf("#user-fullname", "");
	textOf("#user-login", "");
	textOf("#user-email", "");
	textOf("#user-campus", "");
	textOf("#total-xp", "—");
	textOf("#user-level", "—");
	textOf("#completed-projects", "—");
	textOf("#audit-ratio", "—");
	textOf("#audit-done-value", "");
	textOf("#audit-received-value", "");
	textOf("#audit-role-captain", "0");
	textOf("#audit-role-partner", "0");
	textOf("#audit-role-auditor", "0");
	textOf("#nav-username", "");

	const styleOf = (id, width) => {
		const el = $(id);
		if (el) el.style.width = width;
	};
	styleOf("#audit-done-bar", "0");
	styleOf("#audit-received-bar", "0");

	const htmlOf = (id) => {
		const el = $(id);
		if (el) el.replaceChildren();
	};
	htmlOf("#xp-line-chart");
	htmlOf("#project-bar-chart");
	htmlOf("#audit-donut-chart");
	htmlOf("#passfail-pie-chart");
	htmlOf("#skills-list");
	htmlOf("#activity-list");

	_xpTransactions = [];
	_results = [];
	_teamsByProject = new Map();
	_roleProjectsByRole = {
		Captain: [],
		Partner: [],
		Auditor: [],
	};
	_auditDetailsProjects = [];
	closeAuditDetailsPopup();
	closeProjectDetail();
	closeRoleProjectsPopup();
};

/** Fetches all dashboard data and renders every section. */
export const loadDashboard = async (
	onAuthFailure,
	isSessionValid = () => true,
) => {
	const loadGeneration = ++dashboardLoadGeneration;
	const shouldLogout = (error) =>
		(error instanceof Error && isAuthFailureError(error)) || !isSessionValid();
	const _normalizeProjectName = (name) =>
		typeof name === "string" ? name.trim().toLowerCase() : "";
	const staleResult = () => {
		if (loadGeneration !== dashboardLoadGeneration) {
			return { ok: false, error: new Error("Stale dashboard load cancelled.") };
		}
		return null;
	};

	try {
		const userResult = await fetchUserInfo();
		const staleAfterUser = staleResult();
		if (staleAfterUser) return staleAfterUser;
		if (!userResult.ok) {
			if (shouldLogout(userResult.error)) {
				onAuthFailure();
			}
			return { ok: false, error: userResult.error };
		}

		const user = userResult.data;

		renderUserSection(user);
		// Fetch all data in parallel for performance
		const [
			xpResult,
			auditXpResult,
			progressResult,
			skillsResult,
			levelResult,
			resultsResult,
			roleStatsResult,
		] = await Promise.all([
			fetchXPTransactions(user.id),
			fetchAuditXPTransactions(user.id),
			fetchProgress(user.id),
			fetchSkills(user.id),
			fetchUserLevel(user.id),
			fetchResults(user.id),
			fetchUserRoleStats(user.id),
		]);
		const staleAfterParallel = staleResult();
		if (staleAfterParallel) return staleAfterParallel;

		const firstError = [
			xpResult,
			auditXpResult,
			progressResult,
			skillsResult,
			levelResult,
			resultsResult,
			roleStatsResult,
		].find((result) => !result.ok);

		if (firstError && !firstError.ok) {
			if (shouldLogout(firstError.error)) {
				onAuthFailure();
			}
			return { ok: false, error: firstError.error };
		}

		const xpTransactions = xpResult.data;
		const progress = progressResult.data;
		const skills = skillsResult.data;
		const level = levelResult.data;
		const rawResults = resultsResult.data;
		const completedProjects = progress.filter(
			(project) => project.grade >= 1 && project.object?.type === "project",
		);
		const projectObjectIds = [
			...new Set([
				...rawResults
					.map((result) => result.objectId)
					.filter((id) => typeof id === "number"),
				...xpTransactions
					.map((transaction) => transaction.object?.id)
					.filter((id) => typeof id === "number"),
				...completedProjects
					.map((project) => project.object?.id)
					.filter((id) => typeof id === "number"),
			]),
		];
		const projectTeamsResult = await fetchProjectTeams(
			user.id,
			projectObjectIds,
		);
		const staleAfterTeams = staleResult();
		if (staleAfterTeams) return staleAfterTeams;
		if (!projectTeamsResult.ok) {
			if (shouldLogout(projectTeamsResult.error)) {
				onAuthFailure();
			}
			return { ok: false, error: projectTeamsResult.error };
		}

		const teamsByProject = projectTeamsResult.data;
		_teamsByProject = teamsByProject;
		const roleData = computeDashboardRoleData(
			completedProjects,
			teamsByProject,
			user.login,
			roleStatsResult.data?.audits ?? [],
		);
		const roleStats = roleData.stats;
		_roleProjectsByRole = Object.fromEntries(
			Object.entries(roleData.projectsByRole).map(([role, projects]) => [
				role,
				projects.map((project) => {
					const xpAmount = xpTransactions.reduce((sum, tx) => {
						if (
							typeof project.objectId === "number" &&
							tx.object?.id === project.objectId
						) {
							return sum + tx.amount;
						}

						if (project.path && tx.path && tx.path === project.path) {
							return sum + tx.amount;
						}

						if (
							_normalizeProjectName(tx.object?.name) ===
							_normalizeProjectName(project.name)
						) {
							return sum + tx.amount;
						}

						return sum;
					}, 0);

					return {
						...project,
						xpAmount,
					};
				}),
			]),
		);
		const dashboardUser = { ...user, roleStats };
		_auditDetailsProjects = computeAuditDetailsProjects(
			roleStatsResult.data?.audits ?? [],
			auditXpResult.data ?? [],
		);
		const projectCountByObjectId = rawResults.reduce((map, result) => {
			const projectKey = String(result.objectId ?? "");
			if (!projectKey) return map;
			map.set(projectKey, (map.get(projectKey) ?? 0) + 1);
			return map;
		}, new Map());

		const results = rawResults.map((result) => {
			const projectKey = String(result.objectId ?? "");
			const teamInfo = teamsByProject.get(projectKey) ?? {
				members: [],
				captainLogin: "",
			};
			const isCaptain = teamInfo.captainLogin === user.login;
			const myRole = isCaptain ? "Captain" : "Partner";

			return {
				...result,
				teamMembers: teamInfo.members,
				teamCaptainLogin: teamInfo.captainLogin,
				myRole,
				projectRoles: [myRole],
				sharedRecordsCount: projectCountByObjectId.get(projectKey) ?? 1,
			};
		});

		// Store for project detail cross-referencing
		_xpTransactions = xpTransactions;
		_results = results;

		const staleBeforeRender = staleResult();
		if (staleBeforeRender) return staleBeforeRender;

		renderUserSection(dashboardUser);
		renderXPSection(xpTransactions, level, progress);
		renderAuditSection(dashboardUser);
		renderGraphs(xpTransactions, dashboardUser, progress);
		renderSkills(skills);
		renderActivity(results, xpTransactions);

		return { ok: true, data: { userId: user.id } };
	} catch (err) {
		if (shouldLogout(err)) {
			onAuthFailure();
		}
		return {
			ok: false,
			error:
				err instanceof Error ? err : new Error("Unexpected dashboard error."),
		};
	}
};
