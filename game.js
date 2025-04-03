/********************************/
/*      CAMERA & WORLD SETUP    */
/********************************/
const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;

// Camera object
const camera = {
  x: 0,
  y: 0,
  w: 800, // you can set this to canvas.width in init or on resize
  h: 600, // you can set this to canvas.height in init or on resize
};

// Helper to update camera position so it follows the ship
function updateCamera() {
  // Center camera on the ship
  camera.x = ship.x - camera.w / 2;
  camera.y = ship.y - camera.h / 2;

  // Clamp camera so it never goes outside the world
  if (camera.x < 0) camera.x = 0;
  if (camera.y < 0) camera.y = 0;
  if (camera.x + camera.w > WORLD_WIDTH) camera.x = WORLD_WIDTH - camera.w;
  if (camera.y + camera.h > WORLD_HEIGHT) camera.y = WORLD_HEIGHT - camera.h;
}

/********************************/
/*        GAME VARIABLES        */
/********************************/
let gameResetting = false;
let updateLoop = null;

function stopGameLoop() {
  if (updateLoop) {
    cancelAnimationFrame(updateLoop);
    updateLoop = null;
  }
}

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// If your canvas is always the same size as camera.w/h, set them here:
canvas.width = camera.w;
canvas.height = camera.h;

// Preload images
const shipImg = new Image();
shipImg.src = "images/spaceship.png";

const bulletImg = new Image();
bulletImg.src = "images/bullet.png";

const explosionImg = new Image();
explosionImg.src = "images/explosion.png";

const asteroidImg = new Image();
asteroidImg.src = "images/asteroid.png";

const alienImg = new Image();
alienImg.src = "images/alien.png";

const alienBulletImg = new Image();
alienBulletImg.src = "images/alien_bullet.png";

/********************************/
/*       WORLD ENTITIES         */
/********************************/
let aliens = [];
let alienBullets = [];

// **** CAMERA CHANGES: Generate stars across the WORLD instead of the canvas
const NUM_STARS = 1000;
const stars = [];
for (let i = 0; i < NUM_STARS; i++) {
  stars.push({
    x: Math.random() * WORLD_WIDTH,
    y: Math.random() * WORLD_HEIGHT,
    radius: Math.random() * 1.5 + 0.5,
    alpha: Math.random() * 0.5 + 0.3,
  });
}

function drawStars() {
  for (const star of stars) {
    // Position on screen = world space minus camera
    const sx = star.x - camera.x;
    const sy = star.y - camera.y;
    // Only draw if on screen
    if (sx < -10 || sy < -10 || sx > camera.w + 10 || sy > camera.h + 10)
      continue;

    ctx.beginPath();
    ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
    ctx.fill();
  }
}

let aliensToSpawnOnClear = 100;
let asteroidsToSpawnOnClear = 100;

const ALIEN_BULLET_SPEED = 5;
const ALIEN_FIRE_DELAY = 100;
const NUM_ALIENS = 100;

function generateAliens() {
  aliens = [];
  for (let i = 0; i < NUM_ALIENS; i++) {
    let side = Math.floor(Math.random() * 4);
    let x, y;

    // **** CAMERA CHANGES: spawn in WORLD space
    switch (side) {
      case 0: // top
        x = Math.random() * WORLD_WIDTH;
        y = -40;
        break;
      case 1: // right
        x = WORLD_WIDTH + 40;
        y = Math.random() * WORLD_HEIGHT;
        break;
      case 2: // bottom
        x = Math.random() * WORLD_WIDTH;
        y = WORLD_HEIGHT + 40;
        break;
      case 3: // left
        x = -40;
        y = Math.random() * WORLD_HEIGHT;
        break;
    }

    aliens.push({
      x,
      y,
      angle: 0,
      fireCooldown: Math.floor(Math.random() * ALIEN_FIRE_DELAY),
      health: 30,
      radius: 20,
    });
  }
}
generateAliens();

let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
let mouseThrusting = false;
let isFiring = false;
let autoplay = true;

let bulletCooldown = 0;
const BULLET_DELAY = 10;

