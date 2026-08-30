/* ============================================================
   Travel gallery pages
     - region switcher (rendered from one shared list)
     - staggered photo reveal
     - lightbox with keyboard + swipe navigation
     - ambient background reused from the main site
   ============================================================ */

(function () {
    "use strict";

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const $  = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

    /* ---- The one place regions are defined ---- */
    const REGIONS = [
        { slug: "europe",       file: "europe.html",       label: "Europe" },
        { slug: "middle-east",  file: "middle-east.html",  label: "Middle East" },
        { slug: "africa",       file: "africa.html",       label: "Africa" },
        { slug: "americas",     file: "americas.html",     label: "Central & South America" },
        { slug: "asia-oceania", file: "asia-oceania.html", label: "Asia & Oceania" },
        { slug: "antarctica",   file: "antarctica.html",   label: "Antarctica" }
    ];

    /* --------------------------------------------------------
       Ambient background (same aurora as the home page)
    -------------------------------------------------------- */
    function initAurora() {
        const canvas = $("#bg-canvas");
        if (!canvas || reduced) return;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        const tint = (document.body.dataset.tint || "94,234,212").split("|");
        const SCALE = 0.14;
        let w, h;

        const blobs = [
            { hue: tint[0] || "94, 234, 212",  r: 0.66, x: 0.20, y: 0.16, sx: 0.00019, sy: 0.00015, px: 0,   py: 0,   a: 0.32 },
            { hue: tint[1] || "129, 140, 248", r: 0.72, x: 0.80, y: 0.30, sx: -0.00015, sy: 0.00021, px: 1.7, py: 0.4, a: 0.26 },
            { hue: tint[2] || "192, 132, 252", r: 0.52, x: 0.50, y: 0.82, sx: 0.00017, sy: -0.00013, px: 3.1, py: 2.2, a: 0.18 }
        ];

        function resize() {
            w = canvas.width  = Math.max(1, Math.round(window.innerWidth  * SCALE));
            h = canvas.height = Math.max(1, Math.round(window.innerHeight * SCALE));
        }
        resize();
        window.addEventListener("resize", resize, { passive: true });

        function frame(now) {
            ctx.fillStyle = "#08090c";
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = "lighter";
            const diag = Math.hypot(w, h);

            for (const b of blobs) {
                const cx = (b.x + Math.sin(now * b.sx + b.px) * 0.14) * w;
                const cy = (b.y + Math.cos(now * b.sy + b.py) * 0.14) * h;
                const rad = b.r * diag * 0.5;
                const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
                g.addColorStop(0,    `rgba(${b.hue}, ${b.a})`);
                g.addColorStop(0.45, `rgba(${b.hue}, ${b.a * 0.32})`);
                g.addColorStop(1,    `rgba(${b.hue}, 0)`);
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, w, h);
            }
            ctx.globalCompositeOperation = "source-over";
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }

    /* --------------------------------------------------------
       Custom cursor
    -------------------------------------------------------- */
    function initCursor() {
        const dot = $(".cursor-dot");
        const ring = $(".cursor-ring");
        if (!dot || !ring || !fine || reduced) return;

        let px = innerWidth / 2, py = innerHeight / 2;
        let dx = px, dy = py, rx = px, ry = py;

        addEventListener("pointermove", (e) => {
            px = e.clientX; py = e.clientY;
            document.body.classList.add("cursor-ready");
        }, { passive: true });

        (function loop() {
            dx = lerp(dx, px, 0.42); dy = lerp(dy, py, 0.42);
            rx = lerp(rx, px, 0.16); ry = lerp(ry, py, 0.16);
            dot.style.transform  = `translate3d(${dx}px, ${dy}px, 0)`;
            ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
            requestAnimationFrame(loop);
        })();

        const H = "a, button, .shot, [role='button']";
        document.addEventListener("pointerover", (e) => {
            if (e.target.closest(H)) document.body.classList.add("cursor-hover");
        });
        document.addEventListener("pointerout", (e) => {
            if (e.target.closest(H)) document.body.classList.remove("cursor-hover");
        });
    }

    /* --------------------------------------------------------
       Scroll progress + navbar state
    -------------------------------------------------------- */
    function initScrollUI() {
        const bar = $(".scroll-progress");
        const navbar = $("#navbar");
        let ticking = false;

        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const y = scrollY;
                const max = document.documentElement.scrollHeight - innerHeight;
                if (bar) bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
                if (navbar) navbar.classList.toggle("is-scrolled", y > 24);
                ticking = false;
            });
        }
        addEventListener("scroll", onScroll, { passive: true });
        onScroll();
    }

    /* --------------------------------------------------------
       Region switcher
    -------------------------------------------------------- */
    function initRegionStrip() {
        const strip = $("#region-strip");
        if (!strip) return;

        const current = strip.dataset.current;
        REGIONS.forEach((r, i) => {
            const isCurrent = r.slug === current;
            const el = document.createElement(isCurrent ? "span" : "a");
            el.className = "region-pill" + (isCurrent ? " is-current" : "");
            el.textContent = r.label;
            if (!isCurrent) el.href = r.file;
            else el.setAttribute("aria-current", "page");
            el.style.setProperty("--d", `${i * 50}ms`);
            strip.appendChild(el);
        });
    }

    /* --------------------------------------------------------
       Reveal (hero blocks + photos)
    -------------------------------------------------------- */
    function initReveal() {
        const targets = [...$$("[data-reveal]"), ...$$(".shot")];
        if (!targets.length) return;

        if (reduced || !("IntersectionObserver" in window)) {
            targets.forEach((el) => el.classList.add("is-in", "is-in"));
            return;
        }

        // Stagger photos by their position in the grid.
        $$(".shot").forEach((el, i) => {
            el.style.transitionDelay = `${Math.min(i, 8) * 70}ms`;
        });

        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-in");
                io.unobserve(entry.target);
            });
        }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

        targets.forEach((el) => io.observe(el));
    }

    /* --------------------------------------------------------
       Empty state
    -------------------------------------------------------- */
    function initEmptyState() {
        const gallery = $("#gallery");
        const empty = $("#gallery-empty");
        const countEl = $("#photo-count");
        if (!gallery) return;

        const shots = $$(".shot", gallery);
        if (countEl) countEl.textContent = String(shots.length);

        if (!shots.length) {
            gallery.style.display = "none";
            if (empty) empty.classList.add("is-visible");
        }
        return shots;
    }

    /* --------------------------------------------------------
       Lightbox
    -------------------------------------------------------- */
    function initLightbox() {
        const box = $("#lightbox");
        const gallery = $("#gallery");
        if (!box || !gallery) return;

        const shots = $$(".shot", gallery);
        if (!shots.length) return;

        const imgEl   = $("#lb-image", box);
        const placeEl = $("#lb-place", box);
        const yearEl  = $("#lb-year", box);
        const countEl = $("#lb-count", box);
        const prevBtn = $(".lb-prev", box);
        const nextBtn = $(".lb-next", box);
        const closeBtn = $(".lb-close", box);

        let index = 0;
        let lastFocused = null;

        function show(i) {
            index = (i + shots.length) % shots.length;
            const shot = shots[index];
            const img = $("img", shot);

            imgEl.src = shot.dataset.full || (img ? img.src : "");
            imgEl.alt = img ? img.alt : "";
            placeEl.textContent = shot.dataset.place || "";
            yearEl.textContent = shot.dataset.year || "";
            countEl.textContent = `${index + 1} / ${shots.length}`;
        }

        function open(i) {
            lastFocused = document.activeElement;
            show(i);
            box.classList.add("is-open");
            box.setAttribute("aria-hidden", "false");
            document.body.classList.add("is-locked");
            closeBtn.focus();
        }

        function close() {
            box.classList.remove("is-open");
            box.setAttribute("aria-hidden", "true");
            document.body.classList.remove("is-locked");
            if (lastFocused && lastFocused.focus) lastFocused.focus();
        }

        shots.forEach((shot, i) => {
            shot.setAttribute("tabindex", "0");
            shot.setAttribute("role", "button");
            shot.addEventListener("click", () => open(i));
            shot.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); }
            });
        });

        prevBtn.addEventListener("click", (e) => { e.stopPropagation(); show(index - 1); });
        nextBtn.addEventListener("click", (e) => { e.stopPropagation(); show(index + 1); });
        closeBtn.addEventListener("click", close);
        box.addEventListener("click", (e) => {
            if (e.target === box || e.target.classList.contains("lightbox-stage")) close();
        });

        document.addEventListener("keydown", (e) => {
            if (!box.classList.contains("is-open")) return;
            if (e.key === "Escape") close();
            else if (e.key === "ArrowLeft") show(index - 1);
            else if (e.key === "ArrowRight") show(index + 1);
            else if (e.key === "Tab") {
                // Trap focus on the three controls.
                const focusable = [closeBtn, prevBtn, nextBtn];
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        });

        // Swipe
        let startX = null;
        box.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
        box.addEventListener("touchend", (e) => {
            if (startX === null) return;
            const dx = e.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 55) show(index + (dx < 0 ? 1 : -1));
            startX = null;
        }, { passive: true });
    }

    /* --------------------------------------------------------
       Misc
    -------------------------------------------------------- */
    function initMisc() {
        const year = $("#year");
        if (year) year.textContent = String(new Date().getFullYear());

        if (!fine) return;
        $$("[data-magnetic]").forEach((el) => {
            let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
            function loop() {
                cx = lerp(cx, tx, 0.18); cy = lerp(cy, ty, 0.18);
                el.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
                if (Math.abs(cx - tx) < 0.05 && Math.abs(cy - ty) < 0.05 && !tx && !ty) {
                    el.style.transform = ""; raf = null; return;
                }
                raf = requestAnimationFrame(loop);
            }
            const start = () => { if (!raf) raf = requestAnimationFrame(loop); };
            el.addEventListener("pointermove", (e) => {
                const b = el.getBoundingClientRect();
                tx = (e.clientX - (b.left + b.width / 2)) * 0.3;
                ty = (e.clientY - (b.top + b.height / 2)) * 0.3;
                start();
            });
            el.addEventListener("pointerleave", () => { tx = 0; ty = 0; start(); });
        });
    }

    function boot() {
        initAurora();
        initCursor();
        initScrollUI();
        initRegionStrip();
        initEmptyState();
        initReveal();
        initLightbox();
        initMisc();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
