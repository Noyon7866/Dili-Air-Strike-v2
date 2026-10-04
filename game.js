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

window.addEventListener(
  "resize",
  resizeCanvas
);

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

window.addEventListener(
  "keydown",
  event => {
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
  }
);

window.addEventListener(
  "keyup",
  event => {
    keys.delete(event.key);
  }
);

if (touchControls) {
  touchControls.style.display = "none";
                   }
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
      background: "rgba(0,0,0,.82)",
      backdropFilter: "blur(8px)"
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
      background: "rgba(8,18,45,.97)",
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
    document.createElement("button");

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

function updatePlayer(dt) {
  if (
    player.targetX !== null &&
    player.targetY !== null
  ) {
    const dx =
      player.targetX - player.x;

    const dy =
      player.targetY - player.y;

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
    ) {
      dx--;
    }

    if (
      keys.has("ArrowRight") ||
      keys.has("d") ||
      keys.has("D")
    ) {
      dx++;
    }

    if (
      keys.has("ArrowUp") ||
      keys.has("w") ||
      keys.has("W")
    ) {
      dy--;
    }

    if (
      keys.has("ArrowDown") ||
      keys.has("s") ||
      keys.has("S")
    ) {
      dy++;
    }

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
    x: random(
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
    fireTimer: random(
      1.0,
      2.8
    ),
    phase:
      Math.random() *
      Math.PI *
      2
  };

  enemies.push(enemy);
}

function firePlayer() {
  if (!running || paused) return;

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

function enemyFire(enemy) {
  enemyBullets.push({
    x: enemy.x,
    y:
      enemy.y +
      enemy.h * 0.42,
    w: enemy.big ? 10 : 7,
    h: enemy.big ? 22 : 16,
    speed: enemy.big
      ? 260 + level * 8
      : 220 + level * 7
  });
}

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

    if (bullet.y < -40) {
      bullets.splice(i, 1);
    }
  }
}

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

    if (bullet.y > H + 50) {
      enemyBullets.splice(i, 1);
      continue;
    }

    if (
      collision(
        bullet,
        player
      )
    ) {
      enemyBullets.splice(i, 1);
      damagePlayer();
    }
  }
    }
function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    enemy.y += enemy.speed * dt;

    enemy.x += Math.sin(
      performance.now() * 0.0015 + enemy.phase
    ) * (enemy.big ? 18 : 10) * dt;

    enemy.x = clamp(
      enemy.x,
      enemy.w / 2,
      W - enemy.w / 2
    );

    enemy.fireTimer -= dt;

    if (enemy.fireTimer <= 0) {
      enemyFire(enemy);

      enemy.fireTimer = enemy.big
        ? random(1.4, 2.5)
        : random(2.0, 3.5);
    }

    if (
      collision(enemy, player)
    ) {
      if (player.invincible <= 0) {
        damagePlayer();
      }

      enemies.splice(i, 1);
      continue;
    }

    if (enemy.y > H + enemy.h) {
      enemies.splice(i, 1);
      continue;
    }

    for (
      let j = bullets.length - 1;
      j >= 0;
      j--
    ) {
      const bullet = bullets[j];

      if (
        collision(
          bullet,
          enemy
        )
      ) {
        bullets.splice(j, 1);

        enemy.hp--;

        createExplosion(
          enemy.x,
          enemy.y,
          enemy.big ? 1.5 : 0.8
        );

        if (enemy.hp <= 0) {
          score += enemy.points;

          destroyEnemy(
            enemy,
            enemy.big
          );

          enemies.splice(i, 1);

          break;
        }
      }
    }
  }
}

function damagePlayer() {
  if (
    player.invincible > 0 ||
    !running ||
    paused
  ) {
    return;
  }

  player.hp--;

  player.invincible = 1.6;

  createExplosion(
    player.x,
    player.y,
    0.7
  );

  if (
    typeof updateHUD === "function"
  ) {
    updateHUD();
  }

  if (player.hp <= 0) {
    gameOver();
  }
}

function destroyEnemy(enemy, big) {
  createExplosion(
    enemy.x,
    enemy.y,
    big ? 1.8 : 1
  );

  if (big) {
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: random(-180, 180),
        vy: random(-180, 180),
        life: random(0.4, 0.9),
        maxLife: 0.9,
        size: random(3, 7)
      });
    }
  }

  levelProgress += big ? 3 : 1;

  if (
    levelProgress >= levelTarget
  ) {
    levelProgress = 0;
    level++;

    levelTarget =
      12 + level * 4;

    if (
      typeof updateHUD === "function"
    ) {
      updateHUD();
    }
  }
}

