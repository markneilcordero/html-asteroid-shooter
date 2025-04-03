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

const shipImg = new Image();
shipImg.src = "images/spaceship.png"; // Replace with your actual image path

const bulletImg = new Image();
bulletImg.src = "images/bullet.png"; // Replace with your bullet image path

const explosionImg = new Image();
explosionImg.src = "images/explosion.png"; // Replace with your actual explosion image path

const asteroidImg = new Image();
asteroidImg.src = "images/asteroid.png"; // Replace with your actual asteroid image path

const alienImg = new Image();
alienImg.src = "images/alien.png"; // Replace with your alien image path

const alienBulletImg = new Image();
alienBulletImg.src = "images/alien_bullet.png"; // Replace with your own image path

let aliens = [];
let alienBullets = [];

// ===== Stars Settings =====
const NUM_STARS = 100;
const stars = [];

for (let i = 0; i < NUM_STARS; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: Math.random() * 1.5 + 0.5,
    alpha: Math.random() * 0.5 + 0.3,
  });
}

function drawStars() {
  for (const star of stars) {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
    ctx.fill();
  }
}

let aliensToSpawnOnClear = 3; // You can increase this for more difficulty


const ALIEN_BULLET_SPEED = 2;
const ALIEN_FIRE_DELAY = 100; // frames

const NUM_ALIENS = 10;

function generateAliens() {
  aliens = [];
  for (let i = 0; i < NUM_ALIENS; i++) {
    let side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
    let x, y;

    switch (side) {
      case 0: // top
        x = Math.random() * canvas.width;
        y = -40;
        break;
      case 1: // right
        x = canvas.width + 40;
        y = Math.random() * canvas.height;
        break;
      case 2: // bottom
        x = Math.random() * canvas.width;
        y = canvas.height + 40;
        break;
      case 3: // left
        x = -40;
        y = Math.random() * canvas.height;
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

let autoplay = true; // Toggle autoplay on/off

let bulletCooldown = 0;
const BULLET_DELAY = 10; // lower = faster fire rate

// ===== Ship Settings =====
const ship = {
  health: 100, // new
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 20,
  angle: 0, // Facing angle in radians
  rotation: 0, // Rotation speed (rad/frame)
  thrusting: false,
  thrust: {
    x: 0,
    y: 0,
  },
};

let score = 0;
let floatingTexts = [];
let explosions = []; // Stores active explosion animations

// ===== Bullet Settings =====
const BULLET_SPEED = 4;
const BULLET_LIFE = 300; // frames
let bullets = [];

const TURN_SPEED = Math.PI / 90; // radians per frame (~2°)
const THRUST_ACCEL = 0.02;
const FRICTION = 0.99;

// ===== Input Handling =====
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

// ===== Mouse Controls =====
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;

  // Rotate ship to face mouse
  ship.angle = Math.atan2(mouse.y - ship.y, mouse.x - ship.x);
});

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0) {
    // Left click
    mouseThrusting = true;
  }
});

canvas.addEventListener("mouseup", (e) => {
  if (e.button === 0) {
    mouseThrusting = false;
  }
});

// Optional: Right click to shoot
canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  shootBullet();
});

function shootBullet() {
  const bulletOffset = 10; // spacing between side-by-side bullets
  const numBullets = 4;

  for (let i = 0; i < numBullets; i++) {
    // Spread bullets evenly centered on the ship
    const offset = (i - (numBullets - 1) / 2) * bulletOffset;

    // Get perpendicular offset direction
    const offsetX = Math.cos(ship.angle + Math.PI / 2) * offset;
    const offsetY = Math.sin(ship.angle + Math.PI / 2) * offset;

    // Spawn bullet with offset, but move straight forward
    bullets.push({
      x: ship.x + Math.cos(ship.angle) * ship.radius + offsetX,
      y: ship.y + Math.sin(ship.angle) * ship.radius + offsetY,
      dx: Math.cos(ship.angle) * BULLET_SPEED,
      dy: Math.sin(ship.angle) * BULLET_SPEED,
      life: BULLET_LIFE,
    });
  }
}

