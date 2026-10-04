const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const pauseBtn = document.getElementById("pauseBtn");
const fireBtn = document.getElementById("fireBtn");

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const hpEl = document.getElementById("hp");
const progressEl = document.getElementById("progress");
const finalScoreEl = document.getElementById("finalScore");
const finalLevelEl = document.getElementById("finalLevel");

const W = 900;
const H = 600;

let running = false;
let paused = false;
let gameOverState = false;
let lastTime = 0;

let score = 0;
let level = 1;
let levelProgress = 0;
let levelTarget = 12;
let spawnTimer = 0;

const keys = new Set();

const bullets = [];
const enemyBullets = [];
const enemies = [];
const particles = [];
const explosions = [];

const playerImage = new Image();
playerImage.src = "assets/player.png";

const player = {
  x: W / 2,
  y: H - 90,
  w: 58,
  h: 72,
  speed: 360,
  hp: 5,
  maxHp: 5,
  invincible: 0,
  targetX: null,
  targetY: null
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function collision(a, b) {
  return (
    a.x - a.w / 2 < b.x + b.w / 2 &&
    a.x + a.w / 2 > b.x - b.w / 2 &&
    a.y - a.h / 2 < b.y + b.h / 2 &&
    a.y + a.h / 2 > b.y - b.h / 2
  );
}

function updateHUD() {
  if (scoreEl) {
    scoreEl.textContent = score;
  }

  if (levelEl) {
    levelEl.textContent = level;
  }

  if (hpEl) {
    hpEl.textContent = player.hp;
  }

  if (progressEl) {
    progressEl.textContent =
      `${levelProgress}/${levelTarget}`;
  }
}

function startGame() {
  running = true;
  paused = false;
  gameOverState = false;

  score = 0;
  level = 1;
  levelProgress = 0;
  levelTarget = 12;
  spawnTimer = 0.5;

  bullets.length = 0;
  enemyBullets.length = 0;
  enemies.length = 0;
  particles.length = 0;
  explosions.length = 0;

  player.x = W / 2;
  player.y = H - 90;
  player.hp = player.maxHp;
  player.invincible = 1.5;
  player.targetX = null;
  player.targetY = null;

  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");

  pauseBtn.textContent = "Ⅱ";

  updateHUD();

  lastTime = performance.now();

  requestAnimationFrame(gameLoop);
}

function gameOver() {
  if (gameOverState) return;

  gameOverState = true;
  running = false;
  paused = false;

  player.targetX = null;
  player.targetY = null;

  if (finalScoreEl) {
    finalScoreEl.textContent = score;
  }

  if (finalLevelEl) {
    finalLevelEl.textContent = level;
  }

  gameOverScreen.classList.remove("hidden");
}

function togglePause() {
  if (!running || gameOverState) {
    return;
  }

  paused = !paused;

  if (paused) {
    pauseBtn.textContent = "▶";
  } else {
    pauseBtn.textContent = "Ⅱ";

    lastTime =
      performance.now();

    requestAnimationFrame(
      gameLoop
    );
  }
}

function setTouchTarget(event) {
  if (!running || paused) {
    return;
  }

  const rect =
    canvas.getBoundingClientRect();

  const scaleX =
    W / rect.width;

  const scaleY =
    H / rect.height;

  const x =
    (event.clientX - rect.left) *
    scaleX;

  const y =
    (event.clientY - rect.top) *
    scaleY;

  player.targetX =
    clamp(
      x,
      player.w / 2,
      W - player.w / 2
    );

  player.targetY =
    clamp(
      y,
      75,
      H - player.h / 2 - 15
    );
}

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
      Math.hypot(
        dx,
        dy
      );

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
      Math.hypot(
        dx,
        dy
      ) || 1;

    player.x +=
      (dx / length) *
      player.speed *
      dt;

    player.y +=
      (dy / length) *
      player.speed *
      dt;
  }

  player.x =
    clamp(
      player.x,
      player.w / 2,
      W - player.w / 2
    );

  player.y =
    clamp(
      player.y,
      70,
      H - player.h / 2 - 15
    );

  if (
    player.invincible > 0
  ) {
    player.invincible -= dt;
  }
}

function spawnEnemy() {
  const big =
    Math.random() <
    Math.min(
      0.30,
      0.10 + level * 0.02
    );

  const size =
    big
      ? random(82, 112)
      : random(52, 72);

  enemies.push({
    x: random(
      size / 2,
      W - size / 2
    ),

    y: -size,

    w: size,

    h: size * 0.86,

    speed:
      big
        ? random(55, 90) +
          level * 5
        : random(90, 145) +
          level * 7,

    hp:
      big
        ? 3 +
          Math.floor(
            level / 3
          )
        : 1,

    points:
      big
        ? 300 +
          level * 30
        : 50 +
          level * 5,

    big,

    fireTimer:
      random(
        1,
        2.8
      ),

    phase:
      Math.random() *
      Math.PI *
      2
  });
}

