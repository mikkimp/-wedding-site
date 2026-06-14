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

function initWeddingGame() {
  if (!gameRoot || !gameCanvas) {
    return;
  }

  const ctx = gameCanvas.getContext("2d");
  const keys = { left: false, right: false };
  const input = { jumpBuffer: 0 };
  const LEVEL_SCREENS = 7;
  const physics = {
    gravity: 1680,
    accel: 2300,
    friction: 1900,
    maxSpeed: 292,
    jump: 670,
    coyote: 0.12,
    jumpBuffer: 0.15,
  };
  const itemPlan = [
    { key: "bouquet", label: "букет", x: 0.13, y: 104, color: "#ff35bc" },
    { key: "vows", label: "клятвы", x: 0.25, y: 172, color: "#f7f0dd" },
    { key: "ring", label: "кольца", x: 0.39, y: 106, color: "#ffea00" },
    { key: "glass", label: "бокал", x: 0.55, y: 184, color: "#7fc8ff" },
    { key: "playlist", label: "плейлист", x: 0.72, y: 114, color: "#6654b8" },
    { key: "heart", label: "сердце", x: 0.86, y: 160, color: "#c7ccd2" },
  ];

  const game = {
    running: false,
    finished: false,
    over: false,
    lastTime: 0,
    viewW: 960,
    viewH: 520,
    levelW: 5200,
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
    bride: { x: 2860, y: 0, w: 42, h: 68 },
    dog: { x: 2910, y: 0, w: 28, h: 22 },
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
    game.levelW = Math.max(4300, game.viewW * 6.5);
    game.bride.x = game.levelW - 190;
    game.bride.y = game.floorY - game.bride.h;
    game.dog.x = game.bride.x + 48;
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
      { key: "g1", x: 0, y: floor, w: w * 0.18, h: 52, color: "#ff35bc", label: "INTRO" },
      { key: "g2", x: w * 0.2, y: floor, w: w * 0.16, h: 52, color: "#7fc8ff", label: "VERSE" },
      { key: "g3", x: w * 0.37, y: floor, w: w * 0.19, h: 52, color: "#ff6b00", label: "BRIDGE" },
      { key: "g4", x: w * 0.58, y: floor, w: w * 0.17, h: 52, color: "#6654b8", label: "DROP" },
      { key: "g5", x: w * 0.77, y: floor, w: w * 0.23, h: 52, color: "#37bcc7", label: "OUTRO" },
      { key: "p1", x: w * 0.115, y: floor - 112, w: 240, h: 26, color: "#f7f0dd", label: "MIDI" },
      { key: "p2", x: w * 0.255, y: floor - 172, w: 230, h: 26, color: "#c8e000", label: "HI-HAT" },
      { key: "p3", x: w * 0.43, y: floor - 124, w: 280, h: 26, color: "#7fc8ff", label: "PAD" },
      { key: "p4", x: w * 0.6, y: floor - 198, w: 235, h: 26, color: "#f7f0dd", label: "VOCAL" },
      { key: "p5", x: w * 0.715, y: floor - 128, w: 280, h: 26, color: "#ffea00", label: "CHORUS" },
      { key: "p6", x: w * 0.84, y: floor - 166, w: 240, h: 26, color: "#ff35bc", label: "FINAL" },
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
      { type: "sync", x: w * 0.225, y: floor - 48, w: 98, h: 48, color: "#c3452b", label: "SYNC\nERROR" },
      { type: "spikes", x: w * 0.325, y: floor - 34, w: 118, h: 34, color: "#111111", label: "FEEDBACK" },
      { type: "mute", x: w * 0.49, y: floor - 72, w: 88, h: 72, color: "#ff35bc", label: "MUTE" },
      { type: "clip", x: w * 0.645, y: floor - 50, w: 132, h: 50, color: "#c3452b", label: "RED CLIP" },
      { type: "spikes", x: w * 0.81, y: floor - 34, w: 126, h: 34, color: "#111111", label: "LOUD" },
      { type: "sync", x: w * 0.91, y: floor - 48, w: 98, h: 48, color: "#c3452b", label: "SYNC\nERROR" },
    ];

    game.enemies = [
      { key: "wave1", type: "wave", x: w * 0.275, y: floor - 48, w: 76, h: 38, minX: w * 0.238, maxX: w * 0.345, vx: 86, color: "#6654b8" },
      { key: "wave2", type: "wave", x: w * 0.6, y: floor - 48, w: 86, h: 38, minX: w * 0.59, maxX: w * 0.735, vx: -96, color: "#ff6b00" },
      { key: "wave3", type: "wave", x: w * 0.79, y: floor - 48, w: 80, h: 38, minX: w * 0.77, maxX: w * 0.88, vx: 88, color: "#ff35bc" },
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
      gameStartButton.textContent = "Ещё раз";
    }
  }

  function finishGame() {
    game.running = false;
    game.finished = true;
    game.over = false;
    game.message = "финиш";
    game.messageTimer = 2.4;
    gameRoot.classList.add("is-finished");
    if (gameOverlayTitle) {
      gameOverlayTitle.textContent = "Misha + Polina + Юми";
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

    input.jumpBuffer = physics.jumpBuffer;
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
    game.player.x = Math.max(58, game.checkpointX - 120);
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
            game.checkpointX = Math.max(game.checkpointX, platform.x + 80);
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
          for (let i = 0; i < 12; i += 1) {
            spawnSpark(item.x, item.y);
          }
        }
      });

      if (player.y > game.viewH + 160) {
        damagePlayer();
      }

      if (player.x >= game.bride.x - 56) {
        finishGame();
      }
    }

    const lookAhead = Math.max(-110, Math.min(180, game.player.vx * 0.38));
    game.cameraX += ((game.player.x + lookAhead - game.viewW * 0.34) - game.cameraX) * Math.min(1, dt * 5.6);
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
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "#111111";
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "rgba(17, 17, 17, 0.22)";
      for (let n = x + 12; n < x + w - 10; n += 30) {
        ctx.fillRect(n, y + 8, 15, 4);
      }
    }

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
    ctx.fillStyle = "rgba(247, 240, 221, 0.28)";
    ctx.fillRect(x + 4, platform.y + 4, platform.w - 8, 5);
    ctx.fillStyle = "rgba(17, 17, 17, 0.2)";
    for (let noteX = x + 14; noteX < x + platform.w - 12; noteX += 34) {
      ctx.fillRect(noteX, platform.y + 8, 18, 5);
    }
    ctx.fillStyle = "#111111";
    ctx.font = "900 11px Arial";
    ctx.fillText(platform.label || "CLIP", x + 10, platform.y + Math.min(18, platform.h - 8));
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
    } else if (item.key === "playlist") {
      ctx.fillRect(-16, -15, 32, 30);
      ctx.fillStyle = "#f7f0dd";
      ctx.fillRect(-8, -8, 16, 4);
      ctx.fillRect(-8, 0, 22, 4);
      ctx.fillRect(-8, 8, 12, 4);
    } else {
      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.bezierCurveTo(-30, -4, -10, -24, 0, -10);
      ctx.bezierCurveTo(10, -24, 30, -4, 0, 16);
      ctx.fill();
      ctx.stroke();
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

    ctx.fillStyle = "rgba(17, 17, 17, 0.24)";
    ctx.fillRect(x + 6, obstacle.y + 6, obstacle.w, obstacle.h);
    ctx.fillStyle = obstacle.color;
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    if (obstacle.type === "spikes") {
      ctx.fillStyle = "#c3452b";
      ctx.fillRect(x, obstacle.y + obstacle.h - 10, obstacle.w, 10);
      ctx.strokeRect(x, obstacle.y + obstacle.h - 10, obstacle.w, 10);
      ctx.fillStyle = "#111111";
      for (let sx = 0; sx < obstacle.w; sx += 18) {
        ctx.beginPath();
        ctx.moveTo(x + sx, obstacle.y + obstacle.h);
        ctx.lineTo(x + sx + 9, obstacle.y);
        ctx.lineTo(x + sx + 18, obstacle.y + obstacle.h);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ctx.fillRect(x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeRect(x, obstacle.y, obstacle.w, obstacle.h);
      ctx.fillStyle = "rgba(247, 240, 221, 0.32)";
      for (let stripe = 6; stripe < obstacle.w - 6; stripe += 20) {
        ctx.fillRect(x + stripe, obstacle.y + 4, 8, obstacle.h - 8);
      }
      ctx.strokeStyle = "#111111";
      ctx.strokeRect(x, obstacle.y, obstacle.w, obstacle.h);
    }
    ctx.fillStyle = "#111111";
    ctx.font = "900 12px Arial";

    if (obstacle.type === "sync") {
      ctx.fillStyle = "#f7f0dd";
      ctx.beginPath();
      ctx.arc(x + obstacle.w - 18, obstacle.y + 17, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#111111";
      ctx.fillText("!", x + obstacle.w - 21, obstacle.y + 22);
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
      ctx.fillStyle = "#f7f0dd";
      ctx.fillRect(x + 14, obstacle.y + 13, obstacle.w - 28, 10);
      ctx.fillRect(x + 14, obstacle.y + 31, obstacle.w - 28, 10);
      ctx.fillStyle = "#111111";
      ctx.fillText("MUTE", x + 15, obstacle.y + 40);
    } else {
      ctx.fillText("RED CLIP", x + 14, obstacle.y + 28);
    }
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
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#111111";
    const walk = Math.sin(game.time * 12) * Math.min(7, Math.abs(person.vx || 0) / 36);

    if (bride) {
      ctx.fillStyle = "rgba(17, 17, 17, 0.2)";
      ctx.beginPath();
      ctx.ellipse(person.w / 2, person.h + 3, 30, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(247, 240, 221, 0.7)";
      ctx.beginPath();
      ctx.moveTo(person.w / 2, 8);
      ctx.lineTo(person.w + 20, person.h - 4);
      ctx.lineTo(-20, person.h - 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#4b2d1c";
      ctx.fillRect(person.w / 2 - 17, 3, 34, 26);
      ctx.fillStyle = "#f1c7aa";
      ctx.beginPath();
      ctx.arc(person.w / 2, 12, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(person.w / 2, 22);
      ctx.lineTo(person.w + 12, person.h);
      ctx.lineTo(-12, person.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f7f0dd";
      ctx.fillRect(2, 22, person.w - 4, 8);
      ctx.fillStyle = "#111111";
      ctx.fillRect(person.w / 2 - 11, 11, 3, 2);
      ctx.fillRect(person.w / 2 + 8, 11, 3, 2);
    } else {
      ctx.fillStyle = "rgba(17, 17, 17, 0.2)";
      ctx.beginPath();
      ctx.ellipse(person.w / 2, person.h + 3, 24, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111111";
      ctx.fillRect(7 + walk, 52, 8, 15);
      ctx.fillRect(person.w - 15 - walk, 52, 8, 15);
      ctx.fillRect(3 + walk, 64, 15, 4);
      ctx.fillRect(person.w - 20 - walk, 64, 15, 4);
      ctx.fillStyle = "#f1c7aa";
      ctx.beginPath();
      ctx.arc(person.w / 2, 10, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#2d211a";
      ctx.fillRect(person.w / 2 - 13, 0, 26, 10);
      ctx.fillStyle = "#111111";
      ctx.fillRect(3, 22, person.w - 6, 30);
      ctx.strokeRect(3, 22, person.w - 6, 30);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(person.w / 2 - 4, 24, 8, 18);
      ctx.fillStyle = "#f7f0dd";
      ctx.fillRect(person.w / 2 - 2, 25, 4, 15);
      ctx.fillStyle = "#111111";
      ctx.fillRect(person.w / 2 - 11, 10, 3, 2);
      ctx.fillRect(person.w / 2 + 8, 10, 3, 2);
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
    ctx.fillStyle = "rgba(17, 17, 17, 0.2)";
    ctx.beginPath();
    ctx.ellipse(12, 30, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111111";
    ctx.strokeStyle = "#111111";
    ctx.fillRect(0, 8, 24, 12);
    ctx.fillRect(18, 2, 12, 12);
    ctx.fillRect(4, 20, 4, 8);
    ctx.fillRect(18, 20, 4, 8);
    ctx.fillStyle = "#ff35bc";
    ctx.fillRect(18, 12, 12, 3);
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.lineTo(-10, 3 + Math.sin(game.time * 8) * 4);
    ctx.stroke();
    ctx.fillStyle = "#f7f0dd";
    ctx.fillRect(26, 6, 3, 3);
    ctx.fillStyle = "#111111";
    ctx.font = "900 9px Arial";
    ctx.fillText("Юми", -2, -4);
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
    const x = game.bride.x - game.cameraX - 52;
    const y = game.floorY - 116;
    if (x > game.viewW + 120 || x < -220) {
      return;
    }

    ctx.save();
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 3;
    ctx.fillStyle = "#f7f0dd";
    ctx.fillRect(x, y, 122, 116);
    ctx.strokeRect(x, y, 122, 116);
    ctx.fillStyle = "#c7ccd2";
    for (let i = 0; i < 6; i += 1) {
      const sx = x + 18 + i * 17;
      const sy = y + 18 + Math.sin(game.time * 3 + i) * 5;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 7);
      ctx.lineTo(sx + 7, sy);
      ctx.lineTo(sx, sy + 7);
      ctx.lineTo(sx - 7, sy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = "#111111";
    ctx.font = "900 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("WEDDING", x + 61, y + 56);
    ctx.fillText("FINISH", x + 61, y + 76);
    ctx.restore();
  }

  function drawGameMessage() {
    if (game.messageTimer <= 0 || !game.message) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = Math.min(1, game.messageTimer);
    ctx.fillStyle = "#f7f0dd";
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    const text = game.message.toUpperCase();
    const width = Math.min(game.viewW - 38, 260);
    ctx.fillRect((game.viewW - width) / 2, 52, width, 38);
    ctx.strokeRect((game.viewW - width) / 2, 52, width, 38);
    ctx.fillStyle = "#111111";
    ctx.font = "900 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText(text, game.viewW / 2, 76);
    ctx.restore();
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
    ctx.fillText("wedding + Юми", game.viewW / 2, 152);
    ctx.fillText("ждём вас на нашей свадьбе", game.viewW / 2, 176);
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
