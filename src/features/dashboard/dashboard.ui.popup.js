/**
 * Dashboard Popups — project detail modal and activity rendering.
 * @module dashboard.popup
 */

import {
	$,
	formatLongLocalDate,
	formatShortLocalDate,
	getActiveUserDisplayName,
	getActiveUserLogin,
	toProjectUrl,
} from "../../infra/ui.js";
import {
	createProjectMembersSection,
	createProjectPathAndLinkSection,
	createProjectRoleSection,
	createProjectStatGrid,
} from "../../shared/ui/popup.shared.js";
import { renderDashboardActivity } from "./dashboard.ui.popup.activity.js";

const normalizeProjectName = (name) =>
	typeof name === "string" ? name.trim().toLowerCase() : "";

// ── Activity list rendering ────────────────────────────────────────

/**
 * Renders recent project results as clickable activity items.
 * @param {Array} results
 * @param {Array} xpTransactions
 */
export const renderActivity = (results, xpTransactions) => {
	renderDashboardActivity(
		results,
		xpTransactions,
		(result, xpByName) => openProjectDetail(result, xpByName),
		formatShortLocalDate,
	);
};

// ── Project Detail Overlay ─────────────────────────────────────────

/**
 * Shows the project detail modal for a given result record.
 * @param {{grade:number, createdAt:string, path?:string, objectId:number, object:{name:string,type:string}}} result
 * @param {Map<string,number>} xpByName
 */
const openProjectDetail = (result, _xpByName) => {
	const overlay = $("#project-detail-overlay");
	const content = $("#project-detail-content");
	const title = $("#pd-title");
	if (!overlay || !content) return;

	const name = result.object?.name ?? "Unknown Project";
	const projectRoles = result.projectRoles ?? [result.myRole ?? "Partner"];
	const activeUserLogin = result.activeUserLogin ?? "";
	const activeUserDisplayName = result.activeUserDisplayName ?? "";
	const teamMembers = (result.teamMembers ?? []).filter(Boolean);
	const myRole = result.myRole ?? "Partner";

	const dateStr = formatLongLocalDate(result.createdAt, "—");

	title.textContent = name;
	content.replaceChildren();

	const basicTitle = document.createElement("h4");
	basicTitle.className = "sp-project-subtitle";
	basicTitle.textContent = "Basic Data";

	const grid = createProjectStatGrid(
		[
			{
				value: String(result.sharedRecordsCount ?? 1),
				label: "Shared Records",
			},
			{ value: projectRoles.join(", ") || "—", label: "Roles" },
			{ value: dateStr, label: "Latest Shared" },
			{ value: result.path ? "Available" : "—", label: "Project Link" },
		],
		{ gridClassName: "sp-project-grid" },
	);
	content.append(basicTitle, grid);

	const memberItems = teamMembers.map((member) => {
		const memberDisplayName = member.displayName ?? member.login ?? "Unknown";
		return {
			login: member.login ?? "",
			label:
				member.login === activeUserLogin && activeUserDisplayName
					? activeUserDisplayName
					: memberDisplayName,
		};
	});

	const [membersTitle, membersList] = createProjectMembersSection(
		memberItems,
		activeUserLogin,
		{
			titleText: "Project Members",
			emptyText: "Team data unavailable",
		},
	);
	content.append(membersTitle, membersList);

	const [roleTitle, roleValue] = createProjectRoleSection(myRole, {
		titleText: "My Role",
	});
	content.append(roleTitle, roleValue);

	const pathNodes = createProjectPathAndLinkSection(result.path, toProjectUrl, {
		linkClassName: "sp-project-link",
	});
	if (pathNodes.length) {
		content.append(...pathNodes);
	}

	overlay.classList.add("active");
};

// ── Project detail overlay close + bar chart integration ───────────

/**
 * Initializes the project detail overlay event listeners.
 * Because the bar chart is dynamic, we listen at the container level.
 * @param {() => Array} getXpTx - function returning current xpTransactions
 * @param {() => Array} getResults - function returning current results
 * @param {() => Map<string, {captainLogin:string, members:Array<{login:string, displayName:string}>}>} getTeamsByProject
 */
