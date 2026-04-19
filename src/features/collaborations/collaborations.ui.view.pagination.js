/**
 * Collaborations view pagination renderer.
 * @module collaborations.view.pagination
 */

/**
 * @param {{
 * 	container: HTMLElement,
 * 	totalPages: number,
 * 	currentPage: number,
 * 	onPageChange: (page: number) => void,
 * }} args
 */
export const renderCollabsPagination = ({
	container,
	totalPages,
	currentPage,
	onPageChange,
}) => {
	container.replaceChildren();
	if (totalPages <= 1) return;

	const mkBtn = (label, page, disabled = false, active = false) => {
		const btn = document.createElement("button");
		btn.className = `page-btn${active ? " page-active" : ""}`;
		btn.textContent = label;
		btn.disabled = disabled;
		btn.addEventListener("click", () => {
			onPageChange(page);
			document.querySelector("#collaborations-view")?.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		});
		return btn;
	};

	container.append(mkBtn("‹", currentPage - 1, currentPage === 1));
	const start = Math.max(1, currentPage - 3);
	const end = Math.min(totalPages, currentPage + 3);

	if (start > 1) {
		container.append(mkBtn("1", 1));
		if (start > 2) {
			const dots = document.createElement("span");
			dots.className = "page-dots";
			dots.textContent = "…";
			container.append(dots);
		}
	}

	for (let page = start; page <= end; page += 1) {
		container.append(mkBtn(String(page), page, false, page === currentPage));
	}

	if (end < totalPages) {
		if (end < totalPages - 1) {
			const dots = document.createElement("span");
			dots.className = "page-dots";
			dots.textContent = "…";
			container.append(dots);
		}
		container.append(mkBtn(String(totalPages), totalPages));
	}

	container.append(mkBtn("›", currentPage + 1, currentPage === totalPages));
};
