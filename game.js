// === [Images] ===
const shipImg = new Image();
shipImg.src = 'images/spaceship.png';

const alienImg = new Image();
alienImg.src = 'images/alien.png';

const opponentImg = new Image();
opponentImg.src = 'images/alien.png'; // Using alien image for opponent as requested

const asteroidImg = new Image();
asteroidImg.src = 'images/asteroid.png'; // Place your asteroid.png inside your images/ folder

// === [New Civilian and UFO Images] ===
const civilianImg = new Image();
civilianImg.src = 'images/civilian.png'; // Add your civilian.png inside images/ folder

const ufoImg = new Image();
ufoImg.src = 'images/ufo.png'; // Add your ufo.png inside images/ folder

// === [Bullet Images] ===
const playerBulletImg = new Image();
playerBulletImg.src = 'images/laser.png'; // Use laser image for player bullet

const alienBulletImg = new Image();
alienBulletImg.src = 'images/alien_bullet.png';

const ufoLaserImg = new Image();
ufoLaserImg.src = 'images/laser.png';

const opponentLaserImg = new Image(); // Added opponent laser image
opponentLaserImg.src = 'images/laser.png'; // Using the same laser image for now

// === [Sound Effects] ===
const shootSound = new Audio('sounds/laser.wav');
const explosionSound = new Audio('sounds/explosion.wav');
const shipHitSound = new Audio('sounds/ship_hit.wav');

// Adjust volumes if needed
shootSound.volume = 0.2;
explosionSound.volume = 0.5;
shipHitSound.volume = 0.5;

// === [Wave System & Alien Scaling] ===
let alienWave = 1;
let aliensPerWave = 3;
let alienBaseHealth = 50;
let alienBaseSpeed = 1.2;
let alienBaseFireDelay = 100;

// === [Autopilot Settings] ===
let autopilot = false;

// === [Gallery Mode Settings] ===
let inGalleryMode = false;

// Gallery Mode bullets
let galleryBullets = [];
let galleryAlienBullets = [];
let galleryOpponentBullets = [];
let galleryUFOLasers = [];
let galleryCivilianBullets = [];

// Initialize Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size to full window
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// === [World Settings] ===
const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;

// === [Camera Object] ===
const camera = {
  x: 0,
  y: 0,
  w: canvas.width,
  h: canvas.height,
};

// === [Starfield Background] ===
const NUM_STARS = 300;
const stars = [];
for (let i = 0; i < NUM_STARS; i++) {
  stars.push({
    x: Math.random() * WORLD_WIDTH,
    y: Math.random() * WORLD_HEIGHT,
    radius: Math.random() * 1.5 + 0.5,
    alpha: Math.random() * 0.5 + 0.3,
  });
}

// Handle resize
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // Update camera dimensions on resize
  camera.w = canvas.width;
  camera.h = canvas.height;
});

// Player Ship Object
const ship = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 20,
  angle: 0, // radians
  rotation: 0, // rotation speed
  thrusting: false,
  thrust: { x: 0, y: 0 },
  color: 'white',
  health: 100, // === [Ship Health Settings] ===
};

// === [Score Settings] ===
let score = 0;

// === [Bullet Settings] ===
const BULLET_SPEED = 7;
const BULLET_LIFE = 100; // frames
const BULLET_COOLDOWN = 10; // frames between shots

let bullets = [];
let bulletCooldown = 0;

// === [Asteroid Settings] ===
const NUM_ASTEROIDS = 10;
const ASTEROID_MIN_RADIUS = 20;
const ASTEROID_MAX_RADIUS = 50;
const ASTEROID_SPEED = 1.5;

let asteroids = [];

// === [Alien Settings] ===
const ALIEN_RADIUS = 25;
// const ALIEN_SPEED = 1.2; // Now defined by alienBaseSpeed
const ALIEN_BULLET_SPEED = 5;
// const ALIEN_FIRE_DELAY = 100; // Now defined by alienBaseFireDelay

let aliens = [];
let alienBullets = [];

// === [Opponent Settings] ===
const OPPONENT_RADIUS = 25;
const OPPONENT_SPEED = 1.8; // Note: OPPONENT_SPEED is defined but not used in the provided updateOpponent logic
const OPPONENT_BULLET_SPEED = 7; // Increased speed
const OPPONENT_FIRE_DELAY = 60; // frames between shots

let opponent = {
  x: WORLD_WIDTH / 2 + 200,
  y: WORLD_HEIGHT / 2 + 200,
  radius: OPPONENT_RADIUS,
  angle: 0,
  thrust: { x: 0, y: 0 },
  health: 100,
  fireCooldown: 0,
};

let opponentBullets = [];

// === [Civilian and UFO Settings] ===
const NUM_CIVILIANS = 5;
const NUM_UFOS = 3;
const CIVILIAN_RADIUS = 20;
const UFO_RADIUS = 25;
const UFO_SPEED = 2;
const UFO_FIRE_DELAY = 120; // frames between shots
const UFO_LASER_SPEED = 6;

let civilians = [];
let ufos = [];
let ufoLasers = [];
let civilianBullets = []; // Add this line

// === [Explosion Effects] ===
let explosions = [];

// === [Floating Text Settings] ===
let floatingTexts = [];

// === [Create Floating Text] ===
function createFloatingText(text, x, y, color = 'white', size = 18, bold = false, centered = false) {
  floatingTexts.push({
    text,
    x,
    y,
    alpha: 1,
    dy: -0.5,
    life: 60, // frames
    color,
    size,
    bold,
    centered,
  });
}

// === [Draw Floating Texts] ===
function updateFloatingTexts() {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    const sx = ft.x - camera.x;
    const sy = ft.y - camera.y;

    ctx.save();
    ctx.globalAlpha = ft.alpha;
    ctx.fillStyle = ft.color;
    ctx.font = `${ft.bold ? 'bold' : 'normal'} ${ft.size}px Arial`;
    ctx.textAlign = ft.centered ? 'center' : 'left'; // Center text if needed
    ctx.fillText(ft.text, sx, sy);
    ctx.restore();

    ft.y += ft.dy;
    ft.alpha -= 0.015;
    ft.life--;

    if (ft.life <= 0 || ft.alpha <= 0) {
      floatingTexts.splice(i, 1);
    }
  }
}


function createExplosion(x, y, size = 40) {
  explosions.push({
    x,
    y,
    size,
    life: 30, // frames
  });

  explosionSound.currentTime = 0;
  explosionSound.play();
}

// === [Draw Explosions] ===
function updateExplosions() {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const exp = explosions[i];
    const alpha = exp.life / 30; // fade out effect
    const sx = exp.x - camera.x;
    const sy = exp.y - camera.y;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'orange';
    ctx.beginPath();
    ctx.arc(sx, sy, exp.size * (1 - alpha * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    exp.life--;
    if (exp.life <= 0) {
      explosions.splice(i, 1);
    }
  }
}

// Create a single asteroid
function createAsteroid(x, y, radius = randomRange(ASTEROID_MIN_RADIUS, ASTEROID_MAX_RADIUS)) {
  const angle = Math.random() * Math.PI * 2;
  return {
    x,
    y,
    radius,
    speed: ASTEROID_SPEED * (Math.random() * 0.5 + 0.5), // randomize speed a bit
    angle,
    rotation: Math.random() * 0.05 - 0.025, // slight spin
    currentRotation: 0,
  };
}

// Spawn multiple asteroids
function generateAsteroids() {
  asteroids = [];
  for (let i = 0; i < NUM_ASTEROIDS; i++) {
    const x = Math.random() * WORLD_WIDTH;
    const y = Math.random() * WORLD_HEIGHT;
    asteroids.push(createAsteroid(x, y));
  }
}

// Helper random function
function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Controls
const TURN_SPEED = Math.PI / 90; // radians per frame
const THRUST_ACCEL = 0.1;
const FRICTION = 0.99;
const MAX_SPEED = 5;

// Input Handlers
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowLeft':
      ship.rotation = -TURN_SPEED;
      break;
    case 'ArrowRight':
      ship.rotation = TURN_SPEED;
      break;
    case 'ArrowUp':
      ship.thrusting = true;
      break;
    case ' ': // Spacebar
      if (bulletCooldown <= 0) {
        shootBullet();
        bulletCooldown = BULLET_COOLDOWN;
      }
      break;
  }
});