function createExplosion(
  x,
  y,
  scale = 1
) {
  explosions.push({
    x,
    y,
    radius: 8,
    maxRadius: 55 * scale,
    life: 0,
    duration: 0.45
  });

  for (let i = 0; i < 12; i++) {
    const angle =
      Math.random() *
      Math.PI *
      2;

    const speed =
      random(70, 260) *
      scale;

    particles.push({
      x,
      y,
      vx:
        Math.cos(angle) *
        speed,
      vy:
        Math.sin(angle) *
        speed,
      life: random(
        0.25,
        0.65
      ),
      maxLife: 0.65,
      size: random(
        2,
        6
      )
    });
  }

  playExplosionSound();
}

function updateExplosions(dt) {
  for (
    let i =
      explosions.length - 1;
    i >= 0;
    i--
  ) {
    const explosion =
      explosions[i];

    explosion.life += dt;

    explosion.radius =
      explosion.maxRadius *
      Math.min(
        explosion.life /
          explosion.duration,
        1
      );

    if (
      explosion.life >=
      explosion.duration
    ) {
      explosions.splice(
        i,
        1
      );
    }
  }
}

function updateParticles(dt) {
  for (
    let i =
      particles.length - 1;
    i >= 0;
    i--
  ) {
    const particle =
      particles[i];

    particle.x +=
      particle.vx * dt;

    particle.y +=
      particle.vy * dt;

    particle.vx *=
      Math.pow(0.04, dt);

    particle.vy *=
      Math.pow(0.04, dt);

    particle.vy +=
      80 * dt;

    particle.life -= dt;

    if (
      particle.life <= 0
    ) {
      particles.splice(i, 1);
    }
  }
}

function updateSpawner(dt) {
  if (
    !running ||
    paused ||
    gameOverState
  ) {
    return;
  }

  spawnTimer -= dt;

  const minimumDelay =
    Math.max(
      0.28,
      1.15 -
        level * 0.045
    );

  if (
    spawnTimer <= 0
  ) {
    spawnEnemy();

    if (
      Math.random() <
      Math.min(
        0.18,
        level * 0.012
      )
    ) {
      setTimeout(() => {
        if (
          running &&
          !paused &&
          !gameOverState
        ) {
          spawnEnemy();
        }
      }, 180);
    }

    spawnTimer =
      random(
        minimumDelay,
        minimumDelay + 0.55
      );
  }
}

function updateGame(dt) {
  if (
    !running ||
    paused ||
    gameOverState
  ) {
    return;
  }

  updatePlayer(dt);

  updateSpawner(dt);

  updateEnemies(dt);

  updateBullets(dt);

  updateEnemyBullets(dt);

  updateExplosions(dt);

  updateParticles(dt);

  if (
    typeof updateBackground ===
    "function"
  ) {
    updateBackground(dt);
  }

  if (
    typeof updateHUD ===
    "function"
  ) {
    updateHUD();
  }
}

function drawPlayer() {
  if (
    player.invincible > 0 &&
    Math.floor(
      player.invincible * 12
    ) % 2 === 0
  ) {
    return;
  }

  ctx.save();

  ctx.translate(
    player.x,
    player.y
  );

  ctx.fillStyle =
    "#2563eb";

  ctx.beginPath();

  ctx.moveTo(
    0,
    -player.h * 0.55
  );

  ctx.lineTo(
    -player.w * 0.48,
    player.h * 0.42
  );

  ctx.lineTo(
    0,
    player.h * 0.22
  );

  ctx.lineTo(
    player.w * 0.48,
    player.h * 0.42
  );

  ctx.closePath();

  ctx.fill();

  ctx.fillStyle =
    "#60a5fa";

  ctx.beginPath();

  ctx.moveTo(
    0,
    -player.h * 0.40
  );

  ctx.lineTo(
    -player.w * 0.22,
    player.h * 0.15
  );

  ctx.lineTo(
    0,
    player.h * 0.05
  );

  ctx.lineTo(
    player.w * 0.22,
    player.h * 0.15
  );

  ctx.closePath();

  ctx.fill();

  ctx.restore();
}

