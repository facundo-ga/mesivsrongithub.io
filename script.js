//const canvas = document.getElementById("canvas");
//const c = canvas.getContext("2d");
//const scoreText = document.getElementById("score");
//const message = document.getElementById("message");

const canvas = document.getElementById("canvas");
const c = canvas.getContext("2d");
const scoreText = document.getElementById("score");
const message = document.getElementById("message");
// --- Selector de cancha ---
const canchaSelect = document.getElementById("canchaSelect");
const canvasElement = document.getElementById("canvas");

// Detectar cambio en el selector y actualizar el fondo del canvas
canchaSelect.addEventListener("change", () => {
  const nuevaCancha = canchaSelect.value;
  canvasElement.style.backgroundImage = `url('${nuevaCancha}')`;

  // (Opcional) guardar la selección en localStorage
  localStorage.setItem("canchaSeleccionada", nuevaCancha);
});

// Al cargar la página, aplicar la última cancha elegida
window.addEventListener("load", () => {
  const canchaGuardada = localStorage.getItem("canchaSeleccionada");
  if (canchaGuardada) {
    canvasElement.style.backgroundImage = `url('${canchaGuardada}')`;
    canchaSelect.value = canchaGuardada;
  }
});

// Cambiar la imagen de fondo del canvas con transición suave
canchaSelect.addEventListener("change", (e) => {
  const newCancha = e.target.value;
  const canvas = document.getElementById("canvas");

  // Desvanecer
  canvas.style.opacity = 0;

  setTimeout(() => {
    canvas.style.backgroundImage = `url('${newCancha}')`;
    // Volver a aparecer
    canvas.style.opacity = 1;
  }, 500);
});

function Ball(x, y, imgSrc, size) {
  this.x = x; this.y = y;
  this.xVel = 0; this.yVel = 0;
  this.size = size || 25;
  this.image = new Image(); this.image.src = imgSrc;
  this.rotation = 0; // 🔁 ángulo de rotación
  this.spinSpeed = 0; // 🔁 velocidad de giro
}


function Player(x, y, imgSrc, size) {
  this.x = x; this.y = y;
  this.size = size || 45;
  this.maxSpeed = 3;
  this.image = new Image(); this.image.src = imgSrc;
  this.score = 0; this.dir = "right";
  this.tilt = 0; // 🔄 ángulo de inclinación visual
}

function Goalie(x, y, imgSrc) {
  this.x = x; this.y = y;
  this.baseX = x; this.baseY = y;
  this.width = 30; this.height = 50;
  this.image = new Image(); this.image.src = imgSrc;
  this.dir = 1; // dirección de movimiento lateral
  this.cooldown = 0;
  this.angle = Math.PI / 2; // posición media del semicírculo
  this.radius = 25; // radio del semicírculo
  this.forward = false;
}




let player1 = new Player(100, 225, "mes.png", 50);
let player2 = new Player(600, 225, "ron.png", 55);
let goalie1 = new Goalie(40, 225, "11.png");
let goalie2 = new Goalie(660, 225, "22.png");
let ball = new Ball(350, 225, "pelota.png", 25);

let keys = {};
document.addEventListener("keydown", e => keys[e.code] = true);
document.addEventListener("keyup", e => keys[e.code] = false);

let gamePaused = false;
let scoringPlayer = null;
let goalScored = false;
let particles = [];

function resetPositions() {
  player1.x = 100; player1.y = 225; player1.dir = "right";
  player2.x = 600; player2.y = 225; player2.dir = "left";
  goalie1.x = 40; goalie1.y = 225; goalie1.baseX = 40; goalie1.baseY = 225;
  goalie2.x = 660; goalie2.y = 225; goalie2.baseX = 660; goalie2.baseY = 225;
  ball.x = 350; ball.y = 225; ball.xVel = 0; ball.yVel = 0;
}