document.addEventListener('keyup', (e) => {
  switch (e.key) {
    case 'ArrowLeft':
    case 'ArrowRight':
      ship.rotation = 0;
      break;
    case 'ArrowUp':
      ship.thrusting = false;
      break;
  }
});

// === [Joystick Settings] ===
let isDraggingJoystick = false;
let joystickCenter = { x: 60, y: 60 }; // Center inside container (120px)
let joystickCurrent = { x: 60, y: 60 };

const joystickContainer = document.getElementById('joystickContainer');
const joystick = document.getElementById('joystick');

// === [Touch Events] ===
joystickContainer.addEventListener('touchstart', (e) => {
  isDraggingJoystick = true;
  updateJoystickPosition(e.touches[0]);
}, { passive: false });

joystickContainer.addEventListener('touchmove', (e) => {
  if (isDraggingJoystick) {
    updateJoystickPosition(e.touches[0]);
  }
}, { passive: false });

joystickContainer.addEventListener('touchend', () => {
  if (isDraggingJoystick) {
    isDraggingJoystick = false;
    resetJoystick();
  }
});

// === [Mouse Events] (for testing on desktop) ===
joystickContainer.addEventListener('mousedown', (e) => {
  isDraggingJoystick = true;
  updateJoystickPosition(e);
});

joystickContainer.addEventListener('mousemove', (e) => {
  if (isDraggingJoystick) {
    updateJoystickPosition(e);
  }
});

joystickContainer.addEventListener('mouseup', () => {
  if (isDraggingJoystick) {
    isDraggingJoystick = false;
    resetJoystick();
  }
});

joystickContainer.addEventListener('mouseleave', () => {
  if (isDraggingJoystick) {
    isDraggingJoystick = false;
    resetJoystick();
  }
});

// === [Update Joystick Visual and Ship Control] ===
function updateJoystickPosition(event) {
  const rect = joystickContainer.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const dx = x - joystickCenter.x;
  const dy = y - joystickCenter.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const maxDistance = joystickContainer.offsetWidth / 2 - joystick.offsetWidth / 2;

  let limitedX = dx;
  let limitedY = dy;

  // Cap joystick knob movement
  if (distance > maxDistance) {
    limitedX = (dx / distance) * maxDistance;
    limitedY = (dy / distance) * maxDistance;
  }

  joystick.style.transform = `translate(${limitedX}px, ${limitedY}px)`;

  // Only move ship if not in autopilot
  if (!autopilot) {
    const angle = Math.atan2(limitedY, limitedX);

    // Point ship in direction
    ship.angle = angle;

    // Apply thrust
    const JOYSTICK_THRUST = 0.03; // Adjust thrust force
    ship.thrust.x += Math.cos(angle) * JOYSTICK_THRUST;
    ship.thrust.y += Math.sin(angle) * JOYSTICK_THRUST;
    ship.thrusting = true;
  }
}

// === [Reset Joystick] ===
function resetJoystick() {
  joystick.style.transform = `translate(0px, 0px)`;
  if (!autopilot) {
    ship.thrusting = false;
  }
}


// === [Handle Autopilot Button] ===
document.getElementById('autopilotBtn').addEventListener('click', () => {
  autopilot = !autopilot;
  document.getElementById('autopilotBtn').textContent = autopilot ? '🧠 Autopilot: ON' : '🕹️ Autopilot: OFF';

  // Hide or show joystick based on autopilot
  joystickContainer.style.display = autopilot ? 'none' : 'flex';
});

// === [Handle Gallery Button] ===
document.getElementById('galleryBtn').addEventListener('click', () => {
  inGalleryMode = !inGalleryMode;
  document.getElementById('galleryBtn').textContent = inGalleryMode ? '🎮 Back to Game' : '🖼️ Show Gallery';

  if (inGalleryMode) {
    drawObjectGallery(); // Setup objects + fire bullets once
    updateGallery();     // Start animating bullets
  } else {
    // Cancel the gallery animation frame request if exiting gallery mode
    // This requires storing the request ID, let's assume it's stored in a global variable `galleryAnimationId`
    // if (galleryAnimationId) {
    //   cancelAnimationFrame(galleryAnimationId);
    //   galleryAnimationId = null;
    // }
    update();            // Resume normal game
  }
});

