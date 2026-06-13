const RSVP_ENDPOINT = "";
const EXTERNAL_FORM_URL = "";
const hero = document.querySelector(".hero");
const audio = document.querySelector("[data-hero-audio]");
const audioToggle = document.querySelector("[data-audio-toggle]");
const audioLabel = document.querySelector("[data-audio-label]");
const audioStatus = document.querySelector("[data-audio-status]");

const guestName = new URLSearchParams(window.location.search).get("name");
if (guestName) {
  document.querySelectorAll("[data-guest-name]").forEach((node) => {
    node.textContent = guestName.trim();
  });
}

const form = document.querySelector("#rsvp-form");
const statusNode = document.querySelector("#form-status");

function setAudioState(isPlaying) {
  if (!hero || !audioToggle || !audioLabel || !audioStatus) {
    return;
  }

  hero.classList.toggle("is-playing", isPlaying);
  audioToggle.setAttribute("aria-pressed", String(isPlaying));
  audioLabel.textContent = isPlaying ? "Pause" : "Play";
  audioStatus.textContent = isPlaying
    ? "трек играет, дорожка едет"
    : "включи трек, и дорожка поедет";
}

if (audio && audioToggle) {
  audioToggle.addEventListener("click", async () => {
    if (!audio.paused) {
      audio.pause();
      setAudioState(false);
      return;
    }

    try {
      await audio.play();
      setAudioState(true);
    } catch (error) {
      if (audioStatus) {
        audioStatus.textContent = "браузер не дал включить звук, нажми еще раз";
      }
    }
  });

  audio.addEventListener("pause", () => {
    setAudioState(false);
  });

  audio.addEventListener("ended", () => {
    audio.currentTime = 0;
    setAudioState(false);
  });
}

function updateCountdown() {
  const target = new Date("2026-08-19T15:00:00+05:00");
  const diff = target.getTime() - Date.now();
  const safeDiff = Math.max(0, diff);
  const days = Math.floor(safeDiff / 86400000);
  const hours = Math.floor((safeDiff % 86400000) / 3600000);
  const minutes = Math.floor((safeDiff % 3600000) / 60000);

  const dayNode = document.querySelector("#cd-days");
  const hourNode = document.querySelector("#cd-hours");
  const minuteNode = document.querySelector("#cd-minutes");

  if (!dayNode || !hourNode || !minuteNode) {
    return;
  }

  dayNode.textContent = String(days);
  hourNode.textContent = String(hours).padStart(2, "0");
  minuteNode.textContent = String(minutes).padStart(2, "0");
}

updateCountdown();
setInterval(updateCountdown, 60000);

function buildAnswerText(formData) {
  return [
    "Анкета свадьбы Миши и Полины",
    `Имя: ${formData.get("name") || ""}`,
    `Участие: ${formData.get("attendance") || ""}`,
    `Формат: ${formData.get("plusOne") || ""}`,
    `Еда: ${formData.get("food") || ""}`,
    `Алкоголь: ${formData.get("alcohol") || ""}`,
    `Комментарий: ${formData.get("comment") || ""}`,
  ].join("\n");
}

async function copyAnswer(text) {
  if (!navigator.clipboard) {
    return false;
  }

  await navigator.clipboard.writeText(text);
  return true;
}

if (form && statusNode) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    statusNode.textContent = "Собираем ответ...";

    try {
      if (RSVP_ENDPOINT) {
        const response = await fetch(RSVP_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(formData)),
        });

        if (!response.ok) {
          throw new Error("Bad response");
        }

        form.reset();
        statusNode.textContent = "Спасибо, ответ отправлен.";
        return;
      }

      if (EXTERNAL_FORM_URL) {
        window.location.href = EXTERNAL_FORM_URL;
        return;
      }

      const answerText = buildAnswerText(formData);
      const copied = await copyAnswer(answerText);
      statusNode.textContent = copied
        ? "Ответ пока скопирован в буфер. Когда подключим анкету, эта кнопка будет отправлять его напрямую."
        : "Ответ собран. Подключите ссылку анкеты в script.js перед публикацией.";
    } catch (error) {
      statusNode.textContent = "Не получилось отправить. Попробуйте еще раз или напишите нам напрямую.";
    } finally {
      button.disabled = false;
    }
  });
}
