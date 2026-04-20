/**
 * Auth UI View — Login form and Logout button handling.
 * @module features/auth/view
 */

import {
	AUTH_SYNC_KEY,
	clearToken,
	login,
	saveToken,
} from "../../infra/auth.js";
import { $ } from "../../infra/ui.js";
import { toPublicErrorMessage } from "./auth.core.js";

const authChannel =
	"BroadcastChannel" in globalThis
		? new BroadcastChannel("graphql_auth_channel")
		: null;

export const initAuthUI = ({ onLoginSuccess, onLogout }) => {
	const loginForm = $("#login-form");
	const loginError = $("#login-error");
	const loginBtn = $("#login-btn");
	const btnText = loginBtn?.querySelector(".btn-text");
	const btnLoader = loginBtn?.querySelector(".btn-loader");
	const identifierInput = $("#identifier");
	const passwordInput = $("#password");
	const logoutBtn = $("#logout-btn");

	const performLogout = (broadcast = true) => {
		clearToken();
		onLogout();
		history.replaceState(null, "", location.pathname);

		if (broadcast) {
			authChannel?.postMessage({ type: "logout" });
			try {
				localStorage.setItem(
					AUTH_SYNC_KEY,
					String(Temporal.Now.instant().epochMilliseconds),
				);
				localStorage.removeItem(AUTH_SYNC_KEY);
			} catch {
				// Ignore storage sync fallback failures.
			}
		}
	};

	loginForm?.addEventListener("submit", async (e) => {
		e.preventDefault();
		if (loginError) loginError.textContent = "";

		const identifier = identifierInput?.value.trim();
		const password = passwordInput?.value;

		if (!identifier || !password) {
			if (loginError) loginError.textContent = "Please fill in all fields.";
			return;
		}

		if (loginBtn) loginBtn.disabled = true;
		if (btnText) btnText.hidden = true;
		if (btnLoader) btnLoader.hidden = false;

		try {
			const loginResult = await login(identifier, password);
			if (!loginResult.ok) {
				if (loginError)
					loginError.textContent = toPublicErrorMessage(
						loginResult.error,
						"auth",
					);
				return;
			}

			const persistResult = saveToken(loginResult.data);
			if (!persistResult.ok) {
				if (loginError)
					loginError.textContent = toPublicErrorMessage(
						persistResult.error,
						"auth",
					);
				return;
			}

			await onLoginSuccess();
		} catch (err) {
			if (loginError)
				loginError.textContent = toPublicErrorMessage(err, "auth");
		} finally {
			if (loginBtn) loginBtn.disabled = false;
			if (btnText) btnText.hidden = false;
			if (btnLoader) btnLoader.hidden = true;
		}
	});

	logoutBtn?.addEventListener("click", () => {
		performLogout();
	});

	globalThis.addEventListener("storage", (event) => {
		if (event.key === AUTH_SYNC_KEY) performLogout(false);
	});

	authChannel?.addEventListener("message", (event) => {
		if (event.data?.type === "logout") performLogout(false);
	});

	return { performLogout };
};
