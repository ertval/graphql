/**
 * Collaborations Initialization — Data loading and integration.
 * @module collaborations.init
 */

import { normalizeCollaboratorNamesByLogin } from "./collaborations.core.js";
import {
	bindEvents,
	renderCollabsList,
	setAllCollabsData,
} from "./collaborations.view.js";
import { fetchCollaborations } from "./graphql.queries.js";
import { unwrapResult } from "./graphql.result.js";

const $ = (sel) => document.querySelector(sel);

/** Fetches collaboration data and initialises the view. */
export const initCollaborationsView = async (userId) => {
	const loadingEl = $("#collabs-loading");
	const tableWrap = $("#collabs-table-wrap");

	if (loadingEl) loadingEl.hidden = false;
	if (tableWrap) tableWrap.hidden = true;

	try {
		const { groups, auditsGiven, auditsReceived } = unwrapResult(
			await fetchCollaborations(userId),
		);

		const collabs = [];

		// Convert ISO dates to epoch ms for sorting
		const toEpochMs = (isoDate) =>
			Temporal.Instant.from(isoDate).epochMilliseconds;

		// Groups (Partners)
		for (const g of groups) {
			const prjName = g.group?.object?.name || "Unknown Project";
			const projectPath = g.group?.path ?? g.path ?? "";
			for (const member of g.group?.members || []) {
				if (member.userId !== userId && member.user) {
					collabs.push({
						id: `u_${member.userId}_${g.createdAt}`,
						login: member.user.login,
						firstName: member.user.firstName,
						lastName: member.user.lastName,
						campus: member.user.campus,
						project: prjName,
						projectPath,
						role: "Partner",
						date: g.createdAt,
						ts: toEpochMs(g.createdAt),
					});
				}
			}
		}

		// Audits Given (they were the Captain)
		for (const a of auditsGiven) {
			if (a.group?.captainLogin && a.group.captainLogin !== "ekaramet") {
				collabs.push({
					id: `a_${Math.random()}`,
					login: a.group.captainLogin,
					firstName: "",
					lastName: "",
					campus: "",
					project: a.group?.object?.name || "Unknown",
					projectPath: a.group?.path ?? "",
					role: "Captain",
					date: a.createdAt,
					ts: toEpochMs(a.createdAt),
				});
			}
		}

		// Audits Received (they were the Auditor)
		for (const a of auditsReceived) {
			if (a.auditor?.login) {
				collabs.push({
					id: `r_${Math.random()}`,
					login: a.auditor.login,
					firstName: a.auditor.firstName,
					lastName: a.auditor.lastName,
					campus: a.auditor.campus,
					project: a.group?.object?.name || "Unknown",
					projectPath: a.group?.path ?? "",
					role: "Auditor",
					date: a.createdAt,
					ts: toEpochMs(a.createdAt),
				});
			}
		}

		// Deduplicate by login|project|role composite key
		const unique = [];
		const seen = new Set();
		for (const c of collabs) {
			const key = `${c.login}|${c.project}|${c.role}`;
			if (!seen.has(key)) {
				seen.add(key);
				unique.push(c);
			}
		}

		// Calculate total collaborations per login
		const totalCollabsByLogin = new Map();
		for (const c of unique) {
			totalCollabsByLogin.set(
				c.login,
				(totalCollabsByLogin.get(c.login) ?? 0) + 1,
			);
		}
		for (const c of unique) {
			c.totalCollaborations = totalCollabsByLogin.get(c.login);
		}

		const allCollabs = normalizeCollaboratorNamesByLogin(unique);

		if (loadingEl) loadingEl.hidden = true;
		if (tableWrap) tableWrap.hidden = false;

		setAllCollabsData(allCollabs);
		renderCollabsList();
		bindEvents();
	} catch (err) {
		if (loadingEl) {
			loadingEl.innerHTML = "";
			const errorMsg = document.createElement("p");
			errorMsg.style.color = "var(--danger)";
			errorMsg.textContent = `Failed to load data: ${err instanceof Error ? err.message : "Unexpected error"}`;
			loadingEl.append(errorMsg);
		}
	}
};
