/**
 * Collaborator popup project panel DOM helpers.
 * @module collaborations.popup.project-panel
 */

/**
 * @returns {{
 * 	panel: HTMLElement,
 * 	panelTitle: HTMLElement,
 * 	panelBody: HTMLElement,
 * }}
 */
export const createProjectDetailPanelElements = () => {
	const detailPanel = document.createElement("aside");
	detailPanel.className = "sp-project-panel";

	const detailPanelTitle = document.createElement("h3");
	detailPanelTitle.className = "sp-project-title";
	detailPanelTitle.textContent = "Project Details";

	const detailPanelBody = document.createElement("div");
	detailPanelBody.className = "sp-project-body";
	const detailHint = document.createElement("p");
	detailHint.className = "sp-project-hint";
	detailHint.textContent = "Click a shared project to expand details.";
	detailPanelBody.append(detailHint);
	detailPanel.append(detailPanelTitle, detailPanelBody);

	return {
		panel: detailPanel,
		panelTitle: detailPanelTitle,
		panelBody: detailPanelBody,
	};
};