/********************************/
/*        SHIP & MOVEMENT       */
/********************************/
const ship = {
  health: 100,
  // **** CAMERA CHANGES: start in middle of WORLD
  x: WORLD_WIDTH / 2,
  y: WORLD_HEIGHT / 2,
  radius: 20,
  angle: 0,
  rotation: 0,
  thrusting: false,
  thrust: { x: 0, y: 0 },
};

let score = 0;
let floatingTexts = [];
let explosions = [];

const BULLET_SPEED = 5;
const BULLET_LIFE = 300;
let bullets = [];

const TURN_SPEED = Math.PI / 90;
const THRUST_ACCEL = 0.02;
const FRICTION = 0.99;
const MAX_SPEED = 3;

/********************************/
/*       INPUT HANDLERS         */
/********************************/
document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

function keyDown(e) {
  switch (e.key) {
    case "ArrowLeft":
      ship.rotation = -TURN_SPEED;
      break;
    case "ArrowRight":
      ship.rotation = TURN_SPEED;
      break;
    case "ArrowUp":
      ship.thrusting = true;
      break;
    case " ":
      isFiring = true;
      break;
    case "a":
    case "A":
      autoplay = !autoplay;
      console.log("Autoplay:", autoplay);
      break;
  }
}

function keyUp(e) {
  switch (e.key) {
    case "ArrowLeft":
    case "ArrowRight":
      ship.rotation = 0;
      break;
    case "ArrowUp":
      ship.thrusting = false;
      break;
    case " ":
      isFiring = false;
      break;
  }
}

// **** CAMERA CHANGES:
// Mouse coordinates are still screen-based (0..canvas.width/height).
// We must convert them to "world space" if we want the ship to face them.
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  // Convert screen coords -> world coords
  mouse.x = camera.x + sx;
  mouse.y = camera.y + sy;

  // Optionally rotate the ship to face mouse
  ship.angle = Math.atan2(mouse.y - ship.y, mouse.x - ship.x);
});

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0) mouseThrusting = true;
});

canvas.addEventListener("mouseup", (e) => {
  if (e.button === 0) mouseThrusting = false;
});

// Right click to shoot
canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  shootBullet();
});

/********************************/
/*         SHOOT BULLETS        */
/********************************/
function shootBullet() {
  const bulletOffset = 10;
  const numBullets = 4;

  for (let i = 0; i < numBullets; i++) {
    const offset = (i - (numBullets - 1) / 2) * bulletOffset;
    const offsetX = Math.cos(ship.angle + Math.PI / 2) * offset;
    const offsetY = Math.sin(ship.angle + Math.PI / 2) * offset;

    bullets.push({
      x: ship.x + Math.cos(ship.angle) * ship.radius + offsetX,
      y: ship.y + Math.sin(ship.angle) * ship.radius + offsetY,
      dx: Math.cos(ship.angle) * BULLET_SPEED,
      dy: Math.sin(ship.angle) * BULLET_SPEED,
      life: BULLET_LIFE,
    });
  }
}

