const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const playerImg = new Image();
const enemyImg = new Image();

playerImg.src = "player.png";
enemyImg.src = "enemy.png";

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const livesEl = document.getElementById("lives");

const finalScoreEl = document.getElementById("finalScore");
const finalBestEl = document.getElementById("finalBest");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const pauseBtn = document.getElementById("pauseBtn");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const touchControls = document.getElementById("touchControls");

let W = 0;
let H = 0;
let DPR = 1;

let running = false;
let paused = false;
let lastTime = 0;

let score = 0;
let lives = 3;
let best = Number(localStorage.getItem("dliAirStrikeBest") || 0);

let level = 1;
let killsThisStage = 0;
let stageTarget = 12;

let bossActive = false;
let bossDefeated = false;

let enemyTimer = 0;
let autoFireTimer = 0;
let obstacleTimer = 0;

let stageMessageTimer = 0;

const keys = new Set();

const bullets = [];
const enemies = [];
const enemyBullets = [];
const bossBullets = [];
const obstacles = [];
const particles = [];
const stars = [];

const player = {
  x: 0,
  y: 0,
  w: 82,
  h: 82,
  speed: 650,
  targetX: null,
  targetY: null,
  invincible: 0
};

let boss = null;

/* -------------------------
   BASIC HELPERS
-------------------------- */

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function collision(a, b) {
  return (
    Math.abs(a.x - b.x) <
      (a.w + b.w) * 0.38 &&
    Math.abs(a.y - b.y) <
      (a.h + b.h) * 0.38
  );
}

function updateHUD() {
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  bestEl.textContent = best;
}

function resizeCanvas() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);

  W = canvas.clientWidth;
  H = canvas.clientHeight;

  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  player.w = clamp(W * 0.105, 58, 94);
  player.h = player.w;

  player.x = clamp(
    player.x || W / 2,
    player.w / 2,
    W - player.w / 2
  );

  player.y = clamp(
    player.y || H - 130,
    70,
    H - player.h / 2 - 20
  );

  createStars();
}

window.addEventListener("resize", resizeCanvas);

function createStars() {
  stars.length = 0;

  const count = Math.max(
    50,
    Math.floor((W * H) / 8500)
  );

  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: random(0.4, 1.8),
      speed: random(30, 100),
      alpha: random(0.25, 0.9)
    });
  }
}

resizeCanvas();

/* -------------------------
   GAME RESET
-------------------------- */

function resetGame() {
  score = 0;
  lives = 3;

  level = 1;
  killsThisStage = 0;
  stageTarget = 12;

  bossActive = false;
  bossDefeated = false;
  boss = null;

  enemyTimer = 0.5;
  autoFireTimer = 0.1;
  obstacleTimer = 2;

  stageMessageTimer = 2;

  bullets.length = 0;
  enemies.length = 0;
  enemyBullets.length = 0;
  bossBullets.length = 0;
  obstacles.length = 0;
  particles.length = 0;

  player.x = W / 2;
  player.y = H - Math.max(120, H * 0.16);

  player.targetX = null;
  player.targetY = null;
  player.invincible = 0;

  updateHUD();
}

/* -------------------------
   START / GAME OVER
-------------------------- */

function startGame() {
  resetGame();

  running = true;
  paused = false;

  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");

  pauseBtn.textContent = "Ⅱ";

  startAudio();

  lastTime = performance.now();

  requestAnimationFrame(gameLoop);
}

function gameOver() {
  running = false;
  paused = false;

  stopMusic();

  if (score > best) {
    best = score;

    localStorage.setItem(
      "dliAirStrikeBest",
      String(best)
    );
  }

  finalScoreEl.textContent = score;
  finalBestEl.textContent = best;

  updateHUD();

  saveLeaderboardScore(score);
  showLeaderboard(gameOverScreen);

  gameOverScreen.classList.remove("hidden");
}

function quitGame() {
  running = false;
  paused = false;

  stopMusic();

  bullets.length = 0;
  enemies.length = 0;
  enemyBullets.length = 0;
  bossBullets.length = 0;
  obstacles.length = 0;
  particles.length = 0;

  pauseBtn.textContent = "Ⅱ";

  gameOverScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");

  showLeaderboard(startScreen);
}

/* -------------------------
   BUTTON EVENTS
-------------------------- */

