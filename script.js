/* ---------- efekty wizualne ---------- */
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // nav: tło z rozmyciem po przewinięciu
  const nav = document.querySelector(".nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // projekty: odsłonięcie zdjęcia przy wejściu w viewport.
  // Zdjęcia są domyślnie widoczne; chowamy je dopiero tutaj i tylko te,
  // które faktycznie są poza ekranem. Obserwujemy cały wiersz (nie przycięte
  // zdjęcie), a awaryjny timer odsłania wszystko, gdyby obserwator zawiódł.
  const rows = document.querySelectorAll(".project-row");
  if (!("IntersectionObserver" in window) || reduceMotion || !rows.length) return;

  const reveal = (img) => img.classList.add("is-in");

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const img = entry.target.querySelector(".project-image");
      if (img) reveal(img);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -8% 0px" });

  rows.forEach((row) => {
    const img = row.querySelector(".project-image");
    if (!img) return;
    const rect = row.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) return; // już widoczne — nie chowamy
    img.classList.add("will-reveal");
    io.observe(row);
  });

  // zapas: jeśli obserwator z jakiegokolwiek powodu nie zadziała,
  // sprawdzamy pozycję zdjęć przy przewijaniu i po załadowaniu strony
  const sweep = () => {
    document.querySelectorAll(".project-image.will-reveal:not(.is-in)").forEach((img) => {
      if (img.getBoundingClientRect().top < window.innerHeight * 0.92) reveal(img);
    });
  };
  window.addEventListener("scroll", sweep, { passive: true });
  window.addEventListener("load", () => setTimeout(sweep, 800));
})();

(() => {
  const form = document.querySelector(".contact-form");
  if (!form) return;

  const fields = [...form.querySelectorAll("input, textarea")];

  const messages = {
    valueMissing: "To pole jest wymagane.",
    typeMismatch: "Podaj poprawny adres email.",
    badInput: "Podaj poprawną wartość.",
  };

  function messageFor(input) {
    if (input.validity.valueMissing) return messages.valueMissing;
    if (input.validity.typeMismatch) return messages.typeMismatch;
    if (input.validity.badInput) return messages.badInput;
    return input.validationMessage;
  }

  function setInvalid(input, show) {
    const field = input.closest(".form-field");
    const error = field?.querySelector(".form-error");
    const errorText = error?.querySelector(".form-error-text");
    if (!field || !error || !errorText) return;

    if (show) {
      field.classList.add("is-invalid");
      input.setAttribute("aria-invalid", "true");
      error.hidden = false;
      errorText.textContent = messageFor(input);
    } else {
      field.classList.remove("is-invalid");
      input.removeAttribute("aria-invalid");
      error.hidden = true;
      errorText.textContent = "";
    }
  }

  function validateField(input) {
    const valid = input.checkValidity();
    setInvalid(input, !valid);
    return valid;
  }

  fields.forEach((input) => {
    input.addEventListener("blur", () => validateField(input));
    input.addEventListener("input", () => {
      if (input.closest(".form-field")?.classList.contains("is-invalid")) {
        validateField(input);
      }
    });
  });

  const submitBtn = form.querySelector('button[type="submit"]');
  const ACCESS_KEY = "bf57c06b-ee47-429b-9673-2e5a6f534826";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    let firstInvalid = null;
    fields.forEach((input) => {
      if (!validateField(input) && !firstInvalid) firstInvalid = input;
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const formData = new FormData(form);
    formData.append("access_key", ACCESS_KEY);

    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Wysyłanie...";
    submitBtn.disabled = true;

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        alert("Wiadomość została wysłana.");
        form.reset();
        fields.forEach((input) => setInvalid(input, false));
      } else {
        alert("Błąd: " + (data.message || "Nie udało się wysłać wiadomości."));
      }
    } catch {
      alert("Coś poszło nie tak. Spróbuj ponownie.");
    } finally {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
})();
