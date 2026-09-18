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
	// The gate stays in the markup after it is answered — CSS hides it — so the
	// scroll lock has to check the answer, not just the element. Without this
	// the page is unscrollable on every later visit.
	const gate = document.querySelector("[data-age-gate]");
	const answered = document.documentElement.classList.contains("has-age-consent");

	if (gate && !answered) {
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
watchForDrawer();

/**
 * The mobile drawer.
 *
 * Wide screens never reach this: the panel is `display: contents` there, and
 * the button that opens it is hidden.
 */
function watchForDrawer() {
	const toggle = document.querySelector("[data-drawer-toggle]");
	const drawer = document.querySelector("[data-drawer]");
	if (!toggle || !drawer) return;

	const focusable = () =>
		[...drawer.querySelectorAll("a[href], button:not([disabled]), input, [tabindex]:not([tabindex='-1'])")];

	const setOpen = (open) => {
		root.classList.toggle("drawer-open", open);
		toggle.setAttribute("aria-expanded", String(open));

		if (open) {
			// Focus the panel, not its first link: assistive technology lands in
			// the right place and no focus ring appears on something untouched.
			// Deferred a frame, because the panel is still mid-transition here.
			requestAnimationFrame(() => drawer.focus({ preventScroll: true }));
		} else if (drawer.contains(document.activeElement)) {
			toggle.focus({ preventScroll: true });
		}
	};

	toggle.addEventListener("click", () => setOpen(!root.classList.contains("drawer-open")));

	for (const closer of document.querySelectorAll("[data-drawer-close]")) {
		closer.addEventListener("click", () => setOpen(false));
	}

	// Following a link should leave the drawer shut behind you.
	drawer.addEventListener("click", (event) => {
		if (event.target.closest("a")) root.classList.remove("drawer-open");
	});

	document.addEventListener("keydown", (event) => {
		if (!root.classList.contains("drawer-open")) return;

		if (event.key === "Escape") {
			setOpen(false);
			toggle.focus({ preventScroll: true });
			return;
		}

		// Keep Tab inside the panel while it covers the page.
		if (event.key !== "Tab") return;

		const items = [toggle, ...focusable()];
		if (items.length < 2) return;

		const first = items[0];
		const last = items[items.length - 1];

		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		} else if (!drawer.contains(document.activeElement) && document.activeElement !== toggle) {
			event.preventDefault();
			first.focus();
		}
	});

	// A phone rotated to landscape can cross the breakpoint with the drawer open.
	window.matchMedia("(min-width: 40.0625rem)").addEventListener("change", (event) => {
		if (event.matches) setOpen(false);
	});
}
