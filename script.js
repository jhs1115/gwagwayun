const simulationCanvas = document.getElementById("simulationCanvas");
const simulationContext = simulationCanvas.getContext("2d");
const speedChartCanvas = document.getElementById("speedChart");
const speedChartContext = speedChartCanvas.getContext("2d");
const depthChartCanvas = document.getElementById("depthChart");
const depthChartContext = depthChartCanvas.getContext("2d");

const angleSlider = document.getElementById("angleSlider");
const frictionSlider = document.getElementById("frictionSlider");
const angleValue = document.getElementById("angleValue");
const frictionValue = document.getElementById("frictionValue");
const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");
const stateText = document.getElementById("stateText");
const runCount = document.getElementById("runCount");
const modeButtons = document.querySelectorAll(".mode-button");
const earthProcess = document.getElementById("earthProcess");
const processSteps = document.querySelectorAll(".process-step");

const resultAngle = document.getElementById("resultAngle");
const resultSpeed = document.getElementById("resultSpeed");
const resultDistance = document.getElementById("resultDistance");
const resultEnergy = document.getElementById("resultEnergy");

// 교육용 단순 모델 상수입니다.
const GRAVITY = 9.8;
const MAX_TRAVEL_METERS = 7.2;
const OBJECT_RADIUS = 16;

let angleDegrees = Number(angleSlider.value);
let frictionCoefficient = Number(frictionSlider.value);
let displayedAngle = angleDegrees;
let activeMode = "physics";

let isRunning = false;
let travelDistanceMeters = 0;
let currentSpeed = 0;
let relativeEnergy = 0;
let impactWave = null;
let deliveredEnergyFocus = null;
let pathPoints = [];
let experimentData = [];
let lastFrameTime = 0;
let animationClock = 0;

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculateAcceleration() {
  const angleRadians = degreesToRadians(angleDegrees);
  const gravityAlongSlope = GRAVITY * Math.sin(angleRadians);
  const frictionLoss = frictionCoefficient * GRAVITY * Math.cos(angleRadians);
  return Math.max(0, gravityAlongSlope - frictionLoss);
}

function calculateTransferDepth(angle = angleDegrees) {
  return MAX_TRAVEL_METERS * Math.sin(degreesToRadians(angle));
}

function getInclineGeometry() {
  const width = simulationCanvas.width;
  const height = simulationCanvas.height;
  const radianAngle = degreesToRadians(displayedAngle);
  const startX = width * 0.16;
  const startY = height * 0.22;
  const bottomSafeY = height - 90;
  const verticalLimit =
    (bottomSafeY - startY) / Math.max(Math.sin(radianAngle), 0.16);
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

function startSimulation() {
  resetMotionOnly();
  const acceleration = calculateAcceleration();

  if (acceleration <= 0.02) {
    stateText.textContent = "정지";
    recordExperiment();
    return;
  }

  isRunning = true;
  stateText.textContent = "이동 중";
}

function resetMotionOnly() {
  isRunning = false;
  travelDistanceMeters = 0;
  currentSpeed = 0;
  relativeEnergy = 0;
  impactWave = null;
  deliveredEnergyFocus = null;
  pathPoints = [];
  updateReadouts();
}

function resetSimulation() {
  resetMotionOnly();
  experimentData = [];
  runCount.textContent = "0";
  stateText.textContent = "대기 중";
  drawCharts();
}

function completeSimulation() {
  travelDistanceMeters = MAX_TRAVEL_METERS;
  isRunning = false;
  stateText.textContent = "에너지 전달";
  createDeliveredEnergyFocus();
  createImpactWave();
  recordExperiment();
}

function recordExperiment() {
  experimentData.push({
    angle: angleDegrees,
    speed: currentSpeed,
    depth: calculateTransferDepth(),
    energy: relativeEnergy,
    friction: frictionCoefficient
  });
  runCount.textContent = String(experimentData.length);
  drawCharts();
}

function createImpactWave() {
  const position = getObjectPosition();
  const energyPower = clamp(relativeEnergy / 12, 0.2, 1.8);
  impactWave = {
    x: position.x,
    y: position.y,
    baseRadius: 24 + energyPower * 20,
    maxRadius: 62 + energyPower * 62,
    power: energyPower,
    life: 0
  };
}

function createDeliveredEnergyFocus() {
  const angleRatio = clamp(angleDegrees / 60, 0, 1);
  const retainedEnergy = clamp(1 - frictionCoefficient * 0.65, 0.25, 1);
  const impactEnergyRatio = clamp(relativeEnergy / 55, 0.08, 1);

  deliveredEnergyFocus = {
    strength: clamp(
      angleRatio * 0.45 + retainedEnergy * impactEnergyRatio * 0.75,
      0.08,
      1
    )
  };
}

function updatePhysics(deltaSeconds) {
  if (!isRunning) {
    if (impactWave) {
      impactWave.life += deltaSeconds * 1.2;
      if (impactWave.life >= 1) {
        impactWave = null;
        stateText.textContent = "완료";
      }
    }
    return;
  }

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
    completeSimulation();
  }

  updateReadouts();
}

