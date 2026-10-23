import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- Configuração da Cena ---
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0d111a');

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(7.5, 6.2, 8.5);

// Renderizador WebGL otimizado com limite de proporção de pixel
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.getElementById('app').appendChild(renderer.domElement);

// --- Controles de Órbita ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.12;
controls.enablePan = false;
controls.minDistance = 4;
controls.maxDistance = 18;
controls.target.set(0, 0, 0);
controls.rotateSpeed = -1.0; // Movimento natural do mouse: arrastar para direita = girar para direita

// --- Motor de Renderização sob Demanda (0% de CPU quando ocioso) ---
let renderRequested = false;

function render() {
  renderRequested = false;

  // controls.update() retorna true apenas se a câmera estiver em movimento devido ao amortecimento/inércia
  const controlsMoving = controls.update();
  renderer.render(scene, camera);

  // Continua solicitando quadros apenas enquanto os controles estiverem se movendo ativamente
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

// Solicita renderização ao girar a órbita ou usar o zoom da câmera
controls.addEventListener('change', requestRender);

// Pausa a renderização completamente quando a página/aba for ocultada
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) requestRender();
});

// --- Iluminação ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
mainLight.position.set(8, 12, 10);
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.4);
fillLight.position.set(-8, -6, -8);
scene.add(fillLight);

// --- Textura do Logo GAN ---
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

// --- Cores e Materiais (Estilo GAN Stickerless) ---
// Esquema padrão BOY: Branco abaixo (-Y), Amarelo no topo (+Y), Vermelho (+X), Laranja (-X),
// Verde na face frontal (+Z) e Azul na face traseira (-Z).
// Com Branco abaixo (-Y) e Vermelho (+X), ao olhar para o Vermelho, o Verde (+Z) fica à sua DIREITA!
const FACE_COLORS = {
  R: 0xef4444, // Vermelho (+X)
  L: 0xf97316, // Laranja (-X)
  U: 0xfacc15, // Amarelo (+Y)
  D: 0xffffff, // Branco (-Y)
  F: 0x3b82f6, // Azul (+Z)
  B: 0x22c55e  // Verde (-Z)
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

// --- Construção do Cubo ---
const CUBE_SIZE = 0.96;
const GAP = 1.02;
const TILE_THICKNESS = 0.04;
const CORNER_RADIUS = 0.12;

const cubeGroup = new THREE.Group();
scene.add(cubeGroup);

let cubies = [];
let interactiveTiles = [];

// Geometria de azulejo arredondado (curvas otimizadas para reduzir contagem de polígonos)
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
    curveSegments: 3, // Otimizado: reduz drasticamente a contagem de vértices
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
  if (typeof currentAnimFrameId !== 'undefined' && currentAnimFrameId) {
    cancelAnimationFrame(currentAnimFrameId);
    currentAnimFrameId = null;
  }
  if (typeof activePivot !== 'undefined' && activePivot) {
    while (activePivot.children.length > 0) {
      activePivot.remove(activePivot.children[0]);
    }
    scene.remove(activePivot);
    activePivot = null;
  }
  while (cubeGroup.children.length > 0) {
    cubeGroup.remove(cubeGroup.children[0]);
  }
  cubies = [];
  interactiveTiles = [];

  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        // Pula o cubo central interno invisível (0,0,0) por desempenho
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

// --- Estado do Jogo e Estatísticas ---
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

// --- Quantização Matemática e Estabilização dos Cubinhos (À Prova de Drift) ---
function snapBasisVector(v) {
  const ax = Math.abs(v.x);
  const ay = Math.abs(v.y);
  const az = Math.abs(v.z);
  if (ax >= ay && ax >= az) {
    return new THREE.Vector3(Math.sign(v.x) || 1, 0, 0);
  } else if (ay >= ax && ay >= az) {
    return new THREE.Vector3(0, Math.sign(v.y) || 1, 0);
  } else {
    return new THREE.Vector3(0, 0, Math.sign(v.z) || 1);
  }
}

// Projeta e quantiza a orientação exata na base ortonormal discreta da simetria do cubo
function snapCubieOrientation(c) {
  const m = new THREE.Matrix4().makeRotationFromQuaternion(c.quaternion);
  const e = m.elements;
  const vx = new THREE.Vector3(e[0], e[1], e[2]);
  const vy = new THREE.Vector3(e[4], e[5], e[6]);

  const sx = snapBasisVector(vx);
  vy.sub(sx.clone().multiplyScalar(vy.dot(sx)));
  const sy = snapBasisVector(vy);
  const sz = new THREE.Vector3().crossVectors(sx, sy);

  const snappedMatrix = new THREE.Matrix4().makeBasis(sx, sy, sz);
  c.quaternion.setFromRotationMatrix(snappedMatrix);
  c.rotation.setFromQuaternion(c.quaternion);
}

// Garante que todos os 26 cubinhos estejam fixados corretamente ao cubeGroup com coordenadas perfeitas
function stabilizeAllCubies() {
  if (activePivot) {
    while (activePivot.children.length > 0) {
      cubeGroup.attach(activePivot.children[0]);
    }
    scene.remove(activePivot);
    activePivot = null;
  }

  cubies.forEach(c => {
    if (c.parent !== cubeGroup) {
      cubeGroup.attach(c);
    }
    c.position.x = Math.round(c.position.x / GAP) * GAP;
    c.position.y = Math.round(c.position.y / GAP) * GAP;
    c.position.z = Math.round(c.position.z / GAP) * GAP;
    snapCubieOrientation(c);
    c.updateMatrixWorld(true);
  });
}

// --- Fila Segura de Movimentos (FIFO Move Queue com Duração Adaptativa) ---
let moveQueue = [];
let isProcessingQueue = false;
let activePivot = null;
let currentAnimFrameId = null;
let isScrambling = false;
let isSolving = false;
let isTogglingLock = false;

function enqueueMove(moveData) {
  // Limite preventivo para evitar acúmulo excessivo de comandos caso teclas sejam 'espancadas'
  if (moveQueue.length > 30 && !moveData.force) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    moveQueue.push({ ...moveData, resolve });
    processMoveQueue();
  });
}