function drawPlayer(p) {
  const size = p.size;
  c.save();
  c.translate(p.x, p.y);

  // Dirección base
  let angle = 0;
  switch (p.dir) {
    case "up": angle = -Math.PI / 2; break;
    case "down": angle = Math.PI / 2; break;
    case "left": angle = Math.PI; break;
    case "right": angle = 0; break;
  }

  // Aplica dirección + inclinación
  c.rotate(angle + p.tilt);

  // Dibuja imagen
  c.drawImage(p.image, -size / 2, -size / 2, size, size);
  c.restore();
}


function draw() {
  c.clearRect(0, 0, canvas.width, canvas.height);

  if (!gamePaused) {
    drawPlayer(player1);
    drawPlayer(player2);

    // Pelota
    c.save();
    c.translate(ball.x, ball.y);
    c.rotate(ball.rotation);
    c.drawImage(ball.image, -ball.size / 2, -ball.size / 2, ball.size, ball.size);
    c.restore();

  } else if (scoringPlayer) {
    c.drawImage(scoringPlayer.image, canvas.width / 2 - 50, canvas.height / 2 - 50, 100, 100);
  }

  // 🧤 Arqueros
  drawGoalie(goalie1, true);
  drawGoalie(goalie2, false);
}


function movePlayers() {
  if (gamePaused) return;

  // Jugador 1 manual (WASD)
  if (keys['KeyW']) { player1.y -= player1.maxSpeed; player1.dir = "up"; }
  if (keys['KeyS']) { player1.y += player1.maxSpeed; player1.dir = "down"; }
  if (keys['KeyA']) { player1.x -= player1.maxSpeed; player1.dir = "left"; }
  if (keys['KeyD']) { player1.x += player1.maxSpeed; player1.dir = "right"; }

  if (keys['Space']) shootBall();

  // IA o control manual para jugador 2
  const humano = keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight'];

  if (!humano) {
    const dx = ball.x - player2.x;
    const dy = ball.y - player2.y;
    const dist = Math.hypot(dx, dy);

    // AI: Defender y atacar
    if (ball.x > canvas.width / 2 || dist < 200) {
      // Ataca
      const fallo = Math.random() < 0.02;
      if (!fallo && dist > 40) {
        player2.x += (dx / dist) * (player2.maxSpeed * 0.8);
        player2.y += (dy / dist) * (player2.maxSpeed * 0.8);
      } else if (dist <= 40 && Math.random() < 0.04) {
        shootBall();
      }
    } else {
      // Retrocede a posición media (defiende)
      const targetX = 600, targetY = 225;
      const ddx = targetX - player2.x;
      const ddy = targetY - player2.y;
      const ddist = Math.hypot(ddx, ddy);
      if (ddist > 5) {
        player2.x += (ddx / ddist) * 2;
        player2.y += (ddy / ddist) * 2;
      }
    }

    // Evita quedarse en las esquinas
    if (player2.x < 80) player2.x += 2;
    if (player2.x > canvas.width - 80) player2.x -= 2;
    if (player2.y < 60) player2.y += 2;
    if (player2.y > canvas.height - 60) player2.y -= 2;

    // Dirección
    if (Math.abs(dx) > Math.abs(dy)) player2.dir = dx > 0 ? "right" : "left";
    else player2.dir = dy > 0 ? "down" : "up";
  } else {
    // Control humano (flechas)
    if (keys['ArrowUp']) { player2.y -= player2.maxSpeed; player2.dir = "up"; }
    if (keys['ArrowDown']) { player2.y += player2.maxSpeed; player2.dir = "down"; }
    if (keys['ArrowLeft']) { player2.x -= player2.maxSpeed; player2.dir = "left"; }
    if (keys['ArrowRight']) { player2.x += player2.maxSpeed; player2.dir = "right"; }
  }

  // --- Efecto de inclinación visual ---
  [player1, player2].forEach(p => {
    let targetTilt = 0;

    // Inclinación según dirección actual
    switch (p.dir) {
      case "left": targetTilt = 0.25; break;   // inclina hacia la derecha
      case "right": targetTilt = -0.25; break; // inclina hacia la izquierda
      case "up": targetTilt = 0.15; break;     // leve inclinación hacia adelante
      case "down": targetTilt = -0.15; break;  // leve inclinación hacia atrás
    }

    // Transición suave (efecto amortiguado)
    p.tilt += (targetTilt - p.tilt) * 0.15;
  });

}