function updateReadouts() {
  angleValue.textContent = angleDegrees.toFixed(0);
  frictionValue.textContent = frictionCoefficient.toFixed(2);
  resultAngle.textContent = angleDegrees.toFixed(0);
  resultSpeed.textContent = currentSpeed.toFixed(2);
  resultDistance.textContent = travelDistanceMeters.toFixed(2);
  resultEnergy.textContent = relativeEnergy.toFixed(2);
}

function drawScene() {
  displayedAngle += (angleDegrees - displayedAngle) * 0.1;
  simulationContext.clearRect(
    0,
    0,
    simulationCanvas.width,
    simulationCanvas.height
  );

  if (activeMode === "earth") {
    drawEarthScienceModel();
  } else {
    drawPhysicsModel();
  }
}

function drawPhysicsModel() {
  drawBackgroundGrid();
  drawRamp();
  drawPath();
  drawEnergyFocus();
  drawImpactWave();
  drawObject();
}

function drawBackgroundGrid() {
  const ctx = simulationContext;
  ctx.save();
  ctx.fillStyle = "#07101a";
  ctx.fillRect(0, 0, simulationCanvas.width, simulationCanvas.height);
  ctx.strokeStyle = "rgba(88, 217, 255, 0.08)";
  ctx.lineWidth = 1;

  for (let x = 0; x < simulationCanvas.width; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, simulationCanvas.height);
    ctx.stroke();
  }

  for (let y = 0; y < simulationCanvas.height; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(simulationCanvas.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRamp() {
  const ctx = simulationContext;
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
  const ctx = simulationContext;
  const radius = 56;
  const angle = degreesToRadians(displayedAngle);

  ctx.strokeStyle = "rgba(255, 209, 102, 0.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(startX, startY, radius, 0, angle);
  ctx.stroke();

  ctx.fillStyle = "#ffd166";
  ctx.font = "700 15px Segoe UI";
  ctx.fillText(
    `${Math.round(angleDegrees)}도`,
    startX + 68,
    startY + Math.min(42, endY - startY + 20)
  );
}

function drawPath() {
  if (pathPoints.length < 2) {
    return;
  }

  const ctx = simulationContext;
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
  const ctx = simulationContext;
  const { x, y } = getObjectPosition();
  const speedRatio = clamp(currentSpeed / 8, 0, 1);
  const red = Math.round(80 + speedRatio * 175);
  const green = Math.round(220 - speedRatio * 70);
  const blue = Math.round(255 - speedRatio * 165);
  const gradient = ctx.createRadialGradient(
    x - 6,
    y - 7,
    3,
    x,
    y,
    OBJECT_RADIUS + 10
  );

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

function drawEnergyFocus() {
  if (!deliveredEnergyFocus) {
    return;
  }

  const ctx = simulationContext;
  const { endX, endY } = getInclineGeometry();
  const focusStrength = deliveredEnergyFocus.strength;
  const glowRadius = 64 - focusStrength * 30;
  const coreRadius = 4 + focusStrength * 10;
  const glow = ctx.createRadialGradient(endX, endY, 0, endX, endY, glowRadius);

  glow.addColorStop(0, `rgba(255, 245, 220, ${0.45 + focusStrength * 0.5})`);
  glow.addColorStop(0.16, `rgba(255, 69, 82, ${0.28 + focusStrength * 0.58})`);
  glow.addColorStop(0.48, `rgba(255, 38, 60, ${0.08 + focusStrength * 0.2})`);
  glow.addColorStop(1, "rgba(255, 38, 60, 0)");

  ctx.save();
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(endX, endY, glowRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 18 + focusStrength * 38;
  ctx.shadowColor = "rgba(255, 55, 70, 0.95)";
  ctx.fillStyle = `rgba(255, 235, 215, ${0.35 + focusStrength * 0.65})`;
  ctx.beginPath();
  ctx.arc(endX, endY, coreRadius, 0, Math.PI * 2);
  ctx.fill();

  const ringCount = 1 + Math.round(focusStrength * 3);
  for (let index = 0; index < ringCount; index += 1) {
    const radius = coreRadius + 8 + index * (7 - focusStrength * 2);
    ctx.globalAlpha = 0.18 + focusStrength * 0.2;
    ctx.strokeStyle = "#ff4d5f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(endX, endY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawImpactWave() {
  if (!impactWave) {
    return;
  }

  const ctx = simulationContext;
  const radius =
    impactWave.baseRadius +
    (impactWave.maxRadius - impactWave.baseRadius) * impactWave.life;
  const alpha = 1 - impactWave.life;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = 45 * impactWave.power;
  ctx.shadowColor = "rgba(255, 77, 95, 0.95)";
  ctx.strokeStyle = `rgba(255, 77, 95, ${0.85 * alpha})`;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(impactWave.x, impactWave.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// 지구과학 단면도 ----------------------------------------------------------

function getSubductionGeometry() {
  const surfaceY = 142;
  const trenchX = 338;
  const slabAngle = degreesToRadians(14 + displayedAngle * 0.82);
  const slabLength = 560;
  return { surfaceY, trenchX, slabAngle, slabLength };
}

function getSlabPoint(progress) {
  const { surfaceY, trenchX, slabAngle, slabLength } = getSubductionGeometry();
  const curve = Math.sin(progress * Math.PI) * 28;
  return {
    x: trenchX + progress * slabLength * Math.cos(slabAngle),
    y: surfaceY + progress * slabLength * Math.sin(slabAngle) + curve
  };
}

function drawEarthScienceModel() {
  const ctx = simulationContext;
  const width = simulationCanvas.width;
  const height = simulationCanvas.height;
  const { surfaceY, trenchX } = getSubductionGeometry();

  const mantleGradient = ctx.createLinearGradient(0, surfaceY, 0, height);
  mantleGradient.addColorStop(0, "#4d2330");
  mantleGradient.addColorStop(0.5, "#7d302c");
  mantleGradient.addColorStop(1, "#25111e");
  ctx.fillStyle = mantleGradient;
  ctx.fillRect(0, 0, width, height);

  drawMantleTexture();
  drawOceanAndOceanicPlate(surfaceY, trenchX);
  drawContinentalPlate(surfaceY, trenchX);
  drawSubductingSlab();
  drawSubductionTracer();
  drawEarthquakes();
  drawMagmaFlow();
  drawVolcano(surfaceY);
}

function drawMantleTexture() {
  const ctx = simulationContext;
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";

  for (let index = 0; index < 7; index += 1) {
    const offset = (animationClock * 14 + index * 150) % 1040 - 70;
    const y = 360 + (index % 3) * 52;
    const gradient = ctx.createLinearGradient(offset - 55, y, offset + 70, y);
    gradient.addColorStop(0, "rgba(255, 112, 55, 0)");
    gradient.addColorStop(0.5, "rgba(255, 145, 70, 0.72)");
    gradient.addColorStop(1, "rgba(255, 112, 55, 0)");
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(offset - 52, y + Math.sin(index) * 10);
    ctx.bezierCurveTo(
      offset - 12,
      y - 22,
      offset + 28,
      y + 20,
      offset + 72,
      y - 5
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawOceanAndOceanicPlate(surfaceY, trenchX) {
  const ctx = simulationContext;
  const waterGradient = ctx.createLinearGradient(0, 35, 0, surfaceY);
  waterGradient.addColorStop(0, "#123e5b");
  waterGradient.addColorStop(1, "#071f36");
  ctx.fillStyle = waterGradient;
  ctx.fillRect(0, 0, trenchX + 18, surfaceY);

  ctx.fillStyle = "#253e50";
  ctx.beginPath();
  ctx.moveTo(0, surfaceY - 9);
  ctx.lineTo(trenchX - 24, surfaceY - 9);
  ctx.lineTo(trenchX + 16, surfaceY + 18);
  ctx.lineTo(0, surfaceY + 29);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(90, 220, 255, 0.45)";
  ctx.lineWidth = 2;
  for (let index = 0; index < 5; index += 1) {
    const waveX = ((animationClock * 34 + index * 92) % 430) - 60;
    ctx.beginPath();
    ctx.arc(waveX, surfaceY - 22, 25, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }

  // 해양판 이동 방향을 화살촉 형태로 나타냅니다.
  ctx.fillStyle = "rgba(88, 217, 255, 0.75)";
  const plateShift = isRunning
    ? (animationClock * (18 + currentSpeed * 2.2)) % 40
    : (travelDistanceMeters / MAX_TRAVEL_METERS) * 40;
  for (let x = 65; x < trenchX - 35; x += 82) {
    ctx.beginPath();
    ctx.moveTo(x + plateShift, surfaceY + 8);
    ctx.lineTo(x + plateShift + 14, surfaceY + 14);
    ctx.lineTo(x + plateShift, surfaceY + 20);
    ctx.closePath();
    ctx.fill();
  }
}

function drawContinentalPlate(surfaceY, trenchX) {
  const ctx = simulationContext;
  const width = simulationCanvas.width;
  const crustGradient = ctx.createLinearGradient(0, surfaceY - 40, 0, surfaceY + 95);
  crustGradient.addColorStop(0, "#8c7351");
  crustGradient.addColorStop(0.28, "#68533f");
  crustGradient.addColorStop(1, "#3b2c2e");

  ctx.fillStyle = crustGradient;
  ctx.beginPath();
  ctx.moveTo(trenchX, surfaceY + 5);
  ctx.lineTo(trenchX + 62, surfaceY - 7);
  ctx.lineTo(trenchX + 170, surfaceY - 20);
  ctx.lineTo(trenchX + 300, surfaceY - 12);
  ctx.lineTo(width, surfaceY - 22);
  ctx.lineTo(width, surfaceY + 105);
  ctx.lineTo(trenchX + 40, surfaceY + 72);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(242, 207, 146, 0.5)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(trenchX + 8, surfaceY + 3);
  ctx.lineTo(trenchX + 170, surfaceY - 20);
  ctx.lineTo(width, surfaceY - 22);
  ctx.stroke();
}

function drawSubductingSlab() {
  const ctx = simulationContext;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = 14;
  ctx.shadowColor = "rgba(61, 155, 193, 0.45)";
  ctx.strokeStyle = "#2c5264";
  ctx.lineWidth = 34;
  ctx.beginPath();

  for (let index = 0; index <= 42; index += 1) {
    const point = getSlabPoint(index / 42);
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  }
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(126, 211, 225, 0.62)";
  ctx.lineWidth = 4;
  ctx.stroke();

  // 판 내부 무늬가 아래로 이동해 실제 섭입 운동을 보여줍니다.
  const movement =
    (travelDistanceMeters / MAX_TRAVEL_METERS) * 0.35 +
    (isRunning ? animationClock * (0.035 + currentSpeed * 0.008) : 0);
  for (let index = 0; index < 13; index += 1) {
    const progress = (movement + index / 13) % 1;
    const point = getSlabPoint(progress);
    const nextPoint = getSlabPoint(clamp(progress + 0.012, 0, 1));
    const directionX = nextPoint.x - point.x;
    const directionY = nextPoint.y - point.y;
    const length = Math.hypot(directionX, directionY) || 1;
    const normalX = -directionY / length;
    const normalY = directionX / length;

    ctx.strokeStyle = "rgba(151, 222, 231, 0.42)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(point.x - normalX * 11, point.y - normalY * 11);
    ctx.lineTo(point.x + normalX * 11, point.y + normalY * 11);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSubductionTracer() {
  if (!isRunning && travelDistanceMeters === 0) {
    return;
  }

  const ctx = simulationContext;
  const progress = clamp(travelDistanceMeters / MAX_TRAVEL_METERS, 0, 1);
  const point = getSlabPoint(progress);
  const pulse = 1 + Math.sin(animationClock * 8) * 0.13;

  ctx.save();
  ctx.shadowBlur = 30;
  ctx.shadowColor = "#fff1c4";
  ctx.fillStyle = "#fff1c4";
  ctx.beginPath();
  ctx.arc(point.x, point.y, 9 * pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = "#ffcf5a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(point.x, point.y, 17 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawEarthquakes() {
  const ctx = simulationContext;
  const simulationProgress = clamp(
    travelDistanceMeters / MAX_TRAVEL_METERS,
    0,
    1
  );
  const depthRatio = clamp(calculateTransferDepth() / MAX_TRAVEL_METERS, 0, 1);
  const maximumProgress = Math.min(
    simulationProgress,
    0.16 + depthRatio * 0.72
  );
  const energyRatio = clamp((currentSpeed || calculateAcceleration()) / 8, 0.15, 1);

  ctx.save();
  for (let index = 0; index < 16; index += 1) {
    const progress = 0.12 + index * 0.047;
    if (progress > maximumProgress) {
      continue;
    }

    const point = getSlabPoint(progress);
    const pulse = 0.65 + Math.sin(animationClock * 5 + index * 1.7) * 0.35;
    const radius = 2.5 + pulse * (2 + energyRatio * 3);

    ctx.globalAlpha = 0.35 + pulse * 0.65;
    ctx.shadowBlur = 12 + energyRatio * 22;
    ctx.shadowColor = "#ff3149";
    ctx.fillStyle = index % 3 === 0 ? "#fff2da" : "#ff3f52";
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function getVolcanoPosition() {
  const { surfaceY, trenchX } = getSubductionGeometry();
  const depthRatio = clamp(calculateTransferDepth() / MAX_TRAVEL_METERS, 0, 1);
  return {
    x: trenchX + 250 + depthRatio * 105,
    y: surfaceY - 18
  };
}

function drawMagmaFlow() {
  const ctx = simulationContext;
  const source = getSlabPoint(
    clamp(0.44 + calculateTransferDepth() / MAX_TRAVEL_METERS * 0.27, 0.4, 0.75)
  );
  const volcano = getVolcanoPosition();
  const controlX = (source.x + volcano.x) / 2 + 48;
  const controlY = source.y - 95;
  const simulationProgress = clamp(
    travelDistanceMeters / MAX_TRAVEL_METERS,
    0,
    1
  );

  if (simulationProgress < 0.62) {
    return;
  }

  const magmaProgress = clamp((simulationProgress - 0.62) / 0.38, 0, 1);

  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = `rgba(255, 102, 38, ${0.08 + magmaProgress * 0.24})`;
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.moveTo(source.x, source.y);
  ctx.quadraticCurveTo(controlX, controlY, volcano.x, volcano.y);
  ctx.stroke();

  for (let index = 0; index < 13; index += 1) {
    const progress = (animationClock * (0.12 + currentSpeed * 0.01) + index / 13) % 1;
    if (progress > magmaProgress) {
      continue;
    }
    const inverse = 1 - progress;
    const x =
      inverse * inverse * source.x +
      2 * inverse * progress * controlX +
      progress * progress * volcano.x;
    const y =
      inverse * inverse * source.y +
      2 * inverse * progress * controlY +
      progress * progress * volcano.y;

    ctx.shadowBlur = 18;
    ctx.shadowColor = "#ff6a2d";
    ctx.fillStyle = index % 2 === 0 ? "#ffd166" : "#ff6a2d";
    ctx.beginPath();
    ctx.arc(x, y, 4 + Math.sin(animationClock * 4 + index) * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawVolcano(surfaceY) {
  const ctx = simulationContext;
  const volcano = getVolcanoPosition();
  const simulationProgress = clamp(
    travelDistanceMeters / MAX_TRAVEL_METERS,
    0,
    1
  );
  const eruptionStrength = clamp(
    ((currentSpeed || calculateAcceleration()) / 8) *
      clamp((simulationProgress - 0.78) / 0.22, 0, 1),
    0,
    1
  );

  ctx.save();
  const coneGradient = ctx.createLinearGradient(
    volcano.x - 52,
    volcano.y - 80,
    volcano.x + 52,
    surfaceY
  );
  coneGradient.addColorStop(0, "#5b302c");
  coneGradient.addColorStop(1, "#251b22");
  ctx.fillStyle = coneGradient;
  ctx.beginPath();
  ctx.moveTo(volcano.x - 64, volcano.y + 5);
  ctx.lineTo(volcano.x - 18, volcano.y - 74);
  ctx.lineTo(volcano.x + 18, volcano.y - 74);
  ctx.lineTo(volcano.x + 68, volcano.y + 5);
  ctx.closePath();
  ctx.fill();

  if (eruptionStrength > 0) {
    ctx.strokeStyle = "#ff6a2d";
    ctx.lineWidth = 7;
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#ff4d35";
    ctx.beginPath();
    ctx.moveTo(volcano.x, volcano.y - 70);
    ctx.lineTo(volcano.x + 5, volcano.y - 38);
    ctx.lineTo(volcano.x + 20, volcano.y - 6);
    ctx.stroke();

    for (let index = 0; index < 8; index += 1) {
      const phase =
        (animationClock * (0.12 + eruptionStrength * 0.16) + index / 8) % 1;
      const side = index % 2 === 0 ? -1 : 1;
      const x = volcano.x + side * phase * 24;
      const y = volcano.y - 82 - phase * (28 + eruptionStrength * 34);
      ctx.globalAlpha = (1 - phase) * eruptionStrength;
      ctx.fillStyle = index % 3 === 0 ? "#ffd166" : "#ff5538";
      ctx.beginPath();
      ctx.arc(x, y, 3 + eruptionStrength * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function updateEarthProcess() {
  const progress = clamp(travelDistanceMeters / MAX_TRAVEL_METERS, 0, 1);
  processSteps.forEach((step) => {
    const name = step.dataset.step;
    const active =
      (name === "plate" && progress > 0) ||
      (name === "quake" && progress >= 0.16) ||
      (name === "magma" && progress >= 0.62);
    step.classList.toggle("active", active);
  });
}

// 데이터 분석 그래프 -------------------------------------------------------

function drawCharts() {
  drawDataChart({
    canvas: speedChartCanvas,
    ctx: speedChartContext,
    dataKey: "speed",
    yLabel: "이동 속도 (m/s)",
    yMax: 12,
    color: "#58d9ff"
  });
  drawDataChart({
    canvas: depthChartCanvas,
    ctx: depthChartContext,
    dataKey: "depth",
    yLabel: "전달 깊이 (m)",
    yMax: 7.5,
    color: "#ff8a3d"
  });
}

function drawDataChart({ canvas, ctx, dataKey, yLabel, yMax, color }) {
  const width = canvas.width;
  const height = canvas.height;
  const margin = { top: 26, right: 24, bottom: 58, left: 68 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#07101a";
  ctx.fillRect(0, 0, width, height);
  drawChartGrid(ctx, margin, plotWidth, plotHeight, yMax);

  const sortedData = [...experimentData].sort((a, b) => a.angle - b.angle);
  const mapX = (angle) => margin.left + (angle / 60) * plotWidth;
  const mapY = (value) =>
    margin.top + plotHeight - (clamp(value, 0, yMax) / yMax) * plotHeight;

  if (sortedData.length > 1) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 2;
    ctx.beginPath();
    sortedData.forEach((item, index) => {
      const x = mapX(item.angle);
      const y = mapY(item[dataKey]);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    drawTrendLine(ctx, sortedData, dataKey, mapX, mapY, color);
    ctx.restore();
  }

  const latestExperiment = experimentData[experimentData.length - 1];
  sortedData.forEach((item) => {
    const isCurrent = item === latestExperiment;
    drawChartPoint(
      ctx,
      mapX(item.angle),
      mapY(item[dataKey]),
      isCurrent,
      color
    );
  });

  drawLiveChartPoint(ctx, dataKey, mapX, mapY, color);
  drawChartLabels(ctx, width, height, margin, plotWidth, plotHeight, yMax, yLabel);
}

function drawChartGrid(ctx, margin, plotWidth, plotHeight, yMax) {
  ctx.save();
  ctx.strokeStyle = "rgba(138, 186, 214, 0.12)";
  ctx.lineWidth = 1;

  for (let index = 0; index <= 6; index += 1) {
    const x = margin.left + (plotWidth / 6) * index;
    ctx.beginPath();
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, margin.top + plotHeight);
    ctx.stroke();
  }

  for (let index = 0; index <= 5; index += 1) {
    const y = margin.top + (plotHeight / 5) * index;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + plotWidth, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(214, 236, 248, 0.48)";
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, margin.top + plotHeight);
  ctx.lineTo(margin.left + plotWidth, margin.top + plotHeight);
  ctx.stroke();
  ctx.restore();
}

function drawTrendLine(ctx, data, dataKey, mapX, mapY, color) {
  const count = data.length;
  const sumX = data.reduce((sum, item) => sum + item.angle, 0);
  const sumY = data.reduce((sum, item) => sum + item[dataKey], 0);
  const sumXY = data.reduce(
    (sum, item) => sum + item.angle * item[dataKey],
    0
  );
  const sumXX = data.reduce((sum, item) => sum + item.angle * item.angle, 0);
  const denominator = count * sumXX - sumX * sumX;

  if (Math.abs(denominator) < 0.001) {
    return;
  }

  const slope = (count * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / count;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.78;
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.moveTo(mapX(0), mapY(intercept));
  ctx.lineTo(mapX(60), mapY(intercept + slope * 60));
  ctx.stroke();
  ctx.restore();
}

function drawChartPoint(ctx, x, y, isCurrent, color) {
  ctx.save();
  if (isCurrent) {
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#ffd166";
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff5cf";
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawLiveChartPoint(ctx, dataKey, mapX, mapY, color) {
  const value =
    dataKey === "speed" ? currentSpeed : calculateTransferDepth(angleDegrees);
  const x = mapX(angleDegrees);
  const y = mapY(value);
  const pulse = 1 + Math.sin(animationClock * 5) * 0.12;

  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 9 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawChartLabels(
  ctx,
  width,
  height,
  margin,
  plotWidth,
  plotHeight,
  yMax,
  yLabel
) {
  ctx.save();
  ctx.fillStyle = "#91a8ba";
  ctx.font = "12px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  for (let index = 0; index <= 6; index += 1) {
    const value = index * 10;
    const x = margin.left + (plotWidth / 6) * index;
    ctx.fillText(String(value), x, margin.top + plotHeight + 10);
  }

  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let index = 0; index <= 5; index += 1) {
    const value = yMax - (yMax / 5) * index;
    const y = margin.top + (plotHeight / 5) * index;
    ctx.fillText(value.toFixed(1), margin.left - 10, y);
  }

  ctx.fillStyle = "#d5e7f2";
  ctx.font = "700 13px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("경사각 (도)", margin.left + plotWidth / 2, height - 7);

  ctx.translate(16, margin.top + plotHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
}

function setActiveMode(mode) {
  activeMode = mode;
  earthProcess.classList.toggle("visible", mode === "earth");
  modeButtons.forEach((button) => {
    const isActive = button.dataset.mode === mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function animationLoop(timestamp) {
  if (!lastFrameTime) {
    lastFrameTime = timestamp;
  }

  const deltaSeconds = Math.min((timestamp - lastFrameTime) / 1000, 0.04);
  lastFrameTime = timestamp;
  animationClock += deltaSeconds;

  updatePhysics(deltaSeconds);
  updateEarthProcess();
  drawScene();
  drawCharts();
  requestAnimationFrame(animationLoop);
}

angleSlider.addEventListener("input", () => {
  angleDegrees = Number(angleSlider.value);
  updateReadouts();
});

frictionSlider.addEventListener("input", () => {
  frictionCoefficient = Number(frictionSlider.value);
  updateReadouts();
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveMode(button.dataset.mode));
});

startButton.addEventListener("click", startSimulation);
resetButton.addEventListener("click", resetSimulation);

setActiveMode("physics");
updateReadouts();
drawCharts();
requestAnimationFrame(animationLoop);