async function processMoveQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    while (moveQueue.length > 0) {
      const task = moveQueue.shift();

      // Ajuste de velocidade adaptativo: se houver movimentos acumulados, acelera para resposta instantânea
      let duration = task.duration;
      if (duration === undefined) {
        if (moveQueue.length > 6) {
          duration = 40;
        } else if (moveQueue.length > 2) {
          duration = 75;
        } else if (moveQueue.length > 0) {
          duration = 110;
        } else {
          duration = 160;
        }
      }

      await rotateSliceAsync(task.axis, task.slices, task.angle, duration, task.recordHistory, task.isAlignment);
      if (task.resolve) task.resolve();
    }
  } catch (err) {
    console.error('Erro na rotação do cubo:', err);
    stabilizeAllCubies();
  } finally {
    isProcessingQueue = false;
  }
}

// Execução assíncrona e estritamente atômica de uma rotação
function rotateSliceAsync(axis, slices, angle, targetDuration = 160, recordHistory = true, isAlignment = false) {
  return new Promise(resolve => {
    stabilizeAllCubies();

    if (recordHistory && moveCount === 0 && !isAlignment) {
      startTimer();
    }

    const sliceArray = Array.isArray(slices) ? slices : [slices];
    const targetSet = new Set(sliceArray);

    // Seleção robusta por coordenada de grade inteira (independente de erros de ponto flutuante)
    const sliceCubies = cubies.filter(c => {
      const gridVal = Math.round(c.position[axis] / GAP);
      return targetSet.has(gridVal);
    });

    if (sliceCubies.length === 0) {
      resolve();
      return;
    }

    const pivot = new THREE.Group();
    pivot.userData = { isPivot: true };
    activePivot = pivot;
    scene.add(pivot);

    sliceCubies.forEach(c => pivot.attach(c));

    const startTime = performance.now();
    const duration = Math.max(25, targetDuration);

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      pivot.rotation[axis] = angle * ease;
      renderer.render(scene, camera);

      if (progress < 1) {
        currentAnimFrameId = requestAnimationFrame(animate);
      } else {
        currentAnimFrameId = null;
        pivot.rotation[axis] = angle;
        pivot.updateMatrixWorld(true);

        sliceCubies.forEach(c => {
          cubeGroup.attach(c);
          c.position.x = Math.round(c.position.x / GAP) * GAP;
          c.position.y = Math.round(c.position.y / GAP) * GAP;
          c.position.z = Math.round(c.position.z / GAP) * GAP;
          snapCubieOrientation(c);
          c.updateMatrixWorld(true);
        });

        scene.remove(pivot);
        activePivot = null;

        if (recordHistory) {
          if (!isAlignment) {
            moveCount++;
            updateStatsUI();
          }
          moveHistory.push({ axis, slices: sliceArray, angle });
        }

        requestRender();
        resolve();
      }
    }

    currentAnimFrameId = requestAnimationFrame(animate);
  });
}

// Wrapper retrocompatível para chamadas diretas
function rotateSlice(axis, slices, angle, duration = 160, recordHistory = true) {
  return enqueueMove({
    axis,
    slices: Array.isArray(slices) ? slices : [slices],
    angle,
    duration,
    recordHistory
  });
}

