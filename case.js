const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const motionVideos = document.querySelectorAll("video[data-motion]");

if (motionVideos.length) {
  const motionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.12 });

  motionVideos.forEach((video) => {
    video.muted = true;
    motionObserver.observe(video);
  });
}

const baliScene = document.querySelector("[data-bali-scene]");

if (baliScene) {
  baliScene.addEventListener("pointermove", (event) => {
    const rect = baliScene.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * -14;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * -10;
    baliScene.style.setProperty("--scene-x", `${x}px`);
    baliScene.style.setProperty("--scene-y", `${y}px`);
  });

  baliScene.addEventListener("pointerleave", () => {
    baliScene.style.setProperty("--scene-x", "0px");
    baliScene.style.setProperty("--scene-y", "0px");
  });
}

const masterplan = document.querySelector("[data-masterplan]");

if (masterplan) {
  const units = {
    "villa-s1": {
      kind: "Villa",
      code: "S1",
      name: "Villa S1",
      beds: "1",
      baths: "1",
      area: "80.83",
      features: "Ocean view · Forest view · BBQ area",
      image: "assets/every-bali-unit-villa-s1.webp",
    },
    "block-a-l33": {
      kind: "Apartment",
      code: "A L33",
      name: "Block A L33",
      beds: "2",
      baths: "2",
      area: "89.27",
      features: "Ocean view · Fully furnished · Designer interior",
      image: "assets/every-bali-unit-a-l33.webp",
    },
    "block-a-m34": {
      kind: "Apartment",
      code: "A M34",
      name: "Block A M34",
      beds: "1",
      baths: "1",
      area: "50.44",
      features: "Forest view · Fully furnished · Designer interior",
      image: "assets/every-bali-unit-a-m34.webp",
    },
  };

  const card = masterplan.querySelector(".masterplan-card");
  const pins = masterplan.querySelectorAll("[data-unit]");

  const setUnit = (key) => {
    const unit = units[key];
    if (!unit) return;

    pins.forEach((pin) => {
      const isActive = pin.dataset.unit === key;
      pin.classList.toggle("is-active", isActive);
      pin.setAttribute("aria-pressed", String(isActive));
    });
    card.classList.remove("is-switching");
    void card.offsetWidth;
    card.classList.add("is-switching");
    masterplan.querySelector("[data-unit-image]").src = unit.image;
    masterplan.querySelector("[data-unit-image]").alt = unit.name;
    masterplan.querySelector("[data-unit-kind]").textContent = unit.kind;
    masterplan.querySelector("[data-unit-code]").textContent = unit.code;
    masterplan.querySelector("[data-unit-name]").textContent = unit.name;
    masterplan.querySelector("[data-unit-beds]").textContent = unit.beds;
    masterplan.querySelector("[data-unit-baths]").textContent = unit.baths;
    masterplan.querySelector("[data-unit-area]").textContent = unit.area;
    masterplan.querySelector("[data-unit-features]").textContent = unit.features;
  };

  pins.forEach((pin) => pin.addEventListener("click", () => setUnit(pin.dataset.unit)));
}

const propertyCatalog = document.querySelector("[data-property-catalog]");

if (propertyCatalog) {
  const filterButtons = propertyCatalog.querySelectorAll("[data-catalog-filter]");
  const propertyCards = propertyCatalog.querySelectorAll("[data-property-type]");

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.catalogFilter;

      filterButtons.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-pressed", String(isActive));
      });

      propertyCards.forEach((card) => {
        card.hidden = filter !== "all" && card.dataset.propertyType !== filter;
      });
    });
  });
}

const lumeryLogic = document.querySelector("[data-lumery-logic]");

if (lumeryLogic) {
  const logicTabs = lumeryLogic.querySelectorAll("[data-logic-tab]");
  const logicPanels = lumeryLogic.querySelectorAll("[data-logic-panel]");

  logicTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.logicTab;

      logicTabs.forEach((item) => {
        const isActive = item === tab;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-selected", String(isActive));
      });

      logicPanels.forEach((panel) => {
        const isActive = panel.dataset.logicPanel === target;
        panel.hidden = !isActive;
        panel.classList.toggle("is-active", isActive);
      });
    });
  });
}

const lumeryWorkfile = document.querySelector("[data-lumery-workfile]");

