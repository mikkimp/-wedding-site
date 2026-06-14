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
const gameLivesNode = document.querySelector("[data-game-lives]");
const gameItemsNode = document.querySelector("[data-game-items]");
const gameDistanceNode = document.querySelector("[data-game-distance]");
const gameItemNodes = [...document.querySelectorAll("[data-game-item]")];

function initWeddingGame() {
  if (!gameRoot || !gameCanvas) {
    return;
  }

  const ctx = gameCanvas.getContext("2d");
  const keys = { left: false, right: false };
  const input = { jumpBuffer: 0 };
  const LEVEL_SCREENS = 8;
  const physics = {
    gravity: 1480,
    accel: 2350,
    friction: 2000,
    maxSpeed: 302,
    jump: 850,
    coyote: 0.12,
    jumpBuffer: 0.15,
  };
  const itemPlan = [
    {
      key: "bouquet",
      label: "букет",
      x: 0.12,
      y: 170,
      color: "#ff35bc",
      story: "Букет собран: у арки будет живой цвет.",
    },
    {
      key: "vows",
      label: "клятвы",
      x: 0.255,
      y: 248,
      color: "#f7f0dd",
      story: "Конверт с клятвами найден: важные слова с собой.",
    },
    {
      key: "ring",
      label: "кольца",
      x: 0.405,
      y: 202,
      color: "#ffea00",
      story: "Кольца на месте: церемония стала реальнее.",
    },
    {
      key: "glass",
      label: "бокалы",
      x: 0.555,
      y: 150,
      color: "#7fc8ff",
      story: "Бокалы взяты: будет первый тост за двоих.",
    },
    {
      key: "playlist",
      label: "плейлист",
      x: 0.715,
      y: 220,
      color: "#6654b8",
      story: "Плейлист включен: танцы точно начнутся.",
    },
    {
      key: "photo",
      label: "кадр",
      x: 0.865,
      y: 258,
      color: "#c7ccd2",
      story: "Кадр сохранен: эту сцену точно хочется запомнить.",
    },
  ];

  const game = {
    running: false,
    finished: false,
    over: false,
    lastTime: 0,
    viewW: 960,
    viewH: 520,
    levelW: 5600,
    floorY: 438,
    cameraX: 0,
    lives: 3,
    collected: 0,
    checkpointX: 58,
    time: 0,
    message: "",
    messageTimer: 0,
    player: {
      x: 58,
      y: 0,
      w: 40,
      h: 68,
      vx: 0,
      vy: 0,
      grounded: true,
      coyote: 0,
      invulnerable: 0,
      facing: 1,
    },
    bride: { x: 2860, y: 0, w: 38, h: 72 },
    dog: { x: 2910, y: 0, w: 40, h: 30 },
    items: [],
    platforms: [],
    obstacles: [],
    enemies: [],
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
    game.levelW = Math.max(5000, game.viewW * 7.35);
    game.bride.x = game.levelW - 150;
    game.bride.y = game.floorY - game.bride.h;
    game.dog.x = game.bride.x + 46;
    game.dog.y = game.floorY - game.dog.h;
    game.player.y = Math.min(game.player.y || game.floorY - game.player.h, game.floorY - game.player.h);
    buildLevel();
  }

  function buildLevel() {
    const w = game.levelW;
    const floor = game.floorY;
    const platformState = new Map(game.platforms.map((platform) => [platform.key, platform]));
    const enemyState = new Map(game.enemies.map((enemy) => [enemy.key, enemy]));

    game.platforms = [
      { key: "g1", x: 0, y: floor, w: w * 0.16, h: 52, color: "#ff35bc", label: "INTRO" },
      { key: "g2", x: w * 0.18, y: floor, w: w * 0.14, h: 52, color: "#7fc8ff", label: "VERSE" },
      { key: "g3", x: w * 0.34, y: floor, w: w * 0.15, h: 52, color: "#ff6b00", label: "BRIDGE" },
      { key: "g4", x: w * 0.52, y: floor, w: w * 0.14, h: 52, color: "#6654b8", label: "DROP" },
      { key: "g5", x: w * 0.69, y: floor, w: w * 0.13, h: 52, color: "#37bcc7", label: "OUTRO" },
      { key: "g6", x: w * 0.85, y: floor, w: w * 0.15, h: 52, color: "#f7f0dd", label: "CEREMONY" },
      { key: "p0", x: w * 0.075, y: floor - 82, w: 170, h: 26, color: "#7fc8ff", label: "STEP" },
      { key: "p1", x: w * 0.12, y: floor - 150, w: 226, h: 26, color: "#f7f0dd", label: "MIDI" },
      { key: "p1b", x: w * 0.19, y: floor - 96, w: 168, h: 26, color: "#ffea00", label: "KICK" },
      { key: "p2", x: w * 0.245, y: floor - 230, w: 228, h: 26, color: "#c8e000", label: "HI-HAT" },
      { key: "p2b", x: w * 0.335, y: floor - 142, w: 178, h: 26, color: "#ff35bc", label: "SNARE" },
      { key: "p3", x: w * 0.405, y: floor - 178, w: 280, h: 26, color: "#7fc8ff", label: "PAD" },
      { key: "p3b", x: w * 0.5, y: floor - 112, w: 198, h: 26, color: "#37bcc7", label: "BASS" },
      { key: "p4", x: w * 0.575, y: floor - 248, w: 235, h: 26, color: "#f7f0dd", label: "VOCAL" },
      { key: "p4b", x: w * 0.642, y: floor - 138, w: 198, h: 26, color: "#c8e000", label: "JUMP" },
      { key: "p5", x: w * 0.7, y: floor - 188, w: 274, h: 26, color: "#ffea00", label: "CHORUS" },
      { key: "p5b", x: w * 0.758, y: floor - 270, w: 196, h: 26, color: "#6654b8", label: "LEAD" },
      { key: "p6", x: w * 0.812, y: floor - 154, w: 238, h: 26, color: "#ff35bc", label: "FINAL" },
      { key: "p7", x: w * 0.842, y: floor - 226, w: 230, h: 26, color: "#7fc8ff", label: "VOWS" },
      { key: "p7b", x: w * 0.888, y: floor - 118, w: 182, h: 26, color: "#37bcc7", label: "HOME" },
    ].map((platform) => ({
      ...platform,
      touched: platformState.get(platform.key)?.touched || false,
    }));

    game.items = itemPlan.map((item) => ({
      ...item,
      x: game.levelW * item.x,
      y: game.floorY - item.y,
      size: 32,
      collected: game.items.find((old) => old.key === item.key)?.collected || false,
    }));

    game.obstacles = [
      { type: "sync", x: w * 0.215, y: floor - 48, w: 98, h: 48, color: "#c3452b", label: "SYNC\nERROR" },
      { type: "spikes", x: w * 0.305, y: floor - 34, w: 118, h: 34, color: "#111111", label: "FEEDBACK" },
      { type: "mute", x: w * 0.465, y: floor - 60, w: 82, h: 60, color: "#ff35bc", label: "MUTE" },
      { type: "clip", x: w * 0.61, y: floor - 36, w: 98, h: 36, color: "#c3452b", label: "RED CLIP" },
      { type: "spikes", x: w * 0.745, y: floor - 34, w: 112, h: 34, color: "#111111", label: "LOUD" },
      { type: "clip", x: w * 0.792, y: floor - 36, w: 92, h: 36, color: "#c3452b", label: "RED CLIP" },
      { type: "sync", x: w * 0.835, y: floor - 48, w: 98, h: 48, color: "#c3452b", label: "SYNC\nERROR" },
    ];

    game.enemies = [
      { key: "wave1", type: "wave", x: w * 0.275, y: floor - 48, w: 76, h: 38, minX: w * 0.238, maxX: w * 0.345, vx: 86, color: "#6654b8" },
      { key: "wave2", type: "wave", x: w * 0.575, y: floor - 48, w: 86, h: 38, minX: w * 0.545, maxX: w * 0.645, vx: -96, color: "#ff6b00" },
      { key: "wave3", type: "wave", x: w * 0.705, y: floor - 48, w: 80, h: 38, minX: w * 0.69, maxX: w * 0.805, vx: 88, color: "#ff35bc" },
      { key: "wave4", type: "wave", x: w * 0.82, y: floor - 48, w: 78, h: 38, minX: w * 0.8, maxX: w * 0.88, vx: -78, color: "#37bcc7" },
    ].map((enemy) => ({
      ...enemy,
      x: enemyState.get(enemy.key)?.x || enemy.x,
      vx: enemyState.get(enemy.key)?.vx || enemy.vx,
      defeated: enemyState.get(enemy.key)?.defeated || false,
    }));
  }

  function resetGame() {
    game.running = true;
    game.finished = false;
    game.over = false;
    game.lastTime = 0;
    game.cameraX = 0;
    game.lives = 3;
    game.collected = 0;
    game.checkpointX = 58;
    game.message = "";
    game.messageTimer = 0;
    game.sparks = [];
    game.player.x = 58;
    game.player.y = game.floorY - game.player.h;
    game.player.vx = 0;
    game.player.vy = 0;
    game.player.grounded = true;
    game.player.coyote = 0;
    game.player.invulnerable = 0;
    game.player.facing = 1;
    buildLevel();
    game.items.forEach((item) => {
      item.collected = false;
    });
    gameRoot.classList.add("is-running");
    gameRoot.classList.remove("is-finished");
    if (gameStartButton) {
      gameStartButton.textContent = "Заново";
    }
  }

  function finishGame() {
    game.running = false;
    game.finished = true;
    game.over = false;
    game.message = "Миша, Полина и Юми у арки. Ждём гостей на свадьбе!";
    game.messageTimer = 2.4;
    game.player.x = game.bride.x - 76;
    game.player.y = game.floorY - game.player.h;
    game.player.vx = 0;
    game.player.vy = 0;
    gameRoot.classList.add("is-finished");
    if (gameOverlayTitle) {
      gameOverlayTitle.textContent = "Misha + Polina + Юми";
    }
    if (gameOverlayText) {
      gameOverlayText.textContent = "Клятвы произнесены. Ждём вас на нашей свадьбе!";
    }
    if (gameStartButton) {
      gameStartButton.textContent = "Ещё раз";
    }
    const celebrationColors = ["#f7f0dd", "#c7ccd2", "#ff35bc", "#7fc8ff", "#ffea00", "#ff6b00"];
    for (let i = 0; i < 130; i += 1) {
      spawnSpark(
        game.bride.x + (Math.random() - 0.5) * 230,
        game.floorY - 160 - Math.random() * 150,
        celebrationColors[i % celebrationColors.length],
      );
    }
  }

  function jump() {
    if (!game.running) {
      return;
    }

    input.jumpBuffer = physics.jumpBuffer;
  }

  function isTypingTarget(target) {
    return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target?.tagName);
  }

  function isGameInView() {
    const rect = gameRoot.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.78 && rect.bottom > window.innerHeight * 0.22;
  }

  function spawnSpark(x, y, color) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 90 + Math.random() * 240;
    game.sparks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.8 + Math.random() * 0.8,
      size: 3 + Math.random() * 6,
      color: color || (Math.random() > 0.55 ? "#f7f0dd" : "#c7ccd2"),
    });
  }

  function spawnHitSparks(x, y) {
    for (let i = 0; i < 18; i += 1) {
      spawnSpark(x + (Math.random() - 0.5) * 24, y + (Math.random() - 0.5) * 24);
    }
  }

  function showGameMessage(text, duration = 1.4) {
    game.message = text;
    game.messageTimer = duration;
  }

  function defeatEnemy(enemy) {
    enemy.defeated = true;
    game.player.vy = -physics.jump * 0.56;
    game.player.grounded = false;
    showGameMessage("waveform сбит", 1.1);
    for (let i = 0; i < 22; i += 1) {
      spawnSpark(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
    }
  }

  function rectsTouch(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function damagePlayer() {
    if (!game.running || game.player.invulnerable > 0) {
      return;
    }

    game.lives -= 1;
    spawnHitSparks(game.player.x + game.player.w / 2, game.player.y + game.player.h / 2);
    showGameMessage(game.lives > 0 ? `осталось жизней: ${game.lives}` : "жизни закончились", 1.2);
    if (game.lives <= 0) {
      game.running = false;
      game.over = true;
      gameRoot.classList.remove("is-running", "is-finished");
      if (gameOverlayTitle) {
        gameOverlayTitle.textContent = "Ещё попытка";
      }
      if (gameOverlayText) {
        gameOverlayText.textContent = "Три жизни закончились. Препятствия можно перепрыгивать, как в маленьком платформере.";
      }
      if (gameStartButton) {
        gameStartButton.textContent = "Заново";
      }
      return;
    }

    game.player.invulnerable = 1.15;
    game.player.x = Math.max(58, game.checkpointX);
    game.player.y = game.floorY - game.player.h;
    game.player.vx = 0;
    game.player.vy = 0;
    game.player.grounded = true;
  }

  function platformUnderPlayer() {
    const foot = {
      x: game.player.x + 7,
      y: game.player.y + game.player.h,
      w: game.player.w - 14,
      h: 3,
    };
    return game.platforms.some((platform) => rectsTouch(foot, platform));
  }

  function updateGame(dt) {
    game.time += dt;
    game.messageTimer = Math.max(0, game.messageTimer - dt);
    input.jumpBuffer = Math.max(0, input.jumpBuffer - dt);

    if (game.running) {
      const player = game.player;
      player.invulnerable = Math.max(0, player.invulnerable - dt);

      if (keys.left) {
        player.vx -= physics.accel * dt;
        player.facing = -1;
      }

      if (keys.right) {
        player.vx += physics.accel * dt;
        player.facing = 1;
      }

      if (!keys.left && !keys.right) {
        const friction = physics.friction * dt;
        if (Math.abs(player.vx) <= friction) {
          player.vx = 0;
        } else {
          player.vx -= Math.sign(player.vx) * friction;
        }
      }

      player.vx = Math.max(-physics.maxSpeed, Math.min(physics.maxSpeed, player.vx));

      if (player.grounded) {
        player.coyote = physics.coyote;
      } else {
        player.coyote = Math.max(0, player.coyote - dt);
      }

      if (input.jumpBuffer > 0 && (player.grounded || player.coyote > 0)) {
        player.vy = -physics.jump;
        player.grounded = false;
        player.coyote = 0;
        input.jumpBuffer = 0;
      }

      const prevY = player.y;
      player.x += player.vx * dt;
      player.x = Math.max(28, Math.min(player.x, game.bride.x + 24));
      player.vy += physics.gravity * dt;
      player.y += player.vy * dt;
      player.grounded = false;

      game.platforms.forEach((platform) => {
        const wasAbove = prevY + player.h <= platform.y + 10;
        const nowOn = player.y + player.h >= platform.y && player.y + player.h <= platform.y + platform.h + 16;
        const overlapsX = player.x + player.w > platform.x + 6 && player.x < platform.x + platform.w - 6;
        if (player.vy >= 0 && wasAbove && nowOn && overlapsX) {
          player.y = platform.y - player.h;
          player.vy = 0;
          player.grounded = true;
          platform.touched = true;
          if (platform.key?.startsWith("g")) {
            const safeX = Math.min(platform.x + platform.w - player.w - 34, platform.x + 104);
            game.checkpointX = Math.max(game.checkpointX, safeX);
          }
        }
      });

      if (!platformUnderPlayer() && player.grounded) {
        player.grounded = false;
      }

      game.enemies.forEach((enemy) => {
        if (enemy.defeated) {
          return;
        }

        enemy.x += enemy.vx * dt;
        if (enemy.x <= enemy.minX || enemy.x + enemy.w >= enemy.maxX) {
          enemy.x = Math.max(enemy.minX, Math.min(enemy.x, enemy.maxX - enemy.w));
          enemy.vx *= -1;
        }
      });

      game.obstacles.forEach((obstacle) => {
        if (rectsTouch(player, obstacle)) {
          damagePlayer();
        }
      });

      game.enemies.forEach((enemy) => {
        if (enemy.defeated || !rectsTouch(player, enemy)) {
          return;
        }

        const wasAboveEnemy = prevY + player.h <= enemy.y + 14;
        if (player.vy > 0 && wasAboveEnemy) {
          defeatEnemy(enemy);
        } else {
          damagePlayer();
        }
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
          showGameMessage(item.story || `${item.label} собран`, 2.35);
          for (let i = 0; i < 12; i += 1) {
            spawnSpark(item.x, item.y);
          }
        }
      });

      if (player.y > game.viewH + 160) {
        damagePlayer();
      }

      if (player.x >= game.bride.x - 56) {
        if (game.collected >= game.items.length) {
          finishGame();
        } else {
          player.x = game.bride.x - 58;
          player.vx = Math.min(0, player.vx);
          if (game.messageTimer <= 0.1) {
            showGameMessage("Полина ждёт у арки: собери все вещи для церемонии.", 1.8);
          }
        }
      }
    }

    const lookAhead = Math.max(-110, Math.min(180, game.player.vx * 0.38));
    const cameraFocus = game.finished ? game.bride.x + 20 : game.player.x + lookAhead;
    const cameraAnchor = game.finished ? 0.5 : 0.34;
    game.cameraX += ((cameraFocus - game.viewW * cameraAnchor) - game.cameraX) * Math.min(1, dt * 5.6);
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
    if (gameLivesNode) {
      gameLivesNode.textContent = `${"♥ ".repeat(Math.max(0, game.lives)).trim()}${game.lives <= 0 ? "0" : ""}`;
    }

    if (gameItemsNode) {
      gameItemsNode.textContent = `${game.collected}/${game.items.length} собрано`;
    }

    if (gameDistanceNode) {
      const screen = Math.min(LEVEL_SCREENS, Math.max(1, Math.floor((game.player.x / game.levelW) * LEVEL_SCREENS) + 1));
      gameDistanceNode.textContent = `экран ${screen}/${LEVEL_SCREENS}`;
    }

    gameItemNodes.forEach((node) => {
      const item = game.items.find((entry) => entry.key === node.dataset.gameItem);
      node.classList.toggle("is-collected", Boolean(item?.collected));
    });
  }

  function createSilverGradient(x, y, size) {
    const gradient = ctx.createLinearGradient(x - size, y - size, x + size, y + size);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.34, "#c7ccd2");
    gradient.addColorStop(0.62, "#6c727c");
    gradient.addColorStop(1, "#f7f0dd");
    return gradient;
  }

  function drawSilverStar(x, y, size, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = createSilverGradient(0, 0, size);
    ctx.strokeStyle = "rgba(17, 17, 17, 0.62)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(size * 0.24, -size * 0.2, size, 0);
    ctx.quadraticCurveTo(size * 0.24, size * 0.2, 0, size);
    ctx.quadraticCurveTo(-size * 0.24, size * 0.2, -size, 0);
    ctx.quadraticCurveTo(-size * 0.24, -size * 0.2, 0, -size);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawSilverHeart(x, y, size, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = createSilverGradient(0, 0, size);
    ctx.strokeStyle = "rgba(17, 17, 17, 0.58)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.72);
    ctx.bezierCurveTo(-size * 1.35, -size * 0.08, -size * 0.54, -size * 1.1, 0, -size * 0.48);
    ctx.bezierCurveTo(size * 0.54, -size * 1.1, size * 1.35, -size * 0.08, 0, size * 0.72);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawSilverBlob(x, y, size, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = createSilverGradient(0, 0, size);
    ctx.strokeStyle = "rgba(17, 17, 17, 0.46)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-size * 0.8, -size * 0.1);
    ctx.bezierCurveTo(-size * 0.9, -size * 0.9, size * 0.15, -size * 0.95, size * 0.25, -size * 0.25);
    ctx.bezierCurveTo(size * 1.15, -size * 0.38, size * 0.95, size * 0.82, size * 0.1, size * 0.58);
    ctx.bezierCurveTo(-size * 0.4, size * 1.05, -size * 1.15, size * 0.55, -size * 0.8, -size * 0.1);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawTinyFlower(x, y, size, color, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      const angle = (i / 5) * Math.PI * 2;
      ctx.ellipse(
        Math.cos(angle) * size * 0.56,
        Math.sin(angle) * size * 0.56,
        size * 0.42,
        size * 0.24,
        angle,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.fillStyle = "#f7f0dd";
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function roundedRectPath(x, y, w, h, radius) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function wrapCanvasText(text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";

    words.forEach((word) => {
      const nextLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(nextLine).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = nextLine;
      }
    });

    if (line) {
      lines.push(line);
    }

    return lines.slice(0, 3);
  }

  function drawBackground() {
    ctx.fillStyle = "#d5ed2b";
    ctx.fillRect(0, 0, game.viewW, game.viewH);
    ctx.fillStyle = "#f7f0dd";
    ctx.fillRect(0, 0, game.viewW, 38);
    ctx.fillStyle = "#111111";
    ctx.font = "900 12px Arial";
    ctx.fillText("Arrangement View / wedding-run.als", 14, 24);
    ctx.fillStyle = "#ff35bc";
    ctx.beginPath();
    ctx.moveTo(game.viewW - 84, 12);
    ctx.lineTo(game.viewW - 84, 26);
    ctx.lineTo(game.viewW - 68, 19);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#111111";
    ctx.fillText("120 BPM", game.viewW - 158, 24);
    ctx.save();
    ctx.translate(-game.cameraX, 0);

    const lanes = [
      { y: 58, h: 58, label: "DRUMS" },
      { y: 116, h: 58, label: "BASS" },
      { y: 174, h: 58, label: "MIDI" },
      { y: 232, h: 58, label: "VOCAL" },
      { y: 290, h: 58, label: "VOWS" },
      { y: 348, h: Math.max(58, game.floorY - 348), label: "WEDDING" },
    ];

    lanes.forEach((lane, index) => {
      ctx.fillStyle = index % 2 === 0 ? "rgba(247, 240, 221, 0.22)" : "rgba(255, 255, 255, 0.14)";
      ctx.fillRect(0, lane.y, game.levelW, lane.h);
      ctx.strokeStyle = "rgba(17, 17, 17, 0.16)";
      ctx.beginPath();
      ctx.moveTo(0, lane.y);
      ctx.lineTo(game.levelW, lane.y);
      ctx.stroke();
      ctx.fillStyle = "rgba(17, 17, 17, 0.42)";
      ctx.font = "900 10px Arial";
      ctx.fillText(lane.label, game.cameraX + 14, lane.y + 20);
    });

    ctx.strokeStyle = "rgba(17, 17, 17, 0.18)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= game.levelW; x += 96) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, game.viewH);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(17, 17, 17, 0.36)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= game.levelW; x += game.viewW * 0.93) {
      ctx.beginPath();
      ctx.moveTo(x, 38);
      ctx.lineTo(x, game.floorY + 52);
      ctx.stroke();
      ctx.fillStyle = "rgba(17, 17, 17, 0.56)";
      ctx.font = "900 11px Arial";
      ctx.fillText(`SCENE ${String(Math.floor(x / (game.viewW * 0.93)) + 1).padStart(2, "0")}`, x + 8, 55);
    }

    const clipColors = ["#ff35bc", "#7fc8ff", "#ff6b00", "#6654b8", "#37bcc7", "#f7f0dd", "#ffea00"];
    for (let i = 0; i < 18; i += 1) {
      const lane = lanes[(i + 1) % lanes.length];
      const x = 160 + i * 270 + (i % 3) * 54;
      const y = lane.y + 13;
      const w = 136 + (i % 4) * 42;
      const h = 26;
      const color = clipColors[i % clipColors.length];
      if (x > game.levelW - 180) {
        continue;
      }
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(17, 17, 17, 0.24)";
      ctx.fillRect(x, y, w, h);
      ctx.setLineDash([7, 6]);
      ctx.strokeStyle = "rgba(17, 17, 17, 0.62)";
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(247, 240, 221, 0.42)";
      for (let n = x + 12; n < x + w - 10; n += 30) {
        ctx.fillRect(n, y + 8, 15, 4);
      }
      ctx.restore();
    }

    const decor = [
      ["star", 440, 94, 12, -0.2],
      ["heart", 780, 256, 13, 0.18],
      ["blob", 1180, 146, 18, -0.28],
      ["star", 1540, 312, 11, 0.3],
      ["heart", 2050, 116, 12, -0.2],
      ["blob", 2440, 246, 17, 0.24],
      ["star", 2920, 332, 13, -0.14],
      ["heart", 3400, 164, 12, 0.22],
      ["blob", 3860, 290, 18, -0.18],
      ["star", 4260, 106, 12, 0.28],
      ["heart", 4780, 230, 13, -0.2],
      ["blob", 5260, 132, 17, 0.22],
      ["star", 5680, 308, 12, -0.26],
      ["heart", 6120, 96, 12, 0.18],
      ["blob", 6520, 270, 18, -0.2],
    ];
    ctx.globalAlpha = 0.82;
    decor.forEach(([type, x, y, size, rotation]) => {
      if (x < game.cameraX - 100 || x > game.cameraX + game.viewW + 100) {
        return;
      }
      if (type === "heart") {
        drawSilverHeart(x, y, size, rotation);
      } else if (type === "blob") {
        drawSilverBlob(x, y, size, rotation);
      } else {
        drawSilverStar(x, y, size, rotation);
      }
    });
    ctx.globalAlpha = 1;

    const playheadX = game.player.x + game.player.w / 2;
    ctx.strokeStyle = "#ff35bc";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(playheadX, 38);
    ctx.lineTo(playheadX, game.floorY + 52);
    ctx.stroke();
    ctx.fillStyle = "#ff35bc";
    ctx.fillRect(playheadX - 9, 38, 18, 10);

    ctx.restore();
  }

  function drawPlatform(platform) {
    const x = platform.x - game.cameraX;
    if (x + platform.w < -80 || x > game.viewW + 80) {
      return;
    }

    ctx.fillStyle = "rgba(17, 17, 17, 0.22)";
    ctx.fillRect(x + 7, platform.y + 7, platform.w, platform.h);
    ctx.fillStyle = platform.color;
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    ctx.fillRect(x, platform.y, platform.w, platform.h);
    ctx.strokeRect(x, platform.y, platform.w, platform.h);
    ctx.fillStyle = "#f7f0dd";
    ctx.fillRect(x + 4, platform.y + 4, platform.w - 8, 6);
    ctx.fillStyle = "rgba(17, 17, 17, 0.12)";
    ctx.fillRect(x + 4, platform.y + platform.h - 7, platform.w - 8, 3);
    ctx.fillStyle = "rgba(17, 17, 17, 0.2)";
    for (let noteX = x + 14; noteX < x + platform.w - 12; noteX += 34) {
      ctx.fillRect(noteX, platform.y + 8, 18, 5);
    }
    ctx.fillStyle = "#111111";
    ctx.font = "900 11px Arial";
    ctx.fillText(platform.label || "CLIP", x + 10, platform.y + Math.min(18, platform.h - 8));
    ctx.font = "900 8px Arial";
    ctx.fillText("ACTIVE", x + platform.w - 48, platform.y + platform.h - 7);
  }

  function drawItem(item) {
    if (item.collected) {
      return;
    }

    const x = item.x - game.cameraX;
    const y = item.y + Math.sin(game.time * 4 + item.x * 0.01) * 4;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = "#f7f0dd";
    ctx.beginPath();
    ctx.arc(0, 0, 28 + Math.sin(game.time * 5) * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#111111";
    ctx.fillStyle = item.color;

    if (item.key === "bouquet") {
      ctx.strokeStyle = "#2d6f34";
      ctx.lineWidth = 3;
      [-10, 0, 10].forEach((cx) => {
        ctx.beginPath();
        ctx.moveTo(0, 22);
        ctx.lineTo(cx * 0.7, -2);
        ctx.stroke();
      });
      ctx.fillStyle = "#37bcc7";
      ctx.beginPath();
      ctx.ellipse(-9, 12, 9, 4, -0.65, 0, Math.PI * 2);
      ctx.ellipse(9, 12, 9, 4, 0.65, 0, Math.PI * 2);
      ctx.fill();
      [
        [-14, -4, "#ff35bc"],
        [-4, -12, "#f7f0dd"],
        [8, -9, "#ffea00"],
        [15, -1, "#7fc8ff"],
        [0, 0, "#ff6b00"],
      ].forEach(([cx, cy, color]) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#111111";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      });
      ctx.fillStyle = "#f7f0dd";
      ctx.fillRect(-8, 18, 16, 9);
      ctx.strokeRect(-8, 18, 16, 9);
    } else if (item.key === "vows") {
      ctx.fillRect(-18, -12, 36, 24);
      ctx.beginPath();
      ctx.moveTo(-18, -12);
      ctx.lineTo(0, 4);
      ctx.lineTo(18, -12);
      ctx.stroke();
    } else if (item.key === "ring") {
      [[-8, 1], [9, 1]].forEach(([cx, cy]) => {
        const ringGradient = ctx.createLinearGradient(cx - 12, cy - 12, cx + 12, cy + 12);
        ringGradient.addColorStop(0, "#fff6a5");
        ringGradient.addColorStop(0.46, "#ffea00");
        ringGradient.addColorStop(1, "#b98700");
        ctx.fillStyle = ringGradient;
        ctx.beginPath();
        ctx.arc(cx, cy, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#d5ed2b";
        ctx.beginPath();
        ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(6, -10);
      ctx.lineTo(0, -5);
      ctx.lineTo(-6, -10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (item.key === "glass") {
      [[-8, 0], [9, -2]].forEach(([gx, gy]) => {
        ctx.beginPath();
        ctx.moveTo(gx - 8, gy - 14);
        ctx.lineTo(gx + 8, gy - 14);
        ctx.lineTo(gx + 5, gy + 2);
        ctx.lineTo(gx - 5, gy + 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(247, 240, 221, 0.62)";
        ctx.fillRect(gx - 5, gy - 10, 10, 4);
        ctx.fillStyle = item.color;
        ctx.fillRect(gx - 1.5, gy + 2, 3, 18);
        ctx.fillRect(gx - 8, gy + 20, 16, 4);
      });
    } else if (item.key === "playlist") {
      ctx.fillRect(-16, -15, 32, 30);
      ctx.fillStyle = "#f7f0dd";
      ctx.fillRect(-8, -8, 16, 4);
      ctx.fillRect(-8, 0, 22, 4);
      ctx.fillRect(-8, 8, 12, 4);
    } else if (item.key === "photo") {
      roundedRectPath(-18, -14, 36, 30, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#111111";
      ctx.fillRect(-13, -9, 26, 18);
      const photoGradient = ctx.createLinearGradient(-13, -9, 13, 9);
      photoGradient.addColorStop(0, "#7fc8ff");
      photoGradient.addColorStop(0.55, "#f7f0dd");
      photoGradient.addColorStop(1, "#ff35bc");
      ctx.fillStyle = photoGradient;
      ctx.fillRect(-10, -6, 20, 12);
      ctx.fillStyle = "#111111";
      ctx.beginPath();
      ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f7f0dd";
      ctx.beginPath();
      ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#111111";
    ctx.font = "900 10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(item.label.toUpperCase(), 0, 44);
    ctx.restore();
  }

  function drawObstacle(obstacle) {
    const x = obstacle.x - game.cameraX;
    if (x + obstacle.w < -80 || x > game.viewW + 80) {
      return;
    }

    ctx.save();
    ctx.translate(x, obstacle.y);
    const pulse = Math.sin(game.time * 6 + obstacle.x * 0.01) * 0.5 + 0.5;
    ctx.lineJoin = "round";

    if (obstacle.type === "spikes") {
      ctx.fillStyle = "rgba(17, 17, 17, 0.22)";
      ctx.fillRect(5, 8, obstacle.w, obstacle.h);
      ctx.fillStyle = "#c3452b";
      roundedRectPath(0, obstacle.h - 12, obstacle.w, 12, 3);
      ctx.fill();
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 2;
      ctx.stroke();
      for (let sx = 0; sx < obstacle.w - 2; sx += 18) {
        const spikeHeight = 24 + ((sx / 18) % 2) * 6;
        const spikeGradient = ctx.createLinearGradient(0, 0, 0, obstacle.h);
        spikeGradient.addColorStop(0, "#f7f0dd");
        spikeGradient.addColorStop(0.44, "#c7ccd2");
        spikeGradient.addColorStop(1, "#111111");
        ctx.fillStyle = spikeGradient;
        ctx.strokeStyle = "#111111";
        ctx.beginPath();
        ctx.moveTo(sx, obstacle.h - 9);
        ctx.lineTo(sx + 9, obstacle.h - spikeHeight);
        ctx.lineTo(sx + 18, obstacle.h - 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.strokeStyle = "#ff35bc";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i <= 8; i += 1) {
        const px = 8 + i * ((obstacle.w - 16) / 8);
        const py = 12 + (i % 2) * 10;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    } else if (obstacle.type === "sync") {
      const cx = obstacle.w / 2;
      const cy = obstacle.h / 2;
      ctx.fillStyle = "rgba(17, 17, 17, 0.22)";
      ctx.beginPath();
      ctx.moveTo(cx + 6, 5);
      ctx.lineTo(obstacle.w + 8, cy + 6);
      ctx.lineTo(cx + 6, obstacle.h + 8);
      ctx.lineTo(-2, cy + 6);
      ctx.closePath();
      ctx.fill();

      const dangerGradient = ctx.createLinearGradient(0, 0, obstacle.w, obstacle.h);
      dangerGradient.addColorStop(0, "#ff35bc");
      dangerGradient.addColorStop(0.45, "#c3452b");
      dangerGradient.addColorStop(1, "#ff6b00");
      ctx.fillStyle = dangerGradient;
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(obstacle.w, cy);
      ctx.lineTo(cx, obstacle.h);
      ctx.lineTo(0, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "rgba(247, 240, 221, 0.88)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 14 + pulse * 2, -0.8, 0.86);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 14 + pulse * 2, Math.PI - 0.8, Math.PI + 0.86);
      ctx.stroke();
      ctx.fillStyle = "#f7f0dd";
      ctx.font = "900 22px Arial";
      ctx.textAlign = "center";
      ctx.fillText("!", cx, cy + 8);
    } else if (obstacle.type === "mute") {
      const cx = obstacle.w / 2;
      const cy = obstacle.h / 2;
      ctx.fillStyle = "rgba(17, 17, 17, 0.22)";
      ctx.beginPath();
      ctx.ellipse(cx + 6, cy + 7, obstacle.w * 0.5, obstacle.h * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#111111";
      ctx.strokeStyle = "#f7f0dd";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(cx - 27, cy - 12);
      ctx.lineTo(cx - 14, cy - 12);
      ctx.lineTo(cx + 4, cy - 24);
      ctx.lineTo(cx + 4, cy + 24);
      ctx.lineTo(cx - 14, cy + 12);
      ctx.lineTo(cx - 27, cy + 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#ff35bc";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx + 18, cy - 20);
      ctx.lineTo(cx - 24, cy + 20);
      ctx.stroke();
      ctx.lineCap = "butt";
      ctx.fillStyle = "#111111";
      ctx.font = "900 9px Arial";
      ctx.textAlign = "center";
      ctx.fillText("MUTE", cx, obstacle.h - 5);
    } else {
      ctx.fillStyle = "rgba(17, 17, 17, 0.22)";
      roundedRectPath(6, 7, obstacle.w, obstacle.h, 6);
      ctx.fill();
      ctx.fillStyle = "#111111";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 2.2;
      roundedRectPath(0, 0, obstacle.w, obstacle.h, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f7f0dd";
      roundedRectPath(6, 6, obstacle.w - 12, obstacle.h - 12, 4);
      ctx.fill();
      ctx.stroke();

      const meterX = 12;
      const meterY = 12;
      const meterW = obstacle.w - 24;
      const meterH = obstacle.h - 22;
      const bars = 7;
      const gap = 3;
      const barW = (meterW - gap * (bars - 1)) / bars;
      const heights = [0.42, 0.58, 0.72, 0.9, 1, 1, 1];
      for (let i = 0; i < bars; i += 1) {
        const barH = meterH * heights[i];
        const bx = meterX + i * (barW + gap);
        const by = meterY + meterH - barH;
        const barGradient = ctx.createLinearGradient(0, by, 0, by + barH);
        barGradient.addColorStop(0, i > 3 ? "#ff35bc" : "#ff6b00");
        barGradient.addColorStop(0.54, i > 3 ? "#c3452b" : "#ffea00");
        barGradient.addColorStop(1, "#c8e000");
        ctx.fillStyle = barGradient;
        ctx.fillRect(bx, by, barW, barH);
        ctx.strokeStyle = "#111111";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(bx, by, barW, barH);
      }

      ctx.strokeStyle = "#c3452b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(meterX - 2, meterY + 3);
      ctx.lineTo(meterX + meterW + 2, meterY + 3);
      ctx.stroke();

      ctx.fillStyle = "#c3452b";
      roundedRectPath(obstacle.w - 33, 3, 28, 11, 3);
      ctx.fill();
      ctx.fillStyle = "#f7f0dd";
      ctx.font = "900 8px Arial";
      ctx.textAlign = "center";
      ctx.fillText("PEAK", obstacle.w - 19, 11);

      ctx.strokeStyle = "#ff35bc";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, obstacle.h - 7);
      ctx.lineTo(obstacle.w - 10, 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEnemy(enemy) {
    if (enemy.defeated) {
      return;
    }

    const x = enemy.x - game.cameraX;
    if (x + enemy.w < -80 || x > game.viewW + 80) {
      return;
    }

    ctx.fillStyle = "rgba(17, 17, 17, 0.24)";
    ctx.fillRect(x + 5, enemy.y + 5, enemy.w, enemy.h);
    ctx.fillStyle = enemy.color;
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    ctx.fillRect(x, enemy.y, enemy.w, enemy.h);
    ctx.strokeRect(x, enemy.y, enemy.w, enemy.h);
    ctx.fillStyle = "rgba(247, 240, 221, 0.28)";
    ctx.fillRect(x + 6, enemy.y + 5, enemy.w - 12, 5);
    ctx.strokeStyle = "#111111";
    ctx.beginPath();
    for (let i = 0; i < 7; i += 1) {
      const px = x + 8 + i * 10;
      const py = enemy.y + enemy.h / 2 + Math.sin(game.time * 5 + i) * 11;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }

  function drawPerson(person, bride = false) {
    const x = person.x - game.cameraX;
    const y = person.y;
    if (x + person.w < -80 || x > game.viewW + 80) {
      return;
    }

    if (!bride && person.invulnerable > 0 && Math.floor(game.time * 18) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = "#111111";
    const speed = Math.min(1, Math.abs(person.vx || 0) / physics.maxSpeed);
    const walk = Math.sin(game.time * 10) * speed;
    const cx = person.w / 2;

    if (bride) {
      ctx.fillStyle = "rgba(17, 17, 17, 0.2)";
      ctx.beginPath();
      ctx.ellipse(cx, person.h + 4, 22, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      const veil = ctx.createLinearGradient(0, 6, person.w, person.h);
      veil.addColorStop(0, "rgba(255, 255, 255, 0.84)");
      veil.addColorStop(0.64, "rgba(247, 240, 221, 0.42)");
      veil.addColorStop(1, "rgba(247, 240, 221, 0.08)");
      ctx.fillStyle = veil;
      ctx.beginPath();
      ctx.moveTo(cx, 2);
      ctx.bezierCurveTo(cx + 24, 26, cx + 20, 54, cx + 14, person.h);
      ctx.lineTo(cx - 14, person.h);
      ctx.bezierCurveTo(cx - 20, 54, cx - 24, 26, cx, 2);
      ctx.closePath();
      ctx.fill();

      const dress = ctx.createLinearGradient(0, 22, person.w, person.h);
      dress.addColorStop(0, "#ffffff");
      dress.addColorStop(0.6, "#f7f0dd");
      dress.addColorStop(1, "#dfe3de");
      ctx.fillStyle = dress;
      ctx.beginPath();
      ctx.moveTo(cx - 8, 25);
      ctx.bezierCurveTo(cx + 10, 30, cx + 15, 54, cx + 18, person.h);
      ctx.lineTo(cx - 18, person.h);
      ctx.bezierCurveTo(cx - 15, 54, cx - 10, 30, cx + 8, 25);
      ctx.quadraticCurveTo(cx, 20, cx - 8, 25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const bodice = ctx.createLinearGradient(cx - 12, 23, cx + 12, 44);
      bodice.addColorStop(0, "#ffffff");
      bodice.addColorStop(1, "#f7f0dd");
      ctx.fillStyle = bodice;
      roundedRectPath(cx - 11, 25, 22, 22, 8);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = "#f1c7aa";
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - 12, 30);
      ctx.quadraticCurveTo(cx - 18, 42, cx - 13, 51);
      ctx.moveTo(cx + 12, 30);
      ctx.quadraticCurveTo(cx + 18, 42, cx + 13, 51);
      ctx.stroke();
      ctx.fillStyle = "#f1c7aa";
      ctx.beginPath();
      ctx.arc(cx - 13, 51, 2.4, 0, Math.PI * 2);
      ctx.arc(cx + 13, 51, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineCap = "butt";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1.8;

      ctx.fillStyle = "#d6b36f";
      ctx.beginPath();
      ctx.ellipse(cx, 13, 13, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f1c7aa";
      ctx.beginPath();
      ctx.ellipse(cx, 14, 9, 10.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#d6b36f";
      ctx.beginPath();
      ctx.moveTo(cx - 12, 10);
      ctx.bezierCurveTo(cx - 7, 1, cx + 9, 0, cx + 12, 10);
      ctx.bezierCurveTo(cx + 3, 8, cx - 5, 8, cx - 12, 10);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      roundedRectPath(cx - 9, 25, 18, 7, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#111111";
      ctx.beginPath();
      ctx.arc(cx - 4, 13, 1.3, 0, Math.PI * 2);
      ctx.arc(cx + 5, 13, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 1, 18, 2.8, 0.22, Math.PI - 0.22);
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(17, 17, 17, 0.2)";
      ctx.beginPath();
      ctx.ellipse(cx, person.h + 4, 24, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#111111";
      roundedRectPath(cx - 10 + walk * 2.6, 50, 8, 17, 3);
      ctx.fill();
      roundedRectPath(cx + 2 - walk * 2.6, 50, 8, 17, 3);
      ctx.fill();
      roundedRectPath(cx - 13 + walk * 2.6, 64, 15, 4, 2);
      ctx.fill();
      roundedRectPath(cx + 1 - walk * 2.6, 64, 15, 4, 2);
      ctx.fill();

      ctx.fillStyle = "#111111";
      roundedRectPath(3, 22, person.w - 6, 32, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f7f0dd";
      ctx.beginPath();
      ctx.moveTo(cx - 6, 24);
      ctx.lineTo(cx + 6, 24);
      ctx.lineTo(cx + 2, 45);
      ctx.lineTo(cx - 2, 45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#111111";
      ctx.beginPath();
      ctx.moveTo(cx - 4, 26);
      ctx.lineTo(cx, 31);
      ctx.lineTo(cx + 4, 26);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(4, 31);
      ctx.quadraticCurveTo(-4, 39, 5, 44);
      ctx.moveTo(person.w - 4, 31);
      ctx.quadraticCurveTo(person.w + 4, 39, person.w - 5, 44);
      ctx.stroke();
      ctx.fillStyle = "#f1c7aa";
      ctx.beginPath();
      ctx.arc(4, 44, 3, 0, Math.PI * 2);
      ctx.arc(person.w - 4, 44, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineCap = "butt";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1.8;

      ctx.fillStyle = "#f1c7aa";
      ctx.beginPath();
      ctx.ellipse(cx, 12, 10, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#2a211d";
      ctx.beginPath();
      ctx.moveTo(cx - 13, 10);
      ctx.bezierCurveTo(cx - 12, -2, cx + 6, -5, cx + 14, 6);
      ctx.bezierCurveTo(cx + 5, 5, cx - 3, 8, cx - 13, 10);
      ctx.fill();

      ctx.fillStyle = "#111111";
      ctx.beginPath();
      ctx.arc(cx - 4, 13, 1.3, 0, Math.PI * 2);
      ctx.arc(cx + 5, 13, 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + 1, 18, 2.6, 0.18, Math.PI - 0.18);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawDog() {
    const x = game.dog.x - game.cameraX;
    const y = game.dog.y;
    if (x + game.dog.w < -80 || x > game.viewW + 80) {
      return;
    }

    ctx.save();
    ctx.translate(x, y);
    const wag = Math.sin(game.time * 7) * 1.4;
    ctx.fillStyle = "rgba(17, 17, 17, 0.18)";
    ctx.beginPath();
    ctx.ellipse(18, 31, 18, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const fur = ctx.createLinearGradient(2, 4, 36, 29);
    fur.addColorStop(0, "#3a302a");
    fur.addColorStop(0.42, "#171211");
    fur.addColorStop(1, "#070605");
    ctx.fillStyle = fur;
    ctx.strokeStyle = "#0a0807";
    ctx.lineWidth = 1.4;

    ctx.beginPath();
    ctx.ellipse(14, 18, 13, 8.5, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(29, 12, 8.2, 7.2, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#090706";
    ctx.beginPath();
    ctx.ellipse(23.5, 10.5, 4.7, 7.8, -0.42, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#0b0807";
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(3, 17);
    ctx.quadraticCurveTo(-6, 13, -4, 7 + wag);
    ctx.stroke();

    ctx.strokeStyle = "#100d0c";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(6, 23);
    ctx.lineTo(4, 30);
    ctx.moveTo(14, 24);
    ctx.lineTo(13, 31);
    ctx.moveTo(23, 22);
    ctx.lineTo(24, 30);
    ctx.moveTo(30, 18);
    ctx.lineTo(31, 29);
    ctx.stroke();
    ctx.fillStyle = "#0a0807";
    roundedRectPath(2, 29, 6, 2.5, 1.5);
    ctx.fill();
    roundedRectPath(11, 30, 6, 2.5, 1.5);
    ctx.fill();
    roundedRectPath(22, 29, 6, 2.5, 1.5);
    ctx.fill();
    roundedRectPath(29, 28, 6, 2.5, 1.5);
    ctx.fill();
    ctx.lineCap = "butt";

    ctx.fillStyle = "#ff35bc";
    roundedRectPath(21, 15, 13, 3.3, 2);
    ctx.fill();

    ctx.fillStyle = "#2a211d";
    ctx.beginPath();
    ctx.ellipse(34, 13, 5.2, 3.8, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#050403";
    ctx.beginPath();
    ctx.arc(37.5, 12.3, 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#111111";
    ctx.beginPath();
    ctx.arc(31, 10, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(247, 240, 221, 0.7)";
    ctx.beginPath();
    ctx.arc(31.4, 9.6, 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#f7f0dd";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(31, 15, 2.4, 0.15, Math.PI - 0.18);
    ctx.stroke();
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

  function drawGoalArch() {
    const x = game.bride.x - game.cameraX - 86;
    const y = game.floorY - 154;
    if (x > game.viewW + 120 || x < -220) {
      return;
    }

    ctx.save();
    ctx.fillStyle = "rgba(17, 17, 17, 0.14)";
    ctx.beginPath();
    ctx.ellipse(x + 86, game.floorY + 4, 78, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    const curtain = ctx.createLinearGradient(x + 20, y + 28, x + 152, game.floorY);
    curtain.addColorStop(0, "rgba(255, 255, 255, 0.32)");
    curtain.addColorStop(0.64, "rgba(247, 240, 221, 0.16)");
    curtain.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = curtain;
    ctx.beginPath();
    ctx.moveTo(x + 28, game.floorY);
    ctx.bezierCurveTo(x + 34, y + 72, x + 86, y + 14, x + 144, game.floorY);
    ctx.closePath();
    ctx.fill();

    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(17, 17, 17, 0.22)";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(x + 31, y + 150);
    ctx.lineTo(x + 31, y + 76);
    ctx.quadraticCurveTo(x + 86, y + 3, x + 141, y + 76);
    ctx.lineTo(x + 141, y + 150);
    ctx.stroke();

    const archGradient = ctx.createLinearGradient(x + 16, y, x + 156, y + 150);
    archGradient.addColorStop(0, "#ffffff");
    archGradient.addColorStop(0.4, "#c7ccd2");
    archGradient.addColorStop(0.7, "#f7f0dd");
    archGradient.addColorStop(1, "#777d86");
    ctx.strokeStyle = archGradient;
    ctx.lineWidth = 8.5;
    ctx.beginPath();
    ctx.moveTo(x + 27, y + 150);
    ctx.lineTo(x + 27, y + 76);
    ctx.quadraticCurveTo(x + 86, y - 2, x + 145, y + 76);
    ctx.lineTo(x + 145, y + 150);
    ctx.stroke();

    ctx.strokeStyle = "rgba(17, 17, 17, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 27, y + 150);
    ctx.lineTo(x + 27, y + 76);
    ctx.quadraticCurveTo(x + 86, y - 2, x + 145, y + 76);
    ctx.lineTo(x + 145, y + 150);
    ctx.stroke();

    ctx.strokeStyle = "#ff35bc";
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 11]);
    ctx.beginPath();
    ctx.moveTo(x + 38, y + 76);
    ctx.quadraticCurveTo(x + 86, y + 30 + Math.sin(game.time * 2) * 2, x + 134, y + 76);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "rgba(247, 240, 221, 0.82)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 41, y + 88);
    ctx.quadraticCurveTo(x + 86, y + 50, x + 131, y + 88);
    ctx.stroke();

    for (let i = 0; i < 11; i += 1) {
      const px = x + 38 + (i / 10) * 96;
      const py = y + 77 - Math.sin((i / 10) * Math.PI) * 42 + Math.sin(game.time * 3 + i) * 2.5;
      if (i % 2) {
        drawSilverHeart(px, py, 4.7, i * 0.18);
      } else {
        drawSilverStar(px, py, 5.2, i * 0.2);
      }
    }

    [[x + 26, y + 128], [x + 146, y + 128]].forEach(([sx, sy], index) => {
      drawSilverBlob(sx, sy, 7, index ? 0.4 : -0.25);
      drawSilverStar(sx + (index ? -8 : 8), sy - 13, 5.2, index ? -0.2 : 0.2);
      drawSilverHeart(sx + (index ? 8 : -8), sy + 11, 4.8, index ? 0.15 : -0.15);
    });

    [
      [x + 48, y + 76, "#ff35bc", -0.2],
      [x + 64, y + 53, "#7fc8ff", 0.22],
      [x + 87, y + 42, "#ffea00", -0.15],
      [x + 111, y + 55, "#ff6b00", 0.28],
      [x + 126, y + 79, "#c8e000", -0.12],
      [x + 34, y + 132, "#7fc8ff", 0.18],
      [x + 138, y + 132, "#ff35bc", -0.18],
    ].forEach(([fx, fy, color, rotation]) => {
      drawTinyFlower(fx, fy, 5.8, color, rotation);
    });

    ctx.lineCap = "butt";
    ctx.restore();
  }

  function drawGameMessage() {
    if (game.messageTimer <= 0 || !game.message) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = Math.min(1, game.messageTimer * 1.8);
    ctx.fillStyle = "#f7f0dd";
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    const width = Math.min(game.viewW - 38, 470);
    const x = (game.viewW - width) / 2;
    const y = 86;
    ctx.font = "900 13px Arial";
    const lines = wrapCanvasText(game.message, width - 34);
    const height = 32 + lines.length * 17;
    roundedRectPath(x + 5, y + 5, width, height, 8);
    ctx.fillStyle = "rgba(17, 17, 17, 0.18)";
    ctx.fill();
    ctx.fillStyle = "#f7f0dd";
    roundedRectPath(x, y, width, height, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ff35bc";
    roundedRectPath(x + 12, y + 12, 28, 5, 3);
    roundedRectPath(x + width - 40, y + height - 17, 28, 5, 3);
    ctx.fill();
    ctx.fillStyle = "#111111";
    ctx.font = "900 13px Arial";
    ctx.textAlign = "center";
    lines.forEach((line, index) => {
      ctx.fillText(line, game.viewW / 2, y + 36 + index * 17);
    });
    ctx.restore();
  }

  function drawFinalText() {
    if (!game.finished) {
      return;
    }

    ctx.save();
    ctx.fillStyle = "rgba(247, 240, 221, 0.9)";
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    const w = Math.min(340, game.viewW - 48);
    const x = (game.viewW - w) / 2;
    roundedRectPath(x, 62, w, 58, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#111111";
    ctx.textAlign = "center";
    ctx.font = "900 18px Arial";
    ctx.fillText("клятвы произнесены", game.viewW / 2, 88);
    ctx.font = "900 12px Arial";
    ctx.fillText("Misha + Polina + Юми ждут гостей", game.viewW / 2, 106);
    ctx.restore();
  }

  function drawGame() {
    drawBackground();
    game.platforms.forEach((platform) => drawPlatform(platform));
    game.obstacles.forEach((obstacle) => drawObstacle(obstacle));
    game.enemies.forEach((enemy) => drawEnemy(enemy));
    game.items.forEach((item) => drawItem(item));
    drawGoalArch();
    drawPerson(game.bride, true);
    drawDog();
    drawPerson(game.player, false);
    drawSparks();
    drawGameMessage();
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

    const release = () => {
      if (key !== "jump") {
        keys[key] = false;
      }
    };

    const tapMove = () => {
      if (!game.running || key === "jump") {
        return;
      }

      const direction = key === "right" ? 1 : -1;
      game.player.facing = direction;
      game.player.vx = direction * Math.max(Math.abs(game.player.vx), physics.maxSpeed * 0.62);
    };

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      if (key === "jump") {
        jump();
      } else {
        keys[key] = true;
        tapMove();
      }
    });

    button.addEventListener("click", (event) => {
      event.preventDefault();
      if (key === "jump") {
        jump();
      } else {
        tapMove();
      }
    });

    ["pointerup", "pointercancel", "pointerleave", "lostpointercapture"].forEach((eventName) => {
      button.addEventListener(eventName, () => {
        release();
      });
    });
  }

  gameStartButton?.addEventListener("click", resetGame);
  gameCanvas.addEventListener("pointerdown", (event) => {
    if (game.running) {
      event.preventDefault();
      jump();
    }
  });
  setButtonControl(document.querySelector("[data-game-left]"), "left");
  setButtonControl(document.querySelector("[data-game-right]"), "right");
  setButtonControl(document.querySelector("[data-game-jump]"), "jump");

  window.addEventListener("keydown", (event) => {
    if (isTypingTarget(event.target) || !isGameInView()) {
      return;
    }

    if (!game.running) {
      if (["Enter", "Space"].includes(event.code)) {
        event.preventDefault();
        resetGame();
      }
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
