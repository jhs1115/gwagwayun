const canvas = document.getElementById("simulationCanvas");
const ctx = canvas.getContext("2d");

const angleSlider = document.getElementById("angleSlider");
const frictionSlider = document.getElementById("frictionSlider");
const angleValue = document.getElementById("angleValue");
const frictionValue = document.getElementById("frictionValue");
const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");
const stateText = document.getElementById("stateText");

const resultAngle = document.getElementById("resultAngle");
const resultSpeed = document.getElementById("resultSpeed");
const resultDistance = document.getElementById("resultDistance");
const resultEnergy = document.getElementById("resultEnergy");
const interpretationText = document.getElementById("interpretationText");

// 발표용 교육 시뮬레이션이므로 실제 단위보다 시각적 이해를 우선한 상수입니다.
const GRAVITY = 9.8;
const PIXELS_PER_METER = 75;
const MAX_TRAVEL_METERS = 7.2;
const OBJECT_RADIUS = 16;

let angleDegrees = Number(angleSlider.value);
let frictionCoefficient = Number(frictionSlider.value);
let displayedAngle = angleDegrees;

let isRunning = false;
let lastFrameTime = 0;
let travelDistanceMeters = 0;
let currentSpeed = 0;
let relativeEnergy = 0;
let impactWave = null;
let pathPoints = [];

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getInclineGeometry() {
  const width = canvas.width;
  const height = canvas.height;
  const radianAngle = degreesToRadians(displayedAngle);
  const startX = width * 0.16;
  const startY = height * 0.22;
  const bottomSafeY = height - 90;
  const verticalLimit = (bottomSafeY - startY) / Math.max(Math.sin(radianAngle), 0.16);
  const rampLength = Math.min(width * 0.72, 640, verticalLimit);
  const endX = startX + rampLength * Math.cos(radianAngle);
  const endY = startY + rampLength * Math.sin(radianAngle);

  return { startX, startY, endX, endY, rampLength, radianAngle };
}

function getObjectPosition() {
  const geometry = getInclineGeometry();
  const progress = clamp(travelDistanceMeters / MAX_TRAVEL_METERS, 0, 1);
  const x = geometry.startX + (geometry.endX - geometry.startX) * progress;
  const y = geometry.startY + (geometry.endY - geometry.startY) * progress;

  return { x, y, progress, geometry };
}

function calculateAcceleration() {
  const angleRadians = degreesToRadians(angleDegrees);
  const gravityAlongSlope = GRAVITY * Math.sin(angleRadians);
  const frictionLoss = frictionCoefficient * GRAVITY * Math.cos(angleRadians);

  // 경사 방향 힘보다 마찰이 크면 거의 움직이지 않도록 0 이상으로 제한합니다.
  return Math.max(0, gravityAlongSlope - frictionLoss);
}

function resetSimulation() {
  isRunning = false;
  lastFrameTime = 0;
  travelDistanceMeters = 0;
  currentSpeed = 0;
  relativeEnergy = 0;
  impactWave = null;
  pathPoints = [];
  stateText.textContent = "대기 중";
  updateReadouts();
  drawScene();
}

function startSimulation() {
  resetMotionOnly();
  if (calculateAcceleration() <= 0.02) {
    isRunning = false;
    stateText.textContent = "정지";
    interpretationText.textContent =
      "경사 방향 중력 성분보다 마찰 영향이 커서 물체가 거의 움직이지 않습니다.";
    drawScene();
    return;
  }

  isRunning = true;
  stateText.textContent = "이동 중";
  requestAnimationFrame(animate);
}

function resetMotionOnly() {
  lastFrameTime = 0;
  travelDistanceMeters = 0;
  currentSpeed = 0;
  relativeEnergy = 0;
  impactWave = null;
  pathPoints = [];
}

function animate(timestamp) {
  if (!isRunning) {
    return;
  }

  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }

  const deltaSeconds = Math.min((timestamp - lastFrameTime) / 1000, 0.04);
  lastFrameTime = timestamp;

  const acceleration = calculateAcceleration();
  currentSpeed += acceleration * deltaSeconds;
  travelDistanceMeters += currentSpeed * deltaSeconds;
  relativeEnergy = 0.5 * currentSpeed * currentSpeed;

  const objectPosition = getObjectPosition();
  pathPoints.push({ x: objectPosition.x, y: objectPosition.y });
  if (pathPoints.length > 130) {
    pathPoints.shift();
  }

  if (travelDistanceMeters >= MAX_TRAVEL_METERS) {
    travelDistanceMeters = MAX_TRAVEL_METERS;
    isRunning = false;
    stateText.textContent = "에너지 전달";
    createImpactWave();
  }

  updateReadouts();
  drawScene();

  if (isRunning || impactWave) {
    requestAnimationFrame(animateImpactOnly);
  }
}

function animateImpactOnly(timestamp) {
  if (isRunning) {
    animate(timestamp);
    return;
  }

  if (impactWave) {
    impactWave.life += 0.022;
    if (impactWave.life >= 1) {
      impactWave = null;
      stateText.textContent = "완료";
    }
    drawScene();
    requestAnimationFrame(animateImpactOnly);
  }
}

function createImpactWave() {
  const position = getObjectPosition();
  const energyPower = clamp(relativeEnergy / 12, 0.2, 1.6);
  impactWave = {
    x: position.x,
    y: position.y,
    baseRadius: 30 + energyPower * 24,
    maxRadius: 70 + energyPower * 58,
    power: energyPower,
    life: 0
  };
}