// ===== Game Loop =====
function update() {
  // Rotate ship
  ship.angle += ship.rotation;

  // Always face mouse
  // ship.angle = Math.atan2(mouse.y - ship.y, mouse.x - ship.x);

  if (autoplay) {
    smartAutopilot();
  } else {
    const dx = mouse.x - ship.x;
    const dy = mouse.y - ship.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 10) {
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

  // Screen edge wrap
  if (ship.x < 0) ship.x = canvas.width;
  if (ship.x > canvas.width) ship.x = 0;
  if (ship.y < 0) ship.y = canvas.height;
  if (ship.y > canvas.height) ship.y = 0;

  // Clear canvas
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawStars(); // ✨ Add stars to the background

  // Draw ship
  drawShip(ship.x, ship.y, ship.angle);

  // Move and draw asteroids
  ctx.strokeStyle = "slategray";
  ctx.lineWidth = 2;

  asteroids.forEach((asteroid) => {
    // Move
    asteroid.x += Math.cos(asteroid.angle) * asteroid.speed;
    asteroid.y += Math.sin(asteroid.angle) * asteroid.speed;

    // Screen wrap
    if (asteroid.x < 0) asteroid.x = canvas.width;
    if (asteroid.x > canvas.width) asteroid.x = 0;
    if (asteroid.y < 0) asteroid.y = canvas.height;
    if (asteroid.y > canvas.height) asteroid.y = 0;

    // Update rotation
    asteroid.currentRotation += asteroid.rotation;

    // Draw asteroid image
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.currentRotation);
    asteroid.currentRotation += asteroid.rotation; // update rotation
    const size = asteroid.radius * 2;
    ctx.drawImage(asteroidImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  });

  // ===== Update Aliens =====
  aliens.forEach((alien, i) => {
    const dx = ship.x - alien.x;
    const dy = ship.y - alien.y;
    alien.angle = Math.atan2(dy, dx);

    // Separation: Push away from nearby aliens
    aliens.forEach((otherAlien, j) => {
      if (i !== j) {
        const dist = distanceBetween(
          alien.x,
          alien.y,
          otherAlien.x,
          otherAlien.y
        );
        if (dist < 40) {
          // Adjust this distance as needed
          // Push away
          const pushX = (alien.x - otherAlien.x) / dist;
          const pushY = (alien.y - otherAlien.y) / dist;
          alien.x += pushX;
          alien.y += pushY;
        }
      }
    });

    // Only move toward ship if far enough
    const distToShip = Math.sqrt(dx * dx + dy * dy);
    const stopDistance = 120;

    if (distToShip > stopDistance) {
      const speed = 1.2;
      alien.x += Math.cos(alien.angle) * speed;
      alien.y += Math.sin(alien.angle) * speed;
    }

    // Screen wrap
    if (alien.x < 0) alien.x = canvas.width;
    if (alien.x > canvas.width) alien.x = 0;
    if (alien.y < 0) alien.y = canvas.height;
    if (alien.y > canvas.height) alien.y = 0;

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

    // Draw alien
    ctx.save();
    ctx.translate(alien.x, alien.y);
    ctx.rotate(alien.angle + Math.PI / 2);
    ctx.drawImage(alienImg, -20, -20, 40, 40);
    ctx.restore();
  });

  // ===== Update Alien Bullets =====
  for (let i = alienBullets.length - 1; i >= 0; i--) {
    const b = alienBullets[i];
    b.x += b.dx;
    b.y += b.dy;
    b.life--;

    // Remove if expired or off screen
    if (
      b.life <= 0 ||
      b.x < 0 ||
      b.x > canvas.width ||
      b.y < 0 ||
      b.y > canvas.height
    ) {
      alienBullets.splice(i, 1);
      continue;
    }

    // Draw
    // Draw alien bullet
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.dy, b.dx));
    ctx.drawImage(alienBulletImg, -6, -6, 12, 12); // slightly larger bullet
    ctx.restore();

    // Check collision with ship
    const dist = distanceBetween(b.x, b.y, ship.x, ship.y);
    if (dist < ship.radius) {
      ship.health -= 10;
      alienBullets.splice(i, 1);
      createFloatingText("-10", ship.x, ship.y, "red");

      // Add explosion effect on ship hit
      explosions.push({
        x: ship.x,
        y: ship.y,
        size: 40,
        life: 30,
      });

      if (ship.health <= 0) {
        console.log("💀 Game Over");
        stopGameLoop();
        document.getElementById("restartBtn").style.display = "block";
        return;
      }
    }
  }

  // Move and draw bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];

    // ===== Bullet vs Alien Collision =====
    for (let i = aliens.length - 1; i >= 0; i--) {
      const alien = aliens[i];
      for (let j = bullets.length - 1; j >= 0; j--) {
        const bullet = bullets[j];
        const dist = distanceBetween(bullet.x, bullet.y, alien.x, alien.y);

        if (dist < alien.radius) {
          bullets.splice(j, 1); // remove bullet
          alien.health -= 10;

          createFloatingText("-10", alien.x, alien.y, "orange");

          // Alien death
          if (alien.health <= 0) {
            explosions.push({
              x: alien.x,
              y: alien.y,
              size: 40,
              life: 30,
            });
            createFloatingText("Alien Down!", alien.x, alien.y - 10, "red");
            aliens.splice(i, 1); // remove alien
            score += 150;
          }

          break; // Exit bullet loop on hit
        }
      }
    }

    // Update position
    b.x += b.dx;
    b.y += b.dy;
    b.life--;

    // Remove if life is over or off-screen
    if (
      b.life <= 0 ||
      b.x < 0 ||
      b.x > canvas.width ||
      b.y < 0 ||
      b.y > canvas.height
    ) {
      bullets.splice(i, 1);
      continue;
    }

    // Draw bullet using image
    const size = 10; // bullet image size
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.atan2(b.dy, b.dx) + Math.PI / 4);
    ctx.drawImage(bulletImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  // ===== Collision Detection with Splitting =====
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const asteroid = asteroids[i];

    for (let j = bullets.length - 1; j >= 0; j--) {
      const bullet = bullets[j];
      const dist = distanceBetween(bullet.x, bullet.y, asteroid.x, asteroid.y);

      if (dist < asteroid.radius) {
        // Remove bullet
        bullets.splice(j, 1);

        explosions.push({
          x: asteroid.x,
          y: asteroid.y,
          size: asteroid.radius * 1.5,
          life: 30, // duration in frames
        });

        // Split asteroid if it's large enough
        if (asteroid.radius > 20) {
          const newRadius = asteroid.radius / 2;

          // Create two smaller asteroids
          asteroids.push(createAsteroid(asteroid.x, asteroid.y, newRadius));
          asteroids.push(createAsteroid(asteroid.x, asteroid.y, newRadius));
        }

        // Add score based on asteroid size
        if (asteroid.radius > 20) {
          score += 100;
          createFloatingText("+100", asteroid.x, asteroid.y, "lime");
        } else {
          score += 50;
          createFloatingText("+50", asteroid.x, asteroid.y, "lightblue");
        }

        // Remove the hit asteroid
        asteroids.splice(i, 1);
        break; // Exit inner loop
      }
    }
  }

  // ===== Collision Detection: Asteroids vs Ship =====
  for (let i = 0; i < asteroids.length; i++) {
    const asteroid = asteroids[i];
    const distToShip = distanceBetween(asteroid.x, asteroid.y, ship.x, ship.y);

    if (distToShip < asteroid.radius + ship.radius) {
      ship.health -= 5;
      console.log(`💥 Ship Hit! Health: ${ship.health}`);

      // Add explosion effect on ship hit
      explosions.push({
        x: ship.x,
        y: ship.y,
        size: 40,
        life: 30,
      });

      asteroids.splice(i, 1);

      if (ship.health <= 0) {
        console.log("💀 Game Over");
        cancelAnimationFrame(updateLoop);
        document.getElementById("restartBtn").style.display = "block";
        return;
      }

      break;
    }
  }

  if (aliens.length === 0 && !gameResetting) {
    gameResetting = true;
    createFloatingText(
      "🎉 All Aliens Defeated!",
      canvas.width / 2 - 60,
      canvas.height / 2 - 40,
      "lime"
    );
  
    setTimeout(() => {
      for (let i = 0; i < aliensToSpawnOnClear; i++) {
        let side = Math.floor(Math.random() * 4);
        let x, y;
  
        switch (side) {
          case 0:
            x = Math.random() * canvas.width;
            y = -40;
            break;
          case 1:
            x = canvas.width + 40;
            y = Math.random() * canvas.height;
            break;
          case 2:
            x = Math.random() * canvas.width;
            y = canvas.height + 40;
            break;
          case 3:
            x = -40;
            y = Math.random() * canvas.height;
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
  
      gameResetting = false;
    }, 1500);
  }
  

  for (let i = explosions.length - 1; i >= 0; i--) {
    const exp = explosions[i];
    const alpha = exp.life / 30;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      explosionImg,
      exp.x - exp.size / 2,
      exp.y - exp.size / 2,
      exp.size,
      exp.size
    );
    ctx.restore();

    exp.life--;
    if (exp.life <= 0) {
      explosions.splice(i, 1);
    }
  }
  ctx.globalAlpha = 1; // reset alpha

  // Auto-fire bullets if holding spacebar
  if (isFiring && bulletCooldown <= 0) {
    shootBullet();
    bulletCooldown = BULLET_DELAY;
  } else if (bulletCooldown > 0) {
    bulletCooldown--;
  }

  // Draw Health Bar
  drawHealthBar();
  drawScore();
  drawFloatingTexts();

  // Loop
  updateLoop = requestAnimationFrame(update);
}

