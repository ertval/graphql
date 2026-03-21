/**
 * @template T
 * @param {{ok:true,data:T}|{ok:false,error:Error}} result
 * @returns {T}
 */
export const unwrapResult = (result) => {
	if (result.ok) return result.data;
	throw result.error;
};