function updateReadouts() {
  angleValue.textContent = angleDegrees.toFixed(0);
  frictionValue.textContent = frictionCoefficient.toFixed(2);
  resultAngle.textContent = angleDegrees.toFixed(0);
  resultSpeed.textContent = currentSpeed.toFixed(2);
  resultDistance.textContent = travelDistanceMeters.toFixed(2);
  resultEnergy.textContent = relativeEnergy.toFixed(2);

  if (!isRunning && travelDistanceMeters === 0) {
    interpretationText.textContent = "시작 버튼을 누르면 물체가 경사면을 따라 이동합니다.";
    return;
  }

  if (frictionCoefficient > 0.55) {
    interpretationText.textContent =
      "마찰 영향으로 에너지 손실이 증가하고 있어 물체의 속도 증가가 제한됩니다.";
  } else if (angleDegrees > 40) {
    interpretationText.textContent =
      "경사각이 증가하여 이동 속도가 빨라지고, 도착 지점에서 더 강한 에너지 전달이 나타납니다.";
  } else if (angleDegrees < 10) {
    interpretationText.textContent =
      "경사각이 작아 중력의 경사 방향 성분이 약해지고 이동 속도가 천천히 변합니다.";
  } else {
    interpretationText.textContent =
      "위치에너지가 운동에너지로 전환되며 물체가 경사면을 따라 자연스럽게 가속됩니다.";
  }
}

function drawScene() {
  displayedAngle += (angleDegrees - displayedAngle) * 0.12;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackgroundGrid();
  drawRamp();
  drawPath();
  drawImpactWave();
  drawObject();
  drawEnergyBars();
}

function drawBackgroundGrid() {
  ctx.save();
  ctx.strokeStyle = "rgba(88, 217, 255, 0.08)";
  ctx.lineWidth = 1;

  for (let x = 0; x < canvas.width; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  for (let y = 0; y < canvas.height; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.restore();
}

function drawRamp() {
  const { startX, startY, endX, endY } = getInclineGeometry();

  ctx.save();
  ctx.lineCap = "round";
  ctx.shadowBlur = 18;
  ctx.shadowColor = "rgba(88, 217, 255, 0.45)";
  ctx.strokeStyle = "#8ee7ff";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, endY + 36);
  ctx.lineTo(endX + 40, endY + 36);
  ctx.stroke();

  drawAngleArc(startX, startY, endY);
  ctx.restore();
}

function drawAngleArc(startX, startY, endY) {
  const radius = 56;
  const angle = degreesToRadians(displayedAngle);

  ctx.strokeStyle = "rgba(255, 209, 102, 0.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(startX, startY, radius, 0, angle, false);
  ctx.stroke();

  ctx.fillStyle = "#ffd166";
  ctx.font = "700 15px Segoe UI";
  ctx.fillText(`${Math.round(angleDegrees)}도`, startX + 68, startY + Math.min(42, endY - startY + 20));
}

function drawPath() {
  if (pathPoints.length < 2) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = "rgba(116, 240, 162, 0.62)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
  for (const point of pathPoints) {
    ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawObject() {
  const { x, y } = getObjectPosition();
  const speedRatio = clamp(currentSpeed / 8, 0, 1);
  const red = Math.round(80 + speedRatio * 175);
  const green = Math.round(220 - speedRatio * 70);
  const blue = Math.round(255 - speedRatio * 165);

  const gradient = ctx.createRadialGradient(x - 6, y - 7, 3, x, y, OBJECT_RADIUS + 10);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.32, `rgb(${red}, ${green}, ${blue})`);
  gradient.addColorStop(1, "rgba(255, 77, 95, 0.9)");

  ctx.save();
  ctx.shadowBlur = 24 + speedRatio * 18;
  ctx.shadowColor = `rgba(${red}, ${green}, ${blue}, 0.75)`;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, OBJECT_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawImpactWave() {
  if (!impactWave) {
    return;
  }

  const waveProgress = impactWave.life;
  const radius = impactWave.baseRadius + (impactWave.maxRadius - impactWave.baseRadius) * waveProgress;
  const alpha = 1 - waveProgress;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = 45 * impactWave.power;
  ctx.shadowColor = "rgba(255, 77, 95, 0.95)";
  ctx.strokeStyle = `rgba(255, 77, 95, ${0.85 * alpha})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(impactWave.x, impactWave.y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = `rgba(255, 77, 95, ${0.18 * alpha})`;
  ctx.beginPath();
  ctx.arc(impactWave.x, impactWave.y, radius * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnergyBars() {
  const barX = canvas.width - 178;
  const barY = 70;
  const barHeight = 176;
  const energyRatio = clamp(relativeEnergy / 18, 0, 1);
  const frictionRatio = clamp(frictionCoefficient, 0, 1);

  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
  ctx.fillRect(barX, barY, 22, barHeight);
  ctx.fillRect(barX + 58, barY, 22, barHeight);

  ctx.fillStyle = "#74f0a2";
  ctx.fillRect(barX, barY + barHeight * (1 - energyRatio), 22, barHeight * energyRatio);

  ctx.fillStyle = "#ff4d5f";
  ctx.fillRect(barX + 58, barY + barHeight * (1 - frictionRatio), 22, barHeight * frictionRatio);

  ctx.fillStyle = "rgba(238, 247, 255, 0.9)";
  ctx.font = "700 13px Segoe UI";
  ctx.fillText("운동", barX - 4, barY + barHeight + 24);
  ctx.fillText("마찰", barX + 54, barY + barHeight + 24);
  ctx.restore();
}

angleSlider.addEventListener("input", () => {
  angleDegrees = Number(angleSlider.value);
  updateReadouts();
  drawScene();
});

frictionSlider.addEventListener("input", () => {
  frictionCoefficient = Number(frictionSlider.value);
  updateReadouts();
  drawScene();
});

startButton.addEventListener("click", startSimulation);
resetButton.addEventListener("click", resetSimulation);

updateReadouts();
drawScene();