function moveGoalies() {
  if (gamePaused) return;

  [goalie1, goalie2].forEach((g, index) => {
    const isLeft = index === 0;
    const goalCenterX = g.baseX;
    const goalCenterY = g.baseY;

    // --- 1. Seguir la pelota en el eje Y ---
    // Solo se mueve hasta cierto límite (arriba y abajo del arco)
    const targetY = Math.max(165, Math.min(285, ball.y));
    g.y += (targetY - g.y) * 0.12; // movimiento suave

    // --- 2. Movimiento en semicírculo visual (efecto de “pasos laterales”) ---
    g.angle += 0.04 * g.dir;
    if (g.angle > Math.PI / 1.2) g.dir = -1;
    if (g.angle < Math.PI / 3) g.dir = 1;

    const offsetX = Math.cos(g.angle) * g.radius * (isLeft ? 1 : -1);
    g.x = goalCenterX + offsetX;

    // --- 3. Reacción ante la pelota ---
    const dx = ball.x - g.x;
    const dy = ball.y - g.y;
    const dist = Math.hypot(dx, dy);

    // Adelantarse si la pelota se acerca (≈ 1 cm)
    if (dist < 120) {
      g.forward = true;
    } else if (dist > 150) {
      g.forward = false;
    }

    if (g.forward) {
      g.x += (isLeft ? 2 : -2); // avanza
    } else {
      g.x += (g.baseX - g.x) * 0.05; // vuelve atrás
    }
  });
}

function updateBall() {
  if (gamePaused) return;
  ball.x += ball.xVel;
  ball.y += ball.yVel;
  ball.xVel *= 0.99;
  ball.yVel *= 0.99;

  // 🔁 Calcular velocidad de giro según la velocidad lineal
  const speed = Math.hypot(ball.xVel, ball.yVel);
  ball.spinSpeed = speed * 0.2; // cuanto más rápido va, más gira
  ball.rotation += ball.spinSpeed;

  // 🔁 Limitar rotación para evitar overflow
  if (ball.rotation > Math.PI * 2) ball.rotation -= Math.PI * 2;

  // Rebotes con bordes
  if (ball.y < 20) { ball.y = 20; ball.yVel *= -0.7; }
  if (ball.y > canvas.height - 20) { ball.y = canvas.height - 20; ball.yVel *= -0.7; }
  if (ball.x < 20 && (ball.y < 165 || ball.y > 285)) { ball.x = 20; ball.xVel *= -0.7; }
  if (ball.x > canvas.width - 20 && (ball.y < 165 || ball.y > 285)) { ball.x = canvas.width - 20; ball.xVel *= -0.7; }
}


function checkBallCollision() {
  if (gamePaused) return;
  [player1, player2].forEach(p => {
    let d = Math.hypot(ball.x - p.x, ball.y - p.y);
    if (d < p.size / 2 + ball.size / 2) {
      let dx = (ball.x - p.x) / d, dy = (ball.y - p.y) / d;
      ball.xVel = dx * 5; ball.yVel = dy * 5;
      soundKick.play();
    }
  });
  [goalie1, goalie2].forEach(g => {
    let d = Math.hypot(ball.x - g.x, ball.y - g.y);
    if (d < 25) {
      let dx = (ball.x - g.x) / d, dy = (ball.y - g.y) / d;
      ball.xVel = dx * 4; ball.yVel = dy * 4;
      soundBounce.play();
    }
  });
}

function shootBall() {
  if (gamePaused) return;

  let shooter = null;

  if (Math.abs(ball.x - player1.x) < player1.size && Math.abs(ball.y - player1.y) < player1.size) {
    ball.xVel = 5 + Math.random() * 2;
    ball.yVel = (Math.random() - 0.5) * 3;
    shooter = player1;
    soundKick.play();
  }

  if (Math.abs(ball.x - player2.x) < player2.size && Math.abs(ball.y - player2.y) < player2.size) {
    ball.xVel = -5 - Math.random() * 2;
    ball.yVel = (Math.random() - 0.5) * 3;
    shooter = player2;
    soundKick.play();
  }

  // Crear partículas de efecto al patear
  if (shooter) {
    for (let i = 0; i < 15; i++) {
      particles.push({
        x: shooter.x,
        y: shooter.y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        size: Math.random() * 5 + 2,
        color: `hsl(${Math.random() * 360},80%,60%)`,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3
      });
    }
  }
}


