import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0d111a');

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(7.5, 6.2, 8.5);

// Optimized WebGLRenderer with capped pixel ratio and default power preference
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.getElementById('app').appendChild(renderer.domElement);

// --- Orbit Controls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.enablePan = false;
controls.minDistance = 4;
controls.maxDistance = 18;
controls.target.set(0, 0, 0);
controls.rotateSpeed = -1.0; // Natural object drag: drag right = rotate right, drag up = tilt to see top

// --- Render On Demand Engine (0% CPU when idle) ---
let renderRequested = false;

function render() {
  renderRequested = false;

  // controls.update() returns true only when camera is actively moving from damping/inertia
  const controlsMoving = controls.update();
  renderer.render(scene, camera);

  // Keep requesting frames only while controls are actively moving
  if (controlsMoving) {
    requestRender();
  }
}

function requestRender() {
  if (!renderRequested && !document.hidden) {
    renderRequested = true;
    requestAnimationFrame(render);
  }
}

// Request render when user orbits or zooms camera
controls.addEventListener('change', requestRender);

// Pause renders completely when page/tab is hidden
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) requestRender();
});

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
mainLight.position.set(8, 12, 10);
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.4);
fillLight.position.set(-8, -6, -8);
scene.add(fillLight);

// --- GAN Logo Texture ---
function createGanLogoTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.moveTo(128, 55);
  ctx.lineTo(185, 90);
  ctx.lineTo(185, 166);
  ctx.lineTo(128, 201);
  ctx.lineTo(71, 166);
  ctx.lineTo(71, 90);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 46px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GAN', 128, 130);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const logoTexture = createGanLogoTexture();

// --- Colors & Materials (Stickerless GAN Style) ---
const FACE_COLORS = {
  R: 0xef4444, // Red
  L: 0xf97316, // Orange
  U: 0xfacc15, // Yellow
  D: 0xffffff, // White
  F: 0x22c55e, // Green
  B: 0x3b82f6  // Blue
};

const materialMap = {
  R: new THREE.MeshStandardMaterial({ color: FACE_COLORS.R, roughness: 0.25, metalness: 0.05 }),
  L: new THREE.MeshStandardMaterial({ color: FACE_COLORS.L, roughness: 0.25, metalness: 0.05 }),
  U: new THREE.MeshStandardMaterial({ color: FACE_COLORS.U, roughness: 0.25, metalness: 0.05 }),
  D: new THREE.MeshStandardMaterial({ color: FACE_COLORS.D, roughness: 0.25, metalness: 0.05 }),
  F: new THREE.MeshStandardMaterial({ color: FACE_COLORS.F, roughness: 0.25, metalness: 0.05 }),
  B: new THREE.MeshStandardMaterial({ color: FACE_COLORS.B, roughness: 0.25, metalness: 0.05 }),
  D_LOGO: new THREE.MeshStandardMaterial({ map: logoTexture, roughness: 0.25, metalness: 0.05 }),
  BLACK: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.75, metalness: 0.05 })
};

// --- Cube Construction ---
const CUBE_SIZE = 0.96;
const GAP = 1.02;
const TILE_THICKNESS = 0.04;
const CORNER_RADIUS = 0.12;

const cubeGroup = new THREE.Group();
scene.add(cubeGroup);

let cubies = [];
let interactiveTiles = [];

// Low-poly rounded rectangle tile geometry (optimized curveSegments to cut polygon count by 75%)
function createRoundedTileGeometry(w, h, r) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  const extrudeSettings = {
    depth: TILE_THICKNESS,
    curveSegments: 3, // Highly optimized: reduces vertex count drastically
    bevelEnabled: true,
    bevelSegments: 1,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02
  };
  return new THREE.ExtrudeGeometry(shape, extrudeSettings);
}

const tileGeometry = createRoundedTileGeometry(0.84, 0.84, CORNER_RADIUS);
tileGeometry.center();

const innerBoxGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);

