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

const civilianImg = new Image();
civilianImg.src = "images/civilian.png";

const ufoImg = new Image();
ufoImg.src = "images/ufo.png";

// NEW: UFO laser image
const ufoLaserImg = new Image();
ufoLaserImg.src = "images/laser.png";

// Sounds
const explosionSound = new Audio("sounds/explosion.wav");
explosionSound.volume = 0.6;

const shipHitSound = new Audio("sounds/ship_hit.wav");
shipHitSound.volume = 0.7; // optional

const asteroidExplosionSound = new Audio("sounds/asteroid_explosion.wav");
asteroidExplosionSound.volume = 0.6; // Tweak to fit

const laserSound = new Audio("sounds/laser.wav");
laserSound.volume = 0.1;

const alienLaserSound = new Audio("sounds/alien_laser.wav");
alienLaserSound.volume = 0.1;

// NEW: UFO laser sound (optional; adjust filename as needed)
const ufoLaserSound = new Audio("sounds/ufo_laser.wav");
ufoLaserSound.volume = 0.1;

/********************************/
/*       WORLD ENTITIES         */
/********************************/
let civilians = [];
let ufo = null;

let aliens = [];
let alienBullets = [];

// NEW: UFO bullet array
let ufoBullets = [];

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

let aliensToSpawnOnClear = 20;
let asteroidsToSpawnOnClear = 50;

const ALIEN_BULLET_SPEED = 7;
const ALIEN_FIRE_DELAY = 50;
const NUM_ALIENS = 20;

function generateAliens() {
  aliens = [];
  for (let i = 0; i < NUM_ALIENS; i++) {
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
    const alienSize = 30; // 🔧 Adjust alien size
    aliens.push({
      x,
      y,
      angle: 0,
      fireCooldown: Math.floor(Math.random() * ALIEN_FIRE_DELAY),
      health: 30,
      radius: alienSize,
    });
  }
}

generateAliens();

/**
 * Expand the random positions of civilians to be anywhere in the world
 * (instead of 0..100). This ensures they're not all stuck in one corner.
 */
function generateCivilians(num = 10) {
  civilians = [];
  for (let i = 0; i < num; i++) {
    civilians.push({
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      dx: (Math.random() - 0.5) * 1.5,
      dy: (Math.random() - 0.5) * 1.5,
      radius: 20,
      wanderTimer: Math.floor(Math.random() * 120 + 60),
    });
  }
}

// UFO spawning
const UFO_FIRE_DELAY = 120; // frames between UFO shots
const UFO_BULLET_SPEED = 6; // how fast the UFO laser travels
function spawnUFO() {
  const x = Math.random() * WORLD_WIDTH;
  const y = Math.random() * WORLD_HEIGHT;
  ufo = {
    x,
    y,
    dx: (Math.random() - 0.5) * 2,
    dy: (Math.random() - 0.5) * 2,
    radius: 40,
    health: 50,
    wanderTimer: 100,
    fireCooldown: UFO_FIRE_DELAY,
  };
}

let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
let mouseThrusting = false;
let isFiring = false;
let autoplay = true;

let bulletCooldown = 0;
const BULLET_DELAY = 50;

/********************************/
/*        SHIP & MOVEMENT       */
/********************************/
// At the top, near your "ship" definition:
const opponent = {
  health: 100,
  x: WORLD_WIDTH / 2 + 100, // Just place it near you initially
  y: WORLD_HEIGHT / 2 - 100,
  radius: 30,
  angle: 0,
  thrust: { x: 0, y: 0 },
  rotation: 0,
  fireCooldown: 0, // frames until next shot
};

const OPPONENT_BULLETS = [];
const OPPONENT_BULLET_SPEED = 5;
const OPPONENT_BULLET_LIFE = 500;
const OPPONENT_FIRE_DELAY = 60; // frames between shots


const ship = {
  health: 100,
  x: WORLD_WIDTH / 2,
  y: WORLD_HEIGHT / 2,
  radius: 30,
  angle: 0,
  rotation: 0,
  thrusting: false,
  thrust: { x: 0, y: 0 },
};

let score = 0;
let floatingTexts = [];
let explosions = [];

const BULLET_SPEED = 5;
const BULLET_LIFE = 500;
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