// === [Draw Object Gallery Function] ===
function drawObjectGallery() {
  // Clear screen
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const baseY = canvas.height / 2;
  let startX = 100;
  const spacing = 220;
  const labelOffset = 70;

  ctx.textAlign = 'center';
  ctx.font = '18px Arial';
  ctx.fillStyle = 'white';

  // Clear previous gallery bullets
  galleryBullets = [];
  galleryAlienBullets = [];
  galleryOpponentBullets = [];
  galleryUFOLasers = [];
  galleryCivilianBullets = [];

  // 1. Spaceship
  ctx.fillText('Spaceship', startX, baseY - labelOffset);
  ctx.save();
  ctx.translate(startX, baseY);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(shipImg, -30, -30, 60, 60);
  ctx.restore();

  // Fire ship laser
  galleryBullets.push({
    x: startX + 40,
    y: baseY,
    dx: 6,
    dy: 0,
    img: playerBulletImg,
    size: 20,
    height: 16,
  });

  startX += spacing;

  // 2. Alien
  ctx.fillText('Alien', startX, baseY - labelOffset);
  ctx.save();
  ctx.translate(startX, baseY);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(alienImg, -30, -30, 60, 60);
  ctx.restore();

  galleryAlienBullets.push({
    x: startX + 40,
    y: baseY,
    dx: 4,
    dy: 0,
    img: alienBulletImg,
    size: 12,
    height: 12,
  });

  startX += spacing;

  // 3. Opponent
  ctx.fillText('Opponent', startX, baseY - labelOffset);
  ctx.save();
  ctx.translate(startX, baseY);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(opponentImg, -30, -30, 60, 60);
  ctx.restore();

  galleryOpponentBullets.push({
    x: startX + 40,
    y: baseY,
    dx: 5,
    dy: 0,
  });

  startX += spacing;

  // 4. UFO
  ctx.fillText('UFO', startX, baseY - labelOffset);
  ctx.save();
  ctx.translate(startX, baseY);
  ctx.strokeStyle = 'violet';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  galleryUFOLasers.push({
    x: startX + 40,
    y: baseY,
    dx: 5,
    dy: 0,
    img: ufoLaserImg,
    size: 16,
    height: 16,
  });

  startX += spacing;

  // 5. Civilian
  ctx.fillText('Civilian', startX, baseY - labelOffset);
  ctx.save();
  ctx.translate(startX, baseY);
  ctx.fillStyle = 'lightblue';
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  galleryCivilianBullets.push({
    x: startX + 40,
    y: baseY,
    dx: 6,
    dy: 0,
    img: playerBulletImg,
    size: 20,
    height: 16,
  });

  startX += spacing;

  // 6. Asteroid
  ctx.fillText('Asteroid', startX, baseY - labelOffset);
  ctx.save();
  ctx.translate(startX, baseY);
  ctx.strokeStyle = 'gray';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// === [Restart Button] ===
document.getElementById('restartBtn').addEventListener('click', restartGame);

// Update camera to center on ship
function updateCamera() {
  camera.x = ship.x - camera.w / 2;
  camera.y = ship.y - camera.h / 2;

  // Clamp camera inside world
  if (camera.x < 0) camera.x = 0;
  if (camera.y < 0) camera.y = 0;
  if (camera.x + camera.w > WORLD_WIDTH) camera.x = WORLD_WIDTH - camera.w;
  if (camera.y + camera.h > WORLD_HEIGHT) camera.y = WORLD_HEIGHT - camera.h;
}

// === [Restart Game Function] ===
function restartGame() {
  // Reset player ship
  ship.x = WORLD_WIDTH / 2;
  ship.y = WORLD_HEIGHT / 2;
  ship.thrust = { x: 0, y: 0 };
  ship.angle = 0;
  ship.health = 100;

  // Reset score
  score = 0;

  // Reset arrays
  bullets = [];
  alienBullets = [];
  opponentBullets = [];
  ufoLasers = [];
  civilianBullets = []; // Add this line
  explosions = [];
  floatingTexts = [];

  // Respawn entities
  generateAsteroids();   // call your function that spawns asteroids
  spawnAliens();         // call your function that spawns aliens
  spawnCivilians();      // call your function that spawns civilians
  spawnUFOs();           // call your function that spawns ufos

  // Reset opponent
  opponent = {
    x: WORLD_WIDTH / 2 + 200,
    y: WORLD_HEIGHT / 2 + 200,
    radius: OPPONENT_RADIUS,
    angle: 0,
    thrust: { x: 0, y: 0 },
    health: 100,
    fireCooldown: 0,
  };

  // Optional: Reset camera
  updateCamera();

  // Hide or show joystick based on autopilot state
  joystickContainer.style.display = autopilot ? 'none' : 'flex';
}

// === [Smart Autopilot Logic] ===
function smartAutopilot() {
  const DODGE_RADIUS = 150; // Dodge earlier (was 100)
  const DODGE_FORCE = 0.2;  // Dodge harder
  let dodge = { x: 0, y: 0 };

  // 1. Dodge incoming bullets (alienBullets and opponentBullets)
  const incomingBullets = [...alienBullets, ...opponentBullets]; // Dodge both
  for (const bullet of incomingBullets) {
    const dx = ship.x - bullet.x;
    const dy = ship.y - bullet.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < DODGE_RADIUS) {
      const repelForce = (1 - dist / DODGE_RADIUS);
      dodge.x += (dx / dist) * repelForce;
      dodge.y += (dy / dist) * repelForce;
    }
  }

  // Normalize dodge vector and apply dodge force
  const dodgeMag = Math.sqrt(dodge.x * dodge.x + dodge.y * dodge.y);
  if (dodgeMag > 0) {
    dodge.x = (dodge.x / dodgeMag) * DODGE_FORCE;
    dodge.y = (dodge.y / dodgeMag) * DODGE_FORCE;

    ship.thrust.x += dodge.x;
    ship.thrust.y += dodge.y;
  }

  // 2. Hunt nearest target if not actively dodging
  if (dodgeMag <= 0.1) { // Small margin to allow slight dodging while hunting
    let nearestTarget = null;
    let minDist = Infinity;

    // Find nearest alien
    for (const alien of aliens) {
      const d = Math.hypot(alien.x - ship.x, alien.y - ship.y);
      if (d < minDist) {
        minDist = d;
        nearestTarget = alien;
      }
    }

    // Check opponent too
    if (opponent.health > 0) {
      const d = Math.hypot(opponent.x - ship.x, opponent.y - ship.y);
      if (d < minDist) {
        minDist = d;
        nearestTarget = opponent;
      }
    }

    if (nearestTarget) {
      const dx = nearestTarget.x - ship.x;
      const dy = nearestTarget.y - ship.y;
      const angleToTarget = Math.atan2(dy, dx);

      // Smoothly rotate toward target
      const angleDiff = angleToTarget - ship.angle;
      const normalizedAngleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      ship.angle += normalizedAngleDiff * 0.15; // Faster aim than before

      // Adjust movement dynamically
      if (minDist > 400) {
        // Far: chase faster
        ship.thrust.x += Math.cos(ship.angle) * THRUST_ACCEL * 1.2;
        ship.thrust.y += Math.sin(ship.angle) * THRUST_ACCEL * 1.2;
      } else if (minDist > 150) {
        // Mid: chase normal
        ship.thrust.x += Math.cos(ship.angle) * THRUST_ACCEL * 0.8;
        ship.thrust.y += Math.sin(ship.angle) * THRUST_ACCEL * 0.8;
      } else if (minDist < 100) {
        // Too close: back away
        ship.thrust.x -= Math.cos(ship.angle) * THRUST_ACCEL * 0.6;
        ship.thrust.y -= Math.sin(ship.angle) * THRUST_ACCEL * 0.6;
      }

      // 3. Shooting logic
      const angleError = Math.abs(normalizedAngleDiff);
      if (bulletCooldown <= 0 && angleError < Math.PI / 5) { // Wider shooting angle
        shootBullet();
        bulletCooldown = BULLET_COOLDOWN;
      }
    } else {
      // No target, apply friction to slow down
      ship.thrust.x *= FRICTION;
      ship.thrust.y *= FRICTION;
    }
  } else {
    // If dodging, slightly dampen hunting thrust
    ship.thrust.x *= FRICTION;
    ship.thrust.y *= FRICTION;
  }
}

// === [Dodge Only Mode for Manual] ===
function dodgeOnlyAutopilot() {
  const DODGE_RADIUS = 100; // How close bullets need to be to trigger dodge
  const DODGE_FORCE = 0.15; // How strongly the ship dodges
  let dodge = { x: 0, y: 0 };

  // Consider only alien bullets for dodging
  const incomingBullets = [...alienBullets]; // Use a copy
  for (const bullet of incomingBullets) {
    const dx = ship.x - bullet.x;
    const dy = ship.y - bullet.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If bullet is within dodge radius
    if (dist < DODGE_RADIUS) {
      // Calculate repulsion force: stronger when closer
      const repelForce = (1 - dist / DODGE_RADIUS);
      // Add repulsion vector component
      dodge.x += (dx / dist) * repelForce;
      dodge.y += (dy / dist) * repelForce;
    }
  }

  // Normalize the total dodge vector
  const dodgeMag = Math.sqrt(dodge.x * dodge.x + dodge.y * dodge.y);
  if (dodgeMag > 0) {
    // Apply a scaled dodge force to the ship's thrust
    dodge.x = (dodge.x / dodgeMag) * DODGE_FORCE;
    dodge.y = (dodge.y / dodgeMag) * DODGE_FORCE;

    ship.thrust.x += dodge.x;
    ship.thrust.y += dodge.y;
    // Note: We don't change ship.angle here, allowing manual aiming while dodging.
  }
}

// Update camera to follow ship
function updateCamera() {
  camera.x = ship.x - camera.w / 2;
  camera.y = ship.y - camera.h / 2;

  // Clamp camera inside world
  if (camera.x < 0) camera.x = 0;
  if (camera.y < 0) camera.y = 0;
  if (camera.x + camera.w > WORLD_WIDTH) camera.x = WORLD_WIDTH - camera.w;
  if (camera.y + camera.h > WORLD_HEIGHT) camera.y = WORLD_HEIGHT - camera.h;
}

