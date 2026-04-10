// ===== Navegación móvil =====
(() => {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const navToggle = header.querySelector(".nav-toggle");
  const nav = header.querySelector(".site-nav");
  if (!navToggle || !nav) return;

  const setState = (open) => {
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    nav.classList.toggle("is-open", open);
  };

  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    setState(!isOpen);
  });

  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      setState(false);
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 960) {
      setState(false);
    }
  });
})();

/* ===== Tabs Servicios ===== */
(() => {
  const tabsRoot = document.querySelector('[data-tabs="servicios"]');
  if (!tabsRoot) return;

  const tabs = Array.from(tabsRoot.querySelectorAll('[role="tab"]'));
  const panels = Array.from(tabsRoot.querySelectorAll('[role="tabpanel"]'));

  const activate = (btn) => {
    tabs.forEach((tab) => {
      tab.setAttribute("aria-selected", String(tab === btn));
    });

    panels.forEach((panel) => {
      panel.classList.toggle("is-active", `#${panel.id}` === btn.dataset.tabTarget);
    });
  };

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => activate(btn));

    btn.addEventListener("keydown", (e) => {
      const index = tabs.indexOf(btn);

      if (e.key === "ArrowRight") {
        tabs[(index + 1) % tabs.length].focus();
      }

      if (e.key === "ArrowLeft") {
        tabs[(index - 1 + tabs.length) % tabs.length].focus();
      }
    });
  });
})();

/* ===== Carrusel de logos ===== */
(() => {
  const rail = document.querySelector('[data-carousel="clients"]');
  if (!rail) return;

  const clones = [...rail.children].map((node) => node.cloneNode(true));
  clones.forEach((clone) => rail.appendChild(clone));

  let rafId = null;
  const speed = 0.5;

  const tick = () => {
    rail.scrollLeft += speed;

    if (rail.scrollLeft >= rail.scrollWidth / 2) {
      rail.scrollLeft = 0;
    }

    rafId = requestAnimationFrame(tick);
  };

  const start = () => {
    if (!rafId) {
      rafId = requestAnimationFrame(tick);
    }
  };

  const stop = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    rafId = null;
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            start();
          } else {
            stop();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(rail);
  } else {
    start();
  }

  rail.addEventListener("mouseenter", stop);
  rail.addEventListener("mouseleave", start);
  rail.addEventListener("focusin", stop);
  rail.addEventListener("focusout", start);
})();