// --- Definições Completas de Movimentos do Cubo Mágico (Padrão WCA) ---
const MOVE_DEFINITIONS = {
  // Faces Externas
  U: { axis: 'y', slices: [1], defaultDir: -1, name: 'U (Superior)' },
  D: { axis: 'y', slices: [-1], defaultDir: 1, name: 'D (Inferior)' },
  L: { axis: 'x', slices: [-1], defaultDir: 1, name: 'L (Esquerda)' },
  R: { axis: 'x', slices: [1], defaultDir: -1, name: 'R (Direita)' },
  F: { axis: 'z', slices: [1], defaultDir: -1, name: 'F (Frontal)' },
  B: { axis: 'z', slices: [-1], defaultDir: 1, name: 'B (Traseira)' },

  // Fatias do Meio
  M: { axis: 'x', slices: [0], defaultDir: 1, name: 'M (Meio - segue L)' },
  E: { axis: 'y', slices: [0], defaultDir: 1, name: 'E (Equador - segue D)' },
  S: { axis: 'z', slices: [0], defaultDir: -1, name: 'S (Em pé - segue F)' },

  // Rotações do Cubo Inteiro
  X: { axis: 'x', slices: [-1, 0, 1], defaultDir: -1, name: 'X (Giro Cubo R)' },
  Y: { axis: 'y', slices: [-1, 0, 1], defaultDir: -1, name: 'Y (Giro Cubo U)' },
  Z: { axis: 'z', slices: [-1, 0, 1], defaultDir: -1, name: 'Z (Giro Cubo F)' }
};

// Executa qualquer movimento padrão através da fila
function executeMove(moveKey, isPrime = false, isDouble = false) {
  // Evita inclinar o cubo todo caso a visão esteja travada com Amarelo no topo / Branco na base
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

  const duration = isDouble ? 220 : undefined;
  return enqueueMove({
    axis: config.axis,
    slices: config.slices,
    angle: angle,
    duration: duration,
    recordHistory: true
  });
}

// --- Interação de Arrastar para Girar (Gesto Direto nas Peças 3D) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let dragStartPointer = null;
let selectedCubie = null;
let selectedNormal = null;
let selectedHitPoint = null;
let isDraggingFace = false;

renderer.domElement.addEventListener('pointerdown', (e) => {
  if (isProcessingQueue || activePivot || moveQueue.length > 0) return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(interactiveTiles, false);

  if (intersects.length > 0) {
    const hit = intersects[0];
    const tile = hit.object;
    selectedCubie = tile.userData.cubie;

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
  if (!dragStartPointer || isDraggingFace || isProcessingQueue || activePivot || !selectedCubie || !selectedNormal) return;

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

      if (Math.abs(axisVector.dot(selectedNormal)) < 0.1) {
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
          chosenAngle = dot > 0 ? Math.PI / 2 : -Math.PI / 2;
        }
      }
    });

    if (bestAxis) {
      const sliceVal = Math.round(selectedCubie.position[bestAxis] / GAP);
      enqueueMove({
        axis: bestAxis,
        slices: [sliceVal],
        angle: chosenAngle,
        duration: 160,
        recordHistory: true
      });
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

// --- Controles de Interface: Botões de Faces e Movimentos ---
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

// --- Controle de Inversão de Arraste do Mouse ---
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

// --- Trava de Visão: Centro Branco para Baixo, Amarelo para Cima ---
let isViewLocked = false;
const LOCKED_POLAR_ANGLE = 1.08;

// Garante que o cubo físico seja alinhado com o centro Branco em -Y (baixo) e Amarelo em +Y (cima)
async function alignCubeCenters() {
  while (moveQueue.length > 0 || isProcessingQueue) {
    await new Promise(r => setTimeout(r, 20));
  }
  stabilizeAllCubies();

  const whiteCenter = cubies.find(c =>
    c.userData.initialPos.x === 0 &&
    c.userData.initialPos.y === -1 &&
    c.userData.initialPos.z === 0
  );
  if (!whiteCenter) return;

  const wx = Math.round(whiteCenter.position.x / GAP);
  const wy = Math.round(whiteCenter.position.y / GAP);
  const wz = Math.round(whiteCenter.position.z / GAP);

  if (wy === -1) return; // Já está na parte inferior

  let alignMove = null;
  if (wy === 1) {
    alignMove = { axis: 'x', slices: [-1, 0, 1], angle: Math.PI, duration: 150, recordHistory: true, isAlignment: true };
  } else if (wz === 1) {
    alignMove = { axis: 'x', slices: [-1, 0, 1], angle: Math.PI / 2, duration: 150, recordHistory: true, isAlignment: true };
  } else if (wz === -1) {
    alignMove = { axis: 'x', slices: [-1, 0, 1], angle: -Math.PI / 2, duration: 150, recordHistory: true, isAlignment: true };
  } else if (wx === 1) {
    alignMove = { axis: 'z', slices: [-1, 0, 1], angle: -Math.PI / 2, duration: 150, recordHistory: true, isAlignment: true };
  } else if (wx === -1) {
    alignMove = { axis: 'z', slices: [-1, 0, 1], angle: Math.PI / 2, duration: 150, recordHistory: true, isAlignment: true };
  }

  if (alignMove) {
    await enqueueMove({ ...alignMove, force: true });
  }
}

async function toggleViewLock() {
  if (isTogglingLock) return;
  isTogglingLock = true;

  try {
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
      await alignCubeCenters();

      const offset = new THREE.Vector3().copy(camera.position).sub(controls.target);
      const startPhi = Math.acos(Math.max(-1, Math.min(1, offset.y / offset.length())));
      const startTime = performance.now();
      const duration = 240;

      await new Promise(resolve => {
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
            resolve();
          }
        }
        requestAnimationFrame(stepLock);
      });
    } else {
      controls.minPolarAngle = 0.05;
      controls.maxPolarAngle = Math.PI - 0.05;
      requestRender();
    }
  } finally {
    isTogglingLock = false;
  }
}

