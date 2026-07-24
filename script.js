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

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    let firstInvalid = null;
    fields.forEach((input) => {
      if (!validateField(input) && !firstInvalid) firstInvalid = input;
    });

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    // Placeholder — podłącz endpoint / obsługę wysyłki gdy będzie gotowa
    form.reset();
  });
})();
