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
					path
					captainLogin
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
					path
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
					path
					captainLogin
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
				const isCaptain = member.user.login === g.group?.captainLogin;
				collabs.push({
					id: `u_${member.userId}_${g.createdAt}`,
					login: member.user.login,
					firstName: member.user.firstName,
					lastName: member.user.lastName,
					campus: member.user.campus,
					project: prjName,
					projectPath,
					role: isCaptain ? "Captain" : "Partner",
					relationType: "group_member",
					teamCaptainLogin: g.group?.captainLogin ?? "",
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
				relationType: "audit_given",
				teamCaptainLogin: a.group?.captainLogin ?? "",
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
				relationType: "audit_received",
				teamCaptainLogin: a.group?.captainLogin ?? "",
				date: a.createdAt,
				ts: toEpochMs(a.createdAt),
				teamMembers,
			});
		}
	}

	const identityByLogin = collabs.reduce((map, collab) => {
		const current = map.get(collab.login) ?? {
			firstName: "",
			lastName: "",
			campus: "",
		};

		map.set(collab.login, {
			firstName: current.firstName || collab.firstName || "",
			lastName: current.lastName || collab.lastName || "",
			campus: current.campus || collab.campus || "",
		});

		return map;
	}, new Map());

	const enrichedCollabs = collabs.map((collab) => {
		const canonical = identityByLogin.get(collab.login);
		if (!canonical) return collab;

		return {
			...collab,
			firstName: collab.firstName || canonical.firstName,
			lastName: collab.lastName || canonical.lastName,
			campus: collab.campus || canonical.campus,
		};
	});

	// Deduplicate by login|project|role composite key
	const unique = [];
	const seen = new Set();
	for (const c of enrichedCollabs) {
		const key = `${c.login}|${c.project}|${c.role}`;
		if (!seen.has(key)) {
			seen.add(key);
			unique.push(c);
		}
	}

	const verifiedCollabs = filterVerifiedCollaborations(unique, userCampus);
	const collabsByLogin = Object.groupBy(verifiedCollabs, c => c.login);

	const withTotalCollabs = verifiedCollabs.map((collab) => ({
		...collab,
		totalCollaborations: collabsByLogin[collab.login].length,
	}));

	const allCollabs = normalizeCollaboratorNamesByLogin(withTotalCollabs);
	return { ok: true, data: allCollabs };
};