// --- Controles de Teclado (Notação WCA e Modificadores) ---
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.repeat) return; // Ignora repetição automática para evitar enfileiramento descontrolado

  const key = e.key.toUpperCase();
  if (MOVE_DEFINITIONS[key]) {
    e.preventDefault();
    const isPrime = e.shiftKey || isPrimeToggle;
    executeMove(key, isPrime, isDoubleToggle);

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

// --- Botões de Ação (Embaralhar, Resolver, Reiniciar, Travar Visão) ---
async function scrambleCube() {
  if (isScrambling || isSolving) return;
  isScrambling = true;

  if (currentAnimFrameId) {
    cancelAnimationFrame(currentAnimFrameId);
    currentAnimFrameId = null;
  }
  moveQueue = [];
  stabilizeAllCubies();

  const moveKeys = ['U', 'D', 'L', 'R', 'F', 'B'];
  const dirs = [false, true];

  const scramblePromises = [];
  for (let i = 0; i < 20; i++) {
    const key = moveKeys[Math.floor(Math.random() * moveKeys.length)];
    const isPrime = dirs[Math.floor(Math.random() * 2)];
    const isDouble = Math.random() < 0.25;

    const config = MOVE_DEFINITIONS[key];
    const dirMultiplier = isPrime ? -1 : 1;
    let angle = (Math.PI / 2) * config.defaultDir * dirMultiplier;
    if (isDouble) angle *= 2;

    scramblePromises.push(
      enqueueMove({
        axis: config.axis,
        slices: config.slices,
        angle: angle,
        duration: 45,
        recordHistory: true,
        force: true
      })
    );
  }

  await Promise.all(scramblePromises);
  isScrambling = false;
}

async function solveCube() {
  if (isSolving || isScrambling || moveHistory.length === 0) return;
  isSolving = true;

  while (moveQueue.length > 0 || isProcessingQueue) {
    await new Promise(r => setTimeout(r, 20));
  }
  stabilizeAllCubies();

  const historyCopy = [...moveHistory];
  moveHistory = [];
  moveCount = 0;
  updateStatsUI();
  resetTimer();

  const solvePromises = [];
  for (let i = historyCopy.length - 1; i >= 0; i--) {
    const move = historyCopy[i];
    solvePromises.push(
      enqueueMove({
        axis: move.axis,
        slices: move.slices,
        angle: -move.angle,
        duration: 50,
        recordHistory: false,
        force: true
      })
    );
  }

  await Promise.all(solvePromises);
  isSolving = false;
}

function resetCube() {
  if (currentAnimFrameId) {
    cancelAnimationFrame(currentAnimFrameId);
    currentAnimFrameId = null;
  }

  moveQueue = [];
  isProcessingQueue = false;
  isScrambling = false;
  isSolving = false;
  isTogglingLock = false;

  stabilizeAllCubies();
  buildCube();

  moveHistory = [];
  moveCount = 0;
  updateStatsUI();
  resetTimer();

  if (isViewLocked) {
    controls.minPolarAngle = LOCKED_POLAR_ANGLE;
    controls.maxPolarAngle = LOCKED_POLAR_ANGLE;
  }
  requestRender();
}

const lockViewBtn = document.getElementById('btn-lock-view');
if (lockViewBtn) {
  lockViewBtn.addEventListener('click', toggleViewLock);
}

document.getElementById('btn-scramble').addEventListener('click', scrambleCube);
document.getElementById('btn-solve').addEventListener('click', solveCube);
document.getElementById('btn-reset').addEventListener('click', resetCube);

// --- Redimensionamento da Janela ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  requestRender();
});

// Chamada de renderização inicial
requestRender();