// Mouse coordinates are screen-based. We convert them to world coords.
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
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
  const numBullets = 1;
  laserSound.currentTime = 0;
  laserSound.play();
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
/*      UFO SHOOTING LOGIC      */
/********************************/
function ufoShoot() {
  if (!ufo) return;
  // Find the nearest civilian to shoot at
  let nearestCivilian = null;
  let minDist = Infinity;
  for (const civ of civilians) {
    const dist = distanceBetween(ufo.x, ufo.y, civ.x, civ.y);
    if (dist < minDist) {
      minDist = dist;
      nearestCivilian = civ;
    }
  }
  // If a civilian is within range, fire a laser bullet at them
  if (nearestCivilian && minDist < 600) {
    const angle = Math.atan2(
      nearestCivilian.y - ufo.y,
      nearestCivilian.x - ufo.x
    );
    ufoBullets.push({
      x: ufo.x,
      y: ufo.y,
      dx: Math.cos(angle) * UFO_BULLET_SPEED,
      dy: Math.sin(angle) * UFO_BULLET_SPEED,
      life: BULLET_LIFE,
    });
    ufoLaserSound.currentTime = 0;
    ufoLaserSound.play();
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
    // Always perform dodge logic (but skip hunt)
    smartAutopilot(); // keeps the dodging logic

    // Allow player-controlled thrust
    if (mouseThrusting) {
      ship.thrust.x += Math.cos(ship.angle) * THRUST_ACCEL;
      ship.thrust.y += Math.sin(ship.angle) * THRUST_ACCEL;
    } else {
      // still apply friction even if not thrusting
      ship.thrust.x *= FRICTION;
      ship.thrust.y *= FRICTION;
    }
  }

  capSpeed();
  ship.x += ship.thrust.x;
  ship.y += ship.thrust.y;

  // Soft-bounce at world edges
  const bounceDampening = 0.7; // lose 30% speed on bounce
  const buffer = 10; // Keep ship slightly off the edge

  if (ship.x < buffer) {
    ship.x = buffer;
    ship.thrust.x = Math.abs(ship.thrust.x) * bounceDampening;
  }
  if (ship.x > WORLD_WIDTH - buffer) {
    ship.x = WORLD_WIDTH - buffer;
    ship.thrust.x = -Math.abs(ship.thrust.x) * bounceDampening;
  }
  if (ship.y < buffer) {
    ship.y = buffer;
    ship.thrust.y = Math.abs(ship.thrust.y) * bounceDampening;
  }
  if (ship.y > WORLD_HEIGHT - buffer) {
    ship.y = WORLD_HEIGHT - buffer;
    ship.thrust.y = -Math.abs(ship.thrust.y) * bounceDampening;
  }

  // Update camera to follow ship
  updateCamera();

  // 2) Clear the canvas (the visible region)
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3) Draw stars
  drawStars();

    // ... existing code for player ship, etc.
  
    // 1) Opponent AI + Movement
    opponentAutopilot();
    
    // friction & max speed (if you want the same mechanics as player)
    opponent.thrust.x *= 0.99; // friction
    opponent.thrust.y *= 0.99;
    // cap speed
    const oppSpeed = Math.sqrt(opponent.thrust.x**2 + opponent.thrust.y**2);
    const OPPONENT_MAX_SPEED = 3;
    if (oppSpeed > OPPONENT_MAX_SPEED) {
      opponent.thrust.x *= OPPONENT_MAX_SPEED / oppSpeed;
      opponent.thrust.y *= OPPONENT_MAX_SPEED / oppSpeed;
    }
  
    opponent.x += opponent.thrust.x;
    opponent.y += opponent.thrust.y;
  
    // Decrease fireCooldown if > 0
    if (opponent.fireCooldown > 0) {
      opponent.fireCooldown--;
    }
  
    // 2) Opponent collision with world edges (optional bounce or clamp)
    // Just an example bounce:
    if (opponent.x < 0) {
      opponent.x = 0; 
      opponent.thrust.x = -opponent.thrust.x * 0.7;
    }
    if (opponent.x > WORLD_WIDTH) {
      opponent.x = WORLD_WIDTH;
      opponent.thrust.x = -opponent.thrust.x * 0.7;
    }
    if (opponent.y < 0) {
      opponent.y = 0;
      opponent.thrust.y = -opponent.thrust.y * 0.7;
    }
    if (opponent.y > WORLD_HEIGHT) {
      opponent.y = WORLD_HEIGHT;
      opponent.thrust.y = -opponent.thrust.y * 0.7;
    }
  
    // 3) Opponent bullet movement & collision
    for (let i = OPPONENT_BULLETS.length - 1; i >= 0; i--) {
      const b = OPPONENT_BULLETS[i];
      b.x += b.dx;
      b.y += b.dy;
      b.life--;
      // remove if out of life or out of bounds
      if (
        b.life <= 0 ||
        b.x < 0 ||
        b.x > WORLD_WIDTH ||
        b.y < 0 ||
        b.y > WORLD_HEIGHT
      ) {
        OPPONENT_BULLETS.splice(i, 1);
        continue;
      }
  
      // Check collision with player's ship
      if (distanceBetween(b.x, b.y, ship.x, ship.y) < ship.radius) {
        ship.health -= 10;
        createFloatingText("-10", ship.x, ship.y, "red");
        explosions.push({ x: ship.x, y: ship.y, size: 40, life: 30 });
        shipHitSound.currentTime = 0;
        shipHitSound.play();
        OPPONENT_BULLETS.splice(i, 1);
  
        if (ship.health <= 0) {
          ship.health = 100;
          createFloatingText("💖 Respawned!", ship.x, ship.y - 20, "yellow");
        }
        continue;
      }
    }
  
    // 4) Draw Opponent
    drawOpponent();
  
    // 5) Draw Opponent bullets
    for (let i = 0; i < OPPONENT_BULLETS.length; i++) {
      const b = OPPONENT_BULLETS[i];
      const sx = b.x - camera.x;
      const sy = b.y - camera.y;
      const size = 40;
  
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(Math.atan2(b.dy, b.dx));
      ctx.drawImage(bulletImg, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  
    // ... continue with existing code for UFO, aliens, asteroids, drawing
  

  // --- Update & Draw Civilians (with UFO bullet avoidance) ---
  for (const civilian of civilians) {
    // Avoid nearby UFO bullets
    let avoidanceX = 0,
      avoidanceY = 0,
      avoidCount = 0;
    for (const bullet of ufoBullets) {
      const d = distanceBetween(bullet.x, bullet.y, civilian.x, civilian.y);
      if (d < 150) {
        // if a UFO bullet is within 150px
        avoidanceX += (civilian.x - bullet.x) / d;
        avoidanceY += (civilian.y - bullet.y) / d;
        avoidCount++;
      }
    }
    if (avoidCount > 0) {
      civilian.dx += avoidanceX * 0.5;
      civilian.dy += avoidanceY * 0.5;
    }
    // Move civilian
    civilian.x += civilian.dx;
    civilian.y += civilian.dy;
    civilian.wanderTimer--;
    if (civilian.wanderTimer <= 0) {
      civilian.dx = (Math.random() - 0.5) * 1.5;
      civilian.dy = (Math.random() - 0.5) * 1.5;
      civilian.wanderTimer = Math.floor(Math.random() * 120 + 60);
    }
    // Clamp to world edges
    if (civilian.x < 0 || civilian.x > WORLD_WIDTH) civilian.dx *= -1;
    if (civilian.y < 0 || civilian.y > WORLD_HEIGHT) civilian.dy *= -1;
    const sx = civilian.x - camera.x;
    const sy = civilian.y - camera.y;
    if (isOnCamera(civilian)) {
      ctx.drawImage(civilianImg, sx - 20, sy - 20, 40, 40);
    }
  }

  // --- Update & Draw UFO (now hunting civilians) ---
  if (ufo) {
    // If civilians exist, hunt the nearest one
    if (civilians.length > 0) {
      let nearest = null;
      let minDist = Infinity;
      for (const civ of civilians) {
        const d = distanceBetween(ufo.x, ufo.y, civ.x, civ.y);
        if (d < minDist) {
          minDist = d;
          nearest = civ;
        }
      }
      if (nearest) {
        const angle = Math.atan2(nearest.y - ufo.y, nearest.x - ufo.x);
        const speed = 2; // UFO hunting speed
        ufo.dx = Math.cos(angle) * speed;
        ufo.dy = Math.sin(angle) * speed;
      }
    } else {
      // No civilians? Wander randomly.
      ufo.wanderTimer--;
      if (ufo.wanderTimer <= 0) {
        ufo.dx = (Math.random() - 0.5) * 2;
        ufo.dy = (Math.random() - 0.5) * 2;
        ufo.wanderTimer = 100 + Math.random() * 100;
      }
    }
    ufo.x += ufo.dx;
    ufo.y += ufo.dy;
    // Bounce at world edges
    if (ufo.x < 0 || ufo.x > WORLD_WIDTH) ufo.dx *= -1;
    if (ufo.y < 0 || ufo.y > WORLD_HEIGHT) ufo.dy *= -1;
    // UFO firing logic
    ufo.fireCooldown--;
    if (ufo.fireCooldown <= 0) {
      ufoShoot();
      ufo.fireCooldown = UFO_FIRE_DELAY;
    }
    const sx = ufo.x - camera.x;
    const sy = ufo.y - camera.y;
    if (isOnCamera(ufo)) {
      ctx.drawImage(ufoImg, sx - 40, sy - 40, 80, 80);
    }
  }

  // --- Draw the player's ship ---
  drawShip(ship.x, ship.y, ship.angle);

  // --- Move and Draw Asteroids ---
  asteroids.forEach((asteroid) => {
    asteroid.x += Math.cos(asteroid.angle) * asteroid.speed;
    asteroid.y += Math.sin(asteroid.angle) * asteroid.speed;
    if (asteroid.x < 0) asteroid.x = WORLD_WIDTH;
    if (asteroid.x > WORLD_WIDTH) asteroid.x = 0;
    if (asteroid.y < 0) asteroid.y = WORLD_HEIGHT;
    if (asteroid.y > WORLD_HEIGHT) asteroid.y = 0;
    asteroid.currentRotation += asteroid.rotation;
    const sx = asteroid.x - camera.x;
    const sy = asteroid.y - camera.y;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(asteroid.currentRotation);
    const size = asteroid.radius * 2;
    ctx.drawImage(asteroidImg, -size / 2, -size / 2, size, size);
    ctx.restore();
  });

  // --- Update & Draw Aliens (with bullet avoidance) ---
  aliens.forEach((alien, i) => {
    // 1) Separation from other aliens
    aliens.forEach((otherAlien, j) => {
      if (i !== j) {
        const dist = distanceBetween(
          alien.x,
          alien.y,
          otherAlien.x,
          otherAlien.y
        );
        if (dist < 40) {
          // push them apart
          const pushX = (alien.x - otherAlien.x) / dist;
          const pushY = (alien.y - otherAlien.y) / dist;
          alien.x += pushX;
          alien.y += pushY;
        }
      }
    });

    // 2) Dodge nearby player bullets
    // 2) Dodge nearby player bullets
    const DODGE_RADIUS = 200;
    const DODGE_FORCE = 0.6; // Increased for quicker dodge
    let bulletDodge = { x: 0, y: 0 };

    for (const b of bullets) {
      const dxB = alien.x - b.x;
      const dyB = alien.y - b.y;
      const distB = Math.sqrt(dxB * dxB + dyB * dyB);
      if (distB < DODGE_RADIUS) {
        // push away from bullet
        const awayX = dxB / distB;
        const awayY = dyB / distB;
        // Weighted by how close the bullet is
        bulletDodge.x += awayX * (1 - distB / DODGE_RADIUS);
        bulletDodge.y += awayY * (1 - distB / DODGE_RADIUS);
      }
    }
    // Apply the dodge offset
    alien.x += bulletDodge.x * DODGE_FORCE;
    alien.y += bulletDodge.y * DODGE_FORCE;

    // 3) Move toward the ship if not too close
    const dx = ship.x - alien.x;
    const dy = ship.y - alien.y;
    alien.angle = Math.atan2(dy, dx);
    const distToShip = Math.sqrt(dx * dx + dy * dy);
    const stopDistance = 120;
    if (distToShip > stopDistance) {
      const speed = 1.2;
      alien.x += Math.cos(alien.angle) * speed;
      alien.y += Math.sin(alien.angle) * speed;
    }

    // Wrap-around or bounce at edges if you prefer:
    if (alien.x < 0) alien.x = WORLD_WIDTH;
    if (alien.x > WORLD_WIDTH) alien.x = 0;
    if (alien.y < 0) alien.y = WORLD_HEIGHT;
    if (alien.y > WORLD_HEIGHT) alien.y = 0;

    // 4) Alien firing logic
    alien.fireCooldown--;
    if (alien.fireCooldown <= 0 && isOnCamera(alien)) {
      alienBullets.push({
        x: alien.x,
        y: alien.y,
        dx: Math.cos(alien.angle) * ALIEN_BULLET_SPEED,
        dy: Math.sin(alien.angle) * ALIEN_BULLET_SPEED,
        life: BULLET_LIFE,
      });
      alien.fireCooldown = ALIEN_FIRE_DELAY;
      alienLaserSound.currentTime = 0;
      alienLaserSound.play();
    }

    // 5) Draw the alien
    const sx = alien.x - camera.x;
    const sy = alien.y - camera.y;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(alien.angle + Math.PI / 2);
    const alienSize = alien.radius * 2;
    ctx.drawImage(
      alienImg,
      -alienSize / 2,
      -alienSize / 2,
      alienSize,
      alienSize
    );
    ctx.restore();
  });

  // --- Update & Draw Alien Bullets ---
  for (let i = alienBullets.length - 1; i >= 0; i--) {
    const b = alienBullets[i];
    b.x += b.dx;
    b.y += b.dy;
    b.life--;
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
    const sx = b.x - camera.x;
    const sy = b.y - camera.y;
    const alienBulletSize = 20;
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
    if (distanceBetween(b.x, b.y, ship.x, ship.y) < ship.radius) {
      ship.health -= 10;
      alienBullets.splice(i, 1);
      createFloatingText("-10", ship.x, ship.y, "red");
      explosions.push({ x: ship.x, y: ship.y, size: 40, life: 30 });
      shipHitSound.currentTime = 0;
      shipHitSound.play();
      if (ship.health <= 0) {
        ship.health = 100;
        createFloatingText("💖 Respawned!", ship.x, ship.y - 20, "yellow");
      }
    }
  }

  // --- Update & Draw UFO Bullets (which may hit civilians) ---
  for (let i = ufoBullets.length - 1; i >= 0; i--) {
    const b = ufoBullets[i];
    b.x += b.dx;
    b.y += b.dy;
    b.life--;
    if (
      b.life <= 0 ||
      b.x < 0 ||
      b.x > WORLD_WIDTH ||
      b.y < 0 ||
      b.y > WORLD_HEIGHT
    ) {
      ufoBullets.splice(i, 1);
      continue;
    }
    const sx = b.x - camera.x;
    const sy = b.y - camera.y;
    const laserSize = 25;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.atan2(b.dy, b.dx));
    ctx.drawImage(
      ufoLaserImg,
      -laserSize / 2,
      -laserSize / 2,
      laserSize,
      laserSize
    );
    ctx.restore();
    // Check collision with civilians
    for (let j = civilians.length - 1; j >= 0; j--) {
      const civ = civilians[j];
      if (distanceBetween(b.x, b.y, civ.x, civ.y) < civ.radius) {
        createFloatingText("Civilian down!", civ.x, civ.y, "red");
        explosions.push({ x: civ.x, y: civ.y, size: 40, life: 30 });
        explosionSound.currentTime = 0;
        explosionSound.play();
        civilians.splice(j, 1);
        ufoBullets.splice(i, 1);
        break;
      }
    }
  }

  // --- Move and Draw Player Bullets ---
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    // Bullet vs. Alien collision
    for (let k = aliens.length - 1; k >= 0; k--) {
      const alien = aliens[k];
      if (distanceBetween(b.x, b.y, alien.x, alien.y) < alien.radius) {
        bullets.splice(i, 1);
        alien.health -= 50;
        createFloatingText("-10", alien.x, alien.y, "orange");
        if (alien.health <= 0) {
          explosions.push({ x: alien.x, y: alien.y, size: 40, life: 30 });
          createFloatingText("Alien Down!", alien.x, alien.y - 10, "red");
          explosionSound.currentTime = 0;
          explosionSound.play();
          aliens.splice(k, 1);
          score += 150;
        }
        break;
      }
    }
    // Bullet vs. UFO collision
    if (ufo && i >= 0) {
      if (distanceBetween(b.x, b.y, ufo.x, ufo.y) < ufo.radius) {
        bullets.splice(i, 1);
        ufo.health -= 10;
        createFloatingText("-10", ufo.x, ufo.y, "orange");
        if (ufo.health <= 0) {
          explosions.push({ x: ufo.x, y: ufo.y, size: 50, life: 30 });
          createFloatingText("UFO Destroyed!", ufo.x, ufo.y - 20, "red");
          explosionSound.currentTime = 0;
          explosionSound.play();
          score += 500;
          ufo = null;
          setTimeout(spawnUFO, 8000);
        }
        continue;
      }
    }
    b.x += b.dx;
    b.y += b.dy;
    b.life--;
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
    const sx = b.x - camera.x;
    const sy = b.y - camera.y;
    const size = 40;
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
        asteroidExplosionSound.currentTime = 0;
        asteroidExplosionSound.play();
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

  // --- Asteroid vs. Ship collisions ---
  for (let i = 0; i < asteroids.length; i++) {
    const asteroid = asteroids[i];
    if (
      distanceBetween(asteroid.x, asteroid.y, ship.x, ship.y) <
      asteroid.radius + ship.radius
    ) {
      ship.health -= 5;
      console.log(`💥 Ship Hit! Health: ${ship.health}`);
      explosions.push({ x: ship.x, y: ship.y, size: 40, life: 30 });
      explosions.push({
        x: asteroid.x,
        y: asteroid.y,
        size: asteroid.radius * 1.5,
        life: 30,
      });
      asteroidExplosionSound.currentTime = 0;
      asteroidExplosionSound.play();
      if (asteroid.radius > 20) {
        const newRadius = asteroid.radius / 2;
        asteroids.push(createAsteroid(asteroid.x, asteroid.y, newRadius));
        asteroids.push(createAsteroid(asteroid.x, asteroid.y, newRadius));
      }
      asteroids.splice(i, 1);
      if (ship.health <= 0) {
        ship.health = 100;
        createFloatingText("💖 Respawned!", ship.x, ship.y - 20, "yellow");
      }
      break;
    }
  }

  // --- Asteroid vs. Asteroid collisions ---
  {
    const collidedAsteroids = new Set();
    for (let i = 0; i < asteroids.length; i++) {
      for (let j = i + 1; j < asteroids.length; j++) {
        const a1 = asteroids[i];
        const a2 = asteroids[j];
        const dist = distanceBetween(a1.x, a1.y, a2.x, a2.y);
        if (dist < a1.radius + a2.radius) {
          collidedAsteroids.add(i);
          collidedAsteroids.add(j);
        }
      }
    }
    const collidedIndicesDesc = Array.from(collidedAsteroids).sort(
      (a, b) => b - a
    );
    collidedIndicesDesc.forEach((index) => {
      if (index >= asteroids.length) return;
      const asteroid = asteroids[index];
      explosions.push({
        x: asteroid.x,
        y: asteroid.y,
        size: asteroid.radius * 1.5,
        life: 30,
      });
      asteroidExplosionSound.currentTime = 0;
      asteroidExplosionSound.play();
      if (asteroid.radius > 20) {
        const newRadius = asteroid.radius / 2;
        asteroids.push(createAsteroid(asteroid.x, asteroid.y, newRadius));
        asteroids.push(createAsteroid(asteroid.x, asteroid.y, newRadius));
      }
      asteroids.splice(index, 1);
    });
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
      for (let i = 0; i < asteroidsToSpawnOnClear; i++) {
        const x = Math.random() * WORLD_WIDTH;
        const y = Math.random() * WORLD_HEIGHT;
        asteroids.push(createAsteroid(x, y));
      }
      gameResetting = false;
    }, 1500);
  }

  // --- Draw Explosions ---
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
  ctx.globalAlpha = 1;

  // Auto-fire if holding space
  if (isFiring && bulletCooldown <= 0) {
    shootBullet();
    bulletCooldown = BULLET_DELAY;
  } else if (bulletCooldown > 0) {
    bulletCooldown--;
  }

  drawHealthBar();
  drawScore();
  drawFloatingTexts();

  updateLoop = requestAnimationFrame(update);
}

