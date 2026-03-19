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

/* -------------------------------------------------------------------
   Authentication
   ------------------------------------------------------------------- */

/**
 * Authenticates with Basic auth (base64 encoded identifier:password).
 * Supports both username and email as identifier.
 * @param {string} identifier - Username or email
 * @param {string} password - User password
 * @returns {Promise<string>} JWT token
 * @throws {Error} On invalid credentials or network failure
 */
export const login = async (identifier, password) => {
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
			throw new Error("Invalid username/email or password.");
		}
		throw new Error(`Authentication failed (${status}). Please try again.`);
	}

	const data = await response.json();

	// The endpoint may return the token directly as a string or inside an object
	const token = typeof data === "string" ? data.replace(/^"|"$/g, "") : data;

	if (!token) {
		throw new Error("No token received from server.");
	}

	return token;
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
 * @returns {Promise<object>} The `data` portion of the GraphQL response
 * @throws {Error} On network or GraphQL errors
 */
export const graphqlQuery = async (query, variables = {}) => {
	const token = getToken();
	if (!token) {
		throw new Error("Not authenticated. Please log in.");
	}

	const response = await fetch(GRAPHQL_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ query, variables }),
	});

	if (response.status === 401) {
		clearToken();
		throw new Error("Session expired. Please log in again.");
	}

	if (!response.ok) {
		throw new Error(`GraphQL request failed (${response.status}).`);
	}

	const result = await response.json();

	if (result.errors?.length) {
		const messages = result.errors.map((e) => e.message).join("; ");
		throw new Error(`GraphQL Error: ${messages}`);
	}

	return result.data;
};

/* -------------------------------------------------------------------
   Pre-built Queries
   Demonstrates: normal queries, nested queries, and queries with arguments
   ------------------------------------------------------------------- */

/**
 * NORMAL QUERY: Fetches basic user information.
 * @returns {Promise<object>} User data
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
	const data = await graphqlQuery(query);
	return data.user?.[0] ?? null;
};

/**
 * QUERY WITH ARGUMENTS (variables): Fetches XP transactions with path filter.
 * Uses GraphQL variables to demonstrate parameterized queries.
 * @param {number} userId - The user ID
 * @returns {Promise<Array>} XP transactions
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
	const data = await graphqlQuery(query, { userId });
	return data.transaction ?? [];
};

/**
 * NESTED QUERY: Fetches user progress with nested object info.
 * @param {number} userId
 * @returns {Promise<Array>}
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
	const data = await graphqlQuery(query, { userId });
	return data.progress ?? [];
};

/**
 * QUERY WITH ARGUMENTS: Fetches specific object details by ID.
 * @param {number} objectId
 * @returns {Promise<object|null>}
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
	const data = await graphqlQuery(query, { objectId });
	return data.object?.[0] ?? null;
};

/**
 * Fetches skill-related transactions.
 * @param {number} userId
 * @returns {Promise<Array>}
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
	const data = await graphqlQuery(query, { userId });
	return data.transaction ?? [];
};

/**
 * Fetches audit records for the user with nested object info.
 * @param {number} userId
 * @returns {Promise<object>}
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
	const data = await graphqlQuery(query, { userId });
	return data.audit ?? [];
};

/**
 * NESTED QUERY: Fetches results with nested user data.
 * Demonstrates nesting: result → user relationship.
 * @param {number} userId
 * @returns {Promise<Array>}
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
	const data = await graphqlQuery(query, { userId });
	return data.result ?? [];
};

/**
 * Fetches the user's level from events.
 * @param {number} userId
 * @returns {Promise<number>}
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
	const data = await graphqlQuery(query, { userId });
	return data.transaction?.[0]?.amount ?? 0;
};

/* -------------------------------------------------------------------
   Student / Leaderboard Queries
   ------------------------------------------------------------------- */

/**
 * Fetches all users visible to the authenticated token.
 * Returns id, login, campus, auditRatio, totalUp, totalDown.
 * The platform exposes all school users via the user table.
 * @returns {Promise<Array>} List of user records
 */
export const fetchAllStudents = async () => {
	const query = `
    {
      user(order_by: { login: asc }) {
        id
        login
        firstName
        lastName
        campus
        auditRatio
        totalUp
        totalDown
      }
    }
  `;
	const data = await graphqlQuery(query);
	return data.user ?? [];
};

/**
 * Fetches total XP and level for a specific student by their userId.
 * @param {number} userId
 * @returns {Promise<{totalXP: number, level: number}>}
 */
export const fetchStudentXPAndLevel = async (userId) => {
	const query = `
    query GetStudentXPAndLevel($userId: Int!) {
      xp: transaction_aggregate(
        where: {
          userId: { _eq: $userId }
          type: { _eq: "xp" }
          path: { _nlike: "%piscine%" }
        }
      ) {
        aggregate {
          sum {
            amount
          }
        }
      }
      level: transaction(
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
	const data = await graphqlQuery(query, { userId });
	return {
		totalXP: data.xp?.aggregate?.sum?.amount ?? 0,
		level: data.level?.[0]?.amount ?? 0,
	};
};

/**
 * Fetches basic info for a specific student by userId.
 * Same as fetchUserInfo but scoped to a given ID.
 * @param {number} userId
 * @returns {Promise<object|null>}
 */
export const fetchStudentInfo = async (userId) => {
	const query = `
    query GetStudentInfo($userId: Int!) {
      user(where: { id: { _eq: $userId } }) {
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
	const data = await graphqlQuery(query, { userId });
	return data.user?.[0] ?? null;
};
