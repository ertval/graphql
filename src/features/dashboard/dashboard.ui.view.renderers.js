/**
 * Dashboard section renderers.
 * @module dashboard.view.renderers
 */

import { $ } from "../../infra/ui.js";
import { computeTopSkills, computeXpSummary } from "./dashboard.core.js";
import { renderProjectBarChart } from "./dashboard.ui.charts.bar.js";
import { renderAuditDonutChart } from "./dashboard.ui.charts.donut.js";
import { formatXP } from "./dashboard.ui.charts.helpers.js";
import { renderXPLineChart } from "./dashboard.ui.charts.line.js";
import { renderPassFailPieChart } from "./dashboard.ui.charts.pie.js";

/** @param {object} user */
export const renderUserSection = (user) => {
	const roleStats = user.roleStats ?? {};
	const initials =
		`${(user.firstName?.[0] ?? "").toUpperCase()}${(user.lastName?.[0] ?? "").toUpperCase()}` ||
		user.login?.[0]?.toUpperCase() ||
		"?";

	const elInitials = $("#avatar-initials");
	if (elInitials) elInitials.textContent = initials;

	const elFullName = $("#user-fullname");
	if (elFullName)
		elFullName.textContent =
			[user.firstName, user.lastName].filter(Boolean).join(" ") || user.login;

	const elLogin = $("#user-login");
	if (elLogin) elLogin.textContent = `@${user.login}`;

	const elEmail = $("#user-email");
	if (elEmail) elEmail.textContent = user.email || "";

	const elCampus = $("#user-campus");
	if (elCampus) elCampus.textContent = user.campus ? `📍 ${user.campus}` : "";

	const elNavUser = $("#nav-username");
	if (elNavUser) elNavUser.textContent = `@${user.login}`;

	const captainEl = $("#audit-role-captain");
	const partnerEl = $("#audit-role-partner");
	const auditorEl = $("#audit-role-auditor");
	if (captainEl) captainEl.textContent = String(roleStats.captain ?? 0);
	if (partnerEl) partnerEl.textContent = String(roleStats.partner ?? 0);
	if (auditorEl) auditorEl.textContent = String(roleStats.auditor ?? 0);
};

/**
 * @param {Array} transactions
 * @param {number} level
 * @param {Array} progress
 */
export const renderXPSection = (transactions, level, progress) => {
	const { completedProjects, totalXP } = computeXpSummary(
		transactions,
		progress,
	);

	const xpEl = $("#total-xp");
	const lvlEl = $("#user-level");
	const projEl = $("#completed-projects");

	if (xpEl) xpEl.textContent = formatXP(totalXP);
	if (lvlEl) lvlEl.textContent = String(level);
	if (projEl) projEl.textContent = String(completedProjects);
};

/** @param {object} user */
export const renderAuditSection = (user) => {
	const ratio = user.auditRatio ?? 0;
	const totalUp = user.totalUp ?? 0;
	const totalDown = user.totalDown ?? 0;
	const maxAudit = Math.max(totalUp, totalDown, 1);

	const ratioEl = $("#audit-ratio");
	const doneValEl = $("#audit-done-value");
	const recValEl = $("#audit-received-value");

	if (ratioEl) ratioEl.textContent = ratio.toFixed(1);
	if (doneValEl) doneValEl.textContent = formatXP(totalUp);
	if (recValEl) recValEl.textContent = formatXP(totalDown);

	requestAnimationFrame(() => {
		const doneBar = $("#audit-done-bar");
		const receivedBar = $("#audit-received-bar");
		if (doneBar) doneBar.style.width = `${(totalUp / maxAudit) * 100}%`;
		if (receivedBar)
			receivedBar.style.width = `${(totalDown / maxAudit) * 100}%`;
	});
};

/**
 * @param {Array} transactions
 * @param {object} user
 * @param {Array} progress
 */
export const renderGraphs = (transactions, user, progress) => {
	const xpLine = $("#xp-line-chart");
	if (xpLine) renderXPLineChart(xpLine, transactions);

	const barChart = $("#project-bar-chart");
	if (barChart) renderProjectBarChart(barChart, transactions);

	const donutChart = $("#audit-donut-chart");
	if (donutChart)
		renderAuditDonutChart(donutChart, user.totalUp ?? 0, user.totalDown ?? 0);

	const pieChart = $("#passfail-pie-chart");
	if (pieChart) renderPassFailPieChart(pieChart, progress);
};

/** @param {Array} skills */
export const renderSkills = (skills) => {
	const list = $("#skills-list");
	if (!list) return;
	list.replaceChildren();

	if (!skills.length) {
		const empty = document.createElement("p");
		empty.className = "dashboard-empty-message";
		empty.textContent = "No skill data available.";
		list.append(empty);
		return;
	}

	const topSkills = computeTopSkills(skills, 8);
	const maxAmount = Math.max(...topSkills.map(([, value]) => value), 1);

	for (const [name, amount] of topSkills) {
		const item = document.createElement("div");
		item.className = "skill-item";

		const skillName = document.createElement("span");
		skillName.className = "skill-name";
		skillName.textContent = name;

		const skillTrack = document.createElement("div");
		skillTrack.className = "skill-bar-track";

		const skillFill = document.createElement("div");
		skillFill.className = "skill-bar-fill";
		skillFill.style.width = "0%";
		skillTrack.append(skillFill);

		const skillValue = document.createElement("span");
		skillValue.className = "skill-value";
		skillValue.textContent = `${amount}%`;

		item.append(skillName, skillTrack, skillValue);
		list.append(item);

		requestAnimationFrame(() => {
			skillFill.style.width = `${(amount / maxAmount) * 100}%`;
		});
	}
};