// Draw the starfield background
function drawStars() {
  for (const star of stars) {
    const sx = star.x - camera.x;
    const sy = star.y - camera.y;
    // Only draw stars visible in the camera view (+ a small buffer)
    if (sx < -10 || sy < -10 || sx > camera.w + 10 || sy > camera.h + 10) continue;

    ctx.beginPath();
    ctx.arc(sx, sy, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
    ctx.fill();
  }
}

// === [Shoot Bullet] ===
function shootBullet() {
  bullets.push({
    x: ship.x + Math.cos(ship.angle) * ship.radius, // Start from ship's nose
    y: ship.y + Math.sin(ship.angle) * ship.radius, // Start from ship's nose
    dx: Math.cos(ship.angle) * BULLET_SPEED,
    dy: Math.sin(ship.angle) * BULLET_SPEED,
    life: BULLET_LIFE
  });
  shootSound.currentTime = 0; // Rewind sound to start
  shootSound.play(); // Play shooting sound
}

// === [Respawn Ship] ===
function respawnShip() {
  ship.health = 100;
  ship.x = WORLD_WIDTH / 2;
  ship.y = WORLD_HEIGHT / 2;
  ship.thrust.x = 0;
  ship.thrust.y = 0;
  ship.angle = 0;
}

// === [Draw Health Bar] ===
function drawHealthBar() {
  const barWidth = 200;
  const barHeight = 20;
  const healthRatio = Math.max(ship.health, 0) / 100;

  ctx.fillStyle = 'gray';
  ctx.fillRect(20, 20, barWidth, barHeight);

  ctx.fillStyle = healthRatio > 0.3 ? 'limegreen' : 'red';
  ctx.fillRect(20, 20, barWidth * healthRatio, barHeight);

  ctx.strokeStyle = 'white';
  ctx.strokeRect(20, 20, barWidth, barHeight);
}

// === [Draw Score on Screen] ===
function drawScore() {
  ctx.fillStyle = 'white';
  ctx.font = '18px Arial';
  ctx.fillText('Score: ' + score, 20, 60);
}

// === [Create Civilians] ===
function spawnCivilians() {
  civilians = [];
  for (let i = 0; i < NUM_CIVILIANS; i++) {
    civilians.push({
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      dx: (Math.random() - 0.5) * 1.5,
      dy: (Math.random() - 0.5) * 1.5,
      radius: CIVILIAN_RADIUS,
      wanderTimer: Math.floor(Math.random() * 120 + 60),
      fireCooldown: Math.floor(Math.random() * 100) + 50, // Add this line
    });
  }
}

// === [Create UFOs] ===
function spawnUFOs() {
  ufos = [];
  for (let i = 0; i < NUM_UFOS; i++) {
    ufos.push({
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      dx: (Math.random() - 0.5) * 2,
      dy: (Math.random() - 0.5) * 2,
      radius: UFO_RADIUS,
      fireCooldown: UFO_FIRE_DELAY,
      wanderTimer: 100,
    });
  }
}

// === [UFO Shoots Laser] ===
function ufoShoot(ufo, target) {
  const angle = Math.atan2(target.y - ufo.y, target.x - ufo.x);
  ufoLasers.push({
    x: ufo.x,
    y: ufo.y,
    dx: Math.cos(angle) * UFO_LASER_SPEED,
    dy: Math.sin(angle) * UFO_LASER_SPEED,
    life: 100,
  });
}

// === [Update Civilians] ===
function updateCivilians() {
  for (let i = civilians.length - 1; i >= 0; i--) { // Iterate backwards for safe removal
    const civ = civilians[i];
    // Wander movement
    civ.x += civ.dx;
    civ.y += civ.dy;
    civ.wanderTimer--;

    if (civ.wanderTimer <= 0) {
      civ.dx = (Math.random() - 0.5) * 1.5;
      civ.dy = (Math.random() - 0.5) * 1.5;
      civ.wanderTimer = Math.floor(Math.random() * 120 + 60);
    }

    // Dodge nearby UFO lasers
    let dodgeX = 0, dodgeY = 0;
    for (const laser of ufoLasers) {
      const d = Math.sqrt((laser.x - civ.x) ** 2 + (laser.y - civ.y) ** 2);
      if (d < 100 && d > 0) { // Add d > 0 check
        dodgeX += (civ.x - laser.x) / d;
        dodgeY += (civ.y - laser.y) / d;
      }
    }
    // Apply dodge force gradually
    civ.dx += dodgeX * 0.05; // Reduced dodge force factor
    civ.dy += dodgeY * 0.05; // Reduced dodge force factor

    // Clamp velocity to prevent excessive speed from dodging
    const civSpeed = Math.sqrt(civ.dx * civ.dx + civ.dy * civ.dy);
    const MAX_CIV_SPEED = 2;
    if (civSpeed > MAX_CIV_SPEED) {
        civ.dx *= MAX_CIV_SPEED / civSpeed;
        civ.dy *= MAX_CIV_SPEED / civSpeed;
    }


    // Clamp to world (bounce)
    if (civ.x < civ.radius) { civ.x = civ.radius; civ.dx *= -1; }
    if (civ.x > WORLD_WIDTH - civ.radius) { civ.x = WORLD_WIDTH - civ.radius; civ.dx *= -1; }
    if (civ.y < civ.radius) { civ.y = civ.radius; civ.dy *= -1; }
    if (civ.y > WORLD_HEIGHT - civ.radius) { civ.y = WORLD_HEIGHT - civ.radius; civ.dy *= -1; }

    // Civilian Shooting
    civ.fireCooldown--;
    if (civ.fireCooldown <= 0) {
      let nearestUfo = null;
      let minDist = Infinity;
      for (const ufo of ufos) {
        const d = Math.sqrt((civ.x - ufo.x) ** 2 + (civ.y - ufo.y) ** 2);
        if (d < minDist) {
          minDist = d;
          nearestUfo = ufo;
        }
      }

      if (nearestUfo && minDist < 500) { // Only shoot if UFO close enough
        const angle = Math.atan2(nearestUfo.y - civ.y, nearestUfo.x - civ.x);
        civilianBullets.push({
          x: civ.x,
          y: civ.y,
          dx: Math.cos(angle) * 6,
          dy: Math.sin(angle) * 6,
          life: 80,
        });
      }
      civ.fireCooldown = Math.floor(Math.random() * 100) + 50; // Reset cooldown
    }


    // Draw civilian (only if visible)
    const sx = civ.x - camera.x;
    const sy = civ.y - camera.y;
    const buffer = civ.radius;
    if (sx > -buffer && sx < camera.w + buffer && sy > -buffer && sy < camera.h + buffer) {
        ctx.save(); // Add save
        ctx.translate(sx, sy); // Add translate
        // Replace drawing code
        ctx.drawImage(civilianImg, -civ.radius, -civ.radius, civ.radius * 2, civ.radius * 2);
        ctx.restore(); // Add restore
    }
  }
}

// === [Update UFOs] ===
function updateUFOs() {
  for (let i = ufos.length - 1; i >= 0; i--) { // Iterate backwards
    const ufo = ufos[i];
    // Chase nearest civilian
    let nearest = null;
    let minDist = Infinity;

    for (const civ of civilians) {
      const d = Math.sqrt((ufo.x - civ.x) ** 2 + (ufo.y - civ.y) ** 2);
      if (d < minDist) {
        minDist = d;
        nearest = civ;
      }
    }

    if (nearest) {
      const angle = Math.atan2(nearest.y - ufo.y, nearest.x - ufo.x);
      // Accelerate towards target
      ufo.dx += Math.cos(angle) * 0.05; // Gradual acceleration
      ufo.dy += Math.sin(angle) * 0.05;
    } else {
      // Wander
      ufo.wanderTimer--;
      if (ufo.wanderTimer <= 0) {
        const wanderAngle = Math.random() * Math.PI * 2;
        ufo.dx += Math.cos(wanderAngle) * 0.03; // Gentle wander acceleration
        ufo.dy += Math.sin(wanderAngle) * 0.03;
        ufo.wanderTimer = 100 + Math.random() * 100;
      }
    }

    // Apply friction and limit speed
    ufo.dx *= 0.99;
    ufo.dy *= 0.99;
    const ufoSpeed = Math.sqrt(ufo.dx * ufo.dx + ufo.dy * ufo.dy);
    if (ufoSpeed > UFO_SPEED) {
        ufo.dx *= UFO_SPEED / ufoSpeed;
        ufo.dy *= UFO_SPEED / ufoSpeed;
    }


    ufo.x += ufo.dx;
    ufo.y += ufo.dy;

    // Bounce at edges
    if (ufo.x < ufo.radius) { ufo.x = ufo.radius; ufo.dx *= -1; }
    if (ufo.x > WORLD_WIDTH - ufo.radius) { ufo.x = WORLD_WIDTH - ufo.radius; ufo.dx *= -1; }
    if (ufo.y < ufo.radius) { ufo.y = ufo.radius; ufo.dy *= -1; }
    if (ufo.y > WORLD_HEIGHT - ufo.radius) { ufo.y = WORLD_HEIGHT - ufo.radius; ufo.dy *= -1; }


    // Shoot laser at civilians
    ufo.fireCooldown--;
    if (ufo.fireCooldown <= 0 && nearest && minDist < 500) { // Add range check
      ufoShoot(ufo, nearest);
      ufo.fireCooldown = UFO_FIRE_DELAY;
    }

    // Draw UFO (only if visible)
    const sx = ufo.x - camera.x;
    const sy = ufo.y - camera.y;
    const buffer = ufo.radius;
     if (sx > -buffer && sx < camera.w + buffer && sy > -buffer && sy < camera.h + buffer) {
        ctx.save(); // Add save
        ctx.translate(sx, sy); // Add translate
        // Replace drawing code
        ctx.drawImage(ufoImg, -ufo.radius, -ufo.radius, ufo.radius * 2, ufo.radius * 2);
        ctx.restore(); // Add restore
    }

    // Check collision with player bullets
    for (let j = bullets.length - 1; j >= 0; j--) {
        const b = bullets[j];
        const d = Math.sqrt((b.x - ufo.x) ** 2 + (b.y - ufo.y) ** 2);
        if (d < ufo.radius) {
            bullets.splice(j, 1); // destroy bullet
            ufos.splice(i, 1); // destroy ufo
            score += 400; // reward for killing ufo
            break; // Bullet hit, stop checking this ufo
        }
    }
  }
}

// === [Update and Draw UFO Lasers] ===
function updateUFOLasers() {
  for (let i = ufoLasers.length - 1; i >= 0; i--) {
    const l = ufoLasers[i];
    l.x += l.dx;
    l.y += l.dy;
    l.life--;

    if (l.life <= 0 || l.x < 0 || l.x > WORLD_WIDTH || l.y < 0 || l.y > WORLD_HEIGHT) {
      ufoLasers.splice(i, 1);
      continue;
    }

    // Draw laser (only if visible)
    const sx = l.x - camera.x;
    const sy = l.y - camera.y;
    if (sx > -5 && sx < camera.w + 5 && sy > -5 && sy < camera.h + 5) {
        const laserSize = 16;
        ctx.drawImage(ufoLaserImg, sx - laserSize/2, sy - laserSize/2, laserSize, laserSize);
    }


    // Check if laser hits civilian
    for (let j = civilians.length - 1; j >= 0; j--) {
      const civ = civilians[j];
      const d = Math.sqrt((l.x - civ.x) ** 2 + (l.y - civ.y) ** 2);
      if (d < civ.radius) {
        civilians.splice(j, 1); // Remove civilian
        ufoLasers.splice(i, 1); // Remove laser
        // Optional: Add score penalty or sound effect
        createFloatingText(`💀 Civilian Lost!`, ship.x, ship.y - 100, 'cyan', 22, true, true);
        break; // Laser hit, stop checking other civilians
      }
    }

    // Check if laser hits player
    const distPlayer = Math.sqrt((l.x - ship.x) ** 2 + (l.y - ship.y) ** 2);
    if (distPlayer < ship.radius) {
        ship.health -= 15; // Player takes damage from UFO laser
        ufoLasers.splice(i, 1); // Remove laser
        createFloatingText(`👾 UFO Laser Hit! HP: ${ship.health}`, ship.x, ship.y - 50, 'violet', 22, true, true);
        if (ship.health <= 0) {
            respawnShip();
        }
        // No continue here, laser is gone, loop continues to next laser
    }
  }
}

// === [Update and Draw Alien Bullets] ===
function updateAlienBullets() {
  for (let i = alienBullets.length - 1; i >= 0; i--) {
    const b = alienBullets[i];
    b.x += b.dx;
    b.y += b.dy;
    b.life--;

    // Remove if expired or out of bounds
    if (b.life <= 0 || b.x < 0 || b.x > WORLD_WIDTH || b.y < 0 || b.y > WORLD_HEIGHT) {
      alienBullets.splice(i, 1);
      continue;
    }

    // Draw alien bullet
    const sx = b.x - camera.x;
    const sy = b.y - camera.y;
    if (sx > -5 && sx < camera.w + 5 && sy > -5 && sy < camera.h + 5) {
      const bulletSize = 12; // or whatever size you want
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(Math.atan2(b.dy, b.dx)); // 🧠 Rotate the bullet to face moving direction
      ctx.drawImage(alienBulletImg, -bulletSize/2, -bulletSize/2, bulletSize, bulletSize);
      ctx.restore();
    }

    // Check hit with player ship
    const dist = Math.sqrt((b.x - ship.x) ** 2 + (b.y - ship.y) ** 2);
    if (dist < ship.radius) {
      ship.health -= 15; // Player takes damage
      alienBullets.splice(i, 1); // Remove bullet
      shipHitSound.currentTime = 0;
      shipHitSound.play();
      if (ship.health <= 0) {
        respawnShip();
      }
      continue;
    }
  }
}

// === [Update and Draw Civilian Bullets] ===
function updateCivilianBullets() {
  for (let i = civilianBullets.length - 1; i >= 0; i--) {
    const b = civilianBullets[i];
    b.x += b.dx;
    b.y += b.dy;
    b.life--;

    if (b.life <= 0 || b.x < 0 || b.x > WORLD_WIDTH || b.y < 0 || b.y > WORLD_HEIGHT) { // Also check world bounds
      civilianBullets.splice(i, 1);
      continue;
    }

    // Draw bullet (only if visible)
    const sx = b.x - camera.x;
    const sy = b.y - camera.y;
    if (sx > -5 && sx < camera.w + 5 && sy > -5 && sy < camera.h + 5) { // Culling check
        const bulletSize = 20;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(Math.atan2(b.dy, b.dx)); // Rotate bullet to match its movement
        ctx.drawImage(playerBulletImg, -bulletSize/2, -bulletSize/2, bulletSize, bulletSize);
        ctx.restore();
    }

    // Check hit with UFO
    for (let j = ufos.length - 1; j >= 0; j--) {
      const ufo = ufos[j];
      const d = Math.sqrt((b.x - ufo.x) ** 2 + (b.y - ufo.y) ** 2);
      if (d < ufo.radius) {
        createExplosion(ufo.x, ufo.y, ufo.radius * 1.5); // Add explosion on hit
        ufos.splice(j, 1); // destroy UFO
        civilianBullets.splice(i, 1); // destroy bullet
        score += 200; // bonus score
        createFloatingText('+200 UFO Destroyed!', b.x, b.y, 'lightblue', 16); // Floating text for score
        break; // Bullet hit, stop checking UFOs for this bullet
      }
    }
  }
}


// Game Loop
function update() {
  // === [Gallery Mode Check] ===
  if (inGalleryMode) return; // Stop updating game while in gallery mode

  // Ship rotation is handled differently depending on autopilot state
  // Manual rotation happens via input handlers setting ship.rotation

  // Autopilot logic
  if (autopilot) {
    smartAutopilot(); // Autopilot controls rotation and thrust
  } else {
    // Manual control + passive dodge
    ship.angle += ship.rotation; // Apply manual rotation

    // Manual Thrust
    if (ship.thrusting) {
      ship.thrust.x += Math.cos(ship.angle) * THRUST_ACCEL;
      ship.thrust.y += Math.sin(ship.angle) * THRUST_ACCEL;
    } else {
      // Apply friction only when not thrusting manually and autopilot is off
      ship.thrust.x *= FRICTION;
      ship.thrust.y *= FRICTION;
    }
  }

  // Apply thrust (whether from autopilot or manual control)
  ship.x += ship.thrust.x;
  ship.y += ship.thrust.y;

  // Limit max speed (applied regardless of control mode)
  const speed = Math.sqrt(ship.thrust.x ** 2 + ship.thrust.y ** 2);
  if (speed > MAX_SPEED) {
    ship.thrust.x *= MAX_SPEED / speed;
    ship.thrust.y *= MAX_SPEED / speed;
  }

  // Clamp ship inside world boundaries (replacing screen wrapping)
  if (ship.x < ship.radius) ship.x = ship.radius;
  if (ship.x > WORLD_WIDTH - ship.radius) ship.x = WORLD_WIDTH - ship.radius;
  if (ship.y < ship.radius) ship.y = ship.radius;
  if (ship.y > WORLD_HEIGHT - ship.radius) ship.y = WORLD_HEIGHT - ship.radius;

  // Update camera to follow ship
  updateCamera();

  // Clear screen
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw background stars
  drawStars();

  // Update and draw asteroids
  updateAsteroids();

  // Update and draw alien bullets
  updateAlienBullets();

  // Update and draw aliens
  updateAliens();

  // === [Update and Draw Opponent Bullets] ===
  updateOpponentBullets(); // Call opponent bullet update logic

  // === [Opponent AI Logic] ===
  updateOpponent(); // Call opponent update logic

  // === [Update UFOs, Civilians, Lasers] ===
  updateUFOLasers();
  updateUFOs();
  updateCivilians();
  updateCivilianBullets(); // Add this line

  // Update and draw bullets
  updateBullets();

  // Draw Ship relative to camera
  drawShip();

  // Draw Health Bar
  drawHealthBar();

  // Draw Score
  drawScore();

  // Decrease bullet cooldown
  if (bulletCooldown > 0) {
    bulletCooldown--;
  }

  // Update Explosions
  updateExplosions();

  // Update Floating Texts
  updateFloatingTexts();

  requestAnimationFrame(update);
}

// === [Make a updateGallery() function (for animation)] ===
function updateGallery() {
  // Clear screen
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const baseY = canvas.height / 2;
  let startX = 100;
  const spacing = 220;
  const labelOffset = 70;

  ctx.textAlign = 'center';
  ctx.font = '18px Arial';
  ctx.fillStyle = 'white';

  // 1. Spaceship
  ctx.fillText('Spaceship', startX, baseY - labelOffset);
  ctx.save();
  ctx.translate(startX, baseY);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(shipImg, -30, -30, 60, 60);
  ctx.restore();
  startX += spacing;

  // 2. Alien
  ctx.fillText('Alien', startX, baseY - labelOffset);
  ctx.save();
  ctx.translate(startX, baseY);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(alienImg, -30, -30, 60, 60);
  ctx.restore();
  startX += spacing;

  // 3. Opponent
  ctx.fillText('Opponent', startX, baseY - labelOffset);
  ctx.save();
  ctx.translate(startX, baseY);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(opponentImg, -30, -30, 60, 60);
  ctx.restore();
  startX += spacing;

  // 4. UFO
  ctx.fillText('UFO', startX, baseY - labelOffset);
  ctx.save();
  ctx.translate(startX, baseY);
  ctx.strokeStyle = 'violet';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  startX += spacing;

  // 5. Civilian
  ctx.fillText('Civilian', startX, baseY - labelOffset);
  ctx.save();
  ctx.translate(startX, baseY);
  ctx.fillStyle = 'lightblue';
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  startX += spacing;

  // 6. Asteroid
  ctx.fillText('Asteroid', startX, baseY - labelOffset);
  ctx.save();
  ctx.translate(startX, baseY);
  ctx.strokeStyle = 'gray';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Update and draw gallery bullets
  function moveAndDraw(bulletsArray, color = 'white') {
    for (let i = bulletsArray.length - 1; i >= 0; i--) {
      const b = bulletsArray[i];
      b.x += b.dx;
      b.y += b.dy;

      if (b.img) {
        ctx.drawImage(b.img, b.x, b.y - (b.height || 16) / 2, b.size, b.height || b.size);
      } else {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Remove bullets when off screen
      if (b.x > canvas.width + 50) {
        bulletsArray.splice(i, 1);
      }
    }
  }

  moveAndDraw(galleryBullets);
  moveAndDraw(galleryAlienBullets);
  moveAndDraw(galleryOpponentBullets, 'yellow');
  moveAndDraw(galleryUFOLasers);
  moveAndDraw(galleryCivilianBullets);

  requestAnimationFrame(updateGallery);
}

// === [Update and Draw Bullets] ===
function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.dx;
    b.y += b.dy;
    b.life--;

    // Remove bullet if out of life or world bounds
    if (
      b.life <= 0 ||
      b.x < 0 || b.x > WORLD_WIDTH ||
      b.y < 0 || b.y > WORLD_HEIGHT
    ) {
      bullets.splice(i, 1);
      continue; // Skip drawing and collision if removed
    }

    // Draw player bullet (only if visible)
    const sx = b.x - camera.x;
    const sy = b.y - camera.y;
    if (sx > -5 && sx < camera.w + 5 && sy > -5 && sy < camera.h + 5) { // Culling check
        const bulletSize = 20; // Match size used in drawObjectGallery
        const bulletHeight = 16; // Match height used in drawObjectGallery
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(Math.atan2(b.dy, b.dx)); // Rotate bullet image
        ctx.drawImage(playerBulletImg, -bulletSize / 2, -bulletHeight / 2, bulletSize, bulletHeight);
        ctx.restore();
    }


    // === [Bullet Collision with Opponent] ===
    if (opponent.health > 0) { // Check only if opponent is alive
        const d = Math.sqrt((b.x - opponent.x) ** 2 + (b.y - opponent.y) ** 2);
        if (d < opponent.radius) {
            bullets.splice(i, 1); // Remove player bullet
            opponent.health -= 50; // Apply damage to opponent
            createFloatingText(`Opponent Hit! HP: ${opponent.health}`, opponent.x, opponent.y, 'red', 18, true, true); // Show damage text
            createExplosion(b.x, b.y, 15); // Small explosion effect

            if (opponent.health <= 0) {
                score += 500; // Award score for defeating opponent
                createFloatingText(`💥 Opponent Defeated! +500`, opponent.x, opponent.y, 'orange', 24, true, true);
                createExplosion(opponent.x, opponent.y, opponent.radius * 2); // Big explosion for opponent
                // Consider respawning opponent after a delay here if desired
            }
            continue; // Bullet hit opponent, no need to check other collisions for this bullet
        }
    }

    // Note: Collision checks for asteroids and aliens are handled within their respective update functions (updateAsteroids, updateAliens)
  }
}