/********************************/
/*           GAME LOOP          */
/********************************/
function update() {
  // 1) Update logic in world space
  ship.angle += ship.rotation;

  // Thrust
  if (autoplay) {
    smartAutopilot();
  } else {
    if (mouseThrusting) {
      ship.thrust.x += Math.cos(ship.angle) * THRUST_ACCEL;
      ship.thrust.y += Math.sin(ship.angle) * THRUST_ACCEL;
    } else {
      ship.thrust.x *= FRICTION;
      ship.thrust.y *= FRICTION;
    }
  }
  capSpeed();

  ship.x += ship.thrust.x;
  ship.y += ship.thrust.y;

  // Soft-bounce at world edges
  const bounceDampening = 0.7; // 0.7 => lose 30% speed on bounce

  if (ship.x < 0) {
    ship.x = 0;
    // If velocity points outward, flip + reduce it
    if (ship.thrust.x < 0) {
      ship.thrust.x = -ship.thrust.x * bounceDampening;
    }
  }
  if (ship.x > WORLD_WIDTH) {
    ship.x = WORLD_WIDTH;
    if (ship.thrust.x > 0) {
      ship.thrust.x = -ship.thrust.x * bounceDampening;
    }
  }
  if (ship.y < 0) {
    ship.y = 0;
    if (ship.thrust.y < 0) {
      ship.thrust.y = -ship.thrust.y * bounceDampening;
    }
  }
  if (ship.y > WORLD_HEIGHT) {
    ship.y = WORLD_HEIGHT;
    if (ship.thrust.y > 0) {
      ship.thrust.y = -ship.thrust.y * bounceDampening;
    }
  }
  // Apply a small nudge if thrust gets too close to zero
  if (Math.abs(ship.thrust.x) < 0.001) {
    ship.thrust.x += (Math.random() - 0.5) * 0.02;
  }
  if (Math.abs(ship.thrust.y) < 0.001) {
    ship.thrust.y += (Math.random() - 0.5) * 0.02;
  }

  // **** CAMERA CHANGES: clamp ship to the world edges instead of screen wrap
  if (ship.x < 0) ship.x = 0;
  if (ship.x > WORLD_WIDTH) ship.x = WORLD_WIDTH;
  if (ship.y < 0) ship.y = 0;
  if (ship.y > WORLD_HEIGHT) ship.y = WORLD_HEIGHT;

  // Update camera to follow ship
  updateCamera();

  // 2) Clear the canvas (the visible region)
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3) Draw
  drawStars();
  drawShip(ship.x, ship.y, ship.angle);

  // --- Move and draw asteroids ---
  asteroids.forEach((asteroid) => {
    asteroid.x += Math.cos(asteroid.angle) * asteroid.speed;
    asteroid.y += Math.sin(asteroid.angle) * asteroid.speed;

    // If you want asteroids to wrap in the big 4000x4000 world, do so. Or clamp.
    if (asteroid.x < 0) asteroid.x = WORLD_WIDTH;
    if (asteroid.x > WORLD_WIDTH) asteroid.x = 0;
    if (asteroid.y < 0) asteroid.y = WORLD_HEIGHT;
    if (asteroid.y > WORLD_HEIGHT) asteroid.y = 0;

    asteroid.currentRotation += asteroid.rotation;

    // Draw with camera offset
    const sx = asteroid.x - camera.x;
    const sy = asteroid.y - camera.y;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(asteroid.currentRotation);
    const size = asteroid.radius * 2;
    ctx.drawImage(asteroidImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  });

  // --- Update & draw aliens ---
  aliens.forEach((alien, i) => {
    const dx = ship.x - alien.x;
    const dy = ship.y - alien.y;
    alien.angle = Math.atan2(dy, dx);

    // Basic separation
    aliens.forEach((otherAlien, j) => {
      if (i !== j) {
        const dist = distanceBetween(
          alien.x,
          alien.y,
          otherAlien.x,
          otherAlien.y
        );
        if (dist < 40) {
          const pushX = (alien.x - otherAlien.x) / dist;
          const pushY = (alien.y - otherAlien.y) / dist;
          alien.x += pushX;
          alien.y += pushY;
        }
      }
    });

    const distToShip = Math.sqrt(dx * dx + dy * dy);
    const stopDistance = 120;
    if (distToShip > stopDistance) {
      const speed = 1.2;
      alien.x += Math.cos(alien.angle) * speed;
      alien.y += Math.sin(alien.angle) * speed;
    }

    // Wrap or clamp in the 4000x4000 world
    if (alien.x < 0) alien.x = WORLD_WIDTH;
    if (alien.x > WORLD_WIDTH) alien.x = 0;
    if (alien.y < 0) alien.y = WORLD_HEIGHT;
    if (alien.y > WORLD_HEIGHT) alien.y = 0;

    // Fire at ship
    alien.fireCooldown--;
    if (alien.fireCooldown <= 0) {
      alienBullets.push({
        x: alien.x,
        y: alien.y,
        dx: Math.cos(alien.angle) * ALIEN_BULLET_SPEED,
        dy: Math.sin(alien.angle) * ALIEN_BULLET_SPEED,
        life: BULLET_LIFE,
      });
      alien.fireCooldown = ALIEN_FIRE_DELAY;
    }

    // Draw alien with offset
    const sx = alien.x - camera.x;
    const sy = alien.y - camera.y;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(alien.angle + Math.PI / 2);
    ctx.drawImage(alienImg, -20, -20, 40, 40);
    ctx.restore();
  });

  // --- Update & draw alien bullets ---
  for (let i = alienBullets.length - 1; i >= 0; i--) {
    const b = alienBullets[i];
    b.x += b.dx;
    b.y += b.dy;
    b.life--;

    // Remove if off-world or expired
    if (
      b.life <= 0 ||
      b.x < 0 ||
      b.x > WORLD_WIDTH ||
      b.y < 0 ||
      b.y > WORLD_HEIGHT
    ) {
      alienBullets.splice(i, 1);
      continue;
    }

    // Draw with offset
    const sx = b.x - camera.x;
    const sy = b.y - camera.y;
    const alienBulletSize = 20; // 🔧 customize the bullet size here

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.atan2(b.dy, b.dx));
    ctx.drawImage(
      alienBulletImg,
      -alienBulletSize / 2,
      -alienBulletSize / 2,
      alienBulletSize,
      alienBulletSize
    );
    ctx.restore();

    // Check collision with ship
    if (distanceBetween(b.x, b.y, ship.x, ship.y) < ship.radius) {
      ship.health -= 10;
      alienBullets.splice(i, 1);
      createFloatingText("-10", ship.x, ship.y, "red");

      // Explosion effect
      explosions.push({ x: ship.x, y: ship.y, size: 40, life: 30 });

      if (ship.health <= 0) {
        ship.health = 100;
        createFloatingText("💖 Respawned!", ship.x, ship.y - 20, "yellow");
      }
    }
  }

  // --- Move and draw player bullets ---
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];

    // Bullet vs. Alien collision
    for (let k = aliens.length - 1; k >= 0; k--) {
      const alien = aliens[k];
      if (distanceBetween(b.x, b.y, alien.x, alien.y) < alien.radius) {
        bullets.splice(i, 1);
        alien.health -= 10;
        createFloatingText("-10", alien.x, alien.y, "orange");
        if (alien.health <= 0) {
          explosions.push({ x: alien.x, y: alien.y, size: 40, life: 30 });
          createFloatingText("Alien Down!", alien.x, alien.y - 10, "red");
          aliens.splice(k, 1);
          score += 150;
        }
        break;
      }
    }

    // Update bullet movement
    b.x += b.dx;
    b.y += b.dy;
    b.life--;

    // Remove if life is over or off-world
    if (
      b.life <= 0 ||
      b.x < 0 ||
      b.x > WORLD_WIDTH ||
      b.y < 0 ||
      b.y > WORLD_HEIGHT
    ) {
      bullets.splice(i, 1);
      continue;
    }

    // Draw bullet with offset
    const sx = b.x - camera.x;
    const sy = b.y - camera.y;
    const size = 20;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.atan2(b.dy, b.dx) + Math.PI / 1);
    ctx.drawImage(bulletImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  // --- Bullet vs. Asteroid collisions ---
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const asteroid = asteroids[i];
    for (let j = bullets.length - 1; j >= 0; j--) {
      const bullet = bullets[j];
      if (
        distanceBetween(bullet.x, bullet.y, asteroid.x, asteroid.y) <
        asteroid.radius
      ) {
        bullets.splice(j, 1);
        explosions.push({
          x: asteroid.x,
          y: asteroid.y,
          size: asteroid.radius * 1.5,
          life: 30,
        });
        // Split
        if (asteroid.radius > 20) {
          const newRadius = asteroid.radius / 2;
          asteroids.push(createAsteroid(asteroid.x, asteroid.y, newRadius));
          asteroids.push(createAsteroid(asteroid.x, asteroid.y, newRadius));
          score += 100;
          createFloatingText("+100", asteroid.x, asteroid.y, "lime");
        } else {
          score += 50;
          createFloatingText("+50", asteroid.x, asteroid.y, "lightblue");
        }
        asteroids.splice(i, 1);
        break;
      }
    }
  }

  // --- Asteroid vs Ship collisions ---
  for (let i = 0; i < asteroids.length; i++) {
    const asteroid = asteroids[i];
    if (
      distanceBetween(asteroid.x, asteroid.y, ship.x, ship.y) <
      asteroid.radius + ship.radius
    ) {
      ship.health -= 5;
      console.log(`💥 Ship Hit! Health: ${ship.health}`);
      explosions.push({ x: ship.x, y: ship.y, size: 40, life: 30 });
      asteroids.splice(i, 1);
      if (ship.health <= 0) {
        ship.health = 100;
        createFloatingText("💖 Respawned!", ship.x, ship.y - 20, "yellow");
      }
      break;
    }
  }

  // --- Alien wave clearing logic ---
  if (aliens.length === 0 && !gameResetting) {
    gameResetting = true;
    createFloatingText(
      "🎉 All Aliens Defeated!",
      ship.x - 60,
      ship.y - 40,
      "lime"
    );

    setTimeout(() => {
      // spawn new aliens
      for (let i = 0; i < aliensToSpawnOnClear; i++) {
        let side = Math.floor(Math.random() * 4);
        let x, y;
        switch (side) {
          case 0:
            x = Math.random() * WORLD_WIDTH;
            y = -40;
            break;
          case 1:
            x = WORLD_WIDTH + 40;
            y = Math.random() * WORLD_HEIGHT;
            break;
          case 2:
            x = Math.random() * WORLD_WIDTH;
            y = WORLD_HEIGHT + 40;
            break;
          case 3:
            x = -40;
            y = Math.random() * WORLD_HEIGHT;
            break;
        }
        aliens.push({
          x,
          y,
          angle: 0,
          fireCooldown: Math.floor(Math.random() * ALIEN_FIRE_DELAY),
          health: 30,
          radius: 20,
        });
      }
      // spawn new asteroids
      for (let i = 0; i < asteroidsToSpawnOnClear; i++) {
        const x = Math.random() * WORLD_WIDTH;
        const y = Math.random() * WORLD_HEIGHT;
        asteroids.push(createAsteroid(x, y));
      }
      gameResetting = false;
    }, 1500);
  }

  // --- Draw explosions ---
  for (let i = explosions.length - 1; i >= 0; i--) {
    const exp = explosions[i];
    const alpha = exp.life / 30;
    const sx = exp.x - camera.x;
    const sy = exp.y - camera.y;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      explosionImg,
      sx - exp.size / 2,
      sy - exp.size / 2,
      exp.size,
      exp.size
    );
    ctx.restore();

    exp.life--;
    if (exp.life <= 0) explosions.splice(i, 1);
  }
  ctx.globalAlpha = 1; // reset alpha

  // --- Auto-fire if holding space ---
  if (isFiring && bulletCooldown <= 0) {
    shootBullet();
    bulletCooldown = BULLET_DELAY;
  } else if (bulletCooldown > 0) {
    bulletCooldown--;
  }

  drawHealthBar();
  drawScore();
  drawFloatingTexts();

  // Loop
  updateLoop = requestAnimationFrame(update);
}

