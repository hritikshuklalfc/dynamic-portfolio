// --- 1. Custom Crosshair Cursor ---
const c_h = document.getElementById("cursor-h");
const c_v = document.getElementById("cursor-v");
const c_dot = document.getElementById("cursor-dot");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

let mx = window.innerWidth / 2,
  my = window.innerHeight / 2;

if (isTouch || prefersReducedMotion) {
  document.body.classList.add("no-custom-cursor");
} else {
  document.addEventListener("mousemove", (e) => {
    mx = e.clientX;
    my = e.clientY;
  });

  const setCHX = gsap.quickSetter(c_h, "x", "px");
  const setCHY = gsap.quickSetter(c_h, "y", "px");
  const setCVX = gsap.quickSetter(c_v, "x", "px");
  const setCVY = gsap.quickSetter(c_v, "y", "px");
  const setCDX = gsap.quickSetter(c_dot, "x", "px");
  const setCDY = gsap.quickSetter(c_dot, "y", "px");

  // Smooth cursor tracking
  gsap.ticker.add(() => {
    setCHX(mx);
    setCHY(my);
    setCVX(mx);
    setCVY(my);
    setCDX(mx);
    setCDY(my);
  });

  // Hover States
  document
    .querySelectorAll("a, .magnetic-btn, .hud-btn, .project-row")
    .forEach((el) => {
      el.addEventListener("mouseenter", () => {
        gsap.to([c_h, c_v], { scale: 1.5, opacity: 0.3, duration: 0.3 });
        gsap.to(c_dot, { scale: 3, backgroundColor: "#fff", duration: 0.3 });
      });
      el.addEventListener("mouseleave", () => {
        gsap.to([c_h, c_v], { scale: 1, opacity: 1, duration: 0.3 });
        gsap.to(c_dot, {
          scale: 1,
          backgroundColor: "var(--accent)",
          duration: 0.3,
        });
      });
    });
}

// --- 2. Lenis Smooth Scroll & Engine Physics ---
gsap.registerPlugin(ScrollTrigger);
const lenis = prefersReducedMotion
  ? null
  : new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

if (lenis) {
  lenis.on("scroll", ScrollTrigger.update);
}

const rpmCounter = document.getElementById("rpm-counter");
const rpmFill = document.getElementById("rpm-fill");
const IDLE_RPM = 900;
const MAX_RPM = 9000;
const REDLINE_RPM = 7500;

let currentRpm = IDLE_RPM;
let targetRpm = IDLE_RPM;

// Grab velocity directly from the Lenis scroll event
if (lenis) {
  lenis.on("scroll", (e) => {
    let scrollVelocity = Math.abs(e.velocity || 0);
    // Multiply velocity to make it sensitive (tweak the 150 if it revs too fast/slow)
    targetRpm = IDLE_RPM + Math.min(scrollVelocity * 150, MAX_RPM - IDLE_RPM);
  });
}

// ONE single, optimized render loop for the entire site
gsap.ticker.add((time) => {
  // 1. Update Scroll
  if (lenis) {
    lenis.raf(time * 1000);
  }

  // 2. Engine Physics
  // Decay target RPM back to idle when scroll stops
  targetRpm -= (targetRpm - IDLE_RPM) * 0.08;
  // Smoothly animate current RPM toward target
  currentRpm += (targetRpm - currentRpm) * 0.15;

  // 3. Update the UI Gauge
  if (rpmCounter && rpmFill) {
    rpmCounter.innerText = `${Math.floor(currentRpm).toString().padStart(4, "0")} RPM`;
    let fillPct = (currentRpm / MAX_RPM) * 100;
    rpmFill.style.width = `${fillPct}%`;

    // Trigger Redline Neon
    if (currentRpm > REDLINE_RPM) {
      rpmFill.classList.add("redline-active");
    } else {
      rpmFill.classList.remove("redline-active");
    }
  }
});

gsap.ticker.lagSmoothing(0);

// --- 3. Image Sequence (Limited frames for Intro) ---
const canvas = document.getElementById("skcanvas");
const ctx = canvas.getContext("2d", { alpha: false });