// === [Update and Draw Asteroids] ===
function updateAsteroids() {
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const a = asteroids[i];

    // Move asteroid
    a.x += Math.cos(a.angle) * a.speed;
    a.y += Math.sin(a.angle) * a.speed;
    a.currentRotation += a.rotation;

    // Wrap around world edges
    if (a.x < 0) a.x = WORLD_WIDTH;
    if (a.x > WORLD_WIDTH) a.x = 0;
    if (a.y < 0) a.y = WORLD_HEIGHT;
    if (a.y > WORLD_HEIGHT) a.y = 0;

    // === [Asteroid Collision with Ship - inside updateAsteroids()] ===
    // Ship collision check
    const dxShip = a.x - ship.x;
    const dyShip = a.y - ship.y;
    const distShip = Math.sqrt(dxShip * dxShip + dyShip * dyShip);

    if (distShip < a.radius + ship.radius) {
      ship.health -= 20; // reduce health
      createFloatingText(`🚨 Ship hit! HP: ${ship.health}`, ship.x, ship.y - 40, 'red', 24, true, true);

      // Respawn if dead
      if (ship.health <= 0) {
        respawnShip();
      }

      // Destroy asteroid on impact
      if (a.radius > ASTEROID_MIN_RADIUS + 10) {
        const newRadius = a.radius / 2;
        asteroids.push(createAsteroid(a.x, a.y, newRadius));
        asteroids.push(createAsteroid(a.x, a.y, newRadius));
      }
      asteroids.splice(i, 1);
      continue; // Important: continue after modifying asteroid array to avoid errors
    }


    // Draw asteroid relative to camera
    const sx = a.x - camera.x;
    const sy = a.y - camera.y;

    // Only draw if visible in camera (+ buffer)
    const buffer = a.radius; // Use radius as buffer
    if (sx > -buffer && sx < camera.w + buffer && sy > -buffer && sy < camera.h + buffer) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(a.currentRotation);

        // Draw asteroid image
        const imgSize = a.radius * 2; // size the image to match asteroid size
        ctx.drawImage(asteroidImg, -imgSize / 2, -imgSize / 2, imgSize, imgSize);

        ctx.restore();
    }


    // Check bullet collision
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      const dxBullet = a.x - b.x;
      const dyBullet = a.y - b.y;
      const distBullet = Math.sqrt(dxBullet * dxBullet + dyBullet * dyBullet);

      if (distBullet < a.radius) {
        bullets.splice(j, 1); // remove bullet

        // Award points
        if (a.radius > ASTEROID_MIN_RADIUS + 10) {
          score += 100; // Big asteroid destroyed
          // Split into 2 smaller asteroids
          const newRadius = a.radius / 2;
          asteroids.push(createAsteroid(a.x, a.y, newRadius));
          asteroids.push(createAsteroid(a.x, a.y, newRadius));
        } else {
          score += 50; // Small asteroid destroyed
        }

        asteroids.splice(i, 1); // remove original asteroid
        break; // stop checking this asteroid for other bullets
      }
    }
  }
}