function drawEnemy(enemy) {
  ctx.save();

  ctx.translate(
    enemy.x,
    enemy.y
  );

  const color =
    enemy.big
      ? "#ef4444"
      : "#f97316";

  ctx.fillStyle =
    color;

  ctx.beginPath();

  ctx.moveTo(
    0,
    enemy.h * 0.5
  );

  ctx.lineTo(
    -enemy.w * 0.5,
    -enemy.h * 0.3
  );

  ctx.lineTo(
    -enemy.w * 0.18,
    -enemy.h * 0.5
  );

  ctx.lineTo(
    0,
    -enemy.h * 0.28
  );

  ctx.lineTo(
    enemy.w * 0.18,
    -enemy.h * 0.5
  );

  ctx.lineTo(
    enemy.w * 0.5,
    -enemy.h * 0.3
  );

  ctx.closePath();

  ctx.fill();

  ctx.fillStyle =
    "#111827";

  ctx.beginPath();

  ctx.arc(
    -enemy.w * 0.18,
    -enemy.h * 0.08,
    enemy.big ? 7 : 5,
    0,
    Math.PI * 2
  );

  ctx.arc(
    enemy.w * 0.18,
    -enemy.h * 0.08,
    enemy.big ? 7 : 5,
    0,
    Math.PI * 2
  );

  ctx.fill();

  ctx.restore();
}

function drawBullets() {
  for (
    const bullet of bullets
  ) {
    ctx.fillStyle =
      "#facc15";

    ctx.fillRect(
      bullet.x -
        bullet.w / 2,
      bullet.y -
        bullet.h / 2,
      bullet.w,
      bullet.h
    );
  }

  for (
    const bullet of enemyBullets
  ) {
    ctx.fillStyle =
      "#ef4444";

    ctx.fillRect(
      bullet.x -
        bullet.w / 2,
      bullet.y -
        bullet.h / 2,
      bullet.w,
      bullet.h
    );
  }
}

function drawExplosions() {
  for (
    const explosion of explosions
  ) {
    const alpha =
      1 -
      explosion.life /
        explosion.duration;

    ctx.save();

    ctx.globalAlpha =
      Math.max(
        0,
        alpha
      );

    ctx.strokeStyle =
      "#fbbf24";

    ctx.lineWidth = 5;

    ctx.beginPath();

    ctx.arc(
      explosion.x,
      explosion.y,
      explosion.radius,
      0,
      Math.PI * 2
    );

    ctx.stroke();

    ctx.restore();
  }
}

