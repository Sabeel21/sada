
document.addEventListener('DOMContentLoaded', () => {

    // --- Header Scroll & Direction Logic ---
    const headerWrapper = document.querySelector('.header-wrapper');
    const header = document.getElementById('main-header');

    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;

        // 1. Scrolled Class (Background change & Top bar hiding)
        if (currentScrollY > 50) {
            headerWrapper.classList.add('scrolled');
            header.classList.add('scrolled');
        } else {
            headerWrapper.classList.remove('scrolled');
            header.classList.remove('scrolled');
        }
    });

    // --- Mobile Menu Logic ---
    const mobileBtn = document.getElementById('mobile-menu-toggle');
    const closeBtn = document.getElementById('close-mobile-menu');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-link');

    const toggleMenu = () => {
        mobileMenu.classList.toggle('active');
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    };

    if (mobileBtn) mobileBtn.addEventListener('click', toggleMenu);
    if (closeBtn) closeBtn.addEventListener('click', toggleMenu);

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // --- Active Link Highlighting ---
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.desktop-menu a');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollY >= (sectionTop - 150)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href').includes(current)) {
                link.classList.add('active');
            }
        });
    });

    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        // Filter only those that ARE intersecting
        const intersectingEntries = entries.filter(e => e.isIntersecting);

        // Sort them by their vertical (top) then horizontal (left) position to reveal row-by-row, column-by-column
        intersectingEntries.sort((a, b) => {
            const posA = a.target.getBoundingClientRect();
            const posB = b.target.getBoundingClientRect();
            return (posA.top - posB.top) || (posA.left - posB.left);
        });

        intersectingEntries.forEach((entry, index) => {
            // Apply a staggered delay in JS to ensure they reveal one after another
            setTimeout(() => {
                entry.target.classList.add('visible');
            }, index * 100); // 100ms gap between each element's reveal start
            observer.unobserve(entry.target);
        });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });


    // --- Committee Carousel Logic (Seamless Loop) ---
    const viewport = document.querySelector('.carousel-viewport');
    const track = document.getElementById('committee-track');

    if (viewport && track && window.gsap && window.Draggable) {
        gsap.registerPlugin(Draggable);

        const originalCards = Array.from(track.querySelectorAll('.committee-card'));
        const originalCount = originalCards.length;

        if (originalCount > 0) {
            // 1. Create Clones for visual continuity (Prepend and Append)
            // Prepend a full set
            originalCards.slice().reverse().forEach(card => {
                const clone = card.cloneNode(true);
                clone.classList.add('clone');
                track.insertBefore(clone, track.firstChild);
            });

            // Append a full set
            originalCards.forEach(card => {
                const clone = card.cloneNode(true);
                clone.classList.add('clone');
                track.appendChild(clone);
            });

            // Set indices for the range we want to work in (the middle/original set)
            const startIndex = originalCount;
            const endIndex = originalCount * 2;

            // Refresh cards list to include clones
            const allCards = gsap.utils.toArray(track.querySelectorAll('.committee-card'));

            const updateActiveCard = (index) => {
                allCards.forEach(card => card.classList.remove('card-active'));
                // Map the index to the original set and all its clones for consistent styling
                const normalizedIndex = index % originalCount;
                for (let i = 0; i < 3; i++) {
                    const targetIdx = normalizedIndex + (i * originalCount);
                    if (allCards[targetIdx]) allCards[targetIdx].classList.add('card-active');
                }
            };

            const getCenterOffset = (index) => {
                const card = allCards[index];
                if (!card) return 0;
                const viewportCenter = viewport.clientWidth / 2;
                const cardCenter = card.offsetLeft + card.offsetWidth / 2;
                return viewportCenter - cardCenter;
            };

            let currentIndex = startIndex;
            let timer;
            let isPaused = false;

            // Initial Position: President (first card of the middle set)
            gsap.set(track, { x: getCenterOffset(startIndex) });
            updateActiveCard(startIndex);

            const moveTo = (index, duration = 1.2) => {
                gsap.killTweensOf(track);

                gsap.to(track, {
                    x: getCenterOffset(index),
                    duration: duration,
                    ease: "power2.inOut",
                    onComplete: () => {
                        currentIndex = index;
                        // Seamless Snap
                        if (currentIndex >= endIndex) {
                            currentIndex = startIndex;
                            gsap.set(track, { x: getCenterOffset(currentIndex) });
                        } else if (currentIndex < startIndex) {
                            currentIndex = endIndex - (startIndex - currentIndex);
                            gsap.set(track, { x: getCenterOffset(currentIndex) });
                        }
                        updateActiveCard(currentIndex);

                        if (!isPaused) {
                            timer = gsap.delayedCall(2, autoPlay);
                        }
                    }
                });
            };

            const autoPlay = () => {
                moveTo(currentIndex + 1);
            };

            // Start AutoPlay after initial delay
            timer = gsap.delayedCall(3, autoPlay);

            // Draggable Integration
            Draggable.create(track, {
                type: "x",
                trigger: viewport,
                inertia: true,
                onPress: function () {
                    if (timer) timer.kill();
                    gsap.killTweensOf(track);
                },
                onDrag: function () {
                    const offsetStart = getCenterOffset(startIndex);
                    const offsetEnd = getCenterOffset(endIndex);
                    const range = offsetStart - offsetEnd;

                    if (this.x > offsetStart) {
                        gsap.set(this.target, { x: this.x - range });
                        this.update();
                    } else if (this.x < offsetEnd) {
                        gsap.set(this.target, { x: this.x + range });
                        this.update();
                    }
                },
                onRelease: function () {
                    const viewCenter = viewport.clientWidth / 2;
                    let minDiff = Infinity;
                    let closestIdx = startIndex;

                    allCards.forEach((card, idx) => {
                        const cardCenter = card.offsetLeft + card.offsetWidth / 2 + this.x;
                        const diff = Math.abs(viewCenter - cardCenter);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestIdx = idx;
                        }
                    });

                    // Move to closest and resume
                    moveTo(closestIdx, 0.6);
                }
            });

            // Hover interactions
            viewport.addEventListener('mouseenter', () => {
                isPaused = true;
                if (timer) timer.kill();
            });

            viewport.addEventListener('mouseleave', () => {
                isPaused = false;
                if (!Draggable.get(track).isDragging) {
                    timer = gsap.delayedCall(2, autoPlay);
                }
            });

            window.addEventListener('resize', () => {
                if (timer) timer.kill();
                gsap.set(track, { x: getCenterOffset(startIndex) });
                currentIndex = startIndex;
                updateActiveCard(startIndex);
                timer = gsap.delayedCall(2, autoPlay);
            });
        }
    }


    // --- Contact Form Handling (Google Form Integration) ---
    const contactForm = document.getElementById('contactForm');
    const googleFormUrl = "https://docs.google.com/forms/u/0/d/e/1FAIpQLScfBpiOfdPlEwOr16cyB-rm5qVb2oNWWO8TeOlPIVJJtZteqQ/formResponse";

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const formData = new FormData(contactForm);

            // Fetch to Google Form using 'no-cors' mode to avoid CORS errors
            // This won't allow us to see the response content, but it will submit the data.
            fetch(googleFormUrl, {
                method: "POST",
                body: formData,
                mode: "no-cors"
            }).catch(error => console.error("Error submitting form:", error));

            // Show Success UI regardless of fetch status due to no-cors limitations
            const overlay = document.createElement('div');
            Object.assign(overlay.style, {
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 2000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.3s'
            });

            overlay.innerHTML = `
                <div style="background: #141d22; padding: 3rem; border-radius: 20px; text-align: center; max-width: 400px; border: 1px solid rgba(59,156,125,0.3); transform: scale(0.8); transition: transform 0.3s;">
                    <div style="width: 70px; height: 70px; background: rgba(59,156,125,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                        <i class="fas fa-check" style="color: #3b9c7d; font-size: 30px;"></i>
                    </div>
                    <h3 style="color: #fff; margin-bottom: 0.5rem; font-family: 'Reem Kufi', sans-serif;">Message Sent!</h3>
                    <p style="color: #94a3b8; margin-bottom: 2rem;">We have received your message and will get back to you shortly.</p>
                    <button class="close-modal" style="background: #3b9c7d; color: white; border: none; padding: 0.8rem 2rem; border-radius: 8px; cursor: pointer; font-weight: bold; width:100%;">Okay</button>
                </div>
            `;

            document.body.appendChild(overlay);

            // Animate In
            requestAnimationFrame(() => {
                overlay.style.opacity = '1';
                overlay.querySelector('div').style.transform = 'scale(1)';
            });

            const closeBtn = overlay.querySelector('.close-modal');
            closeBtn.addEventListener('click', () => {
                overlay.style.opacity = '0';
                overlay.querySelector('div').style.transform = 'scale(0.8)';
                setTimeout(() => {
                    document.body.removeChild(overlay);
                    contactForm.reset();
                }, 300);
            });
        });
    }

});