// === [Create Aliens] ===
function spawnAliens() {
  aliens = [];
  for (let i = 0; i < aliensPerWave; i++) {
    let x, y;
    const side = Math.floor(Math.random() * 4);
    if (side === 0) { // Top
      x = Math.random() * WORLD_WIDTH;
      y = -40;
    } else if (side === 1) { // Bottom
      x = Math.random() * WORLD_WIDTH;
      y = WORLD_HEIGHT + 40;
    } else if (side === 2) { // Left
      x = -40;
      y = Math.random() * WORLD_HEIGHT;
    } else { // Right
      x = WORLD_WIDTH + 40;
      y = Math.random() * WORLD_HEIGHT;
    }

    aliens.push({
      x,
      y,
      radius: ALIEN_RADIUS,
      angle: 0,
      fireCooldown: Math.floor(Math.random() * alienBaseFireDelay),
      health: alienBaseHealth,
      speed: alienBaseSpeed, // each alien now remembers its own speed!
    });
  }
}

// === [Shoot Alien Bullet] ===
function alienShoot(alien) {
  alienBullets.push({
    x: alien.x,
    y: alien.y,
    dx: Math.cos(alien.angle) * ALIEN_BULLET_SPEED,
    dy: Math.sin(alien.angle) * ALIEN_BULLET_SPEED,
    life: 100,
  });
}

