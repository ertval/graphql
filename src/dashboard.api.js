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

// ── Single object lookup ───────────────────────────────────────────

export const fetchObjectById = async (objectId) => {
	const query = `
    query GetObject($objectId: Int!) {
      object(where: { id: { _eq: $objectId } }) {
        id
        name
        type
      }
    }
  `;
	return mapResult(
		await graphqlQuery(query, { objectId }),
		(data) => data.object?.[0] ?? null,
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

// ── Audit detail records ───────────────────────────────────────────

export const fetchAuditDetails = async (userId) => {
	const query = `
    query GetAudits($userId: Int!) {
      audit(
        where: { auditorId: { _eq: $userId } }
        order_by: { createdAt: desc }
        limit: 20
      ) {
        id
        grade
        createdAt
        group {
          captainLogin
          object {
            name
          }
        }
      }
    }
  `;
	return mapResult(
		await graphqlQuery(query, { userId }),
		(data) => data.audit ?? [],
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