startBtn.addEventListener(
  "click",
  startGame
);

restartBtn.addEventListener(
  "click",
  startGame
);

pauseBtn.addEventListener(
  "click",
  togglePause
);

/* -------------------------
   KEYBOARD
-------------------------- */

window.addEventListener("keydown", event => {
  if (
    [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      " "
    ].includes(event.key)
  ) {
    event.preventDefault();
  }

  keys.add(event.key);

  if (
    event.key === "Escape" ||
    event.key.toLowerCase() === "p"
  ) {
    togglePause();
  }
});

window.addEventListener("keyup", event => {
  keys.delete(event.key);
});

/* -------------------------
   REMOVE OLD JOYSTICK
-------------------------- */

if (touchControls) {
  touchControls.style.display = "none";
    }
/* =========================
   PART 2 — TOUCH MOVEMENT
========================= */

function setTouchTarget(event) {
  if (!running || paused) return;

  const rect = canvas.getBoundingClientRect();

  const scaleX = W / rect.width;
  const scaleY = H / rect.height;

  const x =
    (event.clientX - rect.left) * scaleX;

  const y =
    (event.clientY - rect.top) * scaleY;

  player.targetX = clamp(
    x,
    player.w / 2,
    W - player.w / 2
  );

  player.targetY = clamp(
    y,
    75,
    H - player.h / 2 - 15
  );
}

canvas.addEventListener(
  "pointerdown",
  event => {
    if (
      event.pointerType === "touch" ||
      event.pointerType === "pen"
    ) {
      event.preventDefault();

      canvas.setPointerCapture?.(
        event.pointerId
      );

      setTouchTarget(event);
    }
  },
  { passive: false }
);

canvas.addEventListener(
  "pointermove",
  event => {
    if (
      event.pointerType === "touch" ||
      event.pointerType === "pen"
    ) {
      event.preventDefault();

      setTouchTarget(event);
    }
  },
  { passive: false }
);

canvas.addEventListener(
  "pointerup",
  event => {
    if (
      event.pointerType === "touch" ||
      event.pointerType === "pen"
    ) {
      player.targetX = null;
      player.targetY = null;
    }
  }
);

canvas.addEventListener(
  "pointercancel",
  () => {
    player.targetX = null;
    player.targetY = null;
  }
);


/* =========================
   PAUSE SYSTEM
========================= */

let pauseOverlay = null;

function createPauseOverlay() {
  if (pauseOverlay) return;

  pauseOverlay =
    document.createElement("div");

  pauseOverlay.id =
    "dliPauseOverlay";

  Object.assign(
    pauseOverlay.style,
    {
      position: "absolute",
      inset: "0",
      zIndex: "100",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      background:
        "rgba(0,0,0,.82)",
      backdropFilter:
        "blur(8px)"
    }
  );

  const box =
    document.createElement("div");

  Object.assign(
    box.style,
    {
      width: "min(380px,90%)",
      padding: "28px",
      textAlign: "center",
      borderRadius: "22px",
      background:
        "rgba(8,18,45,.97)",
      border:
        "1px solid rgba(100,180,255,.3)",
      boxShadow:
        "0 20px 70px rgba(0,0,0,.6)"
    }
  );

  const title =
    document.createElement("h2");

  title.textContent =
    "GAME PAUSED";

  title.style.margin =
    "0 0 22px";

  box.appendChild(title);

  const resume =
    createPauseButton(
      "RESUME GAME"
    );

  const restart =
    createPauseButton(
      "RESTART GAME"
    );

  const quit =
    createPauseButton(
      "QUIT GAME"
    );

  resume.onclick = () => {
    togglePause();
  };

  restart.onclick = () => {
    hidePauseOverlay();
    startGame();
  };

  quit.onclick = () => {
    hidePauseOverlay();
    quitGame();
  };

  box.append(
    resume,
    restart,
    quit
  );

  pauseOverlay.appendChild(box);

  const shell =
    document.querySelector(
      ".game-shell"
    );

  if (shell) {
    shell.appendChild(
      pauseOverlay
    );
  } else {
    document.body.appendChild(
      pauseOverlay
    );
  }
}

