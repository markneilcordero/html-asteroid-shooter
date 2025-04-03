const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const shipImg = new Image();
shipImg.src = "images/spaceship.png"; // Replace with your actual image path

const bulletImg = new Image();
bulletImg.src = "images/bullet.png"; // Replace with your bullet image path

let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
let mouseThrusting = false;

// ===== Ship Settings =====
const ship = {
  health: 100, // new
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 15,
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

// ===== Bullet Settings =====
const BULLET_SPEED = 3;
const BULLET_LIFE = 360; // frames
let bullets = [];
let updateLoop; // Stores the requestAnimationFrame ID

const TURN_SPEED = Math.PI / 90; // radians per frame (~2°)
const THRUST_ACCEL = 0.05;
const FRICTION = 0.100;

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
      shootBullet();
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
  bullets.push({
    x: ship.x + Math.cos(ship.angle) * ship.radius,
    y: ship.y + Math.sin(ship.angle) * ship.radius,
    dx: Math.cos(ship.angle) * BULLET_SPEED,
    dy: Math.sin(ship.angle) * BULLET_SPEED,
    life: BULLET_LIFE,
  });
}

// ===== Game Loop =====
function update() {
  // Rotate ship
  ship.angle += ship.rotation;

  // Always face mouse
  ship.angle = Math.atan2(mouse.y - ship.y, mouse.x - ship.x);

  // Distance to mouse
  const dx = mouse.x - ship.x;
  const dy = mouse.y - ship.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Only thrust if far from mouse
  if (distance > 10) {
    ship.thrust.x += Math.cos(ship.angle) * THRUST_ACCEL;
    ship.thrust.y += Math.sin(ship.angle) * THRUST_ACCEL;
  } else {
    // Apply gentle friction to stop
    ship.thrust.x *= FRICTION;
    ship.thrust.y *= FRICTION;
  }

  // Update position
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

    // Draw jagged shape
    const points = asteroid.offset.length;
    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const angle = ((Math.PI * 2) / points) * i;
      const r = asteroid.radius * asteroid.offset[i];
      const px = asteroid.x + r * Math.cos(angle);
      const py = asteroid.y + r * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.stroke();
  });

  // Move and draw bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];

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
      // Collision with ship
      ship.health -= 20;
      console.log(`💥 Ship Hit! Health: ${ship.health}`);

      // Remove asteroid on collision
      asteroids.splice(i, 1);

      if (ship.health <= 0) {
        console.log("💀 Game Over");
        cancelAnimationFrame(updateLoop);
        document.getElementById("restartBtn").style.display = "block";
        return;
      }

      break; // Prevent multiple asteroid hits in one frame
    }
  }

  // ===== Respawn Asteroids if None Are Left =====
  if (asteroids.length === 0) {
    createFloatingText(
      "New Wave!",
      canvas.width / 2 - 40,
      canvas.height / 2,
      "yellow"
    );
    generateAsteroids();
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
  ctx.rotate(angle + Math.PI / 4);
  ctx.drawImage(shipImg, -size / 2, -size / 2, size, size);
  ctx.restore();
}

// ===== Asteroid Settings =====
const NUM_ASTEROIDS = 5;
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
  generateAsteroids();

  // Hide restart button
  document.getElementById("restartBtn").style.display = "none";

  // Restart game loop
  update();
});

// Start game loop
update();