// ===== Draw Ship =====
function drawShip(x, y, angle) {
  const size = ship.radius * 2;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle + Math.PI / 2);
  ctx.drawImage(shipImg, -size / 2, -size / 2, size, size);
  ctx.restore();
}

// ===== Asteroid Settings =====
const NUM_ASTEROIDS = 3;
const ASTEROID_SIZE = 50; // average radius
const ASTEROID_SPEED = 1.5;
let asteroids = [];

// ===== Create Asteroid =====
function createAsteroid(x, y, radius = ASTEROID_SIZE) {
  const angle = Math.random() * Math.PI * 2;
  return {
    x,
    y,
    radius,
    angle,
    speed: Math.random() * ASTEROID_SPEED + 0.5,
    offset: [...Array(10)].map(() => Math.random() * 0.4 + 0.8), // jagged shape
  };
}

// ===== Generate Initial Asteroids =====
function generateAsteroids() {
  asteroids = [];
  for (let i = 0; i < NUM_ASTEROIDS; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    asteroids.push(createAsteroid(x, y));
  }
}
generateAsteroids();

function distanceBetween(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function drawHealthBar() {
  const barWidth = 200;
  const barHeight = 20;
  const healthRatio = Math.max(ship.health, 0) / 100;

  // Background
  ctx.fillStyle = "gray";
  ctx.fillRect(20, 20, barWidth, barHeight);

  // Health
  ctx.fillStyle = healthRatio > 0.3 ? "limegreen" : "red";
  ctx.fillRect(20, 20, barWidth * healthRatio, barHeight);

  // Border
  ctx.strokeStyle = "white";
  ctx.strokeRect(20, 20, barWidth, barHeight);
}

function drawScore() {
  ctx.fillStyle = "white";
  ctx.font = "18px sans-serif";
  ctx.fillText("Score: " + score, 20, 60);
}
drawScore();

function createFloatingText(text, x, y, color = "white") {
  floatingTexts.push({
    text,
    x,
    y,
    alpha: 1,
    dy: -0.5,
    life: 60, // frames
    color,
  });
}

function drawFloatingTexts() {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ctx.globalAlpha = ft.alpha;
    ctx.fillStyle = ft.color;
    ctx.font = "18px sans-serif";
    ctx.fillText(ft.text, ft.x, ft.y);

    // Update
    ft.y += ft.dy;
    ft.alpha -= 0.015;
    ft.life--;

    // Remove if faded
    if (ft.life <= 0 || ft.alpha <= 0) {
      floatingTexts.splice(i, 1);
    }
  }
  ctx.globalAlpha = 1; // reset alpha
}