function createPauseButton(text) {
  const button =
    document.createElement(
      "button"
    );

  button.textContent = text;

  Object.assign(
    button.style,
    {
      display: "block",
      width: "100%",
      margin: "10px 0",
      padding: "13px",
      border: "none",
      borderRadius: "12px",
      cursor: "pointer",
      fontWeight: "800",
      fontSize: "14px"
    }
  );

  return button;
}

function showPauseOverlay() {
  createPauseOverlay();

  pauseOverlay.style.display =
    "flex";
}

function hidePauseOverlay() {
  if (pauseOverlay) {
    pauseOverlay.style.display =
      "none";
  }
}

function togglePause() {
  if (!running) return;

  paused = !paused;

  if (paused) {
    pauseBtn.textContent = "▶";

    showPauseOverlay();

    stopMusic();
  } else {
    pauseBtn.textContent = "Ⅱ";

    hidePauseOverlay();

    startAudio();

    lastTime =
      performance.now();

    requestAnimationFrame(
      gameLoop
    );
  }
}


/* =========================
   PLAYER MOVEMENT
========================= */

function updatePlayer(dt) {

  if (
    player.targetX !== null &&
    player.targetY !== null
  ) {

    const dx =
      player.targetX -
      player.x;

    const dy =
      player.targetY -
      player.y;

    const distance =
      Math.hypot(dx, dy);

    if (distance > 3) {

      const movement =
        Math.min(
          distance,
          player.speed * dt
        );

      player.x +=
        (dx / distance) *
        movement;

      player.y +=
        (dy / distance) *
        movement;
    }

  } else {

    let dx = 0;
    let dy = 0;

    if (
      keys.has("ArrowLeft") ||
      keys.has("a") ||
      keys.has("A")
    ) dx--;

    if (
      keys.has("ArrowRight") ||
      keys.has("d") ||
      keys.has("D")
    ) dx++;

    if (
      keys.has("ArrowUp") ||
      keys.has("w") ||
      keys.has("W")
    ) dy--;

    if (
      keys.has("ArrowDown") ||
      keys.has("s") ||
      keys.has("S")
    ) dy++;

    const length =
      Math.hypot(dx, dy) || 1;

    player.x +=
      (dx / length) *
      player.speed *
      dt;

    player.y +=
      (dy / length) *
      player.speed *
      dt;
  }

  player.x = clamp(
    player.x,
    player.w / 2,
    W - player.w / 2
  );

  player.y = clamp(
    player.y,
    70,
    H - player.h / 2 - 15
  );

  if (player.invincible > 0) {
    player.invincible -= dt;
  }
}


/* =========================
   ENEMY SYSTEM
========================= */

function spawnEnemy() {

  const isBig =
    Math.random() <
    Math.min(
      0.30,
      0.10 + level * 0.02
    );

  const size = isBig
    ? random(82, 112)
    : random(52, 72);

  const enemy = {

    x:
      random(
        size / 2,
        W - size / 2
      ),

    y: -size,

    w: size,

    h: size * 0.86,

    speed: isBig
      ? random(55, 90) +
        level * 5
      : random(90, 145) +
        level * 7,

    hp: isBig
      ? 3 + Math.floor(level / 3)
      : 1,

    points: isBig
      ? 300 + level * 30
      : 50 + level * 5,

    big: isBig,

    fireTimer:
      random(1.0, 2.8),

    phase:
      Math.random() *
      Math.PI * 2
  };

  enemies.push(enemy);
}


/* =========================
   PLAYER AUTO FIRE
========================= */

function firePlayer() {

  if (!running || paused) {
    return;
  }

  bullets.push({

    x:
      player.x -
      player.w * 0.20,

    y:
      player.y -
      player.h * 0.42,

    w: 6,

    h: 20,

    speed: 820
  });

  bullets.push({

    x:
      player.x +
      player.w * 0.20,

    y:
      player.y -
      player.h * 0.42,

    w: 6,

    h: 20,

    speed: 820
  });

  playShootSound();
}


/* =========================
   ENEMY FIRE
========================= */

function enemyFire(enemy) {

  enemyBullets.push({

    x: enemy.x,

    y:
      enemy.y +
      enemy.h * 0.42,

    w:
      enemy.big
        ? 10
        : 7,

    h:
      enemy.big
        ? 22
        : 16,

    speed:
      enemy.big
        ? 260 + level * 8
        : 220 + level * 7
  });
}


/* =========================
   BULLET UPDATE
========================= */

