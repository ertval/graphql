/**
 * Dashboard Data API.
 * Encapsulates GraphQL query execution for dashboard features.
 * @module dashboard.api
 */

import { graphqlQuery } from "../../infra/graphql.js";
import { mapResult } from "../../infra/result.js";

const DEFAULT_EVENT_ID = 200;

const toFiniteInteger = (value) => {
	const parsed = Number.parseInt(String(value ?? ""), 10);
	return Number.isFinite(parsed) ? parsed : null;
};

export const getActiveEventId = () => {
	const search = globalThis.location?.search;
	if (typeof search !== "string" || !search) return DEFAULT_EVENT_ID;

	const params = new URLSearchParams(search);
	const parsedEventId = toFiniteInteger(params.get("event"));
	return parsedEventId ?? DEFAULT_EVENT_ID;
};

// ── User profile ───────────────────────────────────────────────────

export const fetchUserInfo = async () => {
	const query = `
    {
      user {
        id
        login
        firstName
        lastName
        email
        campus
        auditRatio
        totalUp
        totalDown
      }
    }
  `;
	return mapResult(await graphqlQuery(query), (data) => data.user?.[0] ?? null);
};

// ── User role counters (captain / partner / auditor) ──────────────

export const fetchUserRoleStats = async (
	userId,
	eventId = getActiveEventId(),
) => {
	const query = `
    query GetUserRoleStats($userId: Int!, $eventId: Int!) {
      audit(
        where: {
          auditorId: { _eq: $userId }
          grade: { _is_null: false }
          group: { eventId: { _eq: $eventId } }
        }
      ) {
        id
        createdAt
        group {
          path
          captainLogin
          object {
            id
            name
          }
          members {
            user {
              login
              firstName
              lastName
            }
          }
        }
      }
    }
  `;

	return mapResult(await graphqlQuery(query, { userId, eventId }), (data) => {
		const audits = (data.audit ?? []).map((audit) => {
			const members = (audit.group?.members ?? [])
				.map((member) => member.user)
				.filter(Boolean)
				.map((member) => ({
					login: member.login,
					displayName:
						[member.firstName, member.lastName].filter(Boolean).join(" ") ||
						member.login,
				}))
				.filter((member) => member.login);

			return {
				id: audit.id,
				createdAt: audit.createdAt,
				objectId: audit.group?.object?.id ?? null,
				projectName: audit.group?.object?.name ?? "Unknown Project",
				projectPath: audit.group?.path ?? "",
				captainLogin: audit.group?.captainLogin ?? "",
				teamMembers: [
					...new Map(members.map((member) => [member.login, member])).values(),
				],
			};
		});

		return {
			audits,
		};
	});
};

// ── XP transactions (excludes piscine) ─────────────────────────────

export const fetchXPTransactions = async (
	userId,
	eventId = getActiveEventId(),
) => {
	const query = `
    query GetXPTransactions($userId: Int!, $eventId: Int!) {
      transaction(
        where: {
          userId: { _eq: $userId }
          eventId: { _eq: $eventId }
          type: { _eq: "xp" }
          _or: [
            { path: { _is_null: true } }
            { path: { _nilike: "%piscine-go%" } }
          ]
        }
        order_by: [{ createdAt: asc }, { id: asc }]
      ) {
        id
        objectId
        amount
        createdAt
        path
        object {
				id
          name
          type
        }
      }
    }
  `;
	return mapResult(
		await graphqlQuery(query, { userId, eventId }),
		(data) => data.transaction ?? [],
	);
};

// ── Audit XP transactions (XP gained by auditing) ────────────────

export const fetchAuditXPTransactions = async (
	userId,
	eventId = getActiveEventId(),
) => {
	const query = `
    query GetAuditXPTransactions($userId: Int!, $eventId: Int!) {
      transaction(
        where: {
          userId: { _eq: $userId }
          eventId: { _eq: $eventId }
          type: { _eq: "up" }
          _or: [
            { path: { _is_null: true } }
            { path: { _nilike: "%piscine-go%" } }
          ]
        }
        order_by: [{ createdAt: desc }, { id: desc }]
      ) {
        id
        objectId
        amount
        createdAt
        path
        object {
				id
          name
          type
        }
      }
    }
  `;

	return mapResult(
		await graphqlQuery(query, { userId, eventId }),
		(data) => data.transaction ?? [],
	);
};

// ── Completed progress records ─────────────────────────────────────

