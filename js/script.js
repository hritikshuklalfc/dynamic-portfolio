// --- 1. Custom Crosshair Cursor ---
const c_h = document.getElementById("cursor-h");
const c_v = document.getElementById("cursor-v");
const c_dot = document.getElementById("cursor-dot");
let mx = window.innerWidth / 2,
  my = window.innerHeight / 2;

document.addEventListener("mousemove", (e) => {
  mx = e.clientX;
  my = e.clientY;
});

// Smooth cursor tracking
gsap.ticker.add(() => {
  gsap.set(c_h, { x: mx, y: my });
  gsap.set(c_v, { x: mx, y: my });
  gsap.set(c_dot, { x: mx, y: my });
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

// --- 2. Lenis Smooth Scroll & Engine Physics ---
const lenis = new Lenis({
  duration: 1.5,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});

gsap.registerPlugin(ScrollTrigger);
lenis.on("scroll", ScrollTrigger.update);

const rpmCounter = document.getElementById("rpm-counter");
const rpmFill = document.getElementById("rpm-fill");
const IDLE_RPM = 900;
const MAX_RPM = 9000;
const REDLINE_RPM = 7500;

let currentRpm = IDLE_RPM;
let targetRpm = IDLE_RPM;

// Grab velocity directly from the Lenis scroll event
lenis.on("scroll", (e) => {
  let scrollVelocity = Math.abs(e.velocity || 0);
  // Multiply velocity to make it sensitive (tweak the 150 if it revs too fast/slow)
  targetRpm = IDLE_RPM + Math.min(scrollVelocity * 150, MAX_RPM - IDLE_RPM);
});

// ONE single, optimized render loop for the entire site
gsap.ticker.add((time) => {
  // 1. Update Scroll
  lenis.raf(time * 1000);

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

// --- 3. Image Sequence (Limited to 400 frames for Intro) ---
const canvas = document.getElementById("skcanvas");
const ctx = canvas.getContext("2d", { alpha: false });

const maxFrames = 300;
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

// Preload the first 400 frames
// --- PROGRESSIVE PRELOADER ---
const framesToWait = 35; // Boot the site after just 35 frames
let hasBooted = false;

for (let i = 1; i <= maxFrames; i++) {
  const img = new Image();
  img.src = `assets/${String(i).padStart(5, "0")}.png`;

  img.onload = () => {
    loaded++;

    // Fake the percentage so it hits 100% quickly based on our 35 frame target
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
  };
  images.push(img);
}

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
      frameCounter.innerText = `${String(currFrame).padStart(3, "0")} / 400`;
      hudFill.style.width = `${(currFrame / maxFrames) * 100}%`;
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