function updateBullets(dt) {

  for (
    let i = bullets.length - 1;
    i >= 0;
    i--
  ) {

    const bullet =
      bullets[i];

    bullet.y -=
      bullet.speed * dt;

    if (
      bullet.y <
      -40
    ) {
      bullets.splice(i, 1);
    }
  }
}


/* =========================
   ENEMY BULLET UPDATE
========================= */

function updateEnemyBullets(dt) {

  for (
    let i =
      enemyBullets.length - 1;
    i >= 0;
    i--
  ) {

    const bullet =
      enemyBullets[i];

    bullet.y +=
      bullet.speed * dt;

    if (
      bullet.y >
      H + 50
    ) {

      enemyBullets.splice(
        i,
        1
      );

      continue;
    }

    if (
      collision(
        bullet,
        player
      )
    ) {

      enemyBullets.splice(
        i,
        1
      );

      damagePlayer();

    }
  }
    }

function spawnObstacle() {
  const size = random(45, 85);

  obstacles.push({
    x: random(size / 2, W - size / 2),
    y: -size,
    w: size,
    h: size,
    speed: random(120, 190) + level * 8,
    rotation: random(0, Math.PI * 2),
    rotationSpeed: random(-1.5, 1.5)
  });
}

function updateObstacles(dt) {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obstacle = obstacles[i];

    obstacle.y += obstacle.speed * dt;
    obstacle.rotation += obstacle.rotationSpeed * dt;

    if (obstacle.y > H + 100) {
      obstacles.splice(i, 1);
      continue;
    }

    if (collision(obstacle, player)) {
      obstacles.splice(i, 1);
      damagePlayer();
    }
  }
}

function createBoss() {
  bossActive = true;

  boss = {
    x: W / 2,
    y: -130,
    w: Math.min(180, W * 0.30),
    h: Math.min(150, W * 0.25),
    hp: 40 + level * 15,
    maxHp: 40 + level * 15,
    speed: 100 + level * 5,
    direction: 1,
    fireTimer: 1.2,
    moveTimer: 0
  };

  stageMessageTimer = 3;
}

function updateBoss(dt) {
  if (!boss) return;

  if (boss.y < 130) {
    boss.y += 90 * dt;
    return;
  }

  boss.moveTimer += dt;

  boss.x += boss.direction * boss.speed * dt;

  if (boss.x < boss.w / 2 + 15) {
    boss.x = boss.w / 2 + 15;
    boss.direction = 1;
  }

  if (boss.x > W - boss.w / 2 - 15) {
    boss.x = W - boss.w / 2 - 15;
    boss.direction = -1;
  }

  boss.fireTimer -= dt;

  if (boss.fireTimer <= 0) {
    fireBoss();
    boss.fireTimer = Math.max(0.65, 1.4 - level * 0.04);
  }

  if (collision(boss, player)) {
    damagePlayer();
  }
}

function fireBoss() {
  if (!boss) return;

  const bulletCount = 8;

  for (let i = 0; i < bulletCount; i++) {
    const angle =
      (Math.PI * 2 * i) / bulletCount +
      performance.now() * 0.00035;

    bossBullets.push({
      x: boss.x,
      y: boss.y,
      w: 12,
      h: 12,
      vx: Math.cos(angle) * (190 + level * 10),
      vy: Math.sin(angle) * (190 + level * 10),
      life: 4
    });
  }

  playBossSound();
}

function updateBossBullets(dt) {
  for (let i = bossBullets.length - 1; i >= 0; i--) {
    const bullet = bossBullets[i];

    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    if (
      bullet.life <= 0 ||
      bullet.x < -50 ||
      bullet.x > W + 50 ||
      bullet.y < -50 ||
      bullet.y > H + 50
    ) {
      bossBullets.splice(i, 1);
      continue;
    }

    if (collision(bullet, player)) {
      bossBullets.splice(i, 1);
      damagePlayer();
    }
  }
}

function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    enemy.y += enemy.speed * dt;

    enemy.x +=
      Math.sin(performance.now() * 0.0015 + enemy.phase) *
      (25 + level * 2) *
      dt;

    enemy.fireTimer -= dt;

    if (enemy.fireTimer <= 0 && enemy.y > 0) {
      enemyFire(enemy);
      enemy.fireTimer = random(1.4, 3.0);
    }

    if (enemy.y > H + enemy.h) {
      enemies.splice(i, 1);
      continue;
    }

    if (collision(enemy, player)) {
      enemies.splice(i, 1);
      damagePlayer();
      explode(enemy.x, enemy.y, enemy.big ? 18 : 10);
    }
  }
}

