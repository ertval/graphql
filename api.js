/**
 * GraphQL API Service
 * Handles authentication and GraphQL queries using Bearer JWT tokens.
 * @module api
 */

/** @type {string} Platform base URL */
const PLATFORM = "https://platform.zone01.gr";

/** @type {string} Auth endpoint */
const AUTH_URL = `${PLATFORM}/api/auth/signin`;

/** @type {string} GraphQL endpoint */
const GRAPHQL_URL = `${PLATFORM}/api/graphql-engine/v1/graphql`;

/** Token storage key */
const TOKEN_KEY = "graphql_jwt";

/**
 * Creates a success Result.
 * @template T
 * @param {T} data
 * @returns {{ok: true, data: T}}
 */
const ok = (data) => ({ ok: true, data });

/**
 * Creates a failure Result.
 * @param {unknown} error
 * @returns {{ok: false, error: Error}}
 */
const fail = (error) => ({
  ok: false,
  error: error instanceof Error ? error : new Error(String(error)),
});

/**
 * Maps successful Result data and passes failures through unchanged.
 * @template T,U
 * @param {{ok: true, data: T} | {ok: false, error: Error}} result
 * @param {(data: T) => U} mapper
 * @returns {{ok: true, data: U} | {ok: false, error: Error}}
 */
const mapResult = (result, mapper) =>
  result.ok ? ok(mapper(result.data)) : result;

/**
 * Checks if an error message indicates an authentication failure.
 * @param {string} message
 * @returns {boolean}
 */
const isAuthErrorMessage = (message) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("not authenticated") ||
    normalized.includes("unauthorized") ||
    normalized.includes("forbidden") ||
    normalized.includes("jwt") ||
    normalized.includes("token") ||
    normalized.includes("access denied")
  );
};

/* -------------------------------------------------------------------
   Authentication
   ------------------------------------------------------------------- */

/**
 * Authenticates with Basic auth (base64 encoded identifier:password).
 * Supports both username and email as identifier.
 * @param {string} identifier - Username or email
 * @param {string} password - User password
 * @returns {Promise<{ok: true, data: string} | {ok: false, error: Error}>}
 */
export const login = async (identifier, password) => {
  try {
    const credentials = btoa(`${identifier}:${password}`);

    const response = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 401 || status === 403) {
        return fail(new Error("Invalid username/email or password."));
      }
      return fail(new Error(`Authentication failed (${status}). Please try again.`));
    }

    const data = await response.json();

    // The endpoint may return the token directly as a string or inside an object
    const token = typeof data === "string" ? data.replace(/^"|"$/g, "") : data;

    if (!token) {
      return fail(new Error("No token received from server."));
    }

    return ok(token);
  } catch (error) {
    return fail(error);
  }
};

/**
 * Stores the JWT token.
 * @param {string} token
 */
export const saveToken = (token) => {
	localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Retrieves the stored JWT token.
 * @returns {string|null}
 */
export const getToken = () => localStorage.getItem(TOKEN_KEY);

/**
 * Removes the token and clears session.
 */
export const clearToken = () => {
	localStorage.removeItem(TOKEN_KEY);
};

/**
 * Checks if a valid token exists.
 * @returns {boolean}
 */
export const isAuthenticated = () => {
	const token = getToken();
	if (!token) return false;

	// Decode JWT payload and check expiration
	try {
		const payload = JSON.parse(atob(token.split(".")[1]));
		const now = Math.floor(Temporal.Now.instant().epochMilliseconds / 1000);
		return payload.exp > now;
	} catch {
		return false;
	}
};

/**
 * Decodes the JWT payload.
 * @returns {object|null}
 */
export const decodeToken = () => {
	const token = getToken();
	if (!token) return null;
	try {
		return JSON.parse(atob(token.split(".")[1]));
	} catch {
		return null;
	}
};

/* -------------------------------------------------------------------
   GraphQL Querying
   ------------------------------------------------------------------- */

/**
 * Executes a GraphQL query with Bearer authentication.
 * @param {string} query - The GraphQL query string
 * @param {object} [variables={}] - Query variables (for parameterized queries)
 * @returns {Promise<{ok: true, data: object} | {ok: false, error: Error}>}
 */
export const graphqlQuery = async (query, variables = {}) => {
  try {
    const token = getToken();
    if (!token) {
      return fail(new Error("Not authenticated. Please log in."));
    }

    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.status === 401 || response.status === 403) {
      clearToken();
      return fail(new Error("Session expired. Please log in again."));
    }

    if (!response.ok) {
      return fail(new Error(`GraphQL request failed (${response.status}).`));
    }

    const result = await response.json();

    if (result.errors?.length) {
      const messages = result.errors.map((e) => e.message).join("; ");
      if (isAuthErrorMessage(messages)) {
        clearToken();
      }
      return fail(new Error(`GraphQL Error: ${messages}`));
    }

    return ok(result.data);
  } catch (error) {
    return fail(error);
  }
};