function drawShip(x, y, angle) {
  // Draw at (ship.x - camera.x, ship.y - camera.y)
  const sx = x - camera.x;
  const sy = y - camera.y;
  const size = ship.radius * 2;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(angle + Math.PI / 2);
  ctx.drawImage(shipImg, -size / 2, -size / 2, size, size);
  ctx.restore();
}

/********************************/
/*         ASTEROIDS ETC.       */
/********************************/
const NUM_ASTEROIDS = 100;
const ASTEROID_SIZE = 50;
const ASTEROID_SPEED = 5;
let asteroids = [];

function createAsteroid(x, y, radius = ASTEROID_SIZE) {
  const angle = Math.random() * Math.PI * 2;
  return {
    x,
    y,
    radius,
    angle,
    speed: Math.random() * ASTEROID_SPEED + 0.5,
    rotation: Math.random() * 0.02 - 0.01,
    currentRotation: 0,
  };
}

function generateAsteroids() {
  asteroids = [];
  for (let i = 0; i < NUM_ASTEROIDS; i++) {
    const x = Math.random() * WORLD_WIDTH;
    const y = Math.random() * WORLD_HEIGHT;
    asteroids.push(createAsteroid(x, y));
  }
}
generateAsteroids();

/********************************/
/*       HELPER FUNCTIONS       */
/********************************/
function distanceBetween(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function drawHealthBar() {
  const barWidth = 200;
  const barHeight = 20;
  const healthRatio = Math.max(ship.health, 0) / 100;

  ctx.fillStyle = "gray";
  ctx.fillRect(20, 20, barWidth, barHeight);

  ctx.fillStyle = healthRatio > 0.3 ? "limegreen" : "red";
  ctx.fillRect(20, 20, barWidth * healthRatio, barHeight);

  ctx.strokeStyle = "white";
  ctx.strokeRect(20, 20, barWidth, barHeight);
}

function drawScore() {
  ctx.fillStyle = "white";
  ctx.font = "18px sans-serif";
  ctx.fillText("Score: " + score, 20, 60);
}

function createFloatingText(text, x, y, color = "white") {
  floatingTexts.push({
    text,
    x,
    y,
    alpha: 1,
    dy: -0.5,
    life: 60,
    color,
  });
}

function drawFloatingTexts() {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    // Convert to camera offset
    const sx = ft.x - camera.x;
    const sy = ft.y - camera.y;

    // If it’s on screen, draw it
    if (sx >= 0 && sy >= 0 && sx < camera.w && sy < camera.h) {
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.font = "18px sans-serif";
      ctx.fillText(ft.text, sx, sy);
    }

    ft.y += ft.dy;
    ft.alpha -= 0.015;
    ft.life--;

    if (ft.life <= 0 || ft.alpha <= 0) {
      floatingTexts.splice(i, 1);
    }
  }
  ctx.globalAlpha = 1;
}