function drawShip(x, y, angle) {
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
const NUM_ASTEROIDS = 50;
function getRandomAsteroidSize() {
  return Math.random() * 30 + 20;
}
function getRandomAsteroidSpeed() {
  return Math.random() * 3 + 1;
}
let asteroids = [];
function createAsteroid(x, y, radius = getRandomAsteroidSize()) {
  const angle = Math.random() * Math.PI * 2;
  return {
    x,
    y,
    radius,
    angle,
    speed: getRandomAsteroidSpeed(),
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
    const sx = ft.x - camera.x;
    const sy = ft.y - camera.y;
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

document.getElementById("huntModeBtn").addEventListener("click", () => {
  autoplay = !autoplay;
  const btn = document.getElementById("huntModeBtn");
  btn.textContent = autoplay ? "🔫 Hunt Mode: ON" : "🛑 Hunt Mode: OFF";
  createFloatingText(
    autoplay ? "🧠 Autopilot ON (Hunting Aliens)" : "🕹️ Manual Mode",
    ship.x,
    ship.y - 50,
    autoplay ? "lime" : "orange"
  );
});

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("huntModeBtn");
  btn.textContent = autoplay ? "🔫 Hunt Mode: ON" : "🛑 Hunt Mode: OFF";
});

document.getElementById("restartBtn").addEventListener("click", () => {
  stopGameLoop();
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
  ufoBullets = [];
  ufo = null;
  generateAliens();
  generateAsteroids();
  generateCivilians();
  spawnUFO();
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
  const DODGE_RADIUS = 250;
  const DODGE_FORCE = 0.15;
  const bulletDodgeX = { x: 0, y: 0 };
  const asteroidDodgeX = { x: 0, y: 0 };

  // === Dodge Enemy Bullets ===
  const incomingBullets = [...alienBullets, ...ufoBullets];
  for (const bullet of incomingBullets) {
    const dx = ship.x - bullet.x;
    const dy = ship.y - bullet.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < DODGE_RADIUS) {
      const awayX = dx / dist;
      const awayY = dy / dist;
      bulletDodgeX.x += awayX * (1 - dist / DODGE_RADIUS);
      bulletDodgeX.y += awayY * (1 - dist / DODGE_RADIUS);
    }
  }

  // === Dodge Asteroids ===
  for (const asteroid of asteroids) {
    const dx = ship.x - asteroid.x;
    const dy = ship.y - asteroid.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < DODGE_RADIUS) {
      const awayX = dx / dist;
      const awayY = dy / dist;
      asteroidDodgeX.x += awayX * (1 - dist / DODGE_RADIUS);
      asteroidDodgeX.y += awayY * (1 - dist / DODGE_RADIUS);
    }
  }

  // Combine dodge vectors
  const totalDodge = {
    x: bulletDodgeX.x + asteroidDodgeX.x,
    y: bulletDodgeX.y + asteroidDodgeX.y,
  };

  // Normalize dodge direction
  const magnitude = Math.sqrt(totalDodge.x ** 2 + totalDodge.y ** 2);
  if (magnitude > 0) {
    const dodgeX = (totalDodge.x / magnitude) * DODGE_FORCE;
    const dodgeY = (totalDodge.y / magnitude) * DODGE_FORCE;
    ship.thrust.x += dodgeX;
    ship.thrust.y += dodgeY;
    ship.angle = Math.atan2(dodgeY, dodgeX);
  }

  // === Hunt Mode Logic ===
  if (autoplay) {
    let nearestAlien = null;
    let minAlienDist = Infinity;
    for (const alien of aliens) {
      const dist = distanceBetween(ship.x, ship.y, alien.x, alien.y);
      if (dist < minAlienDist) {
        minAlienDist = dist;
        nearestAlien = alien;
      }
    }

    if (nearestAlien) {
      const dx = nearestAlien.x - ship.x;
      const dy = nearestAlien.y - ship.y;
      const angleToAlien = Math.atan2(dy, dx);

      ship.angle = angleToAlien; // Rotate to alien
      if (isOnCamera(nearestAlien) && bulletCooldown <= 0) {
        shootBullet();
        bulletCooldown = BULLET_DELAY;
      }

      // Slight thrust toward enemy
      ship.thrust.x += Math.cos(angleToAlien) * THRUST_ACCEL;
      ship.thrust.y += Math.sin(angleToAlien) * THRUST_ACCEL;
    }
  }
}

