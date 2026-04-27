/**
 * Dashboard audit details popup.
 * @module dashboard.popup.audit
 */

import {
	$,
	formatLocalDate,
	lockBodyScroll,
	unlockBodyScroll,
} from "../../infra/ui.js";
import { formatXP } from "./dashboard.ui.charts.helpers.js";

const AUDIT_DETAILS_OVERLAY_LOCK_KEY = "overlay-audit-details";

let getAuditDetailsProjects = () => [];
let openProjectDetails = () => {};
let eventsBound = false;

const setAuditOverlayInteraction = (enabled) => {
	const overlay = $("#audit-details-overlay");
	if (!overlay) return;
	overlay.style.pointerEvents = enabled ? "" : "none";
};

const renderAuditDetailsContent = (items) => {
	const content = $("#audit-details-content");
	if (!content) return;
	content.replaceChildren();

	if (!items.length) {
		const empty = document.createElement("p");
		empty.className = "dashboard-empty-message";
		empty.textContent = "No audit details available.";
		content.append(empty);
		return;
	}

	const list = document.createElement("div");
	list.className = "audit-details-list";

	for (const item of items) {
		const row = document.createElement("article");
		row.className = "audit-details-item";
		row.setAttribute("role", "button");
		row.setAttribute("tabindex", "0");
		row.setAttribute(
			"aria-label",
			`View details for ${item.name ?? "project"}`,
		);

		const open = () => {
			setAuditOverlayInteraction(false);
			openProjectDetails(item);
		};
		row.addEventListener("click", open);
		row.addEventListener("keydown", (event) => {
			if (event.key !== "Enter" && event.key !== " ") return;
			event.preventDefault();
			open();
		});

		const info = document.createElement("div");
		info.className = "audit-details-info";

		const name = document.createElement("h3");
		name.className = "audit-details-name";
		name.textContent = item.name ?? "Unknown Project";

		const meta = document.createElement("p");
		meta.className = "audit-details-meta";
		const auditCount = Number.isFinite(item.auditCount) ? item.auditCount : 0;
		const countLabel = auditCount === 1 ? "1 audit" : `${auditCount} audits`;
		meta.textContent = `${formatLocalDate(item.latestDate)} • ${countLabel}`;

		if (item.path) {
			const path = document.createElement("p");
			path.className = "audit-details-path";
			path.textContent = item.path;
			info.append(name, meta, path);
		} else {
			info.append(name, meta);
		}

		const xp = document.createElement("div");
		xp.className = "audit-details-xp";
		xp.textContent = `Total XP ${formatXP(item.totalXP ?? 0)}`;

		row.append(info, xp);
		list.append(row);
	}

	content.append(list);
};

const openAuditDetailsPopup = () => {
	const overlay = $("#audit-details-overlay");
	const title = $("#audit-details-title");
	if (!overlay || !title) return;

	title.textContent = "Audit Details";
	renderAuditDetailsContent(getAuditDetailsProjects());
	setAuditOverlayInteraction(true);
	lockBodyScroll(AUDIT_DETAILS_OVERLAY_LOCK_KEY);
	overlay.classList.add("active");
};

export const closeAuditDetailsPopup = () => {
	const overlay = $("#audit-details-overlay");
	overlay?.classList.remove("active");
	setAuditOverlayInteraction(true);
	unlockBodyScroll(AUDIT_DETAILS_OVERLAY_LOCK_KEY);
};

export const initAuditDetailsPopup = (
	auditDetailsGetter,
	onProjectOpen = () => {},
) => {
	getAuditDetailsProjects = auditDetailsGetter;
	openProjectDetails = onProjectOpen;
	if (eventsBound) return;
	eventsBound = true;

	const trigger = $("#audit-details-btn");
	trigger?.addEventListener("click", openAuditDetailsPopup);
	trigger?.addEventListener("keydown", (event) => {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		openAuditDetailsPopup();
	});

	const closeBtn = $("#audit-details-close");
	closeBtn?.addEventListener("click", closeAuditDetailsPopup);

	const overlay = $("#audit-details-overlay");
	overlay?.addEventListener("click", (event) => {
		if (event.target === overlay) {
			closeAuditDetailsPopup();
		}
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && overlay?.classList.contains("active")) {
			closeAuditDetailsPopup();
		}
	});

	document.addEventListener("project-detail:close", () => {
		if (overlay?.classList.contains("active")) {
			setAuditOverlayInteraction(true);
		}
	});
};