function drawParticles() {
  for (
    const particle of particles
  ) {
    const alpha =
      Math.max(
        0,
        particle.life /
          particle.maxLife
      );

    ctx.save();

    ctx.globalAlpha =
      alpha;

    ctx.fillStyle =
      "#fbbf24";

    ctx.beginPath();

    ctx.arc(
      particle.x,
      particle.y,
      particle.size,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
  }
}

function renderGame() {
  ctx.clearRect(
    0,
    0,
    W,
    H
  );

  if (
    typeof drawBackground ===
    "function"
  ) {
    drawBackground();
  }

  for (
    const enemy of enemies
  ) {
    drawEnemy(enemy);
  }

  drawBullets();

  drawExplosions();

  drawParticles();

  drawPlayer();
}

function gameLoop(time) {
  if (
    !running ||
    gameOverState
  ) {
    renderGame();
    return;
  }

  if (paused) {
    renderGame();
    return;
  }

  const dt =
    Math.min(
      (time - lastTime) /
        1000,
      0.033
    );

  lastTime = time;

  updateGame(dt);

  renderGame();

  requestAnimationFrame(
    gameLoop
  );
        }
function startGame() {
  running = true;
  paused = false;
  gameOverState = false;

  score = 0;
  level = 1;
  levelProgress = 0;
  levelTarget = 12;

  bullets.length = 0;
  enemyBullets.length = 0;
  enemies.length = 0;
  particles.length = 0;
  explosions.length = 0;

  spawnTimer = 0.5;

  player.x = W / 2;
  player.y = H - 100;
  player.targetX = null;
  player.targetY = null;
  player.invincible = 1.5;

  if (
    typeof player.maxHp ===
    "number"
  ) {
    player.hp = player.maxHp;
  } else {
    player.hp = 5;
  }

  hidePauseOverlay();

  if (
    typeof updateHUD ===
    "function"
  ) {
    updateHUD();
  }

  startAudio();

  lastTime =
    performance.now();

  requestAnimationFrame(
    gameLoop
  );
}

function gameOver() {
  if (gameOverState) return;

  gameOverState = true;
  running = false;
  paused = false;

  player.targetX = null;
  player.targetY = null;

  stopMusic();

  showGameOverOverlay();
}

let gameOverOverlay = null;

function createGameOverOverlay() {
  if (gameOverOverlay) return;

  gameOverOverlay =
    document.createElement("div");

  gameOverOverlay.id =
    "dliGameOverOverlay";

  Object.assign(
    gameOverOverlay.style,
    {
      position: "absolute",
      inset: "0",
      zIndex: "110",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      background:
        "rgba(0,0,0,.84)",
      backdropFilter:
        "blur(8px)"
    }
  );

  const box =
    document.createElement("div");

  Object.assign(
    box.style,
    {
      width:
        "min(380px,90%)",
      padding: "30px",
      textAlign: "center",
      borderRadius: "22px",
      background:
        "rgba(8,18,45,.98)",
      border:
        "1px solid rgba(255,80,80,.35)",
      boxShadow:
        "0 20px 70px rgba(0,0,0,.65)"
    }
  );

  const title =
    document.createElement("h2");

  title.textContent =
    "GAME OVER";

  Object.assign(
    title.style,
    {
      margin: "0 0 14px",
      fontSize: "28px"
    }
  );

  const result =
    document.createElement("div");

  result.id =
    "dliFinalScore";

  Object.assign(
    result.style,
    {
      marginBottom: "22px",
      fontSize: "17px",
      fontWeight: "700"
    }
  );

  const restart =
    createPauseButton(
      "PLAY AGAIN"
    );

  const menu =
    createPauseButton(
      "MAIN MENU"
    );

  restart.onclick = () => {
    hideGameOverOverlay();
    startGame();
  };

  menu.onclick = () => {
    hideGameOverOverlay();
    quitGame();
  };

  box.append(
    title,
    result,
    restart,
    menu
  );

  gameOverOverlay.appendChild(
    box
  );

  const shell =
    document.querySelector(
      ".game-shell"
    );

  if (shell) {
    shell.appendChild(
      gameOverOverlay
    );
  } else {
    document.body.appendChild(
      gameOverOverlay
    );
  }
}

function showGameOverOverlay() {
  createGameOverOverlay();

  const result =
    document.getElementById(
      "dliFinalScore"
    );

  if (result) {
    result.textContent =
      `Score: ${score} • Level: ${level}`;
  }

  gameOverOverlay.style.display =
    "flex";
}

function hideGameOverOverlay() {
  if (gameOverOverlay) {
    gameOverOverlay.style.display =
      "none";
  }
}

function quitGame() {
  running = false;
  paused = false;
  gameOverState = false;

  bullets.length = 0;
  enemyBullets.length = 0;
  enemies.length = 0;
  particles.length = 0;
  explosions.length = 0;

  player.targetX = null;
  player.targetY = null;

  stopMusic();

  hidePauseOverlay();
  hideGameOverOverlay();

  if (
    typeof showMenu ===
    "function"
  ) {
    showMenu();
  }
}

function setupGameControls() {
  if (
    typeof pauseBtn !==
    "undefined" &&
    pauseBtn
  ) {
    pauseBtn.onclick = () => {
      togglePause();
    };
  }

  if (
    typeof fireBtn !==
    "undefined" &&
    fireBtn
  ) {
    fireBtn.addEventListener(
      "pointerdown",
      event => {
        event.preventDefault();

        if (
          running &&
          !paused
        ) {
          firePlayer();
        }
      },
      {
        passive: false
      }
    );
  }

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.code ===
        "Space"
      ) {
        event.preventDefault();

        if (
          running &&
          !paused
        ) {
          firePlayer();
        }
      }

      if (
        event.code ===
        "Escape"
      ) {
        event.preventDefault();

        if (running) {
          togglePause();
        }
      }
    }
  );
}

function setupResize() {
  function resizeGame() {
    const rect =
      canvas.getBoundingClientRect();

    if (
      rect.width <= 0 ||
      rect.height <= 0
    ) {
      return;
    }

    canvas.width = W;
    canvas.height = H;

    ctx.imageSmoothingEnabled =
      true;
  }

  window.addEventListener(
    "resize",
    resizeGame
  );

  window.addEventListener(
    "orientationchange",
    resizeGame
  );

  resizeGame();
}

function setupVisibility() {
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
}

function updateHUD() {
  const scoreEl =
    document.getElementById(
      "score"
    );

  const levelEl =
    document.getElementById(
      "level"
    );

  const hpEl =
    document.getElementById(
      "hp"
    );

  const progressEl =
    document.getElementById(
      "progress"
    );

  if (scoreEl) {
    scoreEl.textContent =
      score;
  }

  if (levelEl) {
    levelEl.textContent =
      level;
  }

  if (hpEl) {
    hpEl.textContent =
      player.hp;
  }

  if (progressEl) {
    progressEl.textContent =
      `${levelProgress}/${levelTarget}`;
  }
}

function initGame() {
  setupGameControls();

  setupResize();

  setupVisibility();

  createPauseOverlay();

  createGameOverOverlay();

  if (
    typeof updateHUD ===
    "function"
  ) {
    updateHUD();
  }

  renderGame();
}

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initGame,
    {
      once: true
    }
  );
} else {
  initGame();
      }
