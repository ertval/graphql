/**
 * Dashboard View Controller.
 * Handles DOM rendering specifically for the dashboard tab.
 * @module dashboard.view
 */

import {
	fetchProgress,
	fetchProjectTeams,
	fetchResults,
	fetchSkills,
	fetchUserInfo,
	fetchUserLevel,
	fetchXPTransactions,
} from "./dashboard.api.js";
import { isAuthFailureError } from "./dashboard.core.js";
import { initProjectDetailClose, renderActivity } from "./dashboard.popup.js";
import {
	renderAuditSection,
	renderGraphs,
	renderSkills,
	renderUserSection,
	renderXPSection,
} from "./dashboard.view.renderers.js";
import { $ } from "./infra.ui.js";

// ── DOM References ─────────────────────────────────────────────────
// ── Module-level state (needed for project detail cross-reference) ─
/** @type {Array<{amount:number, createdAt:string, path:string, object:{name:string,type:string}}>} */
let _xpTransactions = [];

/** @type {Array<{grade:number, createdAt:string, object:{name:string,type:string}}>} */
let _results = [];

/** @type {Map<string, {captainLogin:string, members:Array<{login:string, displayName:string}>}>} */
let _teamsByProject = new Map();

export const initDashboard = () => {
	initProjectDetailClose(
		() => _xpTransactions,
		() => _results,
		() => _teamsByProject,
	);
};

// ── Dashboard Data Loading ─────────────────────────────────────────

/** Clears all dashboard UI elements back to empty state. */
export const resetDashboard = () => {
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
};

/** Fetches all dashboard data and renders every section. */
export const loadDashboard = async (
	onAuthFailure,
	isSessionValid = () => true,
) => {
	const shouldLogout = (error) =>
		(error instanceof Error && isAuthFailureError(error)) || !isSessionValid();
	const normalizeProjectName = (name) =>
		typeof name === "string" ? name.trim().toLowerCase() : "";

	try {
		const userResult = await fetchUserInfo();
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
			progressResult,
			skillsResult,
			levelResult,
			resultsResult,
		] =
			await Promise.all([
				fetchXPTransactions(user.id),
				fetchProgress(user.id),
				fetchSkills(user.id),
				fetchUserLevel(user.id),
				fetchResults(user.id),
			]);

		const firstError = [
			xpResult,
			progressResult,
			skillsResult,
			levelResult,
			resultsResult,
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
		const projectObjectIds = [
			...new Set(
				rawResults
					.map((result) => result.objectId)
					.filter((id) => typeof id === "number"),
			),
		];
		const projectTeamsResult = await fetchProjectTeams(user.id, projectObjectIds);
		if (!projectTeamsResult.ok) {
			if (shouldLogout(projectTeamsResult.error)) {
				onAuthFailure();
			}
			return { ok: false, error: projectTeamsResult.error };
		}

		const teamsByProject = projectTeamsResult.data;
		_teamsByProject = teamsByProject;
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
			const myRole = isCaptain ? "Captain" : "Member";

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

		renderXPSection(xpTransactions, level, progress);
		renderAuditSection(user);
		renderGraphs(xpTransactions, user, progress);
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
