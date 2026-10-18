/* Podstrony projektów
   - przełączanie projektów bez przeładowania strony (podmieniana jest tylko prawa kolumna)
   - karuzela opinii, liczniki statystk, podgląd zrzutów */

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
   Wszystkie projekty są w jednym pliku (projekty.html). Źródłem prawdy jest
   adres (#slug): klik w spis zmienia hash, a zdarzenie hashchange pokazuje
   odpowiedni panel. Dzięki temu działa też przycisk „wstecz", ręczna zmiana
   adresu i otwarcie pliku prosto z dysku. Brak blokad — wygrywa ostatni klik. */
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

  const idFromHash = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    return panels.some((p) => p.id === id) ? id : panels[0].id;
  };

  let current = null;
  let token = 0; // numer ostatniego żądania — starsze przejścia są ignorowane

  // pokaż panel (bez animacji)
  function swap(id) {
    const target = panels.find((p) => p.id === id);
    if (!target) return;
    panels.forEach((p) => { p.hidden = p !== target; p.classList.remove("is-swapping"); });
    current = id;
    markCurrent(id);
    document.title = target.dataset.title || document.title;
    window.scrollTo({ top: 0, behavior: "instant" });
    initPanel(target);
  }

  function show(id) {
    if (id === current) {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      return;
    }
    const mine = ++token;

    if (reduceMotion) {
      swap(id);
      return;
    }

    // zawsze kończymy na ostatnim żądanym projekcie, nawet jeśli animacja się wysypie
    const finish = () => { if (mine === token && current !== id) swap(id); };

    if (document.startViewTransition) {
      try {
        const vt = document.startViewTransition(() => { if (mine === token) swap(id); });
        vt.finished.catch(finish).finally(finish);
      } catch {
        swap(id);
      }
    } else {
      // wersja awaryjna: wygaszenie → podmiana → pojawienie się
      const out = panels.find((p) => !p.hidden);
      out?.classList.add("is-swapping");
      setTimeout(() => {
        if (mine !== token) return;
        swap(id);
        const inn = panels.find((p) => !p.hidden);
        inn.classList.add("is-swapping");
        requestAnimationFrame(() => requestAnimationFrame(() => inn.classList.remove("is-swapping")));
      }, 180);
    }
  }

  // klik w link do już otwartego projektu nie zmienia hasha — przewiń na górę
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a.pj-item, a.pj-next");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (href === "#" + current) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    }
  });

  window.addEventListener("hashchange", () => show(idFromHash()));
  window.addEventListener("popstate", () => show(idFromHash()));

  swap(idFromHash());
})();