function checkGoals() {
  if (!goalScored && ball.x < 10 && ball.y > 165 && ball.y < 285) {
    player2.score++; goalScored = true; scoringPlayer = player2;
    message.textContent = "🥅 ¡GOOOL del Jugador 2!";
    scoreText.textContent = `Jugador 1: ${player1.score} | Jugador 2: ${player2.score}`;
    pauseGameAfterGoal();
  }
  if (!goalScored && ball.x > 690 && ball.y > 165 && ball.y < 285) {
    player1.score++; goalScored = true; scoringPlayer = player1;
    message.textContent = "🥅 ¡GOOOL del Jugador 1!";
    scoreText.textContent = `Jugador 1: ${player1.score} | Jugador 2: ${player2.score}`;
    pauseGameAfterGoal();
  }
}

function pauseGameAfterGoal() {
  gamePaused = true; soundGoal.play(); createParticles(); draw();
  setTimeout(() => { gamePaused = false; goalScored = false; scoringPlayer = null; particles = []; resetPositions(); }, 3000);
}

function createParticles() {
  const ox = scoringPlayer ? scoringPlayer.x : canvas.width / 2;
  const oy = scoringPlayer ? scoringPlayer.y : canvas.height / 2;
  for (let i = 0; i < 50; i++) {
    particles.push({
      x: ox, y: oy, vx: (Math.random() - 0.5) * 4, vy: Math.random() * -5 - 2,
      size: Math.random() * 5 + 2, color: `hsl(${Math.random() * 360},80%,60%)`,
      rotation: Math.random() * Math.PI * 2, rotationSpeed: (Math.random() - 0.5) * 0.2
    });
  }
}

function updateParticles() {
  particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.rotation += p.rotationSpeed; });
  particles = particles.filter(p => p.y < canvas.height + 20);
}

function drawParticles() {
  particles.forEach(p => {
    c.save(); c.translate(p.x, p.y); c.rotate(p.rotation);
    c.fillStyle = p.color; c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); c.restore();
  });
}

const soundKick = new Audio("/kick.mp3");
const soundGoal = new Audio("/goal.mp3");
const soundBounce = new Audio("/bounce.mp3");

function loop() {
  movePlayers(); moveGoalies(); updateBall();
  checkBallCollision(); checkGoals();
  updateParticles(); draw();
  if (particles.length > 0) drawParticles();
  requestAnimationFrame(loop);
  updateParticles();
}
loop();

function drawGoalie(g, isLeft) {
  c.save();
  c.translate(g.x, g.y);

  // Si se adelanta, inclina levemente
  const tilt = g.forward ? (isLeft ? -0.1 : 0.1) : 0;
  c.rotate(tilt);

  c.drawImage(g.image, -15, -25, 30, 50);
  c.restore();
}



// 📱 Controles táctiles
document.querySelectorAll('#touchControls .btn').forEach(btn => {
  const key = btn.dataset.key;

  // Tocar y mantener presionado => tecla presionada
  btn.addEventListener('touchstart', e => {
    e.preventDefault();
    keys[key] = true;
  });

  // Soltar => tecla liberada
  btn.addEventListener('touchend', e => {
    e.preventDefault();
    keys[key] = false;
  });
});

const touchControls = document.getElementById("touchControls");

if (/Mobi|Android|iPhone/i.test(navigator.userAgent)) {
  // Mostrar controles en móvil
  touchControls.style.display = "flex";
} else {
  // Ocultar controles en PC
  touchControls.style.display = "none";
}

const game = new Game();
requestAnimationFrame(game.gameLoop.bind(game));