function firePlayer() {
  if (
    !running ||
    paused ||
    gameOverState
  ) {
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
}

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
        ? 260 +
          level * 8
        : 220 +
          level * 7
  });
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

  player.invincible =
    1.6;

  createExplosion(
    player.x,
    player.y,
    0.7
  );

  updateHUD();

  if (
    player.hp <= 0
  ) {
    gameOver();
  }
}

function destroyEnemy(
  enemy
) {
  createExplosion(
    enemy.x,
    enemy.y,
    enemy.big
      ? 1.8
      : 1
  );

  score +=
    enemy.points;

  levelProgress +=
    enemy.big
      ? 3
      : 1;

  if (
    levelProgress >=
    levelTarget
  ) {
    levelProgress = 0;

    level++;

    levelTarget =
      12 +
      level * 4;
  }

  updateHUD();
}

function updateSpawner(dt) {
  spawnTimer -= dt;

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
      spawnEnemy();
    }

    const minimumDelay =
      Math.max(
        0.28,
        1.15 -
        level * 0.045
      );

    spawnTimer =
      random(
        minimumDelay,
        minimumDelay +
        0.55
      );
  }
}

function updateBullets(dt) {
  for (
    let i =
      bullets.length - 1;
    i >= 0;
    i--
  ) {
    const bullet =
      bullets[i];

    bullet.y -=
      bullet.speed *
      dt;

    if (
      bullet.y <
      -40
    ) {
      bullets.splice(
        i,
        1
      );
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
      bullet.speed *
      dt;

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

function updateEnemies(dt) {
  for (
    let i =
      enemies.length - 1;
    i >= 0;
    i--
  ) {
    const enemy =
      enemies[i];

    enemy.y +=
      enemy.speed *
      dt;

    enemy.x +=
      Math.sin(
        performance.now() *
        0.0015 +
        enemy.phase
      ) *
      (enemy.big
        ? 18
        : 10) *
      dt;

    enemy.x =
      clamp(
        enemy.x,
        enemy.w / 2,
        W -
        enemy.w / 2
      );

    enemy.fireTimer -=
      dt;

    if (
      enemy.fireTimer <=
      0
    ) {
      enemyFire(enemy);

      enemy.fireTimer =
        enemy.big
          ? random(
              1.4,
              2.5
            )
          : random(
              2,
              3.5
            );
    }

    if (
      collision(
        enemy,
        player
      )
    ) {
      damagePlayer();

      enemies.splice(
        i,
        1
      );

      continue;
    }

    if (
      enemy.y >
      H + enemy.h
    ) {
      enemies.splice(
        i,
        1
      );

      continue;
    }

    let destroyed =
      false;

    for (
      let j =
        bullets.length - 1;
      j >= 0;
      j--
    ) {
      const bullet =
        bullets[j];

      if (
        collision(
          bullet,
          enemy
        )
      ) {
        bullets.splice(
          j,
          1
        );

        enemy.hp--;

        createExplosion(
          enemy.x,
          enemy.y,
          enemy.big
            ? 0.45
            : 0.3
        );

        if (
          enemy.hp <= 0
        ) {
          destroyEnemy(
            enemy
          );

          enemies.splice(
            i,
            1
          );

          destroyed =
            true;

          break;
        }
      }
    }

    if (destroyed) {
      continue;
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
    maxRadius:
      55 * scale,
    life: 0,
    duration: 0.45
  });

  for (
    let i = 0;
    i < 12;
    i++
  ) {
    const angle =
      Math.random() *
      Math.PI *
      2;

    const speed =
      random(
        70,
        260
      ) *
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

      life:
        random(
          0.25,
          0.65
        ),

      maxLife:
        0.65,

      size:
        random(
          2,
          6
        )
    });
  }
}

function updateExplosions(
  dt
) {
  for (
    let i =
      explosions.length - 1;
    i >= 0;
    i--
  ) {
    const explosion =
      explosions[i];

    explosion.life +=
      dt;

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

function updateParticles(
  dt
) {
  for (
    let i =
      particles.length - 1;
    i >= 0;
    i--
  ) {
    const particle =
      particles[i];

    particle.x +=
      particle.vx *
      dt;

    particle.y +=
      particle.vy *
      dt;

    particle.vx *=
      Math.pow(
        0.04,
        dt
      );

    particle.vy *=
      Math.pow(
        0.04,
        dt
      );

    particle.vy +=
      80 * dt;

    particle.life -=
      dt;

    if (
      particle.life <=
      0
    ) {
      particles.splice(
        i,
        1
      );
    }
  }
}

function drawBackground() {
  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      0,
      H
    );

  gradient.addColorStop(
    0,
    "#071a45"
  );

  gradient.addColorStop(
    0.55,
    "#061331"
  );

  gradient.addColorStop(
    1,
    "#020817"
  );

  ctx.fillStyle =
    gradient;

  ctx.fillRect(
    0,
    0,
    W,
    H
  );

  ctx.fillStyle =
    "rgba(120,180,255,.12)";

  const time =
    performance.now();

  for (
    let i = 0;
    i < 45;
    i++
  ) {
    const x =
      (i * 197) %
      W;

    const y =
      (
        i * 83 +
        time *
        0.015 *
        (1 + i % 3)
      ) %
      H;

    ctx.fillRect(
      x,
      y,
      2,
      2
    );
  }
}

function drawPlayer() {
  if (
    player.invincible > 0 &&
    Math.floor(
      player.invincible *
      12
    ) %
      2 ===
      0
  ) {
    return;
  }

  ctx.save();

  ctx.translate(
    player.x,
    player.y
  );

  if (
    playerImage.complete &&
    playerImage.naturalWidth >
      0
  ) {
    ctx.drawImage(
      playerImage,
      -player.w / 2,
      -player.h / 2,
      player.w,
      player.h
    );
  } else {
    ctx.fillStyle =
      "#2563eb";

    ctx.beginPath();

    ctx.moveTo(
      0,
      -player.h / 2
    );

    ctx.lineTo(
      -player.w / 2,
      player.h / 2
    );

    ctx.lineTo(
      0,
      player.h / 4
    );

    ctx.lineTo(
      player.w / 2,
      player.h / 2
    );

    ctx.closePath();

    ctx.fill();
  }

  ctx.restore();
}

function drawEnemy(
  enemy
) {
  ctx.save();

  ctx.translate(
    enemy.x,
    enemy.y
  );

  ctx.fillStyle =
    enemy.big
      ? "#ef4444"
      : "#f97316";

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
    enemy.big
      ? 7
      : 5,
    0,
    Math.PI * 2
  );

  ctx.arc(
    enemy.w * 0.18,
    -enemy.h * 0.08,
    enemy.big
      ? 7
      : 5,
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
    ctx.save();

    ctx.globalAlpha =
      Math.max(
        0,
        particle.life /
          particle.maxLife
      );

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
  drawBackground();

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

  updateHUD();
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
      (time -
        lastTime) /
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

canvas.addEventListener(
  "pointerdown",
  event => {
    if (
      event.pointerType ===
        "touch" ||
      event.pointerType ===
        "pen"
    ) {
      event.preventDefault();

      canvas.setPointerCapture?.(
        event.pointerId
      );

      setTouchTarget(
        event
      );
    }
  },
  {
    passive: false
  }
);

canvas.addEventListener(
  "pointermove",
  event => {
    if (
      event.pointerType ===
        "touch" ||
      event.pointerType ===
        "pen"
    ) {
      event.preventDefault();

      setTouchTarget(
        event
      );
    }
  },
  {
    passive: false
  }
);

canvas.addEventListener(
  "pointerup",
  event => {
    if (
      event.pointerType ===
        "touch" ||
      event.pointerType ===
        "pen"
    ) {
      player.targetX =
        null;

      player.targetY =
        null;
    }
  }
);

canvas.addEventListener(
  "pointercancel",
  () => {
    player.targetX =
      null;

    player.targetY =
      null;
  }
);

startBtn.addEventListener(
  "click",
  () => {
    startGame();
  }
);

restartBtn.addEventListener(
  "click",
  () => {
    startGame();
  }
);

pauseBtn.addEventListener(
  "click",
  () => {
    togglePause();
  }
);

fireBtn.addEventListener(
  "pointerdown",
  event => {
    event.preventDefault();

    firePlayer();
  },
  {
    passive: false
  }
);

document.addEventListener(
  "keydown",
  event => {
    keys.add(
      event.key
    );

    if (
      event.code ===
      "Space"
    ) {
      event.preventDefault();
      firePlayer();
    }

    if (
      event.code ===
      "Escape"
    ) {
      event.preventDefault();
      togglePause();
    }
  }
);

document.addEventListener(
  "keyup",
  event => {
    keys.delete(
      event.key
    );
  }
);

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

canvas.width = W;
canvas.height = H;

updateHUD();

renderGame();
