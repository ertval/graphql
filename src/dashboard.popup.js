/**
 * Dashboard Popups — project detail modal and activity rendering.
 * @module dashboard.popup
 */

const $ = (sel) => document.querySelector(sel);
const normalizeProjectName = (name) =>
	typeof name === "string" ? name.trim().toLowerCase() : "";
const PLATFORM_ORIGIN = "https://platform.zone01.gr";

const getActiveUserLogin = () => {
	const loginText = $("#user-login")?.textContent?.trim() ?? "";
	if (!loginText) return "";
	return loginText.startsWith("@") ? loginText.slice(1) : loginText;
};

const toProjectUrl = (pathValue) => {
	if (typeof pathValue !== "string" || !pathValue.trim()) return null;

	try {
		const url = pathValue.startsWith("/")
			? new URL(pathValue, PLATFORM_ORIGIN)
			: new URL(pathValue);
		if (url.protocol !== "https:") return null;
		if (url.origin !== PLATFORM_ORIGIN) return null;
		return url.toString();
	} catch {
		return null;
	}
};

// ── Activity list rendering ────────────────────────────────────────

/**
 * Renders recent project results as clickable activity items.
 * @param {Array} results
 * @param {Array} xpTransactions
 */
export const renderActivity = (results, xpTransactions) => {
	const list = $("#activity-list");
	if (!list) return;
	list.replaceChildren();

	const projectResults = results
		.filter((r) => r.object?.name && r.object?.type === "project")
		.slice(0, 20);

	const items = projectResults.length
		? projectResults
		: results.filter((r) => r.object?.name).slice(0, 20);

	if (!items.length) {
		const empty = document.createElement("p");
		empty.style.color = "var(--text-muted)";
		empty.style.fontSize = "0.875rem";
		empty.textContent = "No recent activity.";
		list.append(empty);
		return;
	}

	// Build XP lookup by object name for display
	const xpByName = new Map();
	for (const tx of xpTransactions) {
		const name = tx.object?.name;
		if (name) xpByName.set(name, (xpByName.get(name) ?? 0) + tx.amount);
	}

	renderActivityItems(list, items, xpByName);
};

/**
 * Creates individual activity item elements with click-to-detail.
 * @param {HTMLElement} list
 * @param {Array} items
 * @param {Map<string,number>} xpByName
 */
const renderActivityItems = (list, items, xpByName) => {
	for (const result of items) {
		const passed = result.grade >= 1;

		// Format completion date using Temporal API
		const dateStr = (() => {
			try {
				const instant = Temporal.Instant.from(result.createdAt);
				const zdt = instant.toZonedDateTimeISO(Temporal.Now.timeZoneId());
				return zdt.toLocaleString("en", {
					month: "short",
					day: "numeric",
					year: "numeric",
				});
			} catch {
				return "";
			}
		})();

		const item = document.createElement("div");
		item.className = "activity-item";
		item.setAttribute("role", "button");
		item.setAttribute("tabindex", "0");
		item.setAttribute(
			"aria-label",
			`View details for ${result.object?.name ?? "project"}`,
		);

		const activityName = document.createElement("span");
		activityName.className = "activity-name";
		activityName.textContent = result.object?.name ?? "Unknown";

		const activityMeta = document.createElement("div");
		activityMeta.className = "activity-meta";

		const badge = document.createElement("span");
		badge.className = `activity-badge ${passed ? "badge-pass" : "badge-fail"}`;
		badge.textContent = passed ? "PASS" : "FAIL";

		const activityDate = document.createElement("span");
		activityDate.className = "activity-date";
		activityDate.textContent = dateStr;

		activityMeta.append(badge, activityDate);
		item.append(activityName, activityMeta);

		// Click and keyboard handlers open project detail
		const open = () => openProjectDetail(result, xpByName);
		item.addEventListener("click", open);
		item.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				open();
			}
		});

		list.append(item);
	}
};

// ── Project Detail Overlay ─────────────────────────────────────────

/**
 * Shows the project detail modal for a given result record.
 * @param {{grade:number, createdAt:string, path?:string, objectId:number, object:{name:string,type:string}}} result
 * @param {Map<string,number>} xpByName
 */