function buildCube() {
  while (cubeGroup.children.length > 0) {
    cubeGroup.remove(cubeGroup.children[0]);
  }
  cubies = [];
  interactiveTiles = [];

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        // Skip hidden central core cubie (0,0,0) for performance
        if (x === 0 && y === 0 && z === 0) continue;

        const cubie = new THREE.Group();
        cubie.position.set(x * GAP, y * GAP, z * GAP);
        cubie.userData = { initialPos: new THREE.Vector3(x, y, z) };

        const coreMesh = new THREE.Mesh(innerBoxGeometry, materialMap.BLACK);
        cubie.add(coreMesh);

        const faces = [
          { dir: new THREE.Vector3(1, 0, 0), mat: materialMap.R, rot: [0, Math.PI / 2, 0] },
          { dir: new THREE.Vector3(-1, 0, 0), mat: materialMap.L, rot: [0, -Math.PI / 2, 0] },
          { dir: new THREE.Vector3(0, 1, 0), mat: materialMap.U, rot: [-Math.PI / 2, 0, 0] },
          { dir: new THREE.Vector3(0, -1, 0), mat: (x === 0 && z === 0) ? materialMap.D_LOGO : materialMap.D, rot: [Math.PI / 2, 0, 0] },
          { dir: new THREE.Vector3(0, 0, 1), mat: materialMap.F, rot: [0, 0, 0] },
          { dir: new THREE.Vector3(0, 0, -1), mat: materialMap.B, rot: [0, Math.PI, 0] }
        ];

        faces.forEach(f => {
          const isExposed = (f.dir.x !== 0 && f.dir.x === x) ||
                            (f.dir.y !== 0 && f.dir.y === y) ||
                            (f.dir.z !== 0 && f.dir.z === z);

          if (isExposed) {
            const tile = new THREE.Mesh(tileGeometry, f.mat);
            tile.position.copy(f.dir).multiplyScalar(CUBE_SIZE / 2 + 0.01);
            tile.rotation.set(...f.rot);
            tile.userData = {
              isTile: true,
              faceNormal: f.dir.clone(),
              cubie: cubie
            };
            cubie.add(tile);
            interactiveTiles.push(tile);
          }
        });

        cubeGroup.add(cubie);
        cubies.push(cubie);
      }
    }
  }

  requestRender();
}

buildCube();

// --- Rotation & Game State ---
let isRotating = false;
let moveCount = 0;
let moveHistory = [];
let timerInterval = null;
let secondsElapsed = 0;
let isTimerRunning = false;
let isPrimeToggle = false;
let isDoubleToggle = false;

function updateStatsUI() {
  document.getElementById('move-counter').innerHTML = `Movimentos: <strong>${moveCount}</strong>`;
}

function startTimer() {
  if (isTimerRunning) return;
  isTimerRunning = true;
  timerInterval = setInterval(() => {
    secondsElapsed++;
    const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
    const secs = String(secondsElapsed % 60).padStart(2, '0');
    document.getElementById('timer').innerHTML = `Tempo: <strong>${mins}:${secs}</strong>`;
  }, 1000);
}

function resetTimer() {
  clearInterval(timerInterval);
  isTimerRunning = false;
  secondsElapsed = 0;
  document.getElementById('timer').innerHTML = `Tempo: <strong>00:00</strong>`;
}

