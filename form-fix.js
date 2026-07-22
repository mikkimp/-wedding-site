(() => {
  const form = document.querySelector("#rsvp-form");
  const statusNode = document.querySelector("#form-status");
  const endpoint = "https://formsubmit.co/ajax/mikkcift@yandex.ru";
  const timeoutMs = 12000;
  const storageKey = "misha-polina-rsvp-submissions";

  if (!form || !statusNode) {
    return;
  }

  const zagsField = form.querySelector("[name='upper_pyshma_ceremony']")?.closest("fieldset");
  zagsField?.remove();

  function buildAnswerText(formData) {
    return [
      "Анкета свадьбы Миши и Полины",
      `Имя: ${formData.get("name") || ""}`,
      `Контакт: ${formData.get("contact") || ""}`,
      `Участие: ${formData.get("attendance") || ""}`,
      `Еда: ${formData.get("food") || ""}`,
      `Напитки: ${formData.get("alcohol") || ""}`,
      `Дорога: ${formData.get("transport") || ""}`,
      `Комментарий: ${formData.get("comment") || ""}`,
    ].join("\n");
  }

  function buildPayload(formData) {
    return {
      _subject: formData.get("_subject") || "Свадьба: ответ гостя",
      _template: formData.get("_template") || "table",
      _captcha: formData.get("_captcha") || "false",
      _honey: formData.get("_honey") || "",
      _next: formData.get("_next") || window.location.href,
      "Имя и фамилия": formData.get("name") || "",
      "Контакт": formData.get("contact") || "",
      "Участие": formData.get("attendance") || "",
      "Еда": formData.get("food") || "",
      "Напитки": formData.get("alcohol") || "",
      "Дорога": formData.get("transport") || "",
      "Комментарий": formData.get("comment") || "",
      "Отправлено": new Date().toLocaleString("ru-RU", { timeZone: "Asia/Yekaterinburg" }),
    };
  }

  function saveLocally(payload) {
    try {
      const previous = JSON.parse(localStorage.getItem(storageKey) || "[]");
      previous.push(payload);
      localStorage.setItem(storageKey, JSON.stringify(previous));
    } catch (error) {
      // Private mode or storage restrictions should not block the visible fallback.
    }
  }

  async function copyText(text) {
    if (!navigator.clipboard) {
      return false;
    }

    await navigator.clipboard.writeText(text);
    return true;
  }

  function createTimeoutSignal() {
    if (!window.AbortController) {
      return { signal: undefined, cancel: () => {} };
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    return {
      signal: controller.signal,
      cancel: () => window.clearTimeout(timeoutId),
    };
  }

  function showManualFallback(answerText, copied) {
    const mailLink = document.createElement("a");
    mailLink.href = `mailto:mikkcift@yandex.ru?subject=${encodeURIComponent("Свадьба: ответ гостя")}&body=${encodeURIComponent(answerText)}`;
    mailLink.textContent = "отправить письмом";

    statusNode.textContent = copied
      ? "Автоматическая отправка сейчас не прошла. Ответ скопирован, можно отправить его нам в Telegram или "
      : "Автоматическая отправка сейчас не прошла. Можно отправить ответ нам в Telegram или ";
    statusNode.append(mailLink, ".");
  }

  async function submitForm(formData) {
    const timeout = createTimeoutSignal();
    let response;

    try {
      response = await fetch(endpoint, {
        method: "POST",
        signal: timeout.signal,
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildPayload(formData)),
      });
    } finally {
      timeout.cancel();
    }

    if (!response.ok) {
      throw new Error("FormSubmit HTTP error");
    }

    const result = await response.json().catch(() => null);
    if (!result || String(result.success) !== "true") {
      throw new Error(result?.message || "FormSubmit rejected request");
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const formData = new FormData(form);
    const payload = buildPayload(formData);
    const answerText = buildAnswerText(formData);
    const button = form.querySelector("button[type='submit']");

    if (button) {
      button.disabled = true;
    }
    statusNode.textContent = "Отправляем ответ...";

    try {
      await submitForm(formData);
      form.reset();
      statusNode.textContent = "Спасибо, ответ отправлен.";
    } catch (error) {
      saveLocally(payload);
      const copied = await copyText(answerText).catch(() => false);
      showManualFallback(answerText, copied);
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  }, { capture: true });
})();