const openProjectDetail = (result, xpByName) => {
	const overlay = $("#project-detail-overlay");
	const content = $("#project-detail-content");
	const title = $("#pd-title");
	if (!overlay || !content) return;

	const name = result.object?.name ?? "Unknown Project";
	const projectRoles = result.projectRoles ?? [result.myRole ?? "Member"];
	const activeUserLogin = getActiveUserLogin();
	const isCaptain =
		activeUserLogin && result.teamCaptainLogin === activeUserLogin;
	const isMember = (result.teamMembers ?? []).some(
		(member) => member.login === activeUserLogin,
	);
	const myRole = result.myRole ?? (isCaptain ? "Captain" : "Member");

	// Format date using Temporal
	const dateStr = (() => {
		try {
			const zdt = Temporal.Instant.from(result.createdAt).toZonedDateTimeISO(
				Temporal.Now.timeZoneId(),
			);
			return zdt.toLocaleString("en", { dateStyle: "long" });
		} catch {
			return "—";
		}
	})();

	title.textContent = name;
	content.replaceChildren();

	const basicTitle = document.createElement("h4");
	basicTitle.className = "sp-project-subtitle";
	basicTitle.textContent = "Basic Data";

	const grid = document.createElement("div");
	grid.className = "sp-project-grid";

	const appendStat = (value, label) => {
		const stat = document.createElement("div");
		stat.className = "sp-project-stat";

		const statValue = document.createElement("span");
		statValue.className = "stat-value";
		statValue.textContent = value;

		const statLabel = document.createElement("span");
		statLabel.className = "stat-label";
		statLabel.textContent = label;

		stat.append(statValue, statLabel);
		grid.append(stat);
	};

	appendStat(String(result.sharedRecordsCount ?? 1), "Shared Records");
	appendStat(projectRoles.join(", ") || "—", "Roles");
	appendStat(dateStr, "Latest Shared");
	appendStat(result.path ? "Available" : "—", "Project Link");

	content.append(basicTitle, grid);

	const membersTitle = document.createElement("h4");
	membersTitle.className = "sp-project-subtitle";
	membersTitle.textContent = "Project Members";

	const members = (result.teamMembers ?? []).filter(Boolean);
	const membersList = document.createElement("ul");
	membersList.className = "sp-project-members";

	if (!members.length) {
		const item = document.createElement("li");
		item.className = "sp-project-member";
		item.textContent = "Team data unavailable";
		membersList.append(item);
	} else {
		for (const member of members) {
			const item = document.createElement("li");
			item.className = "sp-project-member";
			item.textContent =
				member.login === activeUserLogin
					? `${member.displayName ?? member.login ?? "Unknown"} (you)`
					: (member.displayName ?? member.login ?? "Unknown");
			membersList.append(item);
		}
	}

	content.append(membersTitle, membersList);

	const roleTitle = document.createElement("h4");
	roleTitle.className = "sp-project-subtitle";
	roleTitle.textContent = "My Role";

	const roleValue = document.createElement("div");
	roleValue.className = "sp-project-my-role";
	roleValue.textContent = myRole;

	content.append(roleTitle, roleValue);

	// Optional path display
	if (result.path) {
		const pathLabel = document.createElement("p");
		pathLabel.className = "stat-label";
		pathLabel.style.marginBottom = "0.25rem";
		pathLabel.textContent = "Project Path";

		const pathValue = document.createElement("div");
		pathValue.className = "sp-project-path";
		pathValue.textContent = result.path;

		content.append(pathLabel, pathValue);

		const projectUrl = toProjectUrl(result.path);
		if (projectUrl) {
			const link = document.createElement("a");
			link.href = projectUrl;
			link.target = "_blank";
			link.rel = "noopener noreferrer";
			link.textContent = "Open project";
			link.className = "sp-project-link";
			content.append(link);
		}
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
export const initProjectDetailClose = (getXpTx, getResults, getTeamsByProject) => {
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

		const matchingTxs = currentTx.filter(
			(t) => {
				if (projectObjectId !== null && typeof t.object?.id === "number") {
					return t.object.id === projectObjectId;
				}
				return normalizeProjectName(t.object?.name) === normalizedProjectName;
			},
		);
		const xpAmount = matchingTxs.reduce((sum, tx) => sum + tx.amount, 0);
		const latestTx = matchingTxs.toSorted(
			(a, b) =>
				Temporal.Instant.from(b.createdAt).epochMilliseconds -
				Temporal.Instant.from(a.createdAt).epochMilliseconds,
		)[0];

		const resultRecord = currentRes.find(
			(r) => {
				if (projectObjectId !== null && typeof r.objectId === "number") {
					return r.objectId === projectObjectId;
				}
				return normalizeProjectName(r.object?.name) === normalizedProjectName;
			},
		);
		const fallbackTeamInfo =
			(projectObjectId !== null
				? getTeamsByProject().get(String(projectObjectId))
				: null) ?? { members: [], captainLogin: "" };
		const fallbackTeamMembers = fallbackTeamInfo.members ?? [];
		const fallbackCreatedAt = Temporal.Now.instant().toString();
		const activeUserLogin = getActiveUserLogin();
		const fallbackIsCaptain =
			activeUserLogin && fallbackTeamInfo.captainLogin === activeUserLogin;
		const fallbackIsMember = fallbackTeamMembers.some(
			(member) => member.login === activeUserLogin,
		);
		const fallbackMyRole = fallbackIsCaptain ? "Captain" : "Member";
		const sharedRecordsCount = currentRes.filter(
			(record) =>
				normalizeProjectName(record.object?.name) ===
				normalizeProjectName(projectName),
		).length;

		const detailResult = {
			object: {
				name: resultRecord?.object?.name ?? projectName,
				type: "project",
			},
			grade: resultRecord?.grade ?? (xpAmount > 0 ? 1 : 0),
			createdAt:
				resultRecord?.createdAt ?? latestTx?.createdAt ?? fallbackCreatedAt,
			path: latestTx?.path ?? "",
			teamMembers:
				(resultRecord?.teamMembers?.length
					? resultRecord.teamMembers
					: fallbackTeamMembers),
			teamCaptainLogin:
				resultRecord?.teamCaptainLogin ?? fallbackTeamInfo.captainLogin ?? "",
			myRole: resultRecord?.myRole ?? fallbackMyRole,
			projectRoles: resultRecord?.projectRoles ?? [resultRecord?.myRole ?? fallbackMyRole],
			sharedRecordsCount:
				resultRecord?.sharedRecordsCount ?? (sharedRecordsCount || 1),
		};

		const tempXpMap = new Map([[projectName, xpAmount]]);
		openProjectDetail(detailResult, tempXpMap);
	});
};