// --- Unified Slice & Rotation Engine ---
// Supports: single slice (-1, 0, 1), slice ranges, or whole-cube rotations [-1, 0, 1]
function rotateSlice(axis, slices, angle, duration = 180, recordHistory = true) {
  if (isRotating && recordHistory) return Promise.resolve();
  isRotating = true;

  if (recordHistory && moveCount === 0) {
    startTimer();
  }

  const sliceArray = Array.isArray(slices) ? slices : [slices];

  return new Promise(resolve => {
    // Select cubies in target slices
    const sliceCubies = cubies.filter(c =>
      sliceArray.some(val => Math.abs(c.position[axis] - val * GAP) < 0.2)
    );

    const pivot = new THREE.Group();
    scene.add(pivot);

    sliceCubies.forEach(c => pivot.attach(c));

    const startTime = performance.now();

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      pivot.rotation[axis] = angle * ease;

      // Direct render during animation frame: high FPS without multiple competing rAF loops
      renderer.render(scene, camera);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        pivot.rotation[axis] = angle;
        pivot.updateMatrixWorld(true);

        const halfPi = Math.PI / 2;
        sliceCubies.forEach(c => {
          cubeGroup.attach(c);
          c.position.x = Math.round(c.position.x / GAP) * GAP;
          c.position.y = Math.round(c.position.y / GAP) * GAP;
          c.position.z = Math.round(c.position.z / GAP) * GAP;

          c.rotation.x = Math.round(c.rotation.x / halfPi) * halfPi;
          c.rotation.y = Math.round(c.rotation.y / halfPi) * halfPi;
          c.rotation.z = Math.round(c.rotation.z / halfPi) * halfPi;
          c.updateMatrixWorld(true);
        });

        scene.remove(pivot);
        isRotating = false;

        if (recordHistory) {
          moveCount++;
          moveHistory.push({ axis, slices: sliceArray, angle });
          updateStatsUI();
        }

        // Render clean final frame and sleep
        requestRender();
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}

// --- Complete Rubik's Cube Movement Definitions (WCA Standard) ---
const MOVE_DEFINITIONS = {
  // Outer Faces
  U: { axis: 'y', slices: [1], defaultDir: -1, name: 'U (Superior)' },
  D: { axis: 'y', slices: [-1], defaultDir: 1, name: 'D (Inferior)' },
  L: { axis: 'x', slices: [-1], defaultDir: 1, name: 'L (Esquerda)' },
  R: { axis: 'x', slices: [1], defaultDir: -1, name: 'R (Direita)' },
  F: { axis: 'z', slices: [1], defaultDir: -1, name: 'F (Frontal)' },
  B: { axis: 'z', slices: [-1], defaultDir: 1, name: 'B (Traseira)' },

  // Middle Slices
  M: { axis: 'x', slices: [0], defaultDir: 1, name: 'M (Meio - igual a L)' },
  E: { axis: 'y', slices: [0], defaultDir: 1, name: 'E (Equador - igual a D)' },
  S: { axis: 'z', slices: [0], defaultDir: -1, name: 'S (Em pé - igual a F)' },

  // Whole Cube Rotations
  X: { axis: 'x', slices: [-1, 0, 1], defaultDir: -1, name: 'X (Giro Cubo R)' },
  Y: { axis: 'y', slices: [-1, 0, 1], defaultDir: -1, name: 'Y (Giro Cubo U)' },
  Z: { axis: 'z', slices: [-1, 0, 1], defaultDir: -1, name: 'Z (Giro Cubo F)' }
};

// Execute any standard move
function executeMove(moveKey, isPrime = false, isDouble = false) {
  if (isRotating) return Promise.resolve();
  // Prevent tilting whole cube when view is locked with Yellow top / White bottom
  if (isViewLocked && (moveKey === 'X' || moveKey === 'Z')) {
    return Promise.resolve();
  }
  const config = MOVE_DEFINITIONS[moveKey];
  if (!config) return Promise.resolve();

  let dirMultiplier = isPrime ? -1 : 1;
  let angle = (Math.PI / 2) * config.defaultDir * dirMultiplier;
  if (isDouble) {
    angle *= 2;
  }

  const duration = isDouble ? 240 : 180;
  return rotateSlice(config.axis, config.slices, angle, duration, true);
}

// --- Drag-to-Rotate Interaction (Direct 3D Piece Gesture) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let dragStartPointer = null;
let selectedCubie = null;
let selectedNormal = null;
let selectedHitPoint = null;
let isDraggingFace = false;

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (isRotating) return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  // Optimized raycasting against exposed interactive tiles only
  const intersects = raycaster.intersectObjects(interactiveTiles, false);

  if (intersects.length > 0) {
    const hit = intersects[0];
    const tile = hit.object;
    selectedCubie = tile.userData.cubie;

    // Calculate exact outward face normal in world coordinates
    const worldNormal = tile.userData.faceNormal.clone().applyQuaternion(selectedCubie.quaternion).normalize();
    selectedNormal = new THREE.Vector3(
      Math.round(worldNormal.x),
      Math.round(worldNormal.y),
      Math.round(worldNormal.z)
    );

    selectedHitPoint = hit.point.clone();
    dragStartPointer = { x: e.clientX, y: e.clientY };
    controls.enabled = false;
    try {
      renderer.domElement.setPointerCapture(e.pointerId);
    } catch (_) {}
  }
});

renderer.domElement.addEventListener('pointermove', (e) => {
  if (!dragStartPointer || isDraggingFace || isRotating || !selectedCubie || !selectedNormal) return;

  const dx = e.clientX - dragStartPointer.x;
  const dy = e.clientY - dragStartPointer.y;
  const distance = Math.hypot(dx, dy);

  if (distance > 12) {
    isDraggingFace = true;
    const dragDir = new THREE.Vector2(dx, dy).normalize();

    const candidateAxes = ['x', 'y', 'z'];
    let bestAxis = null;
    let maxDot = -Infinity;
    let chosenAngle = Math.PI / 2;

    candidateAxes.forEach(axisStr => {
      const axisVector = new THREE.Vector3();
      axisVector[axisStr] = 1;

      // Only evaluate rotation axes perpendicular to the clicked face normal
      if (Math.abs(axisVector.dot(selectedNormal)) < 0.1) {
        // Tangent 3D direction that the face moves when rotated around axisVector
        const tangent3D = new THREE.Vector3().crossVectors(axisVector, selectedNormal).normalize();

        const p1 = selectedHitPoint.clone().project(camera);
        const p2 = selectedHitPoint.clone().add(tangent3D).project(camera);

        const screenTangent = new THREE.Vector2(
          (p2.x - p1.x) * (window.innerWidth / 2),
          -(p2.y - p1.y) * (window.innerHeight / 2)
        );

        const dot = dragDir.dot(screenTangent.normalize());
        if (Math.abs(dot) > maxDot) {
          maxDot = Math.abs(dot);
          bestAxis = axisStr;
          // In Three.js coordinates, dot > 0 corresponds to positive rotation
          chosenAngle = dot > 0 ? Math.PI / 2 : -Math.PI / 2;
        }
      }
    });

    if (bestAxis) {
      const sliceVal = Math.round(selectedCubie.position[bestAxis] / GAP);
      rotateSlice(bestAxis, [sliceVal], chosenAngle);
    }

    dragStartPointer = null;
  }
});

