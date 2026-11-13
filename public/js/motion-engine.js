/**
 * ==============================================================================
 * PREMIUM MOTION ENGINE - LENIS + GSAP + SCROLLTRIGGER + ANIME.JS
 * Ultra-Smooth 60 FPS Transitions & Micro-Interactions
 * Strictly Preserves All Existing UI Layouts, Typography, Components & Features
 * ==============================================================================
 */

(function () {
    'use strict';

    // Respect reduced motion accessibility
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ─────────────────────────────────────────────────────────────────────────
    // 1. LENIS SMOOTH SCROLL & GSAP SCROLLTRIGGER SYNCHRONIZATION
    // ─────────────────────────────────────────────────────────────────────────
    let lenis = null;

    function initSmoothScroll() {
        if (prefersReducedMotion || typeof window.Lenis === 'undefined') {
            return;
        }

        try {
            lenis = new Lenis({
                duration: 1.15,
                easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // smooth easeOutExpo
                orientation: 'vertical',
                gestureOrientation: 'vertical',
                smoothWheel: true,
                wheelMultiplier: 0.92,
                touchMultiplier: 1.4,
                infinite: false
            });

            window.lenis = lenis;

            // Synchronize Lenis with GSAP ScrollTrigger
            if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
                gsap.registerPlugin(ScrollTrigger);

                lenis.on('scroll', ScrollTrigger.update);

                gsap.ticker.add((time) => {
                    lenis.raf(time * 1000);
                });

                gsap.ticker.lagSmoothing(0);
            } else {
                function raf(time) {
                    lenis.raf(time);
                    requestAnimationFrame(raf);
                }
                requestAnimationFrame(raf);
            }

            // Mark internal scroll containers so Lenis does not trap wheel in modals
            protectScrollContainers();

        } catch (err) {
            console.warn('Lenis initialization notice:', err);
        }
    }

    function protectScrollContainers() {
        const selectors = [
            '.modal',
            '.modal-overlay',
            '.modal-content',
            '.admin-modal-box',
            '.tracking-modal-card',
            '#tracking-modal-overlay',
            '#complaints-list',
            '#officialTasksList',
            '#workerTasksList',
            '#duplicateModal',
            '.table-responsive',
            '.chat-messages'
        ];

        selectors.forEach((sel) => {
            document.querySelectorAll(sel).forEach((el) => {
                el.setAttribute('data-lenis-prevent', 'true');
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. SMOOTH ANCHOR LINK NAVIGATION
    // ─────────────────────────────────────────────────────────────────────────
    function initAnchorSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                if (targetId && targetId !== '#' && targetId.length > 1) {
                    const targetEl = document.querySelector(targetId);
                    if (targetEl) {
                        e.preventDefault();
                        if (lenis) {
                            lenis.scrollTo(targetEl, { offset: -60, duration: 1.2 });
                        } else {
                            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }
                }
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. GSAP SCROLLTRIGGER ENTRANCE & STAGGER ANIMATIONS
    // ─────────────────────────────────────────────────────────────────────────
    function initGsapScrollTrigger() {
        if (prefersReducedMotion || typeof gsap === 'undefined') {
            return;
        }

        // 3.1 Hero Entrance Timeline
        const heroSection = document.querySelector('.hero, .hero-section, .landing-hero, .page-header');
        if (heroSection) {
            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

            const badge = heroSection.querySelector('.badge, .status-pill, .hero-tag, .tagline');
            const heading = heroSection.querySelector('h1, .hero-title');
            const lead = heroSection.querySelector('p, .hero-lead, .lead');
            const ctas = heroSection.querySelectorAll('.btn, .cta-button, .hero-btns a, .hero-btns button');

            if (badge) tl.fromTo(badge, { opacity: 0, y: -12, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.6 });
            if (heading) tl.fromTo(heading, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.75 }, '-=0.35');
            if (lead) tl.fromTo(lead, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.4');
            if (ctas && ctas.length > 0) tl.fromTo(ctas, { opacity: 0, y: 14, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.08 }, '-=0.3');
        }

        // 3.2 Scroll-triggered Section Headings
        if (typeof ScrollTrigger !== 'undefined') {
            document.querySelectorAll('.section-header, .section-title, .dashboard-header, h2.title').forEach((header) => {
                gsap.fromTo(header, 
                    { opacity: 0, y: 20 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.65,
                        ease: 'power2.out',
                        scrollTrigger: {
                            trigger: header,
                            start: 'top 88%',
                            once: true
                        }
                    }
                );
            });

            // 3.3 Staggered Grid Batch Reveals
            const cardSelectors = [
                '.user-card',
                '.service-card',
                '.feature-card',
                '.stat-card',
                '.stat-mini-card',
                '.dashboard-card',
                '.problem-card',
                '.action-btn'
            ];

            cardSelectors.forEach((selector) => {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    ScrollTrigger.batch(selector, {
                        start: 'top 90%',
                        once: true,
                        onEnter: (batch) => {
                            gsap.fromTo(batch,
                                { opacity: 0, y: 24, scale: 0.97 },
                                {
                                    opacity: 1,
                                    y: 0,
                                    scale: 1,
                                    duration: 0.65,
                                    stagger: 0.07,
                                    ease: 'power3.out',
                                    overwrite: 'auto'
                                }
                            );
                        }
                    });
                }
            });

            // 3.4 Interactive Animated Number Counters
            document.querySelectorAll('.stat-number, .stat-card h3, [data-counter]').forEach((el) => {
                const rawText = el.textContent.trim();
                const num = parseInt(rawText.replace(/[^0-9]/g, ''), 10);
                if (!isNaN(num) && num > 0 && num < 1000000) {
                    ScrollTrigger.create({
                        trigger: el,
                        start: 'top 92%',
                        once: true,
                        onEnter: () => {
                            const counter = { val: 0 };
                            gsap.to(counter, {
                                val: num,
                                duration: 1.5,
                                ease: 'power2.out',
                                onUpdate: () => {
                                    el.textContent = Math.round(counter.val);
                                }
                            });
                        }
                    });
                }
            });

            // 3.5 Subtle Ambient Parallax on Background Orbs
            document.querySelectorAll('.aurora-orb, .floating-orb, .bg-ambient-layer').forEach((orb, i) => {
                gsap.to(orb, {
                    y: (i % 2 === 0 ? 35 : -35),
                    x: (i % 2 === 0 ? -25 : 25),
                    duration: 12 + i * 3,
                    repeat: -1,
                    yoyo: true,
                    ease: 'sine.inOut'
                });
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. ANIME.JS TEXT REVEALS & HIGHLIGHT MOTION
    // ─────────────────────────────────────────────────────────────────────────
    function initAnimeTextMotion() {
        if (prefersReducedMotion || typeof window.anime === 'undefined') {
            return;
        }

        // Apply delicate word entrance on main hero title
        const heroTitle = document.querySelector('.hero h1, .landing-hero h1, .page-header h1');
        if (heroTitle && !heroTitle.dataset.animated) {
            heroTitle.dataset.animated = 'true';
            const words = heroTitle.innerText.split(' ');
            heroTitle.innerHTML = words.map(w => `<span class="word-span" style="display:inline-block;">${w}&nbsp;</span>`).join('');

            anime({
                targets: heroTitle.querySelectorAll('.word-span'),
                translateY: [24, 0],
                opacity: [0, 1],
                easing: 'easeOutExpo',
                duration: 900,
                delay: anime.stagger(55)
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. DYNAMIC MUTATION OBSERVER (For Asynchronously Loaded Cards & Steppers)
    // ─────────────────────────────────────────────────────────────────────────
    function initDynamicListWatcher() {
        const dynamicContainers = [
            document.getElementById('all-complaints-container'),
            document.getElementById('complaints-list'),
            document.getElementById('officialTasksList'),
            document.getElementById('workerTasksList'),
            document.querySelector('.my-complaints-list')
        ];

        dynamicContainers.forEach((container) => {
            if (!container) return;

            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE && (node.classList.contains('complaint-item') || node.classList.contains('complaint-card') || node.classList.contains('task-card'))) {
                            if (typeof gsap !== 'undefined') {
                                gsap.fromTo(node,
                                    { opacity: 0, y: 20, scale: 0.98 },
                                    { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'power2.out' }
                                );
                            }

                            // Animate any progress steppers inside newly added card
                            const fill = node.querySelector('.stepper-track-fill');
                            if (fill) {
                                const targetWidth = fill.style.width;
                                if (targetWidth && targetWidth !== '0%') {
                                    fill.style.width = '0%';
                                    setTimeout(() => {
                                        fill.style.width = targetWidth;
                                    }, 100);
                                }
                            }
                        }
                    });
                });

                protectScrollContainers();
                if (typeof ScrollTrigger !== 'undefined') {
                    ScrollTrigger.refresh();
                }
            });

            observer.observe(container, { childList: true });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. MICRO-INTERACTIONS & BUTTON FEEDBACK
    // ─────────────────────────────────────────────────────────────────────────
    function initMicroInteractions() {
        document.querySelectorAll('button, .btn, .action-btn, .btn-primary').forEach((btn) => {
            btn.addEventListener('mouseenter', function () {
                if (typeof gsap !== 'undefined') {
                    gsap.to(this, { scale: 1.025, duration: 0.22, ease: 'back.out(2)' });
                }
            });

            btn.addEventListener('mouseleave', function () {
                if (typeof gsap !== 'undefined') {
                    gsap.to(this, { scale: 1, duration: 0.2, ease: 'power2.out' });
                }
            });

            btn.addEventListener('mousedown', function () {
                if (typeof gsap !== 'undefined') {
                    gsap.to(this, { scale: 0.96, duration: 0.12, ease: 'power1.out' });
                }
            });

            btn.addEventListener('mouseup', function () {
                if (typeof gsap !== 'undefined') {
                    gsap.to(this, { scale: 1.02, duration: 0.18, ease: 'back.out(2)' });
                }
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. INITIALIZE ENGINE ON DOM READY
    // ─────────────────────────────────────────────────────────────────────────
    function startMotionEngine() {
        initSmoothScroll();
        initAnchorSmoothScroll();
        initGsapScrollTrigger();
        initAnimeTextMotion();
        initDynamicListWatcher();
        initMicroInteractions();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startMotionEngine);
    } else {
        startMotionEngine();
    }

    // Expose helpers globally if needed
    window.MotionEngine = {
        refresh: function () {
            protectScrollContainers();
            if (typeof ScrollTrigger !== 'undefined') {
                ScrollTrigger.refresh();
            }
        },
        getLenis: function () {
            return lenis;
        }
    };

})();
