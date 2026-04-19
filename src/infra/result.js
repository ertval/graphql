/**
 * Result pattern helpers for typed success/failure propagation.
 * Centralises ok/fail constructors and mapResult helpers.
 * @module infra.result
 */

// ── Success constructor ────────────────────────────────────────────
/**
 * @template T
 * @param {T} data
 * @returns {{ok:true,data:T}}
 */
export const ok = (data) => ({ ok: true, data });

// ── Failure constructor ────────────────────────────────────────────
/**
 * @param {unknown} error
 * @returns {{ok:false,error:Error}}
 */
export const fail = (error) => ({
	ok: false,
	error: error instanceof Error ? error : new Error(String(error)),
});

// ── Functor map over a Result ──────────────────────────────────────
/**
 * @template T,U
 * @param {{ok:true,data:T}|{ok:false,error:Error}} result
 * @param {(data:T)=>U} mapper
 * @returns {{ok:true,data:U}|{ok:false,error:Error}}
 */
export const mapResult = (result, mapper) =>
	result.ok ? ok(mapper(result.data)) : result;