document.getElementById("restartBtn").addEventListener("click", () => {
  stopGameLoop(); // 🛑 Stop any existing game loop

  // Reset ship
  ship.health = 100;
  ship.x = canvas.width / 2;
  ship.y = canvas.height / 2;
  ship.angle = 0;
  ship.rotation = 0;
  ship.thrust = { x: 0, y: 0 };

  // Reset game state
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

  // 🔁 Start a fresh loop
  updateLoop = requestAnimationFrame(update);
});

function createAsteroid(x, y, radius = ASTEROID_SIZE) {
  const angle = Math.random() * Math.PI * 2;
  return {
    x,
    y,
    radius,
    angle,
    speed: Math.random() * ASTEROID_SPEED + 0.5,
    rotation: Math.random() * 0.02 - 0.01, // optional: slow rotation
    currentRotation: 0, // optional
  };
}

const MAX_SPEED = 3;

function capSpeed() {
  const speed = Math.sqrt(ship.thrust.x ** 2 + ship.thrust.y ** 2);
  if (speed > MAX_SPEED) {
    ship.thrust.x *= MAX_SPEED / speed;
    ship.thrust.y *= MAX_SPEED / speed;
  }
}

function smartAutopilot() {
  // === Avoid threats (bullets or asteroids) ===
  let nearestThreat = null;
  let minThreatDist = Infinity;

  [...alienBullets, ...asteroids].forEach((obj) => {
    const dist = distanceBetween(ship.x, ship.y, obj.x, obj.y);
    if (dist < minThreatDist) {
      minThreatDist = dist;
      nearestThreat = obj;
    }
  });

  // If a threat is nearby, dodge it
  if (nearestThreat && minThreatDist < 120) {
    const angleAway = Math.atan2(
      ship.y - nearestThreat.y,
      ship.x - nearestThreat.x
    );
    ship.angle = angleAway;
    ship.thrust.x += Math.cos(angleAway) * THRUST_ACCEL * 1.8;
    ship.thrust.y += Math.sin(angleAway) * THRUST_ACCEL * 1.8;
  } else {
    ship.thrust.x *= FRICTION;
    ship.thrust.y *= FRICTION;
  }

  // === Aim at nearest enemy and shoot ===
  let nearestTarget = null;
  let minTargetDist = Infinity;

  [...aliens, ...asteroids].forEach((obj) => {
    const dist = distanceBetween(ship.x, ship.y, obj.x, obj.y);
    if (dist < minTargetDist) {
      minTargetDist = dist;
      nearestTarget = obj;
    }
  });

  if (nearestTarget) {
    const dx = nearestTarget.x - ship.x;
    const dy = nearestTarget.y - ship.y;
    ship.angle = Math.atan2(dy, dx);

    if (bulletCooldown <= 0) {
      shootBullet();
      bulletCooldown = BULLET_DELAY;
    }
  }
}

// Start game loop
update();
