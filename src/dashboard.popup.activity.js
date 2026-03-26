/**
 * Dashboard activity list renderer.
 * @module dashboard.popup.activity
 */

import { $ } from "./infra.ui.js";

/**
 * @param {Array} results
 * @param {Array} xpTransactions
 * @param {(result: object, xpByName: Map<string, number>) => void} onOpenProjectDetail
 * @param {(isoDate: string, fallback?: string) => string} formatShortLocalDate
 */
export const renderDashboardActivity = (
	results,
	xpTransactions,
	onOpenProjectDetail,
	formatShortLocalDate,
) => {
	const list = $("#activity-list");
	if (!list) return;
	list.replaceChildren();

	const projectResults = results
		.filter((result) => result.object?.name && result.object?.type === "project")
		.slice(0, 20);

	const items = projectResults.length
		? projectResults
		: results.filter((result) => result.object?.name).slice(0, 20);

	if (!items.length) {
		const empty = document.createElement("p");
		empty.className = "dashboard-empty-message";
		empty.textContent = "No recent activity.";
		list.append(empty);
		return;
	}

	const xpByName = xpTransactions.reduce((map, tx) => {
		const name = tx.object?.name;
		if (!name) return map;
		map.set(name, (map.get(name) ?? 0) + tx.amount);
		return map;
	}, new Map());

	for (const result of items) {
		const passed = result.grade >= 1;
		const dateStr = formatShortLocalDate(result.createdAt, "");

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

		const open = () => onOpenProjectDetail(result, xpByName);
		item.addEventListener("click", open);
		item.addEventListener("keydown", (event) => {
			if (event.key !== "Enter" && event.key !== " ") return;
			event.preventDefault();
			open();
		});

		list.append(item);
	}
};