const endPointer = (e) => {
  if (e && e.pointerId) {
    try {
      renderer.domElement.releasePointerCapture(e.pointerId);
    } catch (_) {}
  }
  dragStartPointer = null;
  selectedCubie = null;
  selectedNormal = null;
  selectedHitPoint = null;
  isDraggingFace = false;
  controls.enabled = true;
};

renderer.domElement.addEventListener('pointerup', endPointer);
renderer.domElement.addEventListener('pointercancel', endPointer);

// --- Face & Movement Buttons UI Controls ---
document.querySelectorAll('.btn-face, .btn-slice, .btn-rot').forEach(btn => {
  btn.addEventListener('click', () => {
    const moveKey = btn.dataset.move;
    if (moveKey) {
      executeMove(moveKey, isPrimeToggle, isDoubleToggle);
    }
  });
});

const dirToggleBtn = document.getElementById('btn-dir-toggle');
if (dirToggleBtn) {
  dirToggleBtn.addEventListener('click', () => {
    isPrimeToggle = !isPrimeToggle;
    dirToggleBtn.classList.toggle('active', isPrimeToggle);
  });
}

const doubleToggleBtn = document.getElementById('btn-double-toggle');
if (doubleToggleBtn) {
  doubleToggleBtn.addEventListener('click', () => {
    isDoubleToggle = !isDoubleToggle;
    doubleToggleBtn.classList.toggle('active', isDoubleToggle);
  });
}

// --- Invert Mouse Control ---
let isMouseInverted = true;
const invertMouseBtn = document.getElementById('btn-invert-mouse');
if (invertMouseBtn) {
  invertMouseBtn.addEventListener('click', () => {
    isMouseInverted = !isMouseInverted;
    controls.rotateSpeed = isMouseInverted ? -1.0 : 1.0;
    invertMouseBtn.classList.toggle('active', isMouseInverted);
    invertMouseBtn.title = isMouseInverted
      ? 'Modo Mouse: Natural / Invertido Ativo (⇄)'
      : 'Modo Mouse: Órbita Padrão (⇄)';
  });
}

// --- View Lock: White Center Down, Yellow Center Up (Lateral movements only) ---
let isViewLocked = false;
const LOCKED_POLAR_ANGLE = 1.08; // ~62 deg elevation looking cleanly onto Yellow top face and front/sides

// Ensures the physical cube is oriented with White at -Y (down) and Yellow at +Y (up)
async function alignCubeCenters() {
  const whiteCenter = cubies.find(c =>
    c.userData.initialPos.x === 0 &&
    c.userData.initialPos.y === -1 &&
    c.userData.initialPos.z === 0
  );
  if (!whiteCenter) return;

  const wx = Math.round(whiteCenter.position.x / GAP);
  const wy = Math.round(whiteCenter.position.y / GAP);
  const wz = Math.round(whiteCenter.position.z / GAP);

  if (wy === -1) return; // Already at the bottom

  if (wy === 1) {
    // White is at top, flip 180 deg around X
    await rotateSlice('x', [-1, 0, 1], Math.PI, 160, false);
  } else if (wz === 1) {
    // White is at front (+Z), rotate around X by Math.PI / 2
    await rotateSlice('x', [-1, 0, 1], Math.PI / 2, 160, false);
  } else if (wz === -1) {
    // White is at back (-Z), rotate around X by -Math.PI / 2
    await rotateSlice('x', [-1, 0, 1], -Math.PI / 2, 160, false);
  } else if (wx === 1) {
    // White is at right (+X), rotate around Z by -Math.PI / 2
    await rotateSlice('z', [-1, 0, 1], -Math.PI / 2, 160, false);
  } else if (wx === -1) {
    // White is at left (-X), rotate around Z by Math.PI / 2
    await rotateSlice('z', [-1, 0, 1], Math.PI / 2, 160, false);
  }
}

