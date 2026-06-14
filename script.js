const RSVP_ENDPOINT = "";
const EXTERNAL_FORM_URL = "";
const LOCAL_RSVP_STORAGE_KEY = "misha-polina-rsvp-test-submissions";
const hero = document.querySelector(".hero");
const audio = document.querySelector("[data-hero-audio]");
const audioToggle = document.querySelector("[data-audio-toggle]");
const audioLabel = document.querySelector("[data-audio-label]");

const guestName = new URLSearchParams(window.location.search).get("name");
if (guestName) {
  document.querySelectorAll("[data-guest-name]").forEach((node) => {
    node.textContent = guestName.trim();
  });
}

const form = document.querySelector("#rsvp-form");
const statusNode = document.querySelector("#form-status");

function setAudioState(isPlaying) {
  if (!hero || !audioToggle || !audioLabel) {
    return;
  }

  if (isPlaying) {
    hero.classList.add("is-midi-active");
  }

  hero.classList.toggle("is-playing", isPlaying);
  audioToggle.setAttribute("aria-pressed", String(isPlaying));
  audioLabel.textContent = isPlaying ? "Pause" : "Play";
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
      if (audioLabel) {
        audioLabel.textContent = "Play";
      }
    }
  });

  audio.addEventListener("pause", () => {
    setAudioState(false);
  });

  audio.addEventListener("ended", () => {
    audio.currentTime = 0;
    setAudioState(false);
    if (hero) {
      hero.classList.remove("is-midi-active");
    }
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

const gameRoot = document.querySelector("[data-wedding-game]");
const gameCanvas = document.querySelector("[data-game-canvas]");
const gameStartButton = document.querySelector("[data-game-start]");
const gameOverlay = document.querySelector("[data-game-overlay]");
const gameOverlayTitle = document.querySelector("[data-game-overlay-title]");
const gameOverlayText = document.querySelector("[data-game-overlay-text]");
const gameItemsNode = document.querySelector("[data-game-items]");
const gameDistanceNode = document.querySelector("[data-game-distance]");

function initWeddingGame() {
  if (!gameRoot || !gameCanvas) {
    return;
  }

  const ctx = gameCanvas.getContext("2d");
  const keys = { left: false, right: false };
  const itemPlan = [
    { key: "bouquet", label: "букет", x: 0.16, y: 132, color: "#ff35bc" },
    { key: "vows", label: "клятвы", x: 0.31, y: 96, color: "#f7f0dd" },
    { key: "ring", label: "кольца", x: 0.49, y: 148, color: "#ffea00" },
    { key: "glass", label: "бокал", x: 0.65, y: 108, color: "#7fc8ff" },
    { key: "heart", label: "сердце", x: 0.81, y: 136, color: "#c7ccd2" },
  ];
  const obstaclePlan = [
    { type: "sync", x: 0.23, w: 94, h: 42, color: "#ff35bc" },
    { type: "wave", x: 0.38, w: 118, h: 54, color: "#6654b8" },
    { type: "mute", x: 0.56, w: 86, h: 72, color: "#ff6b00" },
    { type: "clip", x: 0.72, w: 112, h: 46, color: "#c3452b" },
  ];

  const game = {
    running: false,
    finished: false,
    lastTime: 0,
    viewW: 960,
    viewH: 520,
    levelW: 3000,
    floorY: 438,
    cameraX: 0,
    collected: 0,
    player: {
      x: 58,
      y: 0,
      w: 34,
      h: 62,
      vx: 0,
      vy: 0,
      grounded: true,
      stun: 0,
    },
    bride: { x: 2860, y: 0, w: 38, h: 62 },
    items: [],
    obstacles: [],
    sparks: [],
  };

  function resizeGame() {
    const rect = gameCanvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    game.viewW = Math.max(320, Math.round(rect.width));
    game.viewH = Math.max(320, Math.round(rect.height));
    gameCanvas.width = Math.round(game.viewW * ratio);
    gameCanvas.height = Math.round(game.viewH * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    game.floorY = game.viewH - 72;
    game.levelW = Math.max(2600, game.viewW * 3.1);
    game.bride.x = game.levelW - 130;
    game.bride.y = game.floorY - game.bride.h;
    game.player.y = Math.min(game.player.y || game.floorY - game.player.h, game.floorY - game.player.h);
    buildLevelObjects();
  }

  function buildLevelObjects() {
    game.items = itemPlan.map((item) => ({
      ...item,
      x: game.levelW * item.x,
      y: game.floorY - item.y,
      size: 32,
      collected: game.items.find((old) => old.key === item.key)?.collected || false,
    }));
    game.obstacles = obstaclePlan.map((obstacle) => ({
      ...obstacle,
      x: game.levelW * obstacle.x,
      y: game.floorY - obstacle.h,
    }));
  }

  function resetGame() {
    game.running = true;
    game.finished = false;
    game.lastTime = 0;
    game.cameraX = 0;
    game.collected = 0;
    game.sparks = [];
    game.player.x = 58;
    game.player.y = game.floorY - game.player.h;
    game.player.vx = 0;
    game.player.vy = 0;
    game.player.grounded = true;
    game.player.stun = 0;
    buildLevelObjects();
    game.items.forEach((item) => {
      item.collected = false;
    });
    gameRoot.classList.add("is-running");
    gameRoot.classList.remove("is-finished");
    if (gameStartButton) {
      gameStartButton.textContent = "Ещё раз";
    }
  }

  function finishGame() {
    game.running = false;
    game.finished = true;
    gameRoot.classList.add("is-finished");
    if (gameOverlayTitle) {
      gameOverlayTitle.textContent = "Misha + Polina";
    }
    if (gameOverlayText) {
      gameOverlayText.textContent = "Wedding. Ждём вас на нашей свадьбе!";
    }
    if (gameStartButton) {
      gameStartButton.textContent = "Ещё раз";
    }
    for (let i = 0; i < 90; i += 1) {
      spawnSpark(game.bride.x + (Math.random() - 0.5) * 180, game.floorY - 150 - Math.random() * 120);
    }
  }

  function jump() {
    if (!game.running) {
      resetGame();
      return;
    }

    if (game.player.grounded || game.player.vy > -80) {
      game.player.vy = -690;
      game.player.grounded = false;
    }
  }

  function isTypingTarget(target) {
    return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target?.tagName);
  }

  function isGameInView() {
    const rect = gameRoot.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.78 && rect.bottom > window.innerHeight * 0.22;
  }

  function spawnSpark(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 90 + Math.random() * 240;
    game.sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.8 + Math.random() * 0.8,
      size: 3 + Math.random() * 6,
      color: Math.random() > 0.55 ? "#f7f0dd" : "#c7ccd2",
    });
  }

  function rectsTouch(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function updateGame(dt) {
    if (game.running) {
      const player = game.player;
      const baseSpeed = player.stun > 0 ? 72 : 132;
      player.stun = Math.max(0, player.stun - dt);
      player.vx = baseSpeed + (keys.right ? 92 : 0) - (keys.left ? 135 : 0);
      player.x += player.vx * dt;
      player.vy += 1750 * dt;
      player.y += player.vy * dt;

      if (player.y + player.h >= game.floorY) {
        player.y = game.floorY - player.h;
        player.vy = 0;
        player.grounded = true;
      }

      player.x = Math.max(28, Math.min(player.x, game.bride.x + 18));

      game.obstacles.forEach((obstacle) => {
        if (!rectsTouch(player, obstacle)) {
          return;
        }

        const playerBottom = player.y + player.h;
        if (player.vy >= 0 && playerBottom - player.vy * dt <= obstacle.y + 10) {
          player.y = obstacle.y - player.h;
          player.vy = 0;
          player.grounded = true;
          return;
        }

        player.x -= 72 * dt + 24;
        player.vx = 0;
        player.stun = 0.28;
      });

      game.items.forEach((item) => {
        if (item.collected) {
          return;
        }

        const px = player.x + player.w / 2;
        const py = player.y + player.h / 2;
        const dx = item.x - px;
        const dy = item.y - py;
        if (Math.hypot(dx, dy) < 58) {
          item.collected = true;
          game.collected += 1;
          for (let i = 0; i < 12; i += 1) {
            spawnSpark(item.x, item.y);
          }
        }
      });

      if (player.x >= game.bride.x - 46) {
        finishGame();
      }
    }

    game.cameraX += ((game.player.x - game.viewW * 0.34) - game.cameraX) * Math.min(1, dt * 5);
    game.cameraX = Math.max(0, Math.min(game.cameraX, game.levelW - game.viewW));
    game.sparks = game.sparks
      .map((spark) => ({
        ...spark,
        x: spark.x + spark.vx * dt,
        y: spark.y + spark.vy * dt,
        vy: spark.vy + 420 * dt,
        life: spark.life - dt,
      }))
      .filter((spark) => spark.life > 0);
  }

  function updateHud() {
    if (gameItemsNode) {
      gameItemsNode.textContent = `${game.collected}/${game.items.length} собрано`;
    }

    if (gameDistanceNode) {
      const screen = Math.min(3, Math.max(1, Math.floor((game.player.x / game.levelW) * 3) + 1));
      gameDistanceNode.textContent = `экран ${screen}/3`;
    }
  }

  function drawBackground() {
    ctx.fillStyle = "#d5ed2b";
    ctx.fillRect(0, 0, game.viewW, game.viewH);
    ctx.save();
    ctx.translate(-game.cameraX, 0);
    ctx.strokeStyle = "rgba(111, 120, 0, 0.28)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= game.levelW; x += 96) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, game.viewH);
      ctx.stroke();
    }

    for (let y = 80; y < game.floorY; y += 58) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(game.levelW, y);
      ctx.stroke();
    }

    const clips = [
      [210, 108, 220, 34, "#ff35bc"],
      [520, 172, 190, 34, "#7fc8ff"],
      [920, 126, 250, 34, "#ff6b00"],
      [1280, 224, 210, 34, "#6654b8"],
      [1640, 142, 260, 34, "#37bcc7"],
      [2030, 206, 240, 34, "#ff35bc"],
    ];
    clips.forEach(([x, y, w, h, color]) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#111111";
      ctx.strokeRect(x, y, w, h);
    });

    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, game.floorY + 1);
    ctx.lineTo(game.levelW, game.floorY + 1);
    ctx.stroke();
    ctx.restore();
  }

  function drawItem(item) {
    if (item.collected) {
      return;
    }

    const x = item.x - game.cameraX;
    const y = item.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#111111";
    ctx.fillStyle = item.color;

    if (item.key === "bouquet") {
      ctx.fillRect(-4, 4, 8, 24);
      [-12, 0, 12].forEach((cx) => {
        ctx.beginPath();
        ctx.arc(cx, -4, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    } else if (item.key === "vows") {
      ctx.fillRect(-18, -12, 36, 24);
      ctx.beginPath();
      ctx.moveTo(-18, -12);
      ctx.lineTo(0, 4);
      ctx.lineTo(18, -12);
      ctx.stroke();
    } else if (item.key === "ring") {
      ctx.beginPath();
      ctx.arc(-8, 0, 10, 0, Math.PI * 2);
      ctx.arc(8, 0, 10, 0, Math.PI * 2);
      ctx.stroke();
    } else if (item.key === "glass") {
      ctx.beginPath();
      ctx.moveTo(-12, -14);
      ctx.lineTo(12, -14);
      ctx.lineTo(6, 4);
      ctx.lineTo(-6, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(-2, 4, 4, 20);
      ctx.fillRect(-12, 24, 24, 4);
    } else {
      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.bezierCurveTo(-30, -4, -10, -24, 0, -10);
      ctx.bezierCurveTo(10, -24, 30, -4, 0, 16);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawObstacle(obstacle) {
    const x = obstacle.x - game.cameraX;
    ctx.fillStyle = obstacle.color;
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    ctx.fillRect(x, obstacle.y, obstacle.w, obstacle.h);
    ctx.strokeRect(x, obstacle.y, obstacle.w, obstacle.h);
    ctx.fillStyle = "#111111";
    ctx.font = "900 12px Arial";

    if (obstacle.type === "sync") {
      ctx.fillText("SYNC", x + 10, obstacle.y + 18);
      ctx.fillText("ERROR", x + 10, obstacle.y + 33);
    } else if (obstacle.type === "wave") {
      ctx.beginPath();
      for (let i = 0; i < 7; i += 1) {
        const px = x + 12 + i * 15;
        const py = obstacle.y + obstacle.h / 2 + Math.sin(i) * 16;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    } else if (obstacle.type === "mute") {
      ctx.fillText("MUTE", x + 15, obstacle.y + 40);
    } else {
      ctx.fillText("RED CLIP", x + 14, obstacle.y + 28);
    }
  }

  function drawPerson(person, bride = false) {
    const x = person.x - game.cameraX;
    const y = person.y;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#111111";
    ctx.fillStyle = "#f1c7aa";
    ctx.beginPath();
    ctx.arc(person.w / 2, 10, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (bride) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(person.w / 2, 22);
      ctx.lineTo(person.w + 12, person.h);
      ctx.lineTo(-12, person.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f7f0dd";
      ctx.fillRect(2, 18, person.w - 4, 8);
    } else {
      ctx.fillStyle = "#111111";
      ctx.fillRect(3, 22, person.w - 6, 30);
      ctx.strokeRect(3, 22, person.w - 6, 30);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(person.w / 2 - 4, 24, 8, 18);
      ctx.fillStyle = "#111111";
      ctx.fillRect(6, 52, 8, 12);
      ctx.fillRect(person.w - 14, 52, 8, 12);
    }

    ctx.restore();
  }

  function drawSparks() {
    game.sparks.forEach((spark) => {
      const x = spark.x - game.cameraX;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, spark.life));
      ctx.fillStyle = spark.color;
      ctx.strokeStyle = "#111111";
      ctx.beginPath();
      ctx.moveTo(x, spark.y - spark.size);
      ctx.lineTo(x + spark.size, spark.y);
      ctx.lineTo(x, spark.y + spark.size);
      ctx.lineTo(x - spark.size, spark.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawFinalText() {
    if (!game.finished) {
      return;
    }

    ctx.save();
    ctx.fillStyle = "rgba(247, 240, 221, 0.82)";
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    const w = Math.min(620, game.viewW - 44);
    const x = (game.viewW - w) / 2;
    ctx.fillRect(x, 68, w, 126);
    ctx.strokeRect(x, 68, w, 126);
    ctx.fillStyle = "#111111";
    ctx.textAlign = "center";
    ctx.font = "900 42px Arial";
    ctx.fillText("Misha + Polina", game.viewW / 2, 122);
    ctx.font = "900 18px Arial";
    ctx.fillText("wedding", game.viewW / 2, 152);
    ctx.fillText("ждём вас на нашей свадьбе", game.viewW / 2, 176);
    ctx.restore();
  }

  function drawGame() {
    drawBackground();
    game.obstacles.forEach((obstacle) => drawObstacle(obstacle));
    game.items.forEach((item) => drawItem(item));
    drawPerson(game.bride, true);
    drawPerson(game.player, false);
    drawSparks();
    drawFinalText();
  }

  function frame(timestamp) {
    const dt = Math.min(0.033, (timestamp - (game.lastTime || timestamp)) / 1000);
    game.lastTime = timestamp;
    updateGame(dt);
    updateHud();
    drawGame();
    requestAnimationFrame(frame);
  }

  function setButtonControl(button, key) {
    if (!button) {
      return;
    }

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (key === "jump") {
        jump();
      } else {
        keys[key] = true;
      }
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach((eventName) => {
      button.addEventListener(eventName, () => {
        if (key !== "jump") {
          keys[key] = false;
        }
      });
    });
  }

  gameStartButton?.addEventListener("click", resetGame);
  gameCanvas.addEventListener("pointerdown", jump);
  setButtonControl(document.querySelector("[data-game-left]"), "left");
  setButtonControl(document.querySelector("[data-game-right]"), "right");
  setButtonControl(document.querySelector("[data-game-jump]"), "jump");

  window.addEventListener("keydown", (event) => {
    if (isTypingTarget(event.target) || !isGameInView()) {
      return;
    }

    if (["ArrowUp", "Space", "KeyW"].includes(event.code)) {
      event.preventDefault();
      jump();
    } else if (["ArrowLeft", "KeyA"].includes(event.code)) {
      keys.left = true;
    } else if (["ArrowRight", "KeyD"].includes(event.code)) {
      keys.right = true;
    }
  });
  window.addEventListener("keyup", (event) => {
    if (["ArrowLeft", "KeyA"].includes(event.code)) {
      keys.left = false;
    } else if (["ArrowRight", "KeyD"].includes(event.code)) {
      keys.right = false;
    }
  });
  window.addEventListener("resize", resizeGame);

  resizeGame();
  drawGame();
  requestAnimationFrame(frame);
}

initWeddingGame();

function buildAnswerText(formData) {
  return [
    "Анкета свадьбы Миши и Полины",
    `Имя: ${formData.get("name") || ""}`,
    `Участие: ${formData.get("attendance") || ""}`,
    `Еда: ${formData.get("food") || ""}`,
    `Напитки: ${formData.get("alcohol") || ""}`,
    `Комментарий: ${formData.get("comment") || ""}`,
  ].join("\n");
}

function buildAnswerPayload(formData) {
  return {
    name: formData.get("name") || "",
    attendance: formData.get("attendance") || "",
    food: formData.get("food") || "",
    alcohol: formData.get("alcohol") || "",
    comment: formData.get("comment") || "",
    submittedAt: new Date().toISOString(),
  };
}

function saveLocalTestAnswer(payload) {
  const previous = JSON.parse(localStorage.getItem(LOCAL_RSVP_STORAGE_KEY) || "[]");
  previous.push(payload);
  localStorage.setItem(LOCAL_RSVP_STORAGE_KEY, JSON.stringify(previous));
  return previous.length;
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

      const payload = buildAnswerPayload(formData);
      const answerText = buildAnswerText(formData);
      const testNumber = saveLocalTestAnswer(payload);
      const copied = await copyAnswer(answerText);
      statusNode.textContent = copied
        ? `Тестовый ответ #${testNumber} сохранен в браузере и скопирован в буфер.`
        : `Тестовый ответ #${testNumber} сохранен в браузере.`;
    } catch (error) {
      statusNode.textContent = "Не получилось отправить. Попробуйте еще раз или напишите нам напрямую.";
    } finally {
      button.disabled = false;
    }
  });
}