export const initProjectDetailClose = (
	getXpTx,
	getResults,
	getTeamsByProject,
) => {
	const overlay = $("#project-detail-overlay");
	const closeBtn = $("#project-detail-close");
	closeBtn?.addEventListener("click", () =>
		overlay?.classList.remove("active"),
	);
	overlay?.addEventListener("click", (e) => {
		if (e.target === overlay) overlay.classList.remove("active");
	});
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") overlay?.classList.remove("active");
	});

	// Connect Project Bar Chart clicks to the Project Detail Overlay
	$("#project-bar-chart")?.addEventListener("projectClick", (e) => {
		const projectName = e.detail?.name ?? e.detail;
		const projectObjectId =
			typeof e.detail?.objectId === "number" ? e.detail.objectId : null;
		const normalizedProjectName = normalizeProjectName(projectName);
		const currentTx = getXpTx();
		const currentRes = getResults();

		const matchingTxs = currentTx.filter((t) => {
			if (projectObjectId !== null && typeof t.object?.id === "number") {
				return t.object.id === projectObjectId;
			}
			return normalizeProjectName(t.object?.name) === normalizedProjectName;
		});
		const xpAmount = matchingTxs.reduce((sum, tx) => sum + tx.amount, 0);
		const latestTx = matchingTxs.toSorted(
			(a, b) =>
				Temporal.Instant.from(b.createdAt).epochMilliseconds -
				Temporal.Instant.from(a.createdAt).epochMilliseconds,
		)[0];

		const resultRecord = currentRes.find((r) => {
			if (projectObjectId !== null && typeof r.objectId === "number") {
				return r.objectId === projectObjectId;
			}
			return normalizeProjectName(r.object?.name) === normalizedProjectName;
		});
		const resolvedProjectObjectId =
			projectObjectId !== null
				? projectObjectId
				: typeof resultRecord?.objectId === "number"
					? resultRecord.objectId
					: null;
		const directTeamInfo =
			projectObjectId !== null
				? getTeamsByProject().get(String(projectObjectId))
				: null;
		const fallbackTeamInfo = directTeamInfo ??
			(resolvedProjectObjectId !== null
				? getTeamsByProject().get(String(resolvedProjectObjectId))
				: null) ?? { members: [], captainLogin: "" };
		const fallbackTeamMembers = fallbackTeamInfo.members ?? [];
		const fallbackCreatedAt = Temporal.Now.instant().toString();
		const activeUserLogin = getActiveUserLogin();
		const activeUserDisplayName = getActiveUserDisplayName();
		const fallbackIsCaptain =
			activeUserLogin && fallbackTeamInfo.captainLogin === activeUserLogin;
		const fallbackIsMember = fallbackTeamMembers.some(
			(member) => member.login === activeUserLogin,
		);
		const fallbackMyRole = fallbackIsCaptain
			? "Captain"
			: fallbackIsMember
				? "Partner"
				: "Partner";
		const sharedRecordsCount = currentRes.filter(
			(record) =>
				normalizeProjectName(record.object?.name) ===
				normalizeProjectName(projectName),
		).length;

		const hasHydratedCaptainLogin =
			typeof resultRecord?.teamCaptainLogin === "string" &&
			resultRecord.teamCaptainLogin.trim().length > 0;
		const hasHydratedTeamData =
			(resultRecord?.teamMembers?.length ?? 0) > 0 || hasHydratedCaptainLogin;
		const resolvedMyRole = hasHydratedTeamData
			? (resultRecord?.myRole ?? fallbackMyRole)
			: fallbackMyRole;

		const detailResult = {
			object: {
				name: resultRecord?.object?.name ?? projectName,
				type: "project",
			},
			grade: resultRecord?.grade ?? (xpAmount > 0 ? 1 : 0),
			createdAt:
				resultRecord?.createdAt ?? latestTx?.createdAt ?? fallbackCreatedAt,
			path: latestTx?.path ?? "",
			teamMembers: resultRecord?.teamMembers?.length
				? resultRecord.teamMembers
				: fallbackTeamMembers,
			teamCaptainLogin:
				resultRecord?.teamCaptainLogin ?? fallbackTeamInfo.captainLogin ?? "",
			myRole: resolvedMyRole,
			projectRoles: resultRecord?.projectRoles ?? [resolvedMyRole],
			sharedRecordsCount:
				resultRecord?.sharedRecordsCount ?? (sharedRecordsCount || 1),
			activeUserLogin,
			activeUserDisplayName,
		};

		const tempXpMap = new Map([[projectName, xpAmount]]);
		openProjectDetail(detailResult, tempXpMap);
	});
};
