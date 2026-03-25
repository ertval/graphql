/**
 * Collaborations Data API.
 * Handles fetching and initial normalization of collaboration records.
 * @module collaborations.api
 */

import {
	filterVerifiedCollaborations,
	normalizeCollaboratorNamesByLogin,
} from "./collaborations.core.js";
import { fetchUserInfo } from "./dashboard.api.js";
import { graphqlQuery } from "./infra.graphql.js";
import { mapResult } from "./infra.result.js";

// ── Collaboration data (groups + audits given / received) ──────────

export const fetchCollaborations = async (userId) => {
	const query = `
    query GetCollabs($userId: Int!) {
      group_user(where: {userId: {_eq: $userId}}) {
        group {
          object { name }
          members {
            userId
            user { login firstName lastName campus }
          }
        }
        createdAt
      }
      audit(where: {auditorId: {_eq: $userId}}) {
        grade
        createdAt
				group {
					captainLogin
					object { name }
					members {
						user {
							login
							firstName
							lastName
							campus
						}
					}
				}
      }
      audit_received: audit(where: {group: {members: {userId: {_eq: $userId}}}}) {
        grade
        createdAt
        auditor { login firstName lastName campus }
				group {
					object { name }
					members {
						user {
							login
							firstName
							lastName
							campus
						}
					}
				}
      }
    }
  `;
	return mapResult(await graphqlQuery(query, { userId }), (data) => ({
		groups: data.group_user ?? [],
		auditsGiven: data.audit ?? [],
		auditsReceived: data.audit_received ?? [],
	}));
};

/** Fetches and normalizes collaboration records into view-ready objects. */
export const loadCollaborationsData = async (userId) => {
	const [collabsResult, userResult] = await Promise.all([
		fetchCollaborations(userId),
		fetchUserInfo(),
	]);
	if (!collabsResult.ok) {
		return collabsResult;
	}

	const userCampus = userResult.ok ? userResult.data?.campus ?? "" : "";

	const { groups, auditsGiven, auditsReceived } = collabsResult.data;
	const collabs = [];

	// Convert ISO dates to epoch ms for sorting
	const toEpochMs = (isoDate) =>
		Temporal.Instant.from(isoDate).epochMilliseconds;

	// Groups (Partners)
	for (const g of groups) {
		const prjName = g.group?.object?.name || "Unknown Project";
		const projectPath = g.group?.path ?? g.path ?? "";
		const teamMembers = (g.group?.members ?? [])
			.map((member) => member.user)
			.filter(Boolean)
			.map((user) => ({
				login: user.login,
				firstName: user.firstName ?? "",
				lastName: user.lastName ?? "",
				campus: user.campus ?? "",
			}));
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
					teamMembers,
				});
			}
		}
	}

	// Audits Given (they were the Captain)
	for (const a of auditsGiven) {
		if (a.grade !== null && a.group?.captainLogin) {
			const teamMembers = (a.group?.members ?? [])
				.map((member) => member.user)
				.filter(Boolean)
				.map((user) => ({
					login: user.login,
					firstName: user.firstName ?? "",
					lastName: user.lastName ?? "",
					campus: user.campus ?? "",
				}));
			const captainMember = (a.group?.members ?? []).find(
				(member) => member.user?.login === a.group.captainLogin,
			);
			collabs.push({
				id: `a_${a.group.captainLogin}_${a.createdAt}`,
				login: a.group.captainLogin,
				firstName: captainMember?.user?.firstName ?? "",
				lastName: captainMember?.user?.lastName ?? "",
				campus: captainMember?.user?.campus ?? "",
				project: a.group?.object?.name || "Unknown",
				projectPath: a.group?.path ?? "",
				role: "Captain",
				date: a.createdAt,
				ts: toEpochMs(a.createdAt),
				teamMembers,
			});
		}
	}

	// Audits Received (they were the Auditor)
	for (const a of auditsReceived) {
		if (a.grade !== null && a.auditor?.login) {
			const teamMembers = (a.group?.members ?? [])
				.map((member) => member.user)
				.filter(Boolean)
				.map((user) => ({
					login: user.login,
					firstName: user.firstName ?? "",
					lastName: user.lastName ?? "",
					campus: user.campus ?? "",
				}));
			collabs.push({
				id: `r_${a.auditor.login}_${a.createdAt}`,
				login: a.auditor.login,
				firstName: a.auditor.firstName,
				lastName: a.auditor.lastName,
				campus: a.auditor.campus,
				project: a.group?.object?.name || "Unknown",
				projectPath: a.group?.path ?? "",
				role: "Auditor",
				date: a.createdAt,
				ts: toEpochMs(a.createdAt),
				teamMembers,
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
	const verifiedCollabs = filterVerifiedCollaborations(unique, userCampus);

	const totalCollabsByLogin = new Map();
	for (const c of verifiedCollabs) {
		totalCollabsByLogin.set(
			c.login,
			(totalCollabsByLogin.get(c.login) ?? 0) + 1,
		);
	}
	const withTotalCollabs = verifiedCollabs.map((collab) => ({
		...collab,
		totalCollaborations: totalCollabsByLogin.get(collab.login) ?? 0,
	}));

	const allCollabs = normalizeCollaboratorNamesByLogin(withTotalCollabs);
	return { ok: true, data: allCollabs };
};