async function toggleViewLock() {
  isViewLocked = !isViewLocked;
  const lockBtn = document.getElementById('btn-lock-view');

  if (lockBtn) {
    lockBtn.classList.toggle('active', isViewLocked);
    const textSpan = lockBtn.querySelector('.btn-text');
    if (textSpan) {
      textSpan.textContent = isViewLocked ? 'Destravar Visão' : 'Travar Visão';
    }
    lockBtn.title = isViewLocked
      ? 'Visão travada: Centro branco para baixo (apenas giros laterais). Clique para destravar.'
      : 'Travar visão: Amarelo no topo e Branco na base (permite apenas giros laterais) [Tecla T]';
  }

  if (isViewLocked) {
    // Realign physical cube if needed so White is strictly bottom and Yellow strictly top
    await alignCubeCenters();

    // Smoothly animate camera polar angle to LOCKED_POLAR_ANGLE (~62 deg)
    const offset = new THREE.Vector3().copy(camera.position).sub(controls.target);
    const startPhi = Math.acos(Math.max(-1, Math.min(1, offset.y / offset.length())));
    const startTime = performance.now();
    const duration = 240;

    function stepLock(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentPhi = startPhi + (LOCKED_POLAR_ANGLE - startPhi) * ease;

      controls.minPolarAngle = currentPhi;
      controls.maxPolarAngle = currentPhi;
      controls.update();
      renderer.render(scene, camera);

      if (progress < 1) {
        requestAnimationFrame(stepLock);
      } else {
        controls.minPolarAngle = LOCKED_POLAR_ANGLE;
        controls.maxPolarAngle = LOCKED_POLAR_ANGLE;
        controls.update();
        requestRender();
      }
    }
    requestAnimationFrame(stepLock);
  } else {
    // Unlock vertical pitch rotation completely
    controls.minPolarAngle = 0.05;
    controls.maxPolarAngle = Math.PI - 0.05;
    requestRender();
  }
}

// --- Keyboard Controls (WCA Notation & Modifiers) ---
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  const key = e.key.toUpperCase();
  if (MOVE_DEFINITIONS[key]) {
    e.preventDefault();
    const isPrime = e.shiftKey || isPrimeToggle;
    executeMove(key, isPrime, isDoubleToggle);

    // Provide visual feedback on corresponding button
    const btn = document.querySelector(`[data-move="${key}"]`);
    if (btn) {
      btn.style.transform = 'scale(0.92)';
      setTimeout(() => { btn.style.transform = ''; }, 120);
    }
  } else if (e.code === 'KeyT') {
    e.preventDefault();
    toggleViewLock();
  } else if (e.code === 'Space') {
    e.preventDefault();
    scrambleCube();
  } else if (e.code === 'Escape') {
    e.preventDefault();
    resetCube();
  }
});

// --- Action Buttons (Scramble, Solve, Reset, Lock View) ---
async function scrambleCube() {
  if (isRotating) return;

  const moveKeys = ['U', 'D', 'L', 'R', 'F', 'B'];
  const dirs = [false, true];

  for (let i = 0; i < 20; i++) {
    const key = moveKeys[Math.floor(Math.random() * moveKeys.length)];
    const isPrime = dirs[Math.floor(Math.random() * 2)];
    const isDouble = Math.random() < 0.25;
    await executeMove(key, isPrime, isDouble);
  }
}

async function solveCube() {
  if (isRotating || moveHistory.length === 0) return;

  const historyCopy = [...moveHistory];
  for (let i = historyCopy.length - 1; i >= 0; i--) {
    const move = historyCopy[i];
    await rotateSlice(move.axis, move.slices, -move.angle, 70, false);
  }

  moveHistory = [];
  moveCount = 0;
  updateStatsUI();
  resetTimer();
}

function resetCube() {
  if (isRotating) return;
  buildCube();
  moveHistory = [];
  moveCount = 0;
  updateStatsUI();
  resetTimer();

  if (isViewLocked) {
    controls.minPolarAngle = LOCKED_POLAR_ANGLE;
    controls.maxPolarAngle = LOCKED_POLAR_ANGLE;
  }
}

const lockViewBtn = document.getElementById('btn-lock-view');
if (lockViewBtn) {
  lockViewBtn.addEventListener('click', toggleViewLock);
}

document.getElementById('btn-scramble').addEventListener('click', scrambleCube);
document.getElementById('btn-solve').addEventListener('click', solveCube);
document.getElementById('btn-reset').addEventListener('click', resetCube);

// --- Window Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  requestRender();
});

// Initial render call
requestRender();