const maxFrames = prefersReducedMotion ? 120 : 300;
const images = [];
const seq = { frame: 1 };
let loaded = 0;

const loadPct = document.getElementById("load-pct");
const loadBar = document.getElementById("load-bar");
const frameCounter = document.getElementById("frame-counter");
const hudFill = document.getElementById("hud-fill");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  renderCanvas();
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function renderCanvas() {
  if (!images[Math.floor(seq.frame) - 1]) return;
  const img = images[Math.floor(seq.frame) - 1];
  if (!img.naturalWidth) return;

  const scale = Math.max(
    canvas.width / img.naturalWidth,
    canvas.height / img.naturalHeight,
  );
  const x = canvas.width / 2 - (img.naturalWidth / 2) * scale;
  const y = canvas.height / 2 - (img.naturalHeight / 2) * scale;

  ctx.drawImage(img, x, y, img.naturalWidth * scale, img.naturalHeight * scale);
}

// Preload with a small concurrency to reduce CPU/network spikes
const framesToWait = prefersReducedMotion ? 12 : 35; // Boot the site quickly
const maxConcurrentLoads = prefersReducedMotion ? 2 : 4;
let hasBooted = false;

let nextToLoad = 1;
let activeLoads = 0;

function queueLoads() {
  while (activeLoads < maxConcurrentLoads && nextToLoad <= maxFrames) {
    const frameIndex = nextToLoad;
    nextToLoad++;
    activeLoads++;

    const img = new Image();
    img.decoding = "async";
    img.src = `assets/${String(frameIndex).padStart(5, "0")}.png`;
    images[frameIndex - 1] = img;

    img.onload = () => {
      loaded++;
      activeLoads--;

      // Fake the percentage so it hits 100% quickly based on our target
      if (!hasBooted) {
        let pct = Math.min(Math.floor((loaded / framesToWait) * 100), 100);
        loadPct.innerText = String(pct).padStart(3, "0");
        loadBar.style.width = pct + "%";
      }

      if (loaded === 1) renderCanvas();

      // Ignite the site early. Let the rest load invisibly in the background.
      if (loaded >= framesToWait && !hasBooted) {
        hasBooted = true;
        initAnimations();
      }

      queueLoads();
    };

    img.onerror = () => {
      activeLoads--;
      queueLoads();
    };
  }
}

queueLoads();

// Fallback safety (drops from 4000ms to 2500ms so they aren't stuck waiting)
setTimeout(() => {
  if (!hasBooted) {
    hasBooted = true;
    initAnimations();
  }
}, 2500);

// --- 4. Scroll Animations & Reveal Logic ---
function initAnimations() {
  // Hide Loader
  gsap.to("#loader", {
    opacity: 0,
    duration: 1,
    onComplete: () =>
      (document.getElementById("loader").style.display = "none"),
  });

  // 4a. The Intro Car Scrubbing
  gsap.to(seq, {
    frame: maxFrames - 1,
    ease: "none",
    scrollTrigger: {
      trigger: "#hero-track",
      start: "top top",
      end: "bottom bottom",
      scrub: 0.5,
    },
    onUpdate: () => {
      renderCanvas();
      let currFrame = Math.floor(seq.frame);
      if (frameCounter) {
        frameCounter.innerText = `${String(currFrame).padStart(3, "0")} / ${maxFrames}`;
      }
      if (hudFill) {
        hudFill.style.width = `${(currFrame / maxFrames) * 100}%`;
      }
    },
  });

  // Fade out the landing title as you scroll down the intro
  gsap.to("#landing-title", {
    opacity: 0,
    x: -50,
    scrollTrigger: {
      trigger: "#hero-track",
      start: "top top",
      end: "30% top",
      scrub: true,
    },
  });

  // 4b. Zpod Text Reveal Logic for Content Sections
  gsap.utils.toArray(".section-title, .body-text, .label").forEach((elem) => {
    gsap.fromTo(
      elem,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: elem,
          start: "top 85%",
        },
      },
    );
  });
}