function opponentAutopilot() {
  // 1) Dodge player's bullets
  const DODGE_RADIUS = 250;
  const DODGE_FORCE = 0.2; // tweak as you like
  let bulletDodge = { x: 0, y: 0 };

  for (const b of bullets) { // player's bullets
    const dx = opponent.x - b.x;
    const dy = opponent.y - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < DODGE_RADIUS) {
      const awayX = dx / dist;
      const awayY = dy / dist;
      bulletDodge.x += awayX * (1 - dist / DODGE_RADIUS);
      bulletDodge.y += awayY * (1 - dist / DODGE_RADIUS);
    }
  }

  // 2) Apply dodge
  const mag = Math.sqrt(bulletDodge.x ** 2 + bulletDodge.y ** 2);
  if (mag > 0) {
    bulletDodge.x = (bulletDodge.x / mag) * DODGE_FORCE;
    bulletDodge.y = (bulletDodge.y / mag) * DODGE_FORCE;
    opponent.thrust.x += bulletDodge.x;
    opponent.thrust.y += bulletDodge.y;
  }

  // 3) Hunt the player
  const dx = ship.x - opponent.x;
  const dy = ship.y - opponent.y;
  const distToShip = Math.sqrt(dx * dx + dy * dy);
  const angleToShip = Math.atan2(dy, dx);

  // Face the ship
  opponent.angle = angleToShip;

  // Thrust if not too close
  if (distToShip > 150) { // don’t get too close
    const THRUST_ACCEL = 0.02;
    opponent.thrust.x += Math.cos(angleToShip) * THRUST_ACCEL;
    opponent.thrust.y += Math.sin(angleToShip) * THRUST_ACCEL;
  }

  // 4) Fire at the player if in range
  if (distToShip < 700) {
    if (opponent.fireCooldown <= 0) {
      opponentShoot();
      opponent.fireCooldown = OPPONENT_FIRE_DELAY;
    }
  }
}

