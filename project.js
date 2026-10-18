/* Podstrony projektów
   - przełączanie projektów bez przeładowania strony (podmieniana jest tylko prawa kolumna)
   - karuzela opinii, liczniki statystyk, podgląd zrzutów */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* =============== moduły prawej kolumny (inicjowane po każdej podmianie) =============== */
let teardown = [];

function initCarousel(root) {
  const carousel = root.querySelector(".pj-carousel");
  if (!carousel) return;

  const track = carousel.querySelector(".pj-track");
  const prev = root.querySelector('.pj-arrow[data-dir="-1"]');
  const next = root.querySelector('.pj-arrow[data-dir="1"]');
  if (!track || !prev || !next) return;

  const step = () => {
    const card = track.querySelector(".pj-review");
    if (!card) return track.clientWidth;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return card.getBoundingClientRect().width + gap;
  };

  const update = () => {
    const max = track.scrollWidth - track.clientWidth - 2;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max;
  };

  prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
  next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));

  carousel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); next.click(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); prev.click(); }
  });

  track.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  teardown.push(() => window.removeEventListener("resize", update));
  update();
}

/* Tekst w HTML to już wartość końcowa — skrypt tylko ją animuje,
   więc przy błędzie lub bez JS liczby i tak są widoczne. */
function initCounters(root) {
  const nums = root.querySelectorAll(".pj-stat-num[data-count]");
  if (!nums.length || !("IntersectionObserver" in window) || reduceMotion) return;

  const fmt = (el, value) => {
    const decimals = Number(el.dataset.decimals || 0);
    const text = new Intl.NumberFormat("pl-PL", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
    el.textContent = text + (value >= Number(el.dataset.count) ? (el.dataset.suffix || "") : "");
  };

  const run = (el) => {
    const target = Number(el.dataset.count);
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      fmt(el, target * (1 - Math.pow(1 - t, 4)));
      if (t < 1) requestAnimationFrame(tick);
      else fmt(el, target);
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      run(entry.target);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.6 });

  nums.forEach((el) => io.observe(el));
  teardown.push(() => io.disconnect());
}

function initPanel(panel) {
  teardown.forEach((fn) => fn());
  teardown = [];
  initCarousel(panel);
  initCounters(panel);
}

/* =============== podgląd zrzutów (delegacja — działa po podmianie treści) =============== */
(() => {
  const dialog = document.getElementById("lightbox");
  if (!dialog || typeof dialog.showModal !== "function") return;

  const img = dialog.querySelector("img");
  const close = dialog.querySelector(".lightbox-close");

  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".pj-shot");
    if (!btn) return;
    img.src = btn.dataset.full;
    img.alt = btn.dataset.alt || "";
    dialog.showModal();
  });

  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
})();

/* =============== spis projektów + przełączanie paneli ===============
   Wszystkie projekty są w jednym pliku (projekty.html). Klik w spis tylko
   pokazuje inny panel, więc nic się nie przeładowuje — działa też po
   otwarciu plików prosto z dysku (bez serwera). Adres: projekty.html#slug */
const list = document.querySelector(".pj-list ul");
const panels = [...document.querySelectorAll(".pj-main")];

function centerCurrentItem() {
  const current = list?.querySelector('[aria-current="page"]');
  if (!list || !current || list.scrollWidth <= list.clientWidth) return;
  list.scrollLeft = current.offsetLeft - (list.clientWidth - current.offsetWidth) / 2;
}

function markCurrent(id) {
  list?.querySelectorAll(".pj-item").forEach((a) => {
    if (a.getAttribute("href") === "#" + id) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  centerCurrentItem();
}

(() => {
  if (!panels.length) return;

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const nextFrame = () => new Promise((res) => requestAnimationFrame(() => res()));
  const idFromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    return panels.some((p) => p.id === id) ? id : panels[0].id;
  };

  let current = null;
  let busy = false;

  // pokaż panel (bez animacji)
  function swap(id) {
    const target = panels.find((p) => p.id === id);
    panels.forEach((p) => { p.hidden = p !== target; });
    current = id;
    markCurrent(id);
    document.title = target.dataset.title || document.title;
    window.scrollTo({ top: 0, behavior: "instant" });
    initPanel(target);
  }

  async function show(id) {
    if (id === current) {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      return;
    }
    if (busy) return;
    busy = true;
    try {
      if (reduceMotion) {
        swap(id);
      } else if (document.startViewTransition) {
        await document.startViewTransition(() => swap(id)).finished.catch(() => {});
      } else {
        // wersja awaryjna: wygaszenie → podmiana → pojawienie się
        const out = panels.find((p) => !p.hidden);
        out?.classList.add("is-swapping");
        await sleep(180);
        swap(id);
        out?.classList.remove("is-swapping");
        const inn = panels.find((p) => !p.hidden);
        inn.classList.add("is-swapping");
        await nextFrame();
        await nextFrame();
        inn.classList.remove("is-swapping");
      }
    } finally {
      busy = false;
    }
  }

  const isPlainClick = (e) =>
    e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a.pj-item, a.pj-next");
    if (!a || !isPlainClick(e)) return;
    const href = a.getAttribute("href") || "";
    if (!href.startsWith("#")) return;
    e.preventDefault();
    const id = href.slice(1);
    if (id !== current) history.pushState(null, "", href);
    show(id);
  });

  window.addEventListener("popstate", () => show(idFromHash()));

  swap(idFromHash());
})();