if (lumeryWorkfile) {
  const workfileViews = {
    architecture: {
      image: "assets/lumery-figma-architecture.jpg",
      alt: "Lumery app architecture, user scenarios and flow charts in Figma",
      path: "Exploration / App architecture and logic",
      stage: "Product logic",
      title: "Architecture before interface",
      description: "User scenarios, technical implementation, object rules and branching flow charts were mapped before the visual layer.",
      index: "01 / 06",
    },
    wireframes: {
      image: "assets/lumery-figma-wireframes.jpg",
      alt: "Large Lumery wireframe workspace with connected product branches in Figma",
      path: "Exploration / Wireframes and drafts",
      stage: "Structural exploration",
      title: "Breadth before polish",
      description: "Onboarding, MyMind, content states, calendar and supporting scenarios were explored as a large working field rather than isolated screens.",
      index: "02 / 06",
    },
    dark: {
      image: "assets/lumery-figma-dark-flow.jpg",
      alt: "Lumery dark application flow with connected screens in Figma",
      path: "Exploration / Main app flow — dark",
      stage: "Connected product flow",
      title: "From screen sets to behaviour",
      description: "The main experience connects onboarding, the home surface, AI assistant, profile and the emerging MyMind and MyWorld branches.",
      index: "03 / 06",
    },
    system: {
      image: "assets/lumery-figma-system.jpg",
      alt: "Lumery UI system exploration with color scales, components and states in Figma",
      path: "Exploration / UI system",
      stage: "Design system",
      title: "A language built across themes",
      description: "Grid, color scales, settings, navigation, assistant states and reusable patterns were tested together across dark and light modes.",
      index: "04 / 06",
    },
    review: {
      image: "assets/lumery-figma-review.jpg",
      alt: "Lumery exploration review showing multiple dated interface iterations in Figma",
      path: "Exploration / Review",
      stage: "Iteration history",
      title: "Decisions stayed visible",
      description: "Dated review groups preserve how flows evolved, what was compared and how the product moved from dark exploration toward a lighter direction.",
      index: "05 / 06",
    },
    light: {
      image: "assets/lumery-figma-light-flow.jpg",
      alt: "Lumery light theme prototype flow with onboarding, profile and assistant branches in Figma",
      path: "Prototype flows / Main app — light",
      stage: "Prototype structure",
      title: "One system, many scenarios",
      description: "The refined prototype brings onboarding, profile, calendar, sources, assistant, MyMind and MyWorld into one connected application map.",
      index: "06 / 06",
    },
  };

  const workfileTabs = lumeryWorkfile.querySelectorAll("[data-workfile-tab]");
  const viewer = lumeryWorkfile.querySelector(".workfile-viewer");
  const image = lumeryWorkfile.querySelector("[data-workfile-image]");
  const links = lumeryWorkfile.querySelectorAll("[data-workfile-link]");
  const path = lumeryWorkfile.querySelector("[data-workfile-path]");
  const stage = lumeryWorkfile.querySelector("[data-workfile-stage]");
  const title = lumeryWorkfile.querySelector("[data-workfile-title]");
  const description = lumeryWorkfile.querySelector("[data-workfile-description]");
  const index = lumeryWorkfile.querySelector("[data-workfile-index]");

  const setWorkfileView = (key) => {
    const view = workfileViews[key];
    if (!view) return;

    workfileTabs.forEach((tab) => {
      const isActive = tab.dataset.workfileTab === key;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-pressed", String(isActive));
    });

    viewer.classList.add("is-switching");
    window.setTimeout(() => {
      image.src = view.image;
      image.alt = view.alt;
      links.forEach((link) => { link.href = view.image; });
      path.textContent = view.path;
      stage.textContent = view.stage;
      title.textContent = view.title;
      description.textContent = view.description;
      index.textContent = view.index;
      viewer.classList.remove("is-switching");
    }, 170);
  };

  workfileTabs.forEach((tab) => {
    tab.addEventListener("click", () => setWorkfileView(tab.dataset.workfileTab));
  });
}

const bitronixBots = document.querySelector("[data-bitronix-bots]");

if (bitronixBots) {
  const profiles = {
    jugg: {
      image: "assets/bitronix-bot-green.png",
      alt: "Jugg Bitronix strategy character",
      color: "#c7ff2f",
      kicker: "Controlled profile · 15–25%",
      title: "Jugg ×1",
      description: "The lowest-risk entry point: solid, grounded and built to communicate control.",
      index: "01 / 04",
    },
    linx: {
      image: "assets/bitronix-bot-blue.png",
      alt: "Linx Bitronix strategy character",
      color: "#28b9ff",
      kicker: "Balanced profile · 25–35%",
      title: "Linx ×3",
      description: "A faster, more agile profile balancing ambition with a clear sense of direction.",
      index: "02 / 04",
    },
    vortex: {
      image: "assets/bitronix-bot-purple.png",
      alt: "Vortex Bitronix strategy character",
      color: "#9a43ff",
      kicker: "Adventurous profile · 35–50%",
      title: "Vortex ×5",
      description: "A sharper, more technical character for users comfortable with greater movement and risk.",
      index: "03 / 04",
    },
    spark: {
      image: "assets/bitronix-bot-pink.png",
      alt: "Spark Bitronix strategy character",
      color: "#ff4aa8",
      kicker: "High-energy profile · 50%+",
      title: "Spark ×10",
      description: "The most expressive profile: fast, confrontational and intentionally impossible to overlook.",
      index: "04 / 04",
    },
  };

  const selector = bitronixBots.querySelector(".bot-selector");
  const selectorView = bitronixBots.querySelector(".bot-selector-view");
  const tabs = bitronixBots.querySelectorAll("[data-bot-tab]");
  const image = bitronixBots.querySelector("[data-bot-image]");
  const kicker = bitronixBots.querySelector("[data-bot-kicker]");
  const title = bitronixBots.querySelector("[data-bot-title]");
  const description = bitronixBots.querySelector("[data-bot-description]");
  const index = bitronixBots.querySelector("[data-bot-index]");
  let switchTimer;

  const setProfile = (key) => {
    const profile = profiles[key];
    if (!profile) return;

    window.clearTimeout(switchTimer);
    tabs.forEach((tab) => {
      const isActive = tab.dataset.botTab === key;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });
    selector.style.setProperty("--bot-color", profile.color);
    selectorView.style.setProperty("--bot-color", profile.color);
    selector.classList.add("is-switching");

    switchTimer = window.setTimeout(() => {
      image.src = profile.image;
      image.alt = profile.alt;
      kicker.textContent = profile.kicker;
      title.textContent = profile.title;
      description.textContent = profile.description;
      index.textContent = profile.index;
      selector.classList.remove("is-switching");
    }, 180);
  };

  tabs.forEach((tab) => tab.addEventListener("click", () => setProfile(tab.dataset.botTab)));
}