function opponentShoot() {
  laserSound.currentTime = 0;
  laserSound.play();

  // bullet starts at the nose of the opponent
  const startX = opponent.x + Math.cos(opponent.angle) * opponent.radius;
  const startY = opponent.y + Math.sin(opponent.angle) * opponent.radius;

  OPPONENT_BULLETS.push({
    x: startX,
    y: startY,
    dx: Math.cos(opponent.angle) * OPPONENT_BULLET_SPEED,
    dy: Math.sin(opponent.angle) * OPPONENT_BULLET_SPEED,
    life: OPPONENT_BULLET_LIFE,
  });
}

function drawOpponent() {
  const sx = opponent.x - camera.x;
  const sy = opponent.y - camera.y;
  const size = opponent.radius * 2;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(opponent.angle + Math.PI / 2);
  ctx.drawImage(shipImg, -size / 2, -size / 2, size, size);
  ctx.restore();
}


function isOnCamera(obj, margin = 50) {
  return (
    obj.x >= camera.x - margin &&
    obj.x <= camera.x + camera.w + margin &&
    obj.y >= camera.y - margin &&
    obj.y <= camera.y + camera.h + margin
  );
}

document.querySelector("#startOverlay button").addEventListener("click", () => {
  // Attempt to unlock sounds by playing them once
  explosionSound.play().catch(() => {});
  shipHitSound.play().catch(() => {});
  asteroidExplosionSound.play().catch(() => {});
  laserSound.play().catch(() => {});
  alienLaserSound.play().catch(() => {});
  ufoLaserSound.play().catch(() => {});
  // Then pause them so they won't loop
  explosionSound.pause();
  shipHitSound.pause();
  asteroidExplosionSound.pause();
  laserSound.pause();
  alienLaserSound.pause();
  ufoLaserSound.pause();

  generateCivilians();
  spawnUFO();
  document.getElementById("startOverlay").style.display = "none";
  update();
});