// === [Update and Draw Aliens] ===
function updateAliens() {
  for (let i = aliens.length - 1; i >= 0; i--) {
    const a = aliens[i];

    // Chase player
    const dx = ship.x - a.x;
    const dy = ship.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    a.angle = Math.atan2(dy, dx);

    if (dist > 60) { // Don't get too close
      a.x += Math.cos(a.angle) * a.speed; // Use alien's specific speed
      a.y += Math.sin(a.angle) * a.speed; // Use alien's specific speed
    }

    // === [Alien Avoidance with Other Aliens] ===
    for (let j = 0; j < aliens.length; j++) {
      if (i === j) continue; // Skip self

      const other = aliens[j];
      const dx = a.x - other.x;
      const dy = a.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const minDist = a.radius + other.radius;

      if (dist < minDist && dist > 0) {
        const overlap = minDist - dist;
        // Push both aliens away from each other
        a.x += (dx / dist) * (overlap / 2);
        a.y += (dy / dist) * (overlap / 2);
        // Note: Modifying 'other' here requires care if the inner loop index 'j'
        // could become invalid due to alien removal in other parts of the code.
        // However, since we are iterating forward (j=0 to length) and only pushing,
        // and the outer loop iterates backward, this should be relatively safe.
        // If issues arise, revert to only pushing 'a'.
        other.x -= (dx / dist) * (overlap / 2);
        other.y -= (dy / dist) * (overlap / 2);
      }
    }

    // === [Alien Avoidance with Opponent] ===
    if (opponent.health > 0) { // Only avoid if opponent is alive
      const dxOp = a.x - opponent.x;
      const dyOp = a.y - opponent.y;
      const distOp = Math.sqrt(dxOp * dxOp + dyOp * dyOp);

      const minDistOp = a.radius + opponent.radius;

      if (distOp < minDistOp && distOp > 0) {
        const overlapOp = minDistOp - distOp;
        // Push alien and opponent away from each other
        // We only push the alien here to avoid modifying the opponent object
        // directly within the alien update loop, which could lead to complex interactions.
        // Pushing only the alien is simpler and often sufficient.
        a.x += (dxOp / distOp) * overlapOp * 0.5; // Push alien slightly less strongly than vs other aliens
        a.y += (dyOp / distOp) * overlapOp * 0.5;
        // If mutual push is desired, opponent's position should be adjusted in its own update function
        // or by applying a force that affects its thrust.
      }
    }
    // === [End Alien Avoidance] ===


    // Fire bullets
    a.fireCooldown--;
    if (a.fireCooldown <= 0) {
      alienShoot(a);
      a.fireCooldown = alienBaseFireDelay; // Use base delay for reset
    }

    // Draw alien
    const sx = a.x - camera.x;
    const sy = a.y - camera.y;
    // Only draw if visible
    if (sx > -a.radius && sx < camera.w + a.radius && sy > -a.radius && sy < camera.h + a.radius) {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(a.angle + Math.PI / 2);

        const imgSize = a.radius * 2; // make image match alien size
        ctx.drawImage(alienImg, -imgSize/2, -imgSize/2, imgSize, imgSize);

        ctx.restore();
    }

    // Check collision with player bullets
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      const d = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
      if (d < a.radius) {
        bullets.splice(j, 1); // destroy bullet
        a.health -= 50;

        if (a.health <= 0) {
          aliens.splice(i, 1); // destroy alien
          score += 300; // reward for killing alien

          // Check if wave is cleared
          if (aliens.length === 0) {
            alienWave++;
            aliensPerWave += 1; // +1 more aliens per wave
            alienBaseHealth += 5; // +5 HP every wave
            alienBaseSpeed += 0.1; // Move 0.1 faster every wave
            alienBaseFireDelay = Math.max(40, alienBaseFireDelay - 5); // Shoot faster, but limit to 40 frames minimum
            spawnAliens();
            const colors = ['gold', 'cyan', 'lime', 'orange', 'violet'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            createFloatingText(`⚡ WAVE ${alienWave} - Stronger Enemies!`, ship.x, ship.y - 50, randomColor, 36, true, true);
          }
        }
        break; // Bullet hit, stop checking this alien for other bullets
      }
    }
  }
}