function checkBulletHits() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    let hit = false;

    // Boss hit
    if (bossActive && boss && collision(bullet, boss)) {
      const hitX = bullet.x;
      const hitY = bullet.y;

      bullets.splice(i, 1);

      boss.hp -= 1;
      explode(hitX, hitY, 4);
      playHitSound();

      if (boss.hp <= 0) {
        defeatBoss();
      }

      continue;
    }

    // Normal enemy hit
    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];

      if (collision(bullet, enemy)) {
        const hitX = bullet.x;
        const hitY = bullet.y;

        bullets.splice(i, 1);

        enemy.hp -= 1;

        explode(hitX, hitY, enemy.big ? 6 : 4);
        playHitSound();

        if (enemy.hp <= 0) {
          score += enemy.points;
          killsThisStage++;

          explode(
            enemy.x,
            enemy.y,
            enemy.big ? 22 : 12
          );

          enemies.splice(j, 1);

          updateHUD();
          checkStageProgress();
        }

        hit = true;
        break;
      }
    }

    if (hit) continue;
  }
}

function checkStageProgress() {
  if (bossActive) return;

  if (killsThisStage >= stageTarget) {
    enemies.length = 0;
    enemyBullets.length = 0;

    createBoss();
  }
}

function defeatBoss() {
  if (!boss) return;

  score += 1000 + level * 250;

  explode(
    boss.x,
    boss.y,
    55
  );

  boss = null;
  bossActive = false;
  bossDefeated = true;

  level++;
  killsThisStage = 0;

  stageTarget = 12 + level * 3;

  enemyTimer = 1;
  obstacleTimer = 1.5;
  stageMessageTimer = 3;

  bossBullets.length = 0;

  updateHUD();
}

function damagePlayer() {
  if (!running || paused) return;

  if (player.invincible > 0) return;

  lives--;

  player.invincible = 1.5;

  explode(
    player.x,
    player.y,
    16
  );

  updateHUD();

  if (lives <= 0) {
    gameOver();
  }
}

function explode(x, y, amount = 12) {
  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = random(60, 260);

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: random(2, 7),
      life: random(0.35, 0.9),
      maxLife: 0.9
    });
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.vx *= 0.97;
    p.vy *= 0.97;

    p.life -= dt;

    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function updateStars(dt) {
  for (const star of stars) {
    star.y += star.speed * dt;

    if (star.y > H + 5) {
      star.y = -5;
      star.x = Math.random() * W;
    }
  }
}

