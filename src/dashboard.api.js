/**
 * Dashboard Data API.
 * Encapsulates GraphQL query execution for dashboard features.
 * @module dashboard.api
 */

import { graphqlQuery } from "./infra.graphql.js";
import { mapResult } from "./infra.result.js";

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

// ── XP transactions (excludes piscine) ─────────────────────────────

export const fetchXPTransactions = async (userId) => {
	const query = `
    query GetXPTransactions($userId: Int!) {
      transaction(
        where: {
          userId: { _eq: $userId }
          type: { _eq: "xp" }
          path: { _nlike: "%piscine%" }
        }
        order_by: { createdAt: asc }
      ) {
        id
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
		await graphqlQuery(query, { userId }),
		(data) => data.transaction ?? [],
	);
};

// ── Completed progress records ─────────────────────────────────────

export const fetchProgress = async (userId) => {
	const query = `
    query GetProgress($userId: Int!) {
      progress(
        where: {
          userId: { _eq: $userId }
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
          name
          type
        }
      }
    }
  `;
	return mapResult(
		await graphqlQuery(query, { userId }),
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

export const fetchResults = async (userId) => {
	const query = `
    query GetResults($userId: Int!) {
      result(
        where: { userId: { _eq: $userId } }
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
		await graphqlQuery(query, { userId }),
		(data) => data.result ?? [],
	);
};

// ── Project teams for member lists ───────────────────────────────

export const fetchProjectTeams = async (userId, projectObjectIds) => {
	if (!projectObjectIds.length) {
		return { ok: true, data: new Map() };
	}

	const query = `
    query GetProjectTeams($userId: Int!, $projectObjectIds: [Int!]!) {
      group_user(
        where: {
          userId: { _eq: $userId }
          group: { object: { id: { _in: $projectObjectIds } } }
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

  return mapResult(await graphqlQuery(query, { userId, projectObjectIds }), (data) => {
		const groups = (data.group_user ?? []).map((entry) => entry.group).filter(Boolean);
		return groups.reduce((map, group) => {
      const projectObjectId = group.object?.id;
      if (typeof projectObjectId !== "number") return map;

      const key = String(projectObjectId);
      const existing = map.get(key) ?? {
        captainLogin: group.captainLogin ?? "",
        members: [],
      };
      const existingLogins = new Set(
        existing.members.map((member) => member.login),
      );
			const members = (group.members ?? [])
				.map((member) => member.user)
				.filter(Boolean)
				.map((user) => ({
					login: user.login,
					displayName:
						[user.firstName, user.lastName].filter(Boolean).join(" ") ||
						user.login,
				}))
				.filter((member) => member.login && !existingLogins.has(member.login));

      map.set(key, {
        captainLogin: existing.captainLogin || group.captainLogin || "",
        members: [...existing.members, ...members],
      });
			return map;
		}, new Map());
	});
};

// ── Current level ──────────────────────────────────────────────────

export const fetchUserLevel = async (userId) => {
	const query = `
    query GetLevel($userId: Int!) {
      transaction(
        where: {
          userId: { _eq: $userId }
          type: { _eq: "level" }
          path: { _nlike: "%piscine%" }
        }
        order_by: { amount: desc }
        limit: 1
      ) {
        amount
      }
    }
  `;
	return mapResult(
		await graphqlQuery(query, { userId }),
		(data) => data.transaction?.[0]?.amount ?? 0,
	);
};
