/* ============================================================
   Garrett Reihner — Portfolio
   Motion layer. No dependencies.

   Modules
     01  utils / rAF ticker
     02  aurora canvas background
     03  custom cursor
     04  scroll progress + navbar + scrollspy
     05  mobile menu
     06  split-text hero reveal
     07  scroll reveal observer
     08  role cycler
     09  stat counters
     10  magnetic elements
     11  3D tilt
     12  glass spotlight
     13  marquee
     14  project modal
     15  misc
   ============================================================ */

(function () {
    "use strict";

    /* --------------------------------------------------------
       01 — UTILS
    -------------------------------------------------------- */
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const $  = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    const lerp  = (a, b, t) => a + (b - a) * t;
    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

    /** Single shared rAF loop — every animation subscribes to it. */
    const ticker = (() => {
        const jobs = new Set();
        let running = false;
        let last = performance.now();

        function frame(now) {
            const dt = Math.min((now - last) / 16.667, 3); // in ~60fps units, capped
            last = now;
            jobs.forEach((job) => job(dt, now));
            if (jobs.size) {
                requestAnimationFrame(frame);
            } else {
                running = false;
            }
        }

        return {
            add(job) {
                jobs.add(job);
                if (!running) {
                    running = true;
                    last = performance.now();
                    requestAnimationFrame(frame);
                }
            },
            remove(job) { jobs.delete(job); }
        };
    })();

    /**
     * Entry gate. Anything that plays an entrance animation registers here so
     * it fires when the visitor actually enters the site, rather than running
     * (and finishing) behind the boot overlay.
     */
    const gate = { open: false, queue: [] };
    function onEnter(fn) {
        if (gate.open) fn();
        else gate.queue.push(fn);
    }
    function openGate() {
        if (gate.open) return;
        gate.open = true;
        gate.queue.forEach((fn) => fn());
        gate.queue.length = 0;
    }

    /** Pointer position, shared by cursor / parallax / canvas. */
    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };
    window.addEventListener("pointermove", (e) => {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        pointer.active = true;
    }, { passive: true });

    /* --------------------------------------------------------
       02 — AURORA CANVAS BACKGROUND
       Rendered at a fraction of viewport size and stretched by
       CSS: cheap to draw, and the upscale gives free blur.
    -------------------------------------------------------- */
    function initAurora() {
        const canvas = $("#bg-canvas");
        if (!canvas || reduced) return;

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        const SCALE = 0.14;           // render resolution multiplier
        let w = 0, h = 0;

        const blobs = [
            { hue: "94, 234, 212",  r: 0.62, x: 0.18, y: 0.20, sx: 0.00021, sy: 0.00017, px: 0, py: 0, a: 0.34 },
            { hue: "129, 140, 248", r: 0.70, x: 0.82, y: 0.32, sx: -0.00016, sy: 0.00023, px: 1.7, py: 0.4, a: 0.30 },
            { hue: "192, 132, 252", r: 0.55, x: 0.55, y: 0.78, sx: 0.00019, sy: -0.00014, px: 3.1, py: 2.2, a: 0.22 },
            { hue: "56, 189, 248",  r: 0.48, x: 0.30, y: 0.92, sx: -0.00022, sy: -0.00019, px: 4.6, py: 5.0, a: 0.20 }
        ];

        function resize() {
            w = canvas.width  = Math.max(1, Math.round(window.innerWidth  * SCALE));
            h = canvas.height = Math.max(1, Math.round(window.innerHeight * SCALE));
        }
        resize();
        window.addEventListener("resize", resize, { passive: true });

        let mx = 0.5, my = 0.5;   // smoothed pointer, 0..1
        let t = 0;

        ticker.add((dt, now) => {
            t = now;

            const tx = pointer.active ? pointer.x / window.innerWidth  : 0.5;
            const ty = pointer.active ? pointer.y / window.innerHeight : 0.5;
            mx = lerp(mx, tx, 0.03 * dt);
            my = lerp(my, ty, 0.03 * dt);

            ctx.fillStyle = "#08090c";
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = "lighter";

            const diag = Math.hypot(w, h);

            for (const b of blobs) {
                // Lissajous drift + gentle pointer parallax
                const cx = (b.x + Math.sin(t * b.sx + b.px) * 0.14 + (mx - 0.5) * 0.07) * w;
                const cy = (b.y + Math.cos(t * b.sy + b.py) * 0.14 + (my - 0.5) * 0.07) * h;
                const rad = b.r * diag * 0.5;

                const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
                g.addColorStop(0,    `rgba(${b.hue}, ${b.a})`);
                g.addColorStop(0.45, `rgba(${b.hue}, ${b.a * 0.32})`);
                g.addColorStop(1,    `rgba(${b.hue}, 0)`);
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, w, h);
            }

            ctx.globalCompositeOperation = "source-over";
        });
    }

    /* --------------------------------------------------------
       03 — CUSTOM CURSOR
    -------------------------------------------------------- */
    function initCursor() {
        const dot  = $(".cursor-dot");
        const ring = $(".cursor-ring");
        if (!dot || !ring || !fine || reduced) return;

        let dx = pointer.x, dy = pointer.y;
        let rx = pointer.x, ry = pointer.y;

        ticker.add((dt) => {
            dx = lerp(dx, pointer.x, clamp(0.42 * dt, 0, 1));
            dy = lerp(dy, pointer.y, clamp(0.42 * dt, 0, 1));
            rx = lerp(rx, pointer.x, clamp(0.16 * dt, 0, 1));
            ry = lerp(ry, pointer.y, clamp(0.16 * dt, 0, 1));

            dot.style.transform  = `translate3d(${dx}px, ${dy}px, 0)`;
            ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
        });

        window.addEventListener("pointermove", () => {
            document.body.classList.add("cursor-ready");
        }, { once: true, passive: true });

        const HOVERABLE = "a, button, [role='button'], [data-project], input, textarea, select";
        document.addEventListener("pointerover", (e) => {
            if (e.target.closest(HOVERABLE)) document.body.classList.add("cursor-hover");
        });
        document.addEventListener("pointerout", (e) => {
            if (e.target.closest(HOVERABLE)) document.body.classList.remove("cursor-hover");
        });

        document.addEventListener("mouseleave", () => document.body.classList.remove("cursor-ready"));
        document.addEventListener("mouseenter", () => document.body.classList.add("cursor-ready"));
    }

    /* --------------------------------------------------------
       04 — SCROLL PROGRESS, NAVBAR STATE, SCROLLSPY
    -------------------------------------------------------- */
    function initScrollUI() {
        const bar     = $(".scroll-progress");
        const navbar  = $("#navbar");
        const navWrap = $("#nav-center");
        const indicator = navWrap ? $(".nav-indicator", navWrap) : null;
        const links   = $$(".nav-link");
        const sections = links
            .map((l) => document.getElementById(l.getAttribute("href").slice(1)))
            .filter(Boolean);

        let activeLink = null;

        function moveIndicator(link) {
            if (!indicator || !navWrap || !link) return;
            const wrapBox = navWrap.getBoundingClientRect();
            const box = link.getBoundingClientRect();
            indicator.style.width = `${box.width}px`;
            indicator.style.transform = `translateX(${box.left - wrapBox.left}px)`;
            indicator.style.opacity = "1";
        }

        function setActive(link) {
            if (link === activeLink) return;
            activeLink = link;
            links.forEach((l) => l.classList.toggle("is-active", l === link));
            if (link) moveIndicator(link);
            else if (indicator) indicator.style.opacity = "0";
        }

        let ticking = false;
        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const y = window.scrollY;
                const max = document.documentElement.scrollHeight - window.innerHeight;

                if (bar) bar.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
                if (navbar) navbar.classList.toggle("is-scrolled", y > 24);

                // Scrollspy: the section whose top is closest above the 40% line.
                const line = window.innerHeight * 0.4;
                let current = null;
                for (const sec of sections) {
                    const box = sec.getBoundingClientRect();
                    if (box.top <= line && box.bottom >= line) { current = sec; break; }
                }
                setActive(current ? links.find((l) => l.getAttribute("href") === `#${current.id}`) : null);

                ticking = false;
            });
        }

        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", () => {
            if (activeLink) moveIndicator(activeLink);
            onScroll();
        }, { passive: true });

        // Hover preview of the pill
        links.forEach((link) => {
            link.addEventListener("pointerenter", () => moveIndicator(link));
        });
        if (navWrap) {
            navWrap.addEventListener("pointerleave", () => {
                if (activeLink) moveIndicator(activeLink);
                else if (indicator) indicator.style.opacity = "0";
            });
        }

        onScroll();
    }

    /* --------------------------------------------------------
       05 — MOBILE MENU
    -------------------------------------------------------- */
    function initMenu() {
        const toggle = $("#nav-toggle");
        const menu   = $("#mobile-menu");
        if (!toggle || !menu) return;

        function setOpen(open) {
            document.body.classList.toggle("menu-open", open);
            document.body.classList.toggle("is-locked", open);
            toggle.setAttribute("aria-expanded", String(open));
            toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        }

        toggle.addEventListener("click", () => {
            setOpen(!document.body.classList.contains("menu-open"));
        });

        $$("a", menu).forEach((a) => a.addEventListener("click", () => setOpen(false)));

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && document.body.classList.contains("menu-open")) setOpen(false);
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 900 && document.body.classList.contains("menu-open")) setOpen(false);
        }, { passive: true });
    }

    /* --------------------------------------------------------
       06 — SPLIT TEXT
       Wraps every word in a mask so it can slide up from behind
       its own line box. Preserves inline markup (e.g. <em>).
    -------------------------------------------------------- */
    function splitWords(root) {
        let index = 0;

        function walk(node) {
            const children = Array.from(node.childNodes);
            for (const child of children) {
                if (child.nodeType === Node.TEXT_NODE) {
                    const text = child.textContent;
                    if (!text.trim()) continue;

                    const frag = document.createDocumentFragment();
                    // Keep whitespace so words don't run together.
                    text.split(/(\s+)/).forEach((token) => {
                        if (!token) return;
                        if (/^\s+$/.test(token)) {
                            frag.appendChild(document.createTextNode(" "));
                            return;
                        }
                        const mask = document.createElement("span");
                        mask.className = "word-mask";
                        const word = document.createElement("span");
                        word.className = "word";
                        word.style.setProperty("--wi", index++);
                        word.textContent = token;
                        mask.appendChild(word);
                        frag.appendChild(mask);
                    });
                    node.replaceChild(frag, child);
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                    walk(child);
                }
            }
        }

        walk(root);
        return index;
    }

    function initSplitText() {
        $$("[data-split]").forEach((el) => {
            if (reduced) { el.classList.add("is-revealed"); return; }
            splitWords(el);
            // Next frame, so the initial transform is painted first.
            onEnter(() => requestAnimationFrame(() => {
                requestAnimationFrame(() => el.classList.add("is-revealed"));
            }));
        });
    }

    /* --------------------------------------------------------
       06b — CONTINUOUS GRADIENT ACROSS SPLIT WORDS
       Each word is its own paint layer, so background-clip:text
       restarts the ramp per word. Sizing every word's background
       to the headline box and offsetting it by the word's position
       stitches them back into one gradient.
    -------------------------------------------------------- */
    function initGradientText() {
        const roots = $$(".hero-title");
        if (!roots.length) return;

        function sync() {
            roots.forEach((root) => {
                const box = root.getBoundingClientRect();
                if (!box.width) return;

                $$(".grad .word", root).forEach((word) => {
                    // Measure the mask, not the word — the word is mid-transform
                    // during the intro animation.
                    const mask = word.parentElement;
                    const wb = (mask || word).getBoundingClientRect();
                    word.style.backgroundSize = `${box.width}px ${box.height}px`;
                    word.style.backgroundPosition = `${box.left - wb.left}px ${box.top - wb.top}px`;
                });
            });
        }

        sync();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync);

        let t = null;
        window.addEventListener("resize", () => {
            clearTimeout(t);
            t = setTimeout(sync, 120);
        }, { passive: true });
    }

    /* --------------------------------------------------------
       07 — SCROLL REVEAL
    -------------------------------------------------------- */
    function initReveal() {
        const items = $$("[data-reveal]");
        if (!items.length) return;

        if (reduced || !("IntersectionObserver" in window)) {
            items.forEach((el) => el.classList.add("is-in"));
            return;
        }

        onEnter(() => {
            const io = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("is-in");
                    io.unobserve(entry.target);
                });
            }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });

            items.forEach((el) => io.observe(el));
        });
    }

    /* --------------------------------------------------------
       08 — ROLE CYCLER (type / erase)
    -------------------------------------------------------- */
    function initRoles() {
        const el = $("#role-text");
        if (!el) return;

        const roles = (el.dataset.roles || "").split("|").filter(Boolean);
        if (!roles.length) return;

        if (reduced) { el.textContent = roles[0]; return; }

        let i = 0, chars = 0, erasing = false;

        function step() {
            const word = roles[i];
            chars += erasing ? -1 : 1;
            el.textContent = word.slice(0, chars);

            let delay = erasing ? 34 : 62;
            if (!erasing && chars === word.length) { erasing = true; delay = 1600; }
            else if (erasing && chars === 0) { erasing = false; i = (i + 1) % roles.length; delay = 320; }

            setTimeout(step, delay);
        }

        onEnter(() => setTimeout(step, 900));
    }

    /* --------------------------------------------------------
       09 — STAT COUNTERS
    -------------------------------------------------------- */
    function initCounters() {
        const stats = $$("[data-count]");
        if (!stats.length) return;

        // A stat can count live DOM nodes instead of carrying a hardcoded number.
        stats.forEach((el) => {
            const sel = el.dataset.countSelector;
            if (sel) el.dataset.count = String(document.querySelectorAll(sel).length);
        });

        function render(el, value) {
            const suffix = el.dataset.suffix || "";
            el.innerHTML = suffix
                ? `${value}<span class="plus">${suffix}</span>`
                : String(value);
        }

        if (reduced || !("IntersectionObserver" in window)) {
            stats.forEach((el) => render(el, Number(el.dataset.count) || 0));
            return;
        }

        onEnter(() => {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                const el = entry.target;
                io.unobserve(el);

                const target = Number(el.dataset.count) || 0;
                const start = performance.now();
                const dur = 1400;

                function run(now) {
                    const p = clamp((now - start) / dur, 0, 1);
                    const eased = 1 - Math.pow(1 - p, 4);   // easeOutQuart
                    render(el, Math.round(target * eased));
                    if (p < 1) requestAnimationFrame(run);
                }
                requestAnimationFrame(run);
            });
        }, { threshold: 0.6 });

        stats.forEach((el) => io.observe(el));
        });
    }

    /* --------------------------------------------------------
       10 — MAGNETIC ELEMENTS
    -------------------------------------------------------- */
    function initMagnetic() {
        if (!fine || reduced) return;

        $$("[data-magnetic]").forEach((el) => {
            const strength = Number(el.dataset.magnetic) || 0.32;
            let tx = 0, ty = 0, cx = 0, cy = 0;
            let job = null;

            function loop(dt) {
                cx = lerp(cx, tx, clamp(0.18 * dt, 0, 1));
                cy = lerp(cy, ty, clamp(0.18 * dt, 0, 1));
                el.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;

                if (Math.abs(cx - tx) < 0.05 && Math.abs(cy - ty) < 0.05 && tx === 0 && ty === 0) {
                    el.style.transform = "";
                    ticker.remove(job);
                    job = null;
                }
            }

            function start() {
                if (!job) { job = loop; ticker.add(job); }
            }

            el.addEventListener("pointermove", (e) => {
                const box = el.getBoundingClientRect();
                tx = (e.clientX - (box.left + box.width / 2)) * strength;
                ty = (e.clientY - (box.top + box.height / 2)) * strength;
                start();
            });

            el.addEventListener("pointerleave", () => {
                tx = 0; ty = 0;
                start();
            });
        });
    }

    /* --------------------------------------------------------
       11 — 3D TILT
    -------------------------------------------------------- */
    function initTilt() {
        if (!fine || reduced) return;

        $$("[data-tilt]").forEach((el) => {
            const MAX = Number(el.dataset.tilt) || 6;   // degrees
            let trx = 0, try_ = 0, crx = 0, cry = 0, hovering = false;
            let job = null;

            function loop(dt) {
                crx = lerp(crx, trx, clamp(0.12 * dt, 0, 1));
                cry = lerp(cry, try_, clamp(0.12 * dt, 0, 1));
                el.style.transform =
                    `perspective(1100px) rotateX(${crx.toFixed(3)}deg) rotateY(${cry.toFixed(3)}deg)` +
                    (hovering ? " translateZ(6px)" : "");

                if (!hovering && Math.abs(crx) < 0.02 && Math.abs(cry) < 0.02) {
                    el.style.transform = "";
                    ticker.remove(job);
                    job = null;
                }
            }

            function start() { if (!job) { job = loop; ticker.add(job); } }

            el.addEventListener("pointerenter", () => { hovering = true; start(); });

            el.addEventListener("pointermove", (e) => {
                const box = el.getBoundingClientRect();
                const px = (e.clientX - box.left) / box.width;
                const py = (e.clientY - box.top) / box.height;
                trx = (0.5 - py) * MAX * 2;
                try_ = (px - 0.5) * MAX * 2;
                start();
            });

            el.addEventListener("pointerleave", () => {
                hovering = false;
                trx = 0; try_ = 0;
                start();
            });
        });
    }

    /* --------------------------------------------------------
       12 — GLASS SPOTLIGHT
       Feeds --mx / --my to the .glass::before highlight.
    -------------------------------------------------------- */
    function initSpotlight() {
        if (!fine) return;

        $$("[data-spotlight]").forEach((el) => {
            el.addEventListener("pointermove", (e) => {
                const box = el.getBoundingClientRect();
                el.style.setProperty("--mx", `${((e.clientX - box.left) / box.width) * 100}%`);
                el.style.setProperty("--my", `${((e.clientY - box.top) / box.height) * 100}%`);
            }, { passive: true });
        });
    }

    /* --------------------------------------------------------
       13 — MARQUEE
       Duplicated track, transform-driven, nudged by scroll speed.
    -------------------------------------------------------- */
    function initMarquee() {
        const wrap = $("[data-marquee]");
        if (!wrap || reduced) return;

        const track = $(".marquee-track", wrap);
        if (!track) return;

        const clone = track.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        wrap.appendChild(clone);

        const tracks = [track, clone];
        let width = track.scrollWidth;
        let offset = 0;
        let base = 0.55;           // px per frame
        let boost = 0;
        let lastScroll = window.scrollY;

        new ResizeObserver(() => { width = track.scrollWidth; }).observe(track);

        window.addEventListener("scroll", () => {
            const delta = window.scrollY - lastScroll;
            lastScroll = window.scrollY;
            boost = clamp(boost + delta * 0.08, -14, 14);
        }, { passive: true });

        let paused = false;
        wrap.addEventListener("pointerenter", () => { paused = true; });
        wrap.addEventListener("pointerleave", () => { paused = false; });

        ticker.add((dt) => {
            boost = lerp(boost, 0, clamp(0.06 * dt, 0, 1));
            if (!paused || Math.abs(boost) > 0.1) {
                offset -= (paused ? 0 : base + Math.abs(boost) * 0.35) * dt + boost * 0.04 * dt;
            }
            if (width > 0) {
                if (offset <= -width) offset += width;
                if (offset > 0) offset -= width;
            }
            const x = `translate3d(${offset.toFixed(2)}px, 0, 0)`;
            tracks[0].style.transform = x;
            tracks[1].style.transform = x;
        });
    }

    /* --------------------------------------------------------
       14 — PROJECT MODAL
    -------------------------------------------------------- */
    function initModal() {
        const modal = $("#modal");
        if (!modal) return;

        const panel   = $(".modal-panel", modal);
        const titleEl = $("#modal-title", modal);
        const descEl  = $("#modal-desc", modal);
        const specEl  = $("#modal-spec", modal);
        const techEl  = $("#modal-techs", modal);
        const statusEl = $("#modal-status", modal);
        const repoEl  = $("#modal-repo", modal);
        const liveEl  = $("#modal-live", modal);
        const closeEl = $(".modal-close", modal);

        const STATUS_LABEL = {
            live:     "Live",           // hosted and reachable
            shipped:  "Shipped",        // downloadable release exists
            complete: "Complete",       // finished, not distributed
            building: "In progress",
            planned:  "Planned"         // repo exists, work not started
        };
        // Rendered in this order; rows with no data on the card are skipped.
        // Deliberately no "stack" row — the tech chip list below the description
        // covers the same ground in more detail.
        const SPEC_ROWS = [
            ["role",  "Role"],
            ["type",  "Type"],
            ["focus", "Focus"]
        ];
        let lastFocused = null;

        function open(card) {
            const d = card.dataset;

            titleEl.textContent = d.title || "";
            descEl.textContent  = d.desc || "";

            const status = d.status || "";
            statusEl.className = `status-chip ${status}`;
            statusEl.textContent = STATUS_LABEL[status] || "";
            statusEl.style.display = status ? "inline-flex" : "none";

            specEl.innerHTML = "";
            SPEC_ROWS.forEach(([key, label]) => {
                if (!d[key]) return;
                const row = document.createElement("div");
                const dt = document.createElement("dt");
                dt.textContent = label;
                const dd = document.createElement("dd");
                dd.textContent = d[key];
                row.append(dt, dd);
                specEl.appendChild(row);
            });

            techEl.innerHTML = "";
            (d.techs || "").split(",").map((t) => t.trim()).filter(Boolean).forEach((t, i) => {
                const chip = document.createElement("span");
                chip.className = "tech";
                chip.style.setProperty("--ti", i);
                chip.textContent = t;
                techEl.appendChild(chip);
            });

            if (d.repo) {
                repoEl.href = d.repo;
                repoEl.style.display = "";
            } else {
                repoEl.style.display = "none";
            }

            // Optional secondary link out to a deployed instance.
            if (d.live) {
                liveEl.href = d.live;
                liveEl.style.display = "";
            } else {
                liveEl.style.display = "none";
            }

            lastFocused = document.activeElement;
            modal.classList.add("is-open");
            modal.setAttribute("aria-hidden", "false");
            lockScroll(true);
            requestAnimationFrame(() => closeEl.focus());
        }

        function close() {
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
            lockScroll(false);
            if (lastFocused && lastFocused.focus) lastFocused.focus();
        }

        function lockScroll(on) {
            if (on) {
                const gap = window.innerWidth - document.documentElement.clientWidth;
                document.body.style.paddingRight = gap > 0 ? `${gap}px` : "";
                document.body.classList.add("is-locked");
            } else {
                document.body.style.paddingRight = "";
                document.body.classList.remove("is-locked");
            }
        }

        // Triggers
        $$("[data-project]").forEach((card) => {
            card.addEventListener("click", () => open(card));
            if (card.tagName !== "BUTTON") {
                card.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        open(card);
                    }
                });
            }
        });

        $$("[data-close]", modal).forEach((el) => el.addEventListener("click", close));

        document.addEventListener("keydown", (e) => {
            if (!modal.classList.contains("is-open")) return;

            if (e.key === "Escape") { close(); return; }

            // Focus trap
            if (e.key === "Tab") {
                const focusable = $$(
                    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
                    panel
                ).filter((el) => el.offsetParent !== null);
                if (!focusable.length) return;

                const first = focusable[0];
                const last = focusable[focusable.length - 1];

                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault(); last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault(); first.focus();
                }
            }
        });

    }

    /* --------------------------------------------------------
       15 — BOOT INTRO
       A mesh assembles itself on canvas while a boot log types
       out, then hands the site over on "Start Site". Only runs
       when the head script put .intro on <html>.
    -------------------------------------------------------- */
    function initPreloader() {
        const root = $("#preloader");

        // No overlay in the markup, or reduced motion — hand over immediately.
        if (!root || !document.documentElement.classList.contains("intro")) {
            openGate();
            return;
        }

        const logEl    = $("#pre-log");
        const barEl    = $("#pre-bar-fill");
        const pctEl    = $("#pre-pct");
        const statusEl = $("#pre-status");
        const enterEl  = $("#pre-enter");
        const flashEl  = $("#pre-flash");
        const canvas   = $("#preloader-canvas");

        // Counts come from the live DOM so the log can't lie.
        const projectCount = document.querySelectorAll("[data-project]").length;
        const regionCount  = document.querySelectorAll(".travel-card").length;

        const LINES = [
            ["0.000", "gr-portfolio // cold boot"],
            ["0.021", "mounting design tokens"],
            ["0.068", "compiling glass surfaces"],
            ["0.114", `linking projects — ${projectCount} records`],
            ["0.190", "spinning up motion layer"],
            ["0.246", "warming aurora canvas"],
            ["0.301", `mapping travel regions — ${regionCount}`],
            ["0.354", "all systems nominal"]
        ];

        let done = false;      // boot finished, button live
        let left = false;      // handed off

        /* ---- canvas: a mesh that assembles as progress climbs ---- */
        const mesh = (() => {
            const ctx = canvas ? canvas.getContext("2d") : null;
            if (!ctx) return { setProgress() {}, stop() {}, burst() {} };

            let w = 0, h = 0, dpr = 1;
            const nodes = [];
            const edges = [];
            let progress = 0;
            let burstT = -1;

            function build() {
                nodes.length = 0;
                edges.length = 0;
                const count = window.innerWidth < 700 ? 26 : 42;
                const radius = Math.min(w, h) * 0.42;

                for (let i = 0; i < count; i++) {
                    // Golden-angle spiral keeps the spread even without clumping.
                    const a = i * 2.399963;
                    const d = radius * Math.sqrt(i / count);
                    nodes.push({
                        bx: w / 2 + Math.cos(a) * d * 1.5,
                        by: h / 2 + Math.sin(a) * d,
                        x: 0, y: 0,
                        ph: Math.random() * Math.PI * 2,
                        sp: 0.4 + Math.random() * 0.6,
                        vx: 0, vy: 0
                    });
                }

                // Connect each node to its two nearest neighbours.
                for (let i = 0; i < nodes.length; i++) {
                    const dists = [];
                    for (let k = 0; k < nodes.length; k++) {
                        if (k === i) continue;
                        dists.push([k, Math.hypot(nodes[i].bx - nodes[k].bx, nodes[i].by - nodes[k].by)]);
                    }
                    dists.sort((a, b) => a[1] - b[1]);
                    for (let n = 0; n < 2; n++) {
                        const j = dists[n][0];
                        if (!edges.some((e) => (e.a === j && e.b === i) || (e.a === i && e.b === j))) {
                            edges.push({ a: i, b: j });
                        }
                    }
                }
            }

            function resize() {
                dpr = Math.min(window.devicePixelRatio || 1, 2);
                w = window.innerWidth;
                h = window.innerHeight;
                canvas.width = Math.round(w * dpr);
                canvas.height = Math.round(h * dpr);
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                build();
            }
            resize();
            window.addEventListener("resize", resize, { passive: true });

            function job(dt, now) {
                ctx.clearRect(0, 0, w, h);

                const shown = progress * nodes.length;
                const px = (pointer.x / w - 0.5) * 16;
                const py = (pointer.y / h - 0.5) * 16;

                for (let i = 0; i < nodes.length; i++) {
                    const n = nodes[i];
                    n.vx *= 0.94; n.vy *= 0.94;
                    n.x = n.bx + Math.sin(now * 0.0004 * n.sp + n.ph) * 9 + px + n.vx;
                    n.y = n.by + Math.cos(now * 0.0005 * n.sp + n.ph) * 9 + py + n.vy;
                    n.a = clamp(shown - i, 0, 1);
                }

                // Edges first, so nodes sit on top.
                ctx.lineWidth = 1;
                for (const e of edges) {
                    const A = nodes[e.a], B = nodes[e.b];
                    const a = Math.min(A.a, B.a);
                    if (a <= 0.01) continue;
                    ctx.strokeStyle = `rgba(94, 234, 212, ${0.16 * a})`;
                    ctx.beginPath();
                    ctx.moveTo(A.x, A.y);
                    // Grow the edge outward from A as it fades in.
                    ctx.lineTo(A.x + (B.x - A.x) * a, A.y + (B.y - A.y) * a);
                    ctx.stroke();
                }

                for (const n of nodes) {
                    if (n.a <= 0.01) continue;
                    ctx.fillStyle = `rgba(129, 140, 248, ${0.5 * n.a})`;
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, 1.7, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = `rgba(94, 234, 212, ${0.1 * n.a})`;
                    ctx.beginPath();
                    ctx.arc(n.x, n.y, 6, 0, Math.PI * 2);
                    ctx.fill();
                }

                // One expanding ring the moment the boot completes. The rAF
                // timestamp can predate the performance.now() captured in
                // burst(), so clamp before it reaches arc() as a negative radius.
                if (burstT >= 0) {
                    const raw = (now - burstT) / 900;
                    if (raw >= 1) {
                        burstT = -1;
                    } else {
                        const t = Math.max(raw, 0);
                        ctx.strokeStyle = `rgba(94, 234, 212, ${0.5 * (1 - t)})`;
                        ctx.lineWidth = Math.max(0.1, 2 * (1 - t));
                        ctx.beginPath();
                        ctx.arc(w / 2, h / 2, t * Math.max(w, h) * 0.6, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
            }
            ticker.add(job);

            return {
                setProgress(p) { progress = p; },
                burst() { burstT = performance.now(); },
                scatter() {
                    for (const n of nodes) {
                        const ang = Math.atan2(n.y - h / 2, n.x - w / 2);
                        n.vx = Math.cos(ang) * 90;
                        n.vy = Math.sin(ang) * 90;
                    }
                },
                stop() {
                    ticker.remove(job);
                    window.removeEventListener("resize", resize);
                }
            };
        })();

        /* ---- boot log ---- */
        function setProgress(p) {
            barEl.style.width = `${Math.round(p * 100)}%`;
            pctEl.textContent = `${Math.round(p * 100)}%`;
            mesh.setProgress(p);
        }

        let lineIndex = 0;
        let timer = null;

        function addLine(i) {
            const [ts, msg] = LINES[i];
            const row = document.createElement("div");
            row.className = "pre-line";
            row.style.setProperty("--li", i);
            row.innerHTML =
                `<span class="pre-ts">[ ${ts} ]</span>` +
                `<span class="pre-msg"></span>` +
                `<span class="pre-dots"></span>` +
                `<span class="pre-ok">ok</span>`;
            logEl.appendChild(row);

            const msgEl = $(".pre-msg", row);
            let c = 0;
            (function type() {
                if (left) return;
                msgEl.textContent = msg.slice(0, ++c);
                if (c < msg.length) {
                    timer = setTimeout(type, 9);
                } else {
                    row.classList.add("is-done");
                    setProgress((i + 1) / LINES.length);
                    if (i + 1 < LINES.length) {
                        lineIndex = i + 1;
                        timer = setTimeout(() => addLine(i + 1), 70);
                    } else {
                        finish();
                    }
                }
            })();
        }

        function finish() {
            if (done) return;
            done = true;
            clearTimeout(timer);

            // Fill in anything that was skipped so the log reads complete.
            for (let i = logEl.children.length; i < LINES.length; i++) {
                const [ts, msg] = LINES[i];
                const row = document.createElement("div");
                row.className = "pre-line is-done";
                row.style.setProperty("--li", i);
                row.innerHTML =
                    `<span class="pre-ts">[ ${ts} ]</span>` +
                    `<span class="pre-msg">${msg}</span>` +
                    `<span class="pre-dots"></span>` +
                    `<span class="pre-ok">ok</span>`;
                logEl.appendChild(row);
            }

            setProgress(1);
            statusEl.textContent = "system ready";
            root.classList.add("is-ready");
            mesh.burst();
            enterEl.focus({ preventScroll: true });
        }

        /* ---- handoff ---- */
        function enter() {
            if (left) return;
            left = true;
            clearTimeout(timer);

            const box = enterEl.getBoundingClientRect();
            flashEl.style.transform = "";
            flashEl.style.left = `${box.left + box.width / 2}px`;
            flashEl.style.top = `${box.top + box.height / 2}px`;
            flashEl.classList.add("is-firing");

            mesh.scatter();
            root.classList.add("is-leaving");

            setTimeout(() => {
                mesh.stop();
                root.remove();
                flashEl.remove();
                document.documentElement.classList.remove("intro");
                openGate();
            }, 780);
        }

        enterEl.addEventListener("click", enter);

        document.addEventListener("keydown", function onKey(e) {
            if (left) return;
            if (done) {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enter(); }
            } else if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                finish();   // let people skip ahead
            }
            if (left) document.removeEventListener("keydown", onKey);
        });

        // Clicking the backdrop during boot also skips to ready.
        root.addEventListener("click", (e) => {
            if (!done && e.target !== enterEl) finish();
        });

        setProgress(0);
        addLine(0);

        // Safety net: never strand someone behind the overlay.
        setTimeout(finish, 9000);
    }

    /* --------------------------------------------------------
       15b — CHANGELOG SCROLLER
       The list is capped so it can't grow the page without limit.
       Its edges fade to transparent (a mask, not an opaque band)
       and the scrollbar is drawn here, because masking a scroll
       container makes Chrome drop the native one.
    -------------------------------------------------------- */
    function initChangelog() {
        const scroller = $("#changelog-scroll");
        const bar = $("#changelog-bar");
        if (!scroller || !bar) return;

        const thumb = $("span", bar);
        const FADE = 46;               // px of fade at a live edge
        let trackH = 0, thumbH = 0, maxScroll = 0, scrollable = false;

        function paint() {
            if (!scrollable) return;
            const p = maxScroll > 0 ? scroller.scrollTop / maxScroll : 0;
            thumb.style.transform = `translateY(${((trackH - thumbH) * p).toFixed(2)}px)`;
            // Only fade an edge that's actually hiding something.
            scroller.style.setProperty("--fade-top", scroller.scrollTop > 4 ? `${FADE}px` : "0px");
            scroller.style.setProperty("--fade-bottom", scroller.scrollTop < maxScroll - 4 ? `${FADE}px` : "0px");
        }

        function measure() {
            maxScroll = scroller.scrollHeight - scroller.clientHeight;
            scrollable = maxScroll > 2;
            bar.classList.toggle("is-active", scrollable);

            if (!scrollable) {
                scroller.style.setProperty("--fade-top", "0px");
                scroller.style.setProperty("--fade-bottom", "0px");
                return;
            }
            trackH = bar.clientHeight;
            thumbH = Math.max(32, Math.round(trackH * (scroller.clientHeight / scroller.scrollHeight)));
            thumb.style.height = `${thumbH}px`;
            paint();
        }

        let queued = false;
        scroller.addEventListener("scroll", () => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(() => { queued = false; paint(); });
        }, { passive: true });

        // Re-measure when the box or its contents change size.
        if ("ResizeObserver" in window) {
            const ro = new ResizeObserver(measure);
            ro.observe(scroller);
            const timeline = $(".timeline", scroller);
            if (timeline) ro.observe(timeline);
        }
        window.addEventListener("resize", measure, { passive: true });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

        /* ---- drag the thumb ---- */
        let dragging = false, startY = 0, startTop = 0;

        thumb.addEventListener("pointerdown", (e) => {
            dragging = true;
            startY = e.clientY;
            startTop = scroller.scrollTop;
            bar.classList.add("is-dragging");
            thumb.setPointerCapture(e.pointerId);
            e.preventDefault();
        });

        thumb.addEventListener("pointermove", (e) => {
            if (!dragging) return;
            const travel = Math.max(1, trackH - thumbH);
            scroller.scrollTop = startTop + (e.clientY - startY) * (maxScroll / travel);
        });

        function endDrag(e) {
            if (!dragging) return;
            dragging = false;
            bar.classList.remove("is-dragging");
            try { thumb.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
        }
        thumb.addEventListener("pointerup", endDrag);
        thumb.addEventListener("pointercancel", endDrag);

        /* ---- click the track to jump ---- */
        bar.addEventListener("pointerdown", (e) => {
            if (e.target === thumb || !scrollable) return;
            const r = bar.getBoundingClientRect();
            const p = clamp((e.clientY - r.top - thumbH / 2) / Math.max(1, trackH - thumbH), 0, 1);
            scroller.scrollTo({ top: p * maxScroll, behavior: reduced ? "auto" : "smooth" });
        });

        measure();
        requestAnimationFrame(measure);
    }

    /* --------------------------------------------------------
       15c — RAIN ON THE SURFACE
       Press the main-row "1" with nothing focused. The view is
       from under still water looking up: no falling drops, just
       the moment each one lands and the rings it leaves.
    -------------------------------------------------------- */
    function initRipples() {
        const canvas = $("#ripple-canvas");
        if (!canvas || reduced) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const LIFE = 1750;        // ms a ring takes to die
        const SHOWER = 8000;      // ms one press keeps it raining
        const MAX = 150;
        const TINTS = [
            [94, 234, 212],       // accent
            [129, 140, 248],      // accent-2
            [192, 132, 252],      // accent-3
            [56, 189, 248]
        ];

        let w = 0, h = 0, dpr = 1;
        const drops = [];
        let showerEnd = 0, showerStart = 0, nextDrop = 0;
        let job = null;

        function resize() {
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        resize();
        window.addEventListener("resize", resize, { passive: true });

        function spawn(now) {
            if (drops.length >= MAX) return;
            drops.push({
                x: Math.random() * w,
                y: Math.random() * h,
                born: now,
                max: 52 + Math.random() * 130,
                tint: TINTS[(Math.random() * TINTS.length) | 0],
                gain: 0.6 + Math.random() * 0.45
            });
        }

        /** One expanding ring: sharp at impact, thinning as it spreads. */
        function ring(d, p, scale, weight) {
            const r = d.max * scale * (1 - Math.pow(1 - p, 3));   // ease-out spread
            if (r <= 0.5) return;
            const fade = Math.pow(1 - p, 1.7) * d.gain * weight;
            if (fade <= 0.004) return;
            ctx.strokeStyle = `rgba(${d.tint[0]}, ${d.tint[1]}, ${d.tint[2]}, ${fade})`;
            // Wider than it looks: the canvas-wide blur spreads these out.
            ctx.lineWidth = Math.max(1, 3.6 * (1 - p) * weight);
            ctx.beginPath();
            ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        function frame(dt, now) {
            ctx.clearRect(0, 0, w, h);

            // A shower that builds, holds, then eases off.
            if (now < showerEnd) {
                const rampIn = clamp((now - showerStart) / 900, 0, 1);
                const rampOut = clamp((showerEnd - now) / 2200, 0, 1);
                const intensity = rampIn * rampOut;
                if (now >= nextDrop) {
                    spawn(now);
                    if (Math.random() < intensity * 0.7) spawn(now);
                    if (Math.random() < intensity * 0.3) spawn(now);
                    nextDrop = now + lerp(260, 38, intensity) * (0.6 + Math.random() * 0.8);
                }
            }

            ctx.globalCompositeOperation = "lighter";

            for (let i = drops.length - 1; i >= 0; i--) {
                const d = drops[i];
                const p = (now - d.born) / LIFE;
                if (p >= 1) { drops.splice(i, 1); continue; }

                // The flash where it breaks the surface.
                if (p < 0.12) {
                    const f = 1 - p / 0.12;
                    const rad = 4 + f * 12;
                    const g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, rad);
                    g.addColorStop(0, `rgba(${d.tint[0]}, ${d.tint[1]}, ${d.tint[2]}, ${0.5 * f * d.gain})`);
                    g.addColorStop(1, `rgba(${d.tint[0]}, ${d.tint[1]}, ${d.tint[2]}, 0)`);
                    ctx.fillStyle = g;
                    ctx.beginPath();
                    ctx.arc(d.x, d.y, rad, 0, Math.PI * 2);
                    ctx.fill();
                }

                ring(d, p, 1, 1);                                  // leading crest
                if (p > 0.10) ring(d, (p - 0.10) / 0.90, 0.72, 0.55);   // capillary trail
                if (p > 0.20) ring(d, (p - 0.20) / 0.80, 0.48, 0.28);
            }

            ctx.globalCompositeOperation = "source-over";

            // Nothing left to draw and nothing coming — stop the loop entirely.
            if (!drops.length && now >= showerEnd && job) {
                ctx.clearRect(0, 0, w, h);
                ticker.remove(job);
                job = null;
            }
        }

        function start() {
            const now = performance.now();
            showerStart = now;
            showerEnd = now + SHOWER;
            nextDrop = now;
            for (let i = 0; i < 3; i++) spawn(now + i * 40);
            if (!job) { job = frame; ticker.add(job); }
        }

        /** Only when the page itself has focus — not a link, field or dialog. */
        function armed() {
            if (!gate.open) return false;
            if (document.body.classList.contains("menu-open")) return false;
            const modal = $("#modal");
            if (modal && modal.classList.contains("is-open")) return false;

            const el = document.activeElement;
            if (!el || el === document.body || el === document.documentElement) return true;
            if (el.isContentEditable) return false;
            return !/^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(el.tagName);
        }

        document.addEventListener("keydown", (e) => {
            if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
            // Digit1 is the number-row key; Numpad1 reports its own code.
            const hit = e.code ? e.code === "Digit1" : e.key === "1";
            if (!hit || !armed()) return;
            start();
        });
    }

    /* --------------------------------------------------------
       16 — MISC
    -------------------------------------------------------- */
    function initMisc() {
        const year = $("#year");
        if (year) year.textContent = String(new Date().getFullYear());

        // Mark the newest changelog entry (top of the list).
        const first = $(".timeline .log-entry");
        if (first) first.classList.add("is-latest");
    }

    /* --------------------------------------------------------
       BOOT
    -------------------------------------------------------- */
    function boot() {
        initAurora();
        initCursor();
        initScrollUI();
        initMenu();
        initSplitText();
        initGradientText();
        initReveal();
        initRoles();
        initCounters();
        initMagnetic();
        initTilt();
        initSpotlight();
        initMarquee();
        initModal();
        initChangelog();
        initRipples();
        initMisc();
        // Last, so every onEnter() callback above is registered before the
        // gate can open.
        initPreloader();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
