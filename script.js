const cases = {
  aleria: {
    index: "01 / Aleria",
    title: "Aleria",
    lead: "Building one visual system across an enterprise AI product, its brand and public communication.",
    facts: [["Role", "Brand Director"], ["Period", "2024—2025"], ["Scope", "Brand · Product · Motion"]],
    body: "I led the brand direction and had final responsibility for the visual system. The work extended from brandbook and web direction into mobile and web UI, presentations, internal materials, event communication and motion. I also reviewed work, distributed tasks and presented creative decisions within a small team.",
    link: "case-aleria.html",
    linkLabel: "View full case study →"
  },
  lumery: {
    index: "02 / Lumery Glasses",
    title: "Lumery",
    lead: "Turning an early smart-glasses concept into a coherent physical and digital product ecosystem.",
    facts: [["Role", "Product / Brand Designer"], ["Period", "2025—2026"], ["Team", "CEO + 2 designers"]],
    body: "Working with the CEO and another designer, I helped shape the product from architecture and interaction logic to the companion app, design system, brand language, physical-product direction and website. The case is currently shown as a sanitized preview while the product remains in development.",
    link: "case-lumery.html",
    linkLabel: "View full case study →"
  },
  bitronix: {
    index: "03 / Bitronix",
    title: "Bitronix",
    lead: "A character-led visual universe built to scale across fintech product, motion and daily communication.",
    facts: [["Role", "Visual Designer"], ["Period", "Oct 2024—Apr 2026"], ["Output", "≈50 motion assets"]],
    body: "I owned the social visual layer, developed robot characters and produced motion across social, advertising and campaign use. I also contributed collaboratively to the Telegram mini-app and selected product surfaces, while the visual communication system remained my primary responsibility.",
    link: "case-bitronix.html",
    linkLabel: "View full case study →"
  },
  bali: {
    index: "04 / Every Bali",
    title: "Every Bali",
    lead: "A launched property experience balancing cinematic storytelling with detailed real-estate discovery.",
    facts: [["Role", "Web / Product Designer"], ["Period", "2026"], ["Status", "Live product"]],
    body: "I designed the information structure, UX, filtering logic and visual experience across desktop and mobile. The final website combines a large property catalog, apartment and villa modes, interactive masterplan, detailed attributes and international brand storytelling. Copywriting was outside my scope.",
    link: "case-every-bali.html",
    linkLabel: "View full case study →"
  }
};

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const dialog = document.querySelector(".case-dialog");
const dialogTitle = dialog.querySelector("#dialog-title");
const dialogIndex = dialog.querySelector(".dialog-index");
const dialogLead = dialog.querySelector(".dialog-lead");
const dialogFacts = dialog.querySelector(".dialog-facts");
const dialogBody = dialog.querySelector(".dialog-body");
const dialogLink = dialog.querySelector(".dialog-link");

document.querySelectorAll("[data-case] .case-open").forEach((button) => {
  button.addEventListener("click", () => {
    const data = cases[button.closest("[data-case]").dataset.case];
    dialogIndex.textContent = data.index;
    dialogTitle.textContent = data.title;
    dialogLead.textContent = data.lead;
    dialogFacts.replaceChildren(...data.facts.map(([label, value]) => {
      const cell = document.createElement("div");
      const small = document.createElement("small");
      const text = document.createElement("span");
      small.textContent = label;
      text.textContent = value;
      cell.append(small, text);
      return cell;
    }));
    dialogBody.textContent = data.body;
    dialogLink.href = data.link || "";
    dialogLink.textContent = data.linkLabel;
    dialogLink.target = data.link?.startsWith("http") ? "_blank" : "_self";
    dialog.showModal();
  });
});

dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

/* ── Particle-field film hero, driven by page scroll ───────────────────── */

(() => {
  const section = document.querySelector(".film");
  if (!section) return;

  const stage = section.querySelector(".film-canvas");
  const intro = section.querySelector(".film-intro");
  const outro = section.querySelector(".film-outro");
  const hint = section.querySelector(".film-hint");
  const fill = section.querySelector(".film-rail-fill");
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (typeof window.createParticleVideo !== "function") return;

  // interactive:false — the section must not swallow the page's wheel/touch.
  const pv = window.createParticleVideo(stage, {
    src: "assets/particle-video.mp4",
    interactive: false,
    grain: false,          // its own grain is one stretched tile -> blotches
    background: "#131312"
  });

  const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ease = (v, a, b) => clamp((v - a) / (b - a));

  const bands = pv.stages + 1;            // stage 0 … pv.stages, one scroll band each
  let progress = 0;
  let want = 0;

  const readScroll = () => {
    const travel = section.offsetHeight - window.innerHeight;
    progress = travel > 0 ? clamp(-section.getBoundingClientRect().top / travel) : 0;
    want = Math.min(pv.stages, Math.floor(progress * bands));
  };

  const paint = () => {
    const out = ease(progress, 0.03, 0.14);
    intro.style.opacity = String(1 - out);
    intro.style.transform = `translateY(${-out * 40}px)`;

    // Scroll position alone runs ahead of the particle field, which is capped by
    // the stage throttle and by playback; gate the headline on the field itself.
    const inn = Math.min(ease(progress, 0.9, 0.99), pv.outroProgress);
    outro.style.opacity = String(inn);
    outro.style.transform = `translateY(${(1 - inn) * 24}px)`;

    if (hint) hint.style.opacity = String((1 - ease(progress, 0, 0.05)) * 0.5);
    fill.style.width = `${progress * 100}%`;
  };

  const tick = () => {
    // step() self-throttles to ~350ms, which matches its own stage easing.
    if (pv.stage < want) pv.step(1);
    else if (pv.stage > want) pv.step(-1);
    paint();
    requestAnimationFrame(tick);
  };

  window.addEventListener("scroll", readScroll, { passive: true });
  window.addEventListener("resize", readScroll);
  readScroll();

  if (calm) {
    paint();
    return;
  }
  requestAnimationFrame(tick);
})();