export const fetchProgress = async (userId, eventId = getActiveEventId()) => {
	const query = `
    query GetProgress($userId: Int!, $eventId: Int!) {
      progress(
        where: {
          userId: { _eq: $userId }
          eventId: { _eq: $eventId }
          isDone: { _eq: true }
        }
        order_by: { updatedAt: desc }
      ) {
        id
        grade
        createdAt
        updatedAt
        path
        object {
				id
          name
          type
        }
      }
    }
  `;
	return mapResult(
		await graphqlQuery(query, { userId, eventId }),
		(data) => data.progress ?? [],
	);
};

// ── Skill transactions ─────────────────────────────────────────────

export const fetchSkills = async (userId) => {
	const query = `
    query GetSkills($userId: Int!) {
      transaction(
        where: {
          userId: { _eq: $userId }
          type: { _like: "skill_%" }
        }
        order_by: { amount: desc }
      ) {
        type
        amount
      }
    }
  `;
	return mapResult(
		await graphqlQuery(query, { userId }),
		(data) => data.transaction ?? [],
	);
};

// ── Project results ────────────────────────────────────────────────

export const fetchResults = async (userId, eventId = getActiveEventId()) => {
	const query = `
    query GetResults($userId: Int!, $eventId: Int!) {
      result(
        where: {
          userId: { _eq: $userId }
          eventId: { _eq: $eventId }
        }
        order_by: { createdAt: desc }
        limit: 30
      ) {
        id
        objectId
        grade
        type
        createdAt
        user {
          id
          login
        }
        object {
          name
          type
        }
      }
    }
  `;
	return mapResult(
		await graphqlQuery(query, { userId, eventId }),
		(data) => data.result ?? [],
	);
};

// ── Project teams for member lists ───────────────────────────────

export const fetchProjectTeams = async (
	userId,
	projectObjectIds,
	eventId = getActiveEventId(),
) => {
	if (!projectObjectIds.length) {
		return { ok: true, data: new Map() };
	}

	const query = `
    query GetProjectTeams($userId: Int!, $projectObjectIds: [Int!]!, $eventId: Int!) {
      group_user(
        where: {
          userId: { _eq: $userId }
          group: {
            eventId: { _eq: $eventId }
            object: { id: { _in: $projectObjectIds } }
          }
        }
      ) {
        group {
				captainLogin
          object {
            id
            name
          }
          members {
            user {
              login
              firstName
              lastName
            }
          }
        }
      }
    }
  `;

	return mapResult(
		await graphqlQuery(query, { userId, projectObjectIds, eventId }),
		(data) => {
			const groups = (data.group_user ?? [])
				.map((entry) => entry.group)
				.filter(Boolean);
			const grouped = groups.reduce((map, group) => {
				const projectObjectId = group.object?.id;
				if (typeof projectObjectId !== "number") {
					return map;
				}

				const key = String(projectObjectId);
				const existing = map.get(key) ?? [];
				map.set(key, [...existing, group]);
				return map;
			}, new Map());

			const result = new Map();
			for (const [key, projectGroups] of grouped.entries()) {
				const captainLogin =
					projectGroups.find((g) => g.captainLogin)?.captainLogin ?? "";

				const rawMembers = projectGroups.flatMap((g) =>
					(g.members ?? [])
						.map((m) => m.user)
						.filter(Boolean)
						.map((u) => ({
							login: u.login,
							displayName:
								[u.firstName, u.lastName].filter(Boolean).join(" ") || u.login,
						})),
				);

				const uniqueMembers = [
					...new Map(rawMembers.map((m) => [m.login, m])).values(),
				].filter((m) => m.login);

				result.set(key, { captainLogin, members: uniqueMembers });
			}

			return result;
		},
	);
};

// ── Current level ──────────────────────────────────────────────────

export const fetchUserLevel = async (userId, eventId = getActiveEventId()) => {
	const query = `
    query GetLevel($userId: Int!, $eventId: Int!) {
      transaction(
        where: {
          userId: { _eq: $userId }
          eventId: { _eq: $eventId }
          type: { _eq: "level" }
          _or: [
            { path: { _is_null: true } }
            { path: { _nilike: "%piscine-go%" } }
          ]
        }
        order_by: { amount: desc }
        limit: 1
      ) {
        amount
      }
    }
  `;
	return mapResult(
		await graphqlQuery(query, { userId, eventId }),
		(data) => data.transaction?.[0]?.amount ?? 0,
	);
};