document.getElementById("restartBtn").addEventListener("click", () => {
  stopGameLoop();

  // Reset ship in world
  ship.health = 100;
  ship.x = WORLD_WIDTH / 2;
  ship.y = WORLD_HEIGHT / 2;
  ship.angle = 0;
  ship.rotation = 0;
  ship.thrust = { x: 0, y: 0 };

  score = 0;
  bullets = [];
  asteroids = [];
  floatingTexts = [];
  explosions = [];
  aliens = [];
  alienBullets = [];

  generateAliens();
  generateAsteroids();

  document.getElementById("restartBtn").style.display = "none";

  updateLoop = requestAnimationFrame(update);
});

function capSpeed() {
  const speed = Math.sqrt(ship.thrust.x ** 2 + ship.thrust.y ** 2);
  if (speed > MAX_SPEED) {
    ship.thrust.x *= MAX_SPEED / speed;
    ship.thrust.y *= MAX_SPEED / speed;
  }
}

function smartAutopilot() {
  // 1) Find nearest alien or asteroid
  let nearestTarget = null;
  let minDist = Infinity;

  const potentialTargets = [...aliens, ...asteroids];

  for (const target of potentialTargets) {
    const dist = distanceBetween(ship.x, ship.y, target.x, target.y);
    if (dist < minDist) {
      minDist = dist;
      nearestTarget = target;
    }
  }

  if (nearestTarget) {
    // 2) Rotate toward target
    const dx = nearestTarget.x - ship.x;
    const dy = nearestTarget.y - ship.y;
    const angleToTarget = Math.atan2(dy, dx);
    ship.angle = angleToTarget;

    // 3) Move toward target if far
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
    if (distanceToTarget > 100) {
      ship.thrust.x += Math.cos(angleToTarget) * THRUST_ACCEL * 1.2;
      ship.thrust.y += Math.sin(angleToTarget) * THRUST_ACCEL * 1.2;
    } else {
      ship.thrust.x *= FRICTION;
      ship.thrust.y *= FRICTION;
    }

    // 4) Fire when ready
    if (bulletCooldown <= 0) {
      shootBullet();
      bulletCooldown = BULLET_DELAY;
    }
  } else {
    // No targets — idle/brake
    ship.thrust.x *= FRICTION;
    ship.thrust.y *= FRICTION;
  }
}

function isOnCamera(obj, margin = 0) {
  // Optional margin extends the on-screen zone a bit,
  // so it can shoot just before objects fully enter the view
  return (
    obj.x >= camera.x - margin &&
    obj.x <= camera.x + camera.w + margin &&
    obj.y >= camera.y - margin &&
    obj.y <= camera.y + camera.h + margin
  );
}

// Start the game
update();