// === [Shoot Opponent Bullet] ===
function opponentShoot() {
  opponentBullets.push({
    x: opponent.x + Math.cos(opponent.angle) * opponent.radius,
    y: opponent.y + Math.sin(opponent.angle) * opponent.radius,
    dx: Math.cos(opponent.angle) * OPPONENT_BULLET_SPEED,
    dy: Math.sin(opponent.angle) * OPPONENT_BULLET_SPEED,
    life: 100,
  });
}

// === [Opponent AI Logic] ===
function updateOpponent() {
  if (opponent.health <= 0) return; // Don't update if defeated (until respawn logic is added)

  // 1. Dodge player's bullets
  const DODGE_RADIUS = 100;
  const DODGE_FORCE = 0.15;
  let dodge = { x: 0, y: 0 };

  // Use a copy of bullets array in case it's modified during iteration elsewhere
  const playerBullets = [...bullets];
  for (const b of playerBullets) {
    const dx = opponent.x - b.x;
    const dy = opponent.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < DODGE_RADIUS && dist > 0) { // Avoid division by zero if dist is 0
      dodge.x += (dx / dist) * (1 - dist / DODGE_RADIUS);
      dodge.y += (dy / dist) * (1 - dist / DODGE_RADIUS);
    }
  }

  const mag = Math.sqrt(dodge.x * dodge.x + dodge.y * dodge.y);
  if (mag > 0) {
    dodge.x = (dodge.x / mag) * DODGE_FORCE;
    dodge.y = (dodge.y / mag) * DODGE_FORCE;
    opponent.thrust.x += dodge.x;
    opponent.thrust.y += dodge.y;
  }

  // 2. Hunt player (only if not actively dodging hard)
  if (mag < DODGE_FORCE * 0.5) { // Reduce hunting if dodging
      const dxShip = ship.x - opponent.x;
      const dyShip = ship.y - opponent.y;
      const distToShip = Math.sqrt(dxShip * dxShip + dyShip * dyShip);
      opponent.angle = Math.atan2(dyShip, dxShip);

      if (distToShip > 150) {
          opponent.thrust.x += Math.cos(opponent.angle) * OPPONENT_SPEED * 0.01; // Forward thrust
          opponent.thrust.y += Math.sin(opponent.angle) * OPPONENT_SPEED * 0.01;
      } else if (distToShip < 100) {
          opponent.thrust.x -= Math.cos(opponent.angle) * OPPONENT_SPEED * 0.005; // Back away slower
          opponent.thrust.y -= Math.sin(opponent.angle) * OPPONENT_SPEED * 0.005;
      }
  }

  // 3. Fire at player
  const dxFire = ship.x - opponent.x;
  const dyFire = ship.y - opponent.y;
  const distToShipFire = Math.sqrt(dxFire*dxFire + dyFire*dyFire);

  if (distToShipFire < 600) { // Firing range
    if (opponent.fireCooldown <= 0) {
      // Check if roughly facing the player before firing
      const angleToShip = Math.atan2(dyFire, dxFire);
      const angleDiff = angleToShip - opponent.angle;
      const normalizedAngleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      if (Math.abs(normalizedAngleDiff) < Math.PI / 8) { // Fire if within ~22.5 degrees
          opponentShoot();
          opponent.fireCooldown = OPPONENT_FIRE_DELAY;
      }
    }
  }

  // Apply movement
  opponent.x += opponent.thrust.x;
  opponent.y += opponent.thrust.y;

  // Limit speed (similar to player ship)
  const opponentSpeed = Math.sqrt(opponent.thrust.x ** 2 + opponent.thrust.y ** 2);
  const MAX_OPPONENT_SPEED = 3; // Give opponent a max speed
  if (opponentSpeed > MAX_OPPONENT_SPEED) {
    opponent.thrust.x *= MAX_OPPONENT_SPEED / opponentSpeed;
    opponent.thrust.y *= MAX_OPPONENT_SPEED / opponentSpeed;
  }


  // Friction
  opponent.thrust.x *= 0.99;
  opponent.thrust.y *= 0.99;

  // Clamp in world
  if (opponent.x < opponent.radius) opponent.x = opponent.radius;
  if (opponent.x > WORLD_WIDTH - opponent.radius) opponent.x = WORLD_WIDTH - opponent.radius;
  if (opponent.y < opponent.radius) opponent.y = opponent.radius;
  if (opponent.y > WORLD_HEIGHT - opponent.radius) opponent.y = WORLD_HEIGHT - opponent.radius;

  // Decrease cooldown
  if (opponent.fireCooldown > 0) opponent.fireCooldown--;

  // Draw Opponent (only if alive)
  const sx = opponent.x - camera.x;
  const sy = opponent.y - camera.y;

  // Culling check - only draw if within camera view (+ buffer)
  const buffer = opponent.radius;
  if (sx > -buffer && sx < camera.w + buffer && sy > -buffer && sy < camera.h + buffer) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(opponent.angle + Math.PI / 2); // Align sprite rotation if needed

      const imgSize = opponent.radius * 2;
      ctx.drawImage(opponentImg, -imgSize/2, -imgSize/2, imgSize, imgSize);

      ctx.restore();
  }
}

// === [Update and Draw Opponent Bullets] ===
function updateOpponentBullets() {
  for (let i = opponentBullets.length - 1; i >= 0; i--) {
    const b = opponentBullets[i];
    b.x += b.dx;
    b.y += b.dy;
    b.life--;

    // Remove if expired or out of bounds
    if (b.life <= 0 || b.x < 0 || b.x > WORLD_WIDTH || b.y < 0 || b.y > WORLD_HEIGHT) {
      opponentBullets.splice(i, 1);
      continue;
    }

    // Draw opponent bullet (laser)
    const sx = b.x - camera.x;
    const sy = b.y - camera.y;
    if (sx > -5 && sx < camera.w + 5 && sy > -5 && sy < camera.h + 5) {
      const bulletSize = 20; // You can adjust size if needed
      const bulletHeight = 16; // Taller if you want
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(Math.atan2(b.dy, b.dx)); // Rotate laser to match movement
      ctx.drawImage(opponentLaserImg, -bulletSize / 2, -bulletHeight / 2, bulletSize, bulletHeight);
      ctx.restore();
    }

    // Check hit with player ship
    const dist = Math.sqrt((b.x - ship.x) ** 2 + (b.y - ship.y) ** 2);
    if (dist < ship.radius) {
      ship.health -= 10; // Player takes damage from opponent bullet
      opponentBullets.splice(i, 1); // Remove bullet
      shipHitSound.currentTime = 0;
      shipHitSound.play();
      if (ship.health <= 0) {
        respawnShip();
      }
      continue;
    }
  }
}

// Draw the ship relative to the camera
function drawShip() {
  const sx = ship.x - camera.x;
  const sy = ship.y - camera.y;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(ship.angle + Math.PI / 2);

  const imgSize = ship.radius * 2; // Size based on ship radius
  ctx.drawImage(shipImg, -imgSize/2, -imgSize/2, imgSize, imgSize);

  ctx.restore();
}

// Start the game
generateAsteroids(); // Initialize asteroids
spawnAliens(); // Initialize aliens
spawnCivilians(); // Initialize civilians
spawnUFOs(); // Initialize UFOs
update();