/* ===== Filtros y búsqueda en Proyectos (multi-servicio y filas completas) ===== */
(() => {
  const gallery = document.querySelector('[data-gallery="proyectos"]');
  if (!gallery) return;

  const searchInput = document.querySelector("[data-search]");
  const loadMoreBtn = document.querySelector("[data-load-more]");
  const items = Array.from(gallery.querySelectorAll(".project-card"));

  const state = {
    sectores: new Set(),
    servicios: new Set(),
    query: ""
  };

  const normalize = (value) =>
    (value || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const splitServices = (value) =>
    (value || "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);

  const BATCH = 9;
  let visibleCount = BATCH;

  let countEl = document.querySelector(".results-count");
  if (!countEl) {
    countEl = document.createElement("p");
    countEl.className = "small results-count";

    const filters = document.querySelector(".filters");
    if (filters) {
      filters.appendChild(countEl);
    }
  }

  const getCols = () => {
    const template = getComputedStyle(gallery).gridTemplateColumns;
    let cols = template.split(" ").filter((part) => /fr$|px$/.test(part)).length;

    if (!cols) {
      cols = Math.max(1, Math.round(gallery.clientWidth / 300));
    }

    return cols;
  };

  const snapToRows = (count, total) => {
    const cols = getCols();
    const snapped = Math.min(Math.ceil(count / cols) * cols, total);
    return Math.max(Math.min(cols, total), snapped);
  };

  const applyFilters = () => {
    const query = normalize(state.query);
    const kept = [];

    items.forEach((card) => {
      const sector = card.dataset.sector || "";
      const services = splitServices(card.dataset.servicio || "");
      const text = card.textContent || "";

      const matchSector = state.sectores.size
        ? state.sectores.has(sector)
        : true;

      const matchServicio = state.servicios.size
        ? services.some((service) => state.servicios.has(service))
        : true;

      const matchQuery = query
        ? normalize(text).includes(query)
        : true;

      const keep = matchSector && matchServicio && matchQuery;

      card.dataset.keep = keep ? "1" : "0";
      if (keep) {
        kept.push(card);
      }
    });

    const total = kept.length;
    const limit = snapToRows(visibleCount, total);

    let index = 0;
    items.forEach((card) => {
      if (card.dataset.keep === "1") {
        card.hidden = index >= limit;
        index += 1;
      } else {
        card.hidden = true;
      }
    });

    countEl.textContent = `Mostrando ${limit} de ${total}`;

    if (loadMoreBtn) {
      loadMoreBtn.style.display = total > limit ? "" : "none";
    }
  };

  document.querySelectorAll(".pills [data-filter]").forEach((btn) => {
    const group = btn.getAttribute("data-filter");
    const value = btn.getAttribute("data-value");

    btn.setAttribute("aria-pressed", "false");

    btn.addEventListener("click", () => {
      const targetSet = group === "sector" ? state.sectores : state.servicios;

      if (targetSet.has(value)) {
        targetSet.delete(value);
        btn.classList.remove("active");
        btn.setAttribute("aria-pressed", "false");
      } else {
        targetSet.add(value);
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
      }

      visibleCount = BATCH;
      applyFilters();
    });
  });

  if (searchInput) {
    let debounceId;

    searchInput.addEventListener("input", (event) => {
      clearTimeout(debounceId);

      debounceId = setTimeout(() => {
        state.query = event.target.value || "";
        visibleCount = BATCH;
        applyFilters();
      }, 200);
    });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      visibleCount += BATCH;
      applyFilters();
    });
  }

  window.addEventListener("resize", applyFilters);

  items.forEach((item) => {
    item.hidden = false;
    item.dataset.keep = "1";
  });

  applyFilters();
})();

/* ===== Validación y envío simulado ===== */
(() => {
  const form = document.querySelector('[data-form="contacto"]');
  if (!form) return;

  const success = form.querySelector(".form-success");
  const servicio = form.elements["servicio"];
  const sector = form.elements["sector"];
  const ubicacion = form.elements["ubicacion"];
  const presupuesto = form.elements["presupuesto"];
  const nombre = form.elements["nombre"];
  const email = form.elements["email"];
  const telefono = form.elements["telefono"];
  const mensaje = form.elements["mensaje"];
  const consent = form.elements["consent"];

  form.addEventListener("input", (e) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement
    ) {
      e.target.setCustomValidity("");
    }
  });

  form.addEventListener("change", (e) => {
    if (e.target === consent) {
      consent.setCustomValidity("");
    }
  });

  const validate = () => {
    let ok = true;

    [
      servicio,
      sector,
      ubicacion,
      presupuesto,
      nombre,
      email,
      telefono,
      mensaje,
      consent
    ].forEach((field) => {
      if (field && "setCustomValidity" in field) {
        field.setCustomValidity("");
      }
    });

    if (servicio && !servicio.value) {
      servicio.setCustomValidity("Selecciona el tipo de servicio.");
      ok = false;
    }

    if (sector && !sector.value) {
      sector.setCustomValidity("Selecciona el sector del proyecto.");
      ok = false;
    }

    if (ubicacion && ubicacion.value.trim().length < 3) {
      ubicacion.setCustomValidity("Indica una ubicación válida (distrito/ciudad).");
      ok = false;
    }

    if (nombre && nombre.value.trim().length < 3) {
      nombre.setCustomValidity("Ingresa tu nombre y apellido.");
      ok = false;
    }

    if (email && email.value.trim() && !email.checkValidity()) {
      email.setCustomValidity("Ingresa un correo electrónico válido.");
      ok = false;
    }

    if (
      telefono &&
      telefono.value.trim() &&
      !/^[0-9+\s()-]{6,}$/.test(telefono.value.trim())
    ) {
      telefono.setCustomValidity(
        "Ingresa un teléfono válido (mínimo 6 caracteres, solo números, espacios, + o guiones)."
      );
      ok = false;
    }

    if (mensaje && mensaje.value.trim().length < 10) {
      mensaje.setCustomValidity(
        "Cuéntanos brevemente el alcance del proyecto (mínimo 10 caracteres)."
      );
      ok = false;
    }

    if (consent && !consent.checked) {
      consent.setCustomValidity("Debes aceptar el uso de tus datos para continuar.");
      ok = false;
    }

    return ok;
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const isValid = validate() && form.checkValidity();

    if (!isValid) {
      form.reportValidity();
      return;
    }

    setTimeout(() => {
      success.hidden = false;
      form.reset();

      const header = document.querySelector(".site-header");
      const extra = 90;
      const offset = (header ? header.offsetHeight : 0) + extra;
      const target = success || form;
      const y = target.getBoundingClientRect().top + window.pageYOffset - offset;

      window.scrollTo({ top: y, behavior: "smooth" });
    }, 250);
  });
})();