/* -------------------------------------------------------------------
   Pre-built Queries
   Demonstrates: normal queries, nested queries, and queries with arguments
   ------------------------------------------------------------------- */

/**
 * NORMAL QUERY: Fetches basic user information.
 * @returns {Promise<{ok: true, data: object|null} | {ok: false, error: Error}>}
 */
export const fetchUserInfo = async () => {
	// Normal query — no nesting, no arguments
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

/**
 * QUERY WITH ARGUMENTS (variables): Fetches XP transactions with path filter.
 * Uses GraphQL variables to demonstrate parameterized queries.
 * @param {number} userId - The user ID
 * @returns {Promise<{ok: true, data: Array} | {ok: false, error: Error}>}
 */
export const fetchXPTransactions = async (userId) => {
	// Query using arguments/variables — demonstrates parameterized queries
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

/**
 * NESTED QUERY: Fetches user progress with nested object info.
 * @param {number} userId
 * @returns {Promise<{ok: true, data: Array} | {ok: false, error: Error}>}
 */
export const fetchProgress = async (userId) => {
	// Nested query — result contains nested user and object relationships
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

/**
 * QUERY WITH ARGUMENTS: Fetches specific object details by ID.
 * @param {number} objectId
 * @returns {Promise<{ok: true, data: object|null} | {ok: false, error: Error}>}
 */
export const fetchObjectById = async (objectId) => {
	// Demonstrates using arguments (where clause with _eq)
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

/**
 * Fetches skill-related transactions.
 * @param {number} userId
 * @returns {Promise<{ok: true, data: Array} | {ok: false, error: Error}>}
 */
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

/**
 * Fetches audit records for the user with nested object info.
 * @param {number} userId
 * @returns {Promise<{ok: true, data: Array} | {ok: false, error: Error}>}
 */
export const fetchAuditDetails = async (userId) => {
	// Nested query — audits with nested group and object information
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

/**
 * NESTED QUERY: Fetches results with nested user data.
 * Demonstrates nesting: result → user relationship.
 * @param {number} userId
 * @returns {Promise<{ok: true, data: Array} | {ok: false, error: Error}>}
 */
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

/**
 * Fetches the user's level from events.
 * @param {number} userId
 * @returns {Promise<{ok: true, data: number} | {ok: false, error: Error}>}
 */
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

/* -------------------------------------------------------------------
   Collaborations / Sub-queries
   ------------------------------------------------------------------- */

/**
 * Fetches all collaborations (group partners, audits given/received) for a given userId.
 * @param {number} userId
 * @returns {Promise<{ok: true, data: {groups: Array, auditsGiven: Array, auditsReceived: Array}} | {ok: false, error: Error}>}
 */
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
        group { captainLogin object { name } }
      }
      audit_received: audit(where: {group: {members: {userId: {_eq: $userId}}}}) {
        grade
        createdAt
        auditor { login firstName lastName campus }
        group { object { name } }
      }
    }
  `;
  return mapResult(await graphqlQuery(query, { userId }), (data) => ({
    groups: data.group_user ?? [],
    auditsGiven: data.audit ?? [],
    auditsReceived: data.audit_received ?? [],
  }));
};
