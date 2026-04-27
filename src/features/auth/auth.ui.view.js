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

export const initAuth = () => {
	const loginForm = $("#login-form");
	const loginError = $("#login-error");
	const loginBtn = $("#login-btn");
	const btnText = loginBtn?.querySelector(".btn-text");
	const btnLoader = loginBtn?.querySelector(".btn-loader");
	const identifierInput = $("#identifier");
	const passwordInput = $("#password");
	const logoutBtn = $("#logout-btn");
	const passwordToggle = $("#password-toggle");

	passwordToggle?.addEventListener("click", () => {
		const isPassword = passwordInput?.type === "password";
		if (passwordInput) {
			passwordInput.type = isPassword ? "text" : "password";
		}

		// Update icons
		const eyeIcon = passwordToggle.querySelector(".icon-eye");
		const eyeOffIcon = passwordToggle.querySelector(".icon-eye-off");

		if (eyeIcon && eyeOffIcon) {
			eyeIcon.hidden = isPassword;
			eyeOffIcon.hidden = !isPassword;
		}

		passwordToggle.setAttribute(
			"aria-label",
			isPassword ? "Hide password" : "Show password",
		);

		// Trigger animation
		passwordToggle.classList.add("toggling");
		setTimeout(() => passwordToggle.classList.remove("toggling"), 300);
	});

	const performLogout = (broadcast = true) => {
		clearToken();
		document.dispatchEvent(new CustomEvent("auth:logout"));
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

			document.dispatchEvent(new CustomEvent("auth:login"));
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
};
