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

const COLLABS_HISTORY_LIMIT = 250;

export const fetchCollaborations = async (userId) => {
	const query = `
		query GetCollabs($userId: Int!, $historyLimit: Int!) {
			group_user(where: {userId: {_eq: $userId}}, limit: $historyLimit, order_by: {createdAt: desc}) {
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
			audit(where: {auditorId: {_eq: $userId}}, limit: $historyLimit, order_by: {createdAt: desc}) {
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
      audit_received: audit(where: {group: {members: {userId: {_eq: $userId}}}}, limit: $historyLimit, order_by: {createdAt: desc}) {
        grade
        createdAt
        auditor { login firstName lastName campus }
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
    }
  `;
	return mapResult(
		await graphqlQuery(query, { userId, historyLimit: COLLABS_HISTORY_LIMIT }),
		(data) => ({
			groups: data.group_user ?? [],
			auditsGiven: data.audit ?? [],
			auditsReceived: data.audit_received ?? [],
		}),
	);
};

/** @typedef {{ login: string, firstName: string, lastName: string, campus: string }} TeamMember */

/** @param {string | null | undefined} isoDate */
const toEpochMsSafe = (isoDate) => {
	if (!isoDate) return 0;
	try {
		return Temporal.Instant.from(isoDate).epochMilliseconds;
	} catch {
		return 0;
	}
};

/** @param {Array<{ user?: { login?: string, firstName?: string, lastName?: string, campus?: string } }>} groupMembers */
const toTeamMembers = (groupMembers = []) =>
	groupMembers.flatMap(({ user }) =>
		user
			? [
					{
						login: user.login,
						firstName: user.firstName ?? "",
						lastName: user.lastName ?? "",
						campus: user.campus ?? "",
					},
				]
			: [],
	);

const canonicalizeIdentityByLogin = (collabs) => {
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

	return collabs.map((collab) => {
		const canonical = identityByLogin.get(collab.login);
		if (!canonical) return collab;
		return {
			...collab,
			firstName: collab.firstName || canonical.firstName,
			lastName: collab.lastName || canonical.lastName,
			campus: collab.campus || canonical.campus,
		};
	});
};

const dedupeByLoginProjectRole = (collabs) => {
	const seen = new Set();
	return collabs.filter((collab) => {
		const key = `${collab.login}|${collab.project}|${collab.role}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};

const mapGroupRecords = (groups, userId) =>
	(groups ?? []).flatMap((g) => {
		const prjName = g.group?.object?.name || "Unknown Project";
		const projectPath = g.group?.path ?? g.path ?? "";
		const teamMembers = toTeamMembers(g.group?.members ?? []);
		return (g.group?.members ?? []).flatMap((member) => {
			if (member.userId === userId || !member.user) return [];
			const isCaptain = member.user.login === g.group?.captainLogin;
			return [
				{
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
					ts: toEpochMsSafe(g.createdAt),
					teamMembers,
				},
			];
		});
	});

const mapAuditRecords = (audits, mapper) =>
	(audits ?? []).flatMap((audit) =>
		audit.grade === null ? [] : mapper(audit),
	);

const mapAuditGivenRecords = (auditsGiven) =>
	mapAuditRecords(auditsGiven, (a) => {
		if (!a.group?.captainLogin) return [];
		const teamMembers = toTeamMembers(a.group?.members ?? []);
		const captainMember = (a.group?.members ?? []).find(
			(member) => member.user?.login === a.group.captainLogin,
		);
		return [
			{
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
				ts: toEpochMsSafe(a.createdAt),
				teamMembers,
			},
		];
	});

const mapAuditReceivedRecords = (auditsReceived) =>
	mapAuditRecords(auditsReceived, (a) => {
		if (!a.auditor?.login) return [];
		const teamMembers = toTeamMembers(a.group?.members ?? []);
		return [
			{
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
				ts: toEpochMsSafe(a.createdAt),
				teamMembers,
			},
		];
	});

const mapCollaborationRecords = (records, userId) => [
	...mapGroupRecords(records.groups, userId),
	...mapAuditGivenRecords(records.auditsGiven),
	...mapAuditReceivedRecords(records.auditsReceived),
];

/** Fetches and normalizes collaboration records into view-ready objects. */
export const loadCollaborationsData = async (userId) => {
	const [collabsResult, userResult] = await Promise.all([
		fetchCollaborations(userId),
		fetchUserInfo(),
	]);
	if (!collabsResult.ok) {
		return collabsResult;
	}

	const userCampus = userResult.ok ? (userResult.data?.campus ?? "") : "";
	const collabs = mapCollaborationRecords(collabsResult.data, userId);
	const canonicalizedCollabs = canonicalizeIdentityByLogin(collabs);
	const dedupedCollabs = dedupeByLoginProjectRole(canonicalizedCollabs);
	const verifiedCollabs = filterVerifiedCollaborations(
		dedupedCollabs,
		userCampus,
	);
	const collabsByLogin = Object.groupBy(
		verifiedCollabs,
		(collab) => collab.login,
	);

	const withTotalCollabs = verifiedCollabs.map((collab) => ({
		...collab,
		totalCollaborations: collabsByLogin[collab.login].length,
	}));

	const allCollabs = normalizeCollaboratorNamesByLogin(withTotalCollabs);
	return { ok: true, data: allCollabs };
};
