/**
 * Aside — theme behaviour.
 *
 * Two jobs: the light/dark switch, and keeping Ghost's comments embed in step
 * with it. Everything else on the page is server rendered, and Ghost's own
 * scripts (search, members, comments) load themselves through {{ghost_head}}.
 */
const STORAGE_KEY = "aside-theme";
const CONSENT = {
	age: { key: "aside-age-ok", className: "has-age-consent" },
	sensitive: { key: "aside-sensitive-ok", className: "has-sensitive-consent" },
};
const CANVAS_STYLE_ID = "aside-comments-canvas";
const root = document.documentElement;

function storedTheme() {
	try {
		return localStorage.getItem(STORAGE_KEY);
	} catch (error) {
		return null;
	}
}

function currentTheme() {
	if (root.classList.contains("dark")) return "dark";
	if (root.classList.contains("light")) return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
	root.classList.remove("light", "dark");
	root.classList.add(theme);

	try {
		localStorage.setItem(STORAGE_KEY, theme);
	} catch (error) {
		/* The preference simply will not persist between visits. */
	}

	syncCommentsTheme();
}

/**
 * Ghost renders comments in a same-origin iframe that reads its colour scheme
 * once, at boot: post.hbs hands it the saved choice on page load. A switch made
 * here has to reach the iframe directly, which means two things — repainting
 * the iframe's canvas (otherwise a dark page gets a white panel) and flipping
 * the class the embed uses for its own colours.
 */
function syncCommentsTheme() {
	const frame = document.querySelector(".article-comments iframe");
	if (!frame) return;

	const theme = currentTheme();

	try {
		const doc = frame.contentDocument;
		if (!doc || !doc.documentElement) return;

		let style = doc.getElementById(CANVAS_STYLE_ID);
		if (!style) {
			style = doc.createElement("style");
			style.id = CANVAS_STYLE_ID;
			doc.documentElement.appendChild(style);
		}

		style.textContent = `:root{color-scheme:${theme};background:transparent;}body{background:transparent;}`;

		const display = doc.querySelector(".ghost-display");
		if (display) display.classList.toggle("dark", theme === "dark");
	} catch (error) {
		/* A future cross-origin embed would land here; leave it as Ghost drew it. */
	}
}

/**
 * Content warnings and the age gate.
 *
 * Both are a courtesy: the post is in the page either way, blurred and inert
 * until the reader answers. Treat it as a warning, not as access control.
 */
function watchForConsent() {
	const gate = document.querySelector("[data-age-gate]");
	if (gate) {
		document.documentElement.classList.add("age-gate-open");
		// Focus the panel rather than the button: screen readers land in the
		// right place without a focus ring appearing on a button nobody clicked.
		gate.querySelector("[data-age-gate-panel]")?.focus({ preventScroll: true });
	}

	for (const button of document.querySelectorAll("[data-warning-decline]")) {
		button.addEventListener("click", () => {
			if (window.history.length > 1) {
				window.history.back();
			} else {
				window.close(); // Only works for script-opened tabs; harmless otherwise.
			}
		});
	}

	for (const button of document.querySelectorAll("[data-warning-accept]")) {
		button.addEventListener("click", () => {
			const consent = CONSENT[button.dataset.warningAccept] ?? CONSENT.sensitive;

			document.documentElement.classList.add(consent.className);
			document.documentElement.classList.remove("age-gate-open");

			try {
				localStorage.setItem(consent.key, "1");
			} catch (error) {
				/* The answer will be asked for again on the next visit. */
			}
		});
	}
}

/** The embed mounts after this script runs, so wait for it to appear. */
function watchForComments() {
	const section = document.querySelector(".article-comments");
	if (!section) return;

	syncCommentsTheme();

	const observer = new MutationObserver(() => {
		const frame = section.querySelector("iframe");
		if (!frame) return;

		syncCommentsTheme();
		frame.addEventListener("load", syncCommentsTheme);
	});

	observer.observe(section, { childList: true, subtree: true });

	// The embed swaps its srcdoc document while it boots, which throws away any
	// style injected a moment too early. Re-apply for the first few seconds so
	// the panel never flashes white on a dark page.
	let attempts = 0;
	const settle = setInterval(() => {
		syncCommentsTheme();
		if ((attempts += 1) >= 20) clearInterval(settle);
	}, 250);
}

document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
	button.addEventListener("click", () => {
		applyTheme(currentTheme() === "dark" ? "light" : "dark");
	});
});

// Someone who has never chosen a theme should keep following the OS.
if (!storedTheme()) {
	window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
		root.classList.remove("light", "dark");
		syncCommentsTheme();
	});
}

watchForComments();
watchForConsent();