function updateGame(dt) {
  updateStars(dt);
  updatePlayer(dt);

  enemyTimer -= dt;
  obstacleTimer -= dt;
  autoFireTimer -= dt;

  if (stageMessageTimer > 0) {
    stageMessageTimer -= dt;
  }

  // Auto shooting
  if (autoFireTimer <= 0) {
    firePlayer();
    autoFireTimer = 0.24;
  }

  // Spawn normal enemies
  if (!bossActive && enemyTimer <= 0) {
    spawnEnemy();

    const baseTime = Math.max(
      0.35,
      1.05 - level * 0.045
    );

    enemyTimer = random(
      baseTime * 0.65,
      baseTime * 1.25
    );
  }

  // Spawn obstacles
  if (!bossActive && obstacleTimer <= 0) {
    spawnObstacle();

    obstacleTimer = random(
      Math.max(1.3, 2.5 - level * 0.05),
      Math.max(2.0, 4.0 - level * 0.05)
    );
  }

  updateBullets(dt);
  updateEnemyBullets(dt);
  updateBossBullets(dt);

  updateEnemies(dt);
  updateObstacles(dt);

  if (bossActive) {
    updateBoss(dt);
  }

  checkBulletHits();
  updateParticles(dt);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(
    0,
    0,
    0,
    H
  );

  gradient.addColorStop(0, "#020817");
  gradient.addColorStop(0.5, "#061b3d");
  gradient.addColorStop(1, "#020817");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  for (const star of stars) {
    ctx.globalAlpha = star.alpha;

    ctx.beginPath();
    ctx.arc(
      star.x,
      star.y,
      star.r,
      0,
      Math.PI * 2
    );

    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function drawPlayer() {
  if (player.invincible > 0) {
    const blink =
      Math.floor(player.invincible * 12) % 2 === 0;

    if (!blink) return;
  }

  ctx.save();

  ctx.translate(player.x, player.y);

  ctx.drawImage(
    playerImg,
    -player.w / 2,
    -player.h / 2,
    player.w,
    player.h
  );

  ctx.restore();
}

function drawEnemies() {
  for (const enemy of enemies) {
    ctx.save();

    ctx.translate(enemy.x, enemy.y);

    if (enemy.big) {
      ctx.shadowBlur = 18;
      ctx.shadowColor = "#ff3b3b";
    }

    ctx.drawImage(
      enemyImg,
      -enemy.w / 2,
      -enemy.h / 2,
      enemy.w,
      enemy.h
    );

    ctx.restore();
  }
}

function drawBoss() {
  if (!boss) return;

  ctx.save();

  ctx.translate(boss.x, boss.y);

  ctx.shadowBlur = 25;
  ctx.shadowColor = "#ff1744";

  ctx.drawImage(
    enemyImg,
    -boss.w / 2,
    -boss.h / 2,
    boss.w,
    boss.h
  );

  ctx.restore();

  // Boss HP bar
  const barW = Math.min(360, W * 0.72);
  const barH = 14;
  const barX = (W - barW) / 2;
  const barY = 18;

  ctx.fillStyle = "rgba(0,0,0,.65)";
  ctx.fillRect(
    barX,
    barY,
    barW,
    barH
  );

  ctx.fillStyle = "#ff334f";

  ctx.fillRect(
    barX,
    barY,
    barW * Math.max(0, boss.hp / boss.maxHp),
    barH
  );

  ctx.strokeStyle = "rgba(255,255,255,.7)";
  ctx.strokeRect(
    barX,
    barY,
    barW,
    barH
  );
}

function drawBullets() {
  for (const bullet of bullets) {
    ctx.save();

    ctx.fillStyle = "#7dd3fc";
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#38bdf8";

    ctx.fillRect(
      bullet.x - bullet.w / 2,
      bullet.y - bullet.h / 2,
      bullet.w,
      bullet.h
    );

    ctx.restore();
  }
}

function drawEnemyBullets() {
  for (const bullet of enemyBullets) {
    ctx.save();

    ctx.fillStyle = "#ffcc33";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#ff9900";

    ctx.fillRect(
      bullet.x - bullet.w / 2,
      bullet.y - bullet.h / 2,
      bullet.w,
      bullet.h
    );

    ctx.restore();
  }
}

function drawBossBullets() {
  for (const bullet of bossBullets) {
    ctx.save();

    ctx.fillStyle = "#ff3158";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ff003c";

    ctx.beginPath();

    ctx.arc(
      bullet.x,
      bullet.y,
      7,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }
}

function drawObstacles() {
  for (const obstacle of obstacles) {
    ctx.save();

    ctx.translate(
      obstacle.x,
      obstacle.y
    );

    ctx.rotate(obstacle.rotation);

    ctx.fillStyle = "#596579";
    ctx.strokeStyle = "#aab4c5";
    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.moveTo(
      -obstacle.w * 0.5,
      -obstacle.h * 0.2
    );

    ctx.lineTo(
      -obstacle.w * 0.2,
      -obstacle.h * 0.5
    );

    ctx.lineTo(
      obstacle.w * 0.45,
      -obstacle.h * 0.35
    );

    ctx.lineTo(
      obstacle.w * 0.5,
      obstacle.h * 0.2
    );

    ctx.lineTo(
      obstacle.w * 0.15,
      obstacle.h * 0.5
    );

    ctx.lineTo(
      -obstacle.w * 0.45,
      obstacle.h * 0.35
    );

    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.save();

    ctx.globalAlpha =
      Math.max(0, p.life / p.maxLife);

    ctx.fillStyle = "#ffd166";

    ctx.beginPath();

    ctx.arc(
      p.x,
      p.y,
      p.size,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }

  ctx.globalAlpha = 1;
}

function drawStageMessage() {
  if (stageMessageTimer <= 0) return;

  ctx.save();

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (bossActive && boss) {
    ctx.font = "900 28px Arial";
    ctx.fillStyle = "#ff405c";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#ff003c";

    ctx.fillText(
      "BOSS INCOMING!",
      W / 2,
      H * 0.35
    );
  } else if (bossDefeated) {
    ctx.font = "900 24px Arial";
    ctx.fillStyle = "#7dd3fc";

    ctx.fillText(
      `STAGE ${level}`,
      W / 2,
      H * 0.35
    );
  }

  ctx.restore();
}

function drawGame() {
  drawBackground();
  drawObstacles();
  drawBullets();
  drawEnemyBullets();
  drawBossBullets();
  drawEnemies();
  drawBoss();
  drawParticles();
  drawPlayer();
  drawStageMessage();
}

function gameLoop(timestamp) {
  if (!running || paused) return;

  const dt = Math.min(
    (timestamp - lastTime) / 1000,
    0.033
  );

  lastTime = timestamp;

  updateGame(dt);
  drawGame();

  requestAnimationFrame(gameLoop);
      }
// ================================
// PART 4/4 — SOUND + MUSIC + FINAL SETUP
// ================================

let audioCtx = null;
let musicGain = null;
let musicTimer = null;
let audioStarted = false;

function initAudio() {
  if (audioCtx) return;

  const AudioContext =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContext) return;

  audioCtx = new AudioContext();

  musicGain = audioCtx.createGain();
  musicGain.gain.value = 0.035;
  musicGain.connect(audioCtx.destination);
}

function startAudio() {
  initAudio();

  if (!audioCtx) return;

  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  if (audioStarted) return;

  audioStarted = true;
  startMusic();
}

function createTone(
  frequency,
  duration,
  type = "sine",
  volume = 0.08
) {
  if (!audioCtx) return;

  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  gain.gain.setValueAtTime(
    volume,
    audioCtx.currentTime
  );

  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioCtx.currentTime + duration
  );

  oscillator.connect(gain);
  gain.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(
    audioCtx.currentTime + duration
  );
}

function playShootSound() {
  if (!audioCtx) return;

  createTone(
    620,
    0.07,
    "square",
    0.035
  );

  setTimeout(() => {
    createTone(
      880,
      0.045,
      "square",
      0.025
    );
  }, 20);
}

function playHitSound() {
  if (!audioCtx) return;

  createTone(
    150,
    0.08,
    "sawtooth",
    0.06
  );

  createTone(
    90,
    0.12,
    "square",
    0.035
  );
}

function playBossSound() {
  if (!audioCtx) return;

  createTone(
    90,
    0.35,
    "sawtooth",
    0.08
  );

  setTimeout(() => {
    createTone(
      55,
      0.45,
      "square",
      0.06
    );
  }, 100);
}

function startMusic() {
  if (!audioCtx || musicTimer) return;

  const notes = [
    110,
    146.83,
    164.81,
    196,
    164.81,
    146.83,
    130.81,
    98
  ];

  let index = 0;

  musicTimer = setInterval(() => {
    if (!running || paused) return;

    const frequency =
      notes[index % notes.length];

    const oscillator =
      audioCtx.createOscillator();

    const gain =
      audioCtx.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(
      0.001,
      audioCtx.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
      0.045,
      audioCtx.currentTime + 0.04
    );

    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioCtx.currentTime + 0.28
    );

    oscillator.connect(gain);
    gain.connect(musicGain);

    oscillator.start();
    oscillator.stop(
      audioCtx.currentTime + 0.3
    );

    index++;
  }, 320);
}

function stopMusic() {
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}


// ======================================
// LEADERBOARD
// ======================================

const leaderboardKey =
  "dliAirStrikeLeaderboard";

function getLeaderboard() {
  try {
    return JSON.parse(
      localStorage.getItem(
        leaderboardKey
      ) || "[]"
    );
  } catch {
    return [];
  }
}

function saveLeaderboardScore(newScore) {
  if (!newScore || newScore <= 0) return;

  const leaderboard =
    getLeaderboard();

  leaderboard.push({
    score: newScore,
    date: new Date().toLocaleDateString()
  });

  leaderboard.sort(
    (a, b) => b.score - a.score
  );

  const topScores =
    leaderboard.slice(0, 10);

  localStorage.setItem(
    leaderboardKey,
    JSON.stringify(topScores)
  );
}

function showLeaderboard(parent) {
  if (!parent) return;

  const old =
    parent.querySelector(
      ".dli-leaderboard"
    );

  if (old) old.remove();

  const leaderboard =
    getLeaderboard();

  const box =
    document.createElement("div");

  box.className =
    "dli-leaderboard";

  Object.assign(box.style, {
    width: "min(420px,92%)",
    margin: "18px auto 0",
    padding: "16px",
    borderRadius: "16px",
    background: "rgba(5,15,35,.82)",
    border:
      "1px solid rgba(100,180,255,.22)",
    boxSizing: "border-box",
    textAlign: "left"
  });

  const title =
    document.createElement("div");

  title.textContent =
    "🏆 TOP 10 SCORES";

  Object.assign(title.style, {
    fontSize: "15px",
    fontWeight: "900",
    marginBottom: "10px",
    textAlign: "center"
  });

  box.appendChild(title);

  if (leaderboard.length === 0) {
    const empty =
      document.createElement("div");

    empty.textContent =
      "No scores yet. Be the first pilot!";

    empty.style.textAlign =
      "center";

    empty.style.opacity =
      "0.7";

    box.appendChild(empty);
  } else {
    leaderboard.forEach(
      (entry, index) => {
        const row =
          document.createElement("div");

        Object.assign(row.style, {
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          padding: "7px 4px",
          borderBottom:
            "1px solid rgba(255,255,255,.07)",
          fontSize: "13px"
        });

        const rank =
          document.createElement("span");

        rank.textContent =
          `${index + 1}.`;

        rank.style.width =
          "35px";

        const scoreText =
          document.createElement("span");

        scoreText.textContent =
          `${entry.score} pts`;

        scoreText.style.fontWeight =
          "800";

        const date =
          document.createElement("span");

        date.textContent =
          entry.date;

        date.style.opacity =
          "0.55";

        date.style.fontSize =
          "11px";

        row.append(
          rank,
          scoreText,
          date
        );

        box.appendChild(row);
      }
    );
  }

  parent.appendChild(box);
}


// ======================================
// HOME SCREEN LOGO / TITLE
// ======================================

function improveHomeScreen() {
  if (!startScreen) return;

  const logo =
    startScreen.querySelector(
      ".logo"
    );

  if (logo) {
    logo.style.transform =
      "scale(1.12)";

    logo.style.marginBottom =
      "18px";

    logo.style.filter =
      "drop-shadow(0 0 18px rgba(50,160,255,.45))";
  }

  const title =
    startScreen.querySelector(
      "h1"
    );

  if (title) {
    title.style.fontWeight =
      "900";

    title.style.letterSpacing =
      "1px";
  }

  showLeaderboard(startScreen);
}


// ======================================
// SAFE BUTTON SETUP
// ======================================

if (startBtn) {
  startBtn.addEventListener(
    "pointerdown",
    () => {
      startAudio();
    },
    { passive: true }
  );
}


// ======================================
// PREVENT MOBILE PAGE SCROLL
// ======================================

document.addEventListener(
  "touchmove",
  event => {
    if (running) {
      event.preventDefault();
    }
  },
  { passive: false }
);


// ======================================
// VISIBILITY HANDLING
// ======================================

document.addEventListener(
  "visibilitychange",
  () => {
    if (
      document.hidden &&
      running &&
      !paused
    ) {
      togglePause();
    }
  }
);


// ======================================
// INITIAL SETUP
// ======================================

playerImg.onload = () => {
  drawGame();
};

enemyImg.onload = () => {
  drawGame();
};

improveHomeScreen();

updateHUD();

drawGame();


// ======================================
// START SCREEN LEADERBOARD REFRESH
// ======================================

window.addEventListener(
  "storage",
  event => {
    if (
      event.key === leaderboardKey
    ) {
      if (!running) {
        showLeaderboard(
          startScreen
        );
      }
    }
  }
);


// ======================================
// KEEP CANVAS READY
// ======================================

setTimeout(() => {
  resizeCanvas();
  updateHUD();

  if (!running) {
    drawGame();
  }
}, 100);


// ======================================
// FINAL GAME READY
// ======================================

console.log(
  "DLI Air Strike — Game Ready"
);