/* ===== Reveal on scroll ===== */
(() => {
  const roots = document.querySelectorAll('[data-reveal="scroll"]');
  if (!roots.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("in-view", entry.isIntersecting);

        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  roots.forEach((root) => observer.observe(root));
})();

/* ===== Loading Bar ===== */
(() => {
  const bar = document.getElementById("loading-bar");
  if (!bar) return;

  let progress = 0;
  let finished = false;

  const setProgress = (value) => {
    progress = Math.max(progress, Math.min(value, 100));
    bar.style.width = `${progress}%`;
  };

  const start = () => {
    bar.classList.add("is-active");
    setProgress(10);
  };

  const finish = () => {
    if (finished) return;

    finished = true;
    setProgress(100);
    bar.classList.add("is-done");

    window.setTimeout(() => {
      bar.classList.remove("is-active", "is-done");
      bar.style.width = "0%";
      progress = 0;
    }, 450);
  };

  const pulse = (value) => {
    if (!finished) {
      setProgress(value);
    }
  };

  start();

  document.addEventListener("DOMContentLoaded", () => pulse(35));

  const images = Array.from(document.images).filter((img) => !img.complete);
  const total = images.length;
  let loaded = 0;

  const track = () => {
    loaded += 1;

    if (total > 0) {
      const mapped = 35 + (loaded / total) * 50;
      pulse(mapped);
    }
  };

  images.forEach((img) => {
    img.addEventListener("load", track, { once: true });
    img.addEventListener("error", track, { once: true });
  });

  window.addEventListener("load", () => {
    pulse(90);
    window.setTimeout(finish, 180);
  });
})();

/* ===== Loader circular por imagen ===== */
(() => {
const selectors = [
  ".project-card img",
  ".case-card img",
  ".certs-grid img",
  ".services-summary .card img",
  "#certificaciones .iso-badges img"
];

  const images = Array.from(document.querySelectorAll(selectors.join(",")));
  if (!images.length) return;

  const wrapImage = (img) => {
    const parent = img.parentElement;
    if (!parent || parent.classList.contains("img-loading")) return parent;

    const wrapper = document.createElement("div");
    wrapper.className = "img-loading";

    parent.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    return wrapper;
  };

  const markLoaded = (img, wrapper) => {
    wrapper.classList.add("is-loaded");
    img.classList.add("is-loaded");
  };

  images.forEach((img) => {
    const wrapper = wrapImage(img);

    if (img.complete && img.naturalWidth > 0) {
      markLoaded(img, wrapper);
      return;
    }

    img.addEventListener(
      "load",
      () => markLoaded(img, wrapper),
      { once: true }
    );

    img.addEventListener(
      "error",
      () => markLoaded(img, wrapper),
      { once: true }
    );
  });
})();