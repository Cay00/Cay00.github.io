/* Podstrony projektów: karuzela opinii, liczniki, podgląd zrzutów */

/* ---------- karuzela opinii ---------- */
(() => {
  const carousel = document.querySelector(".pj-carousel");
  if (!carousel) return;

  const track = carousel.querySelector(".pj-track");
  const prev = document.querySelector('.pj-arrow[data-dir="-1"]');
  const next = document.querySelector('.pj-arrow[data-dir="1"]');
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

  // sterowanie strzałkami, gdy karuzela ma fokus
  carousel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); next.click(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); prev.click(); }
  });

  track.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
})();

/* ---------- liczniki statystyk ----------
   Tekst w HTML to już wartość końcowa — skrypt tylko ją animuje,
   więc przy błędzie lub bez JS liczby i tak są widoczne. */
(() => {
  const nums = document.querySelectorAll(".pj-stat-num[data-count]");
  if (!nums.length || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
      const eased = 1 - Math.pow(1 - t, 4);
      fmt(el, target * eased);
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
})();

/* ---------- podgląd zrzutów ekranu ---------- */
(() => {
  const dialog = document.getElementById("lightbox");
  const shots = document.querySelectorAll(".pj-shot");
  if (!dialog || !shots.length || typeof dialog.showModal !== "function") return;

  const img = dialog.querySelector("img");
  const close = dialog.querySelector(".lightbox-close");

  shots.forEach((btn) => {
    btn.addEventListener("click", () => {
      img.src = btn.dataset.full;
      img.alt = btn.dataset.alt || "";
      dialog.showModal();
    });
  });

  close.addEventListener("click", () => dialog.close());
  // kliknięcie w tło zamyka podgląd
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
})();
