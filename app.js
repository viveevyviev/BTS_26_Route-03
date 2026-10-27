import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- State & Calibrated Default Parameters ---
const PARAMS = {
  // Screenshot 1: Tiered Scales Per Wheel
  scale_w0: 0.85,            // Inner Wheel Base Scale
  scale_w1: 0.55,            // Middle Wheel Base Scale
  scale_w2: 0.3,             // Outer Wheel Base Scale

  // Screenshot 2: Rear Apex Convergence & Ring Depth
  apexConvergence: 0.58,     // Apex Convergence Pinch
  ringDepthZ: 80.0,          // Ring Depth Span (Z-Depth)
  apexTargetY: 50.0,         // Apex Vertical Height Target

  // Screenshot 3: Lateral Wheel Positions
  wheel0_x: 36.5,            // Inner Wheel Lateral X
  wheel1_x: 60.0,            // Middle Wheel Lateral X
  wheel2_x: 80.0,            // Outer Wheel Lateral X

  // Screenshot 4: Card Spacing & Center Focus Mechanics
  cardSpacingAlongWheel: 57.0,// Ring Height (Vertical Radius)
  centerPopBoost: 3.88,      // Center Card Focus Boost
  cardsPerWheel: 35,         // Cards Quantity Per Wheel
  cornerRadius: 0.48,        // Corner Radius (Roundness)

  // Card Plate Dimensions
  cardBaseSize: 2.1,
  cardDepth: 0.02,

  // Motion & Speed
  scrollDirection: 'down',
  speedMode: 'equal',
  baseSpeed: 0.22,
  animSpeed: 1.0,
  play: true,

  // Opacity & Fade
  frontOpacity: 1.0,
  rearFadeMin: 0.16,

  // Export & Background
  videoFPS: 30,
  videoDuration: 5,
  exportFormat: 'png',
  bgColor: '#f5f7fa',
  bgMode: 'solid'
};

// --- Three.js Setup ---
const canvasContainer = document.getElementById('canvas-root');
const scene = new THREE.Scene();
scene.background = new THREE.Color(PARAMS.bgColor);

// Camera placed at Z = 92 to frame the full scene cleanly
const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 3000);
camera.position.set(0, 0, 220);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1.3;
canvasContainer.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.45);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
dirLight.position.set(20, 45, 45);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.radius = 3;
scene.add(dirLight);

// --- Full-Bleed Card Geometry (No Bevel, Zero Border) ---
function createFullBleedCardGeometry(size, depth, radius, segments = 8) {
  const shape = new THREE.Shape();
  const half = size / 2;
  const r = Math.min(radius, half - 0.01);

  shape.moveTo(-half + r, -half);
  shape.lineTo(half - r, -half);
  shape.quadraticCurveTo(half, -half, half, -half + r);
  shape.lineTo(half, half - r);
  shape.quadraticCurveTo(half, half, half - r, half);
  shape.lineTo(-half + r, half);
  shape.quadraticCurveTo(-half, half, -half, half - r);
  shape.lineTo(-half, -half + r);
  shape.quadraticCurveTo(-half, -half, -half + r, -half);

  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(depth, 0.005),
    bevelEnabled: false,
    steps: 1
  });
  geom.center();

  const pos = geom.attributes.position;
  const uvs = geom.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const u = THREE.MathUtils.clamp((x + half) / size, 0.0, 1.0);
    const v = THREE.MathUtils.clamp((y + half) / size, 0.0, 1.0);
    uvs.setXY(i, u, v);
  }
  uvs.needsUpdate = true;
  return geom;
}

const darkSideMaterial = new THREE.MeshStandardMaterial({
  color: 0x18181b,
  roughness: 0.5,
  metalness: 0.1
});

// --- Center-Crop 1:1 Texture Processor ---
function createCenterCropTexture(img) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1024, 1024);

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const minSide = Math.min(w, h);
  const sx = (w - minSide) / 2;
  const sy = (h - minSide) / 2;
  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, 1024, 1024);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

function createProceduralPlaceholder(type, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (type === 'infra') {
    ctx.fillStyle = seed % 2 === 0 ? '#c8d7e5' : '#b8c9d9';
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.strokeStyle = '#275270'; ctx.lineWidth = 140;
    ctx.beginPath(); ctx.arc(820, 180, 500, Math.PI * 0.5, Math.PI); ctx.stroke();
  } else if (type === 'human') {
    ctx.fillStyle = seed % 2 === 0 ? '#d6dee5' : '#c9d3dc';
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.strokeStyle = '#3d4f5d'; ctx.lineWidth = 42;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(512, 512);
      ctx.lineTo(Math.cos(i * 1.25 + seed) * 600 + 512, Math.sin(i * 1.25 + seed) * 600 + 512);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = seed % 2 === 0 ? '#e9edf2' : '#dfe5ec';
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.strokeStyle = '#7c8e9f'; ctx.lineWidth = 14;
    for (let x = 120; x < 960; x += 120) ctx.strokeRect(x, 200, 80, 600);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

const defaultGalleries = {
  infra: [createProceduralPlaceholder('infra', 0), createProceduralPlaceholder('infra', 1), createProceduralPlaceholder('infra', 2)],
  human: [createProceduralPlaceholder('human', 0), createProceduralPlaceholder('human', 1), createProceduralPlaceholder('human', 2)],
  data:  [createProceduralPlaceholder('data', 0),  createProceduralPlaceholder('data', 1),  createProceduralPlaceholder('data', 2)]
};
const customGalleries = { infra: [], human: [], data: [] };

function getCategoryTextures(key) {
  return customGalleries[key].length > 0 ? customGalleries[key] : defaultGalleries[key];
}

function getShuffledIndex(cardIndex, totalImages, seedOffset) {
  return (cardIndex * 3 + seedOffset) % totalImages;
}

// --- Position Calculation with Apex Convergence (Constant Smooth Flow) ---
function getConicalFunnelPosition(theta, side, wheelIndex, ry, rz) {
  let baseHubX = PARAMS.wheel0_x;
  if (wheelIndex === 1) baseHubX = PARAMS.wheel1_x;
  else if (wheelIndex === 2) baseHubX = PARAMS.wheel2_x;

  const u = (1 - Math.cos(theta)) * 0.5;
  const pinch = Math.pow(u, 1.25) * PARAMS.apexConvergence;

  const effectiveHubX = baseHubX * (1.0 - pinch);
  const x = side * effectiveHubX;

  const yLocal = ry * Math.sin(theta);
  const y = yLocal * (1.0 - pinch * 0.7) + PARAMS.apexTargetY * pinch * 0.7;

  const z = rz * Math.cos(theta);

  return { x, y, z, u };
}

// --- Scene Mesh Hierarchy ---
const carouselGroup = new THREE.Group();
scene.add(carouselGroup);

let allCardNodes = [];

function rebuildScene() {
  while (carouselGroup.children.length > 0) {
    const c = carouselGroup.children[0];
    if (c.geometry) c.geometry.dispose();
    carouselGroup.remove(c);
  }
  allCardNodes = [];

  const baseGeom = createFullBleedCardGeometry(
    PARAMS.cardBaseSize,
    PARAMS.cardDepth,
    PARAMS.cornerRadius
  );

  const wheelCategoryMap = ['infra', 'human', 'data'];
  const sides = [-1, 1]; // Left (-1) and Right (+1)

  sides.forEach((side, sideIdx) => {
    const sideSeed = sideIdx === 0 ? 0 : 5;

    for (let w = 0; w < 3; w++) {
      const wheelRatio = w / 2;
      const ry = PARAMS.cardSpacingAlongWheel * (0.92 + 0.16 * (1.0 - wheelRatio));
      const rz = PARAMS.ringDepthZ * (0.85 + 0.25 * (1.0 - wheelRatio));

      const catKey = wheelCategoryMap[w];
      const textureList = getCategoryTextures(catKey);

      for (let c = 0; c < PARAMS.cardsPerWheel; c++) {
        // Distribute cards uniformly along closed loop (zero overlapping wraps)
        const basePhase = (c / PARAMS.cardsPerWheel) * Math.PI * 2;

        const texIndex = getShuffledIndex(c, textureList.length, sideSeed + w * 2);
        const texture = textureList[texIndex];

        const frontMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: PARAMS.frontOpacity,
          map: texture
        });

        const materials = [frontMat, darkSideMaterial];
        const mesh = new THREE.Mesh(baseGeom, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        carouselGroup.add(mesh);

        const node = {
          mesh,
          frontMat,
          side,
          wheelIndex: w,
          ry,
          rz,
          phase: basePhase
        };

        allCardNodes.push(node);
      }
    }
  });
}

// --- Upload Pipeline ---
function setupDropGallery(key, dropZoneId, inputId, countId, thumbsId) {
  const dz = document.getElementById(dropZoneId);
  const inp = document.getElementById(inputId);
  const countSpan = document.getElementById(countId);
  const thumbsContainer = document.getElementById(thumbsId);

  dz.addEventListener('click', () => inp.click());
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.style.borderColor = '#3b82f6'; });
  dz.addEventListener('dragleave', () => { dz.style.borderColor = '#3f3f46'; });
  dz.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.style.borderColor = '#3f3f46';
    loadFiles(e.dataTransfer.files);
  });
  inp.addEventListener('change', (e) => loadFiles(e.target.files));

  function loadFiles(files) {
    const list = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (!list.length) return;

    list.forEach(file => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const tex = createCenterCropTexture(img);
        customGalleries[key].push(tex);

        const thumb = document.createElement('img');
        thumb.src = url;
        thumb.className = 'gallery-thumb';
        thumbsContainer.appendChild(thumb);

        countSpan.innerText = `${customGalleries[key].length} loaded`;
        rebuildScene();
      };
      img.src = url;
    });
  }
}

setupDropGallery('infra', 'dz-infra', 'inp-infra', 'count-infra', 'thumbs-infra');
setupDropGallery('human', 'dz-human', 'inp-human', 'count-human', 'thumbs-human');
setupDropGallery('data', 'dz-data', 'inp-data', 'count-data', 'thumbs-data');

// --- Two-Way Binding Helper ---
function linkInputAndSlider(sliderId, numInputId, paramKey, onChangeCallback = null) {
  const slider = document.getElementById(sliderId);
  const numInput = document.getElementById(numInputId);

  slider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    PARAMS[paramKey] = val;
    numInput.value = val;
    if (onChangeCallback) onChangeCallback(val);
  });

  numInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (isNaN(val)) return;

    if (val > parseFloat(slider.max)) slider.max = val * 1.25;
    if (val < parseFloat(slider.min)) slider.min = val * 0.75;

    slider.value = val;
    PARAMS[paramKey] = val;
    if (onChangeCallback) onChangeCallback(val);
  });
}

// Bind Sliders to Params with Calibrated Defaults
linkInputAndSlider('rng-card-spacing', 'num-card-spacing', 'cardSpacingAlongWheel', () => rebuildScene());
linkInputAndSlider('rng-center-pop', 'num-center-pop', 'centerPopBoost');
linkInputAndSlider('rng-cards-count', 'num-cards-count', 'cardsPerWheel', () => rebuildScene());
linkInputAndSlider('rng-corner-radius', 'num-corner-radius', 'cornerRadius', () => rebuildScene());

linkInputAndSlider('rng-apex-convergence', 'num-apex-convergence', 'apexConvergence');
linkInputAndSlider('rng-ring-depth', 'num-ring-depth', 'ringDepthZ', () => rebuildScene());
linkInputAndSlider('rng-apex-y', 'num-apex-y', 'apexTargetY');

linkInputAndSlider('rng-w0-x', 'num-w0-x', 'wheel0_x');
linkInputAndSlider('rng-w1-x', 'num-w1-x', 'wheel1_x');
linkInputAndSlider('rng-w2-x', 'num-w2-x', 'wheel2_x');

linkInputAndSlider('rng-scale-w0', 'num-scale-w0', 'scale_w0');
linkInputAndSlider('rng-scale-w1', 'num-scale-w1', 'scale_w1');
linkInputAndSlider('rng-scale-w2', 'num-scale-w2', 'scale_w2');

linkInputAndSlider('rng-anim-speed', 'num-anim-speed', 'animSpeed');

// Mode Toggles
const modeEqual = document.getElementById('mode-equal');
const modeStaggered = document.getElementById('mode-staggered');
modeEqual.addEventListener('click', () => {
  modeEqual.classList.add('active'); modeStaggered.classList.remove('active');
  PARAMS.speedMode = 'equal';
});
modeStaggered.addEventListener('click', () => {
  modeStaggered.classList.add('active'); modeEqual.classList.remove('active');
  PARAMS.speedMode = 'staggered';
});

const dirDown = document.getElementById('dir-down');
const dirUp = document.getElementById('dir-up');
dirDown.addEventListener('click', () => {
  dirDown.classList.add('active'); dirUp.classList.remove('active');
  PARAMS.scrollDirection = 'down';
});
dirUp.addEventListener('click', () => {
  dirUp.classList.add('active'); dirDown.classList.remove('active');
  PARAMS.scrollDirection = 'up';
});

const btnAnimPause = document.getElementById('btn-anim-pause');
const btnAnimPlay = document.getElementById('btn-anim-play');
btnAnimPause.addEventListener('click', () => {
  PARAMS.play = false;
  btnAnimPause.classList.add('active'); btnAnimPlay.classList.remove('active');
});
btnAnimPlay.addEventListener('click', () => {
  PARAMS.play = true;
  btnAnimPlay.classList.add('active'); btnAnimPause.classList.remove('active');
});

// Background Controls
const bgNone = document.getElementById('bg-none');
const bgSolid = document.getElementById('bg-solid');
const bgImage = document.getElementById('bg-image');
const bgColorPicker = document.getElementById('bg-color-picker');
const vpContainer = document.getElementById('viewport-container');

bgNone.addEventListener('click', () => {
  [bgNone, bgSolid, bgImage].forEach(b => b.classList.remove('active'));
  bgNone.classList.add('active');
  PARAMS.bgMode = 'none';
  scene.background = null;
  vpContainer.style.background = 'transparent';
});

bgSolid.addEventListener('click', () => {
  [bgNone, bgSolid, bgImage].forEach(b => b.classList.remove('active'));
  bgSolid.classList.add('active');
  PARAMS.bgMode = 'solid';
  scene.background = new THREE.Color(PARAMS.bgColor);
  vpContainer.style.background = PARAMS.bgColor;
});

bgImage.addEventListener('click', () => {
  [bgNone, bgSolid, bgImage].forEach(b => b.classList.remove('active'));
  bgImage.classList.add('active');
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = (e) => {
    if (e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      new THREE.TextureLoader().load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        scene.background = tex;
      });
    }
  };
  inp.click();
});

bgColorPicker.addEventListener('input', (e) => {
  PARAMS.bgColor = e.target.value;
  if (PARAMS.bgMode === 'solid') {
    scene.background = new THREE.Color(PARAMS.bgColor);
    vpContainer.style.background = PARAMS.bgColor;
  }
});

// Fullscreen ONLY Preview
document.getElementById('btn-fullscreen-preview').addEventListener('click', () => {
  if (!document.fullscreenElement) vpContainer.requestFullscreen();
  else document.exitFullscreen();
});

// Snapshot Export
const fmtPng = document.getElementById('fmt-png');
const fmtJpeg = document.getElementById('fmt-jpeg');
fmtPng.addEventListener('click', () => {
  fmtPng.classList.add('active'); fmtJpeg.classList.remove('active');
  PARAMS.exportFormat = 'png';
});
fmtJpeg.addEventListener('click', () => {
  fmtJpeg.classList.add('active'); fmtPng.classList.remove('active');
  PARAMS.exportFormat = 'jpeg';
});

document.getElementById('btn-export-image').addEventListener('click', () => {
  renderer.render(scene, camera);
  const mime = PARAMS.exportFormat === 'png' ? 'image/png' : 'image/jpeg';
  const a = document.createElement('a');
  a.href = renderer.domElement.toDataURL(mime, 0.95);
  a.download = `carousel-snap-${Date.now()}.${PARAMS.exportFormat}`;
  a.click();
});

// Video Export
const selFps = document.getElementById('sel-video-fps');
const rngDuration = document.getElementById('rng-video-duration');
const lblDuration = document.getElementById('lbl-video-duration');
const btnPerfectLoop = document.getElementById('btn-perfect-loop');

selFps.addEventListener('change', (e) => { PARAMS.videoFPS = parseInt(e.target.value); });
rngDuration.addEventListener('input', (e) => {
  PARAMS.videoDuration = parseInt(e.target.value);
  lblDuration.innerText = `${PARAMS.videoDuration}s`;
});

let isRecording = false;
btnPerfectLoop.addEventListener('click', () => {
  if (isRecording) return;
  startPerfectLoopRecording();
});

function startPerfectLoopRecording() {
  isRecording = true;
  btnPerfectLoop.classList.add('recording');
  btnPerfectLoop.innerText = `Recording Perfect Loop... (${PARAMS.videoDuration}s)`;

  const stream = renderer.domElement.captureStream(PARAMS.videoFPS);
  let mimeType = 'video/webm; codecs=vp9';
  let ext = 'webm';

  if (MediaRecorder.isTypeSupported('video/mp4; codecs="avc1.42E01E"')) {
    mimeType = 'video/mp4; codecs="avc1.42E01E"';
    ext = 'mp4';
  } else if (MediaRecorder.isTypeSupported('video/mp4')) {
    mimeType = 'video/mp4';
    ext = 'mp4';
  }

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: mimeType });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `carousel-perfect-loop-${Date.now()}.${ext}`;
    a.click();

    btnPerfectLoop.classList.remove('recording');
    btnPerfectLoop.innerText = 'Export Perfect Loop Video';
    isRecording = false;
  };

  recorder.start();
  let remaining = PARAMS.videoDuration;
  const t = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(t);
      recorder.stop();
    } else {
      btnPerfectLoop.innerText = `Recording (${remaining}s)...`;
    }
  }, 1000);
}

// Viewport Resize & Ratio
const selAspect = document.getElementById('sel-aspect');
const selZoom = document.getElementById('sel-zoom');

function updateViewportSize() {
  const wrapper = document.getElementById('viewport-wrapper');
  const w = wrapper.clientWidth;
  const h = wrapper.clientHeight;
  const aspectChoice = selAspect.value;
  const zoom = parseFloat(selZoom.value);

  let targetW = w * zoom;
  let targetH = h * zoom;

  if (aspectChoice === '16-9') {
    if (targetW / targetH > 16 / 9) targetW = targetH * (16 / 9);
    else targetH = targetW / (16 / 9);
  } else if (aspectChoice === '1-1') {
    const size = Math.min(targetW, targetH);
    targetW = size; targetH = size;
  } else if (aspectChoice === '4-5') {
    if (targetW / targetH > 4 / 5) targetW = targetH * (4 / 5);
    else targetH = targetW / (4 / 5);
  } else if (aspectChoice === '9-16') {
    if (targetW / targetH > 9 / 16) targetW = targetH * (9 / 16);
    else targetH = targetW / (9 / 16);
  }

  vpContainer.style.width = `${targetW}px`;
  vpContainer.style.height = `${targetH}px`;

  renderer.setSize(targetW, targetH);
  camera.aspect = targetW / targetH;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', updateViewportSize);
selAspect.addEventListener('change', updateViewportSize);
selZoom.addEventListener('change', updateViewportSize);

document.getElementById('btn-reset-cam').addEventListener('click', () => {
  camera.position.set(0, 0, 92);
  controls.target.set(0, 0, 0);
  controls.update();
});

// --- Continuous Animation Loop ---
rebuildScene();
updateViewportSize();

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (PARAMS.play) {
    const directionSign = (PARAMS.scrollDirection === 'down') ? 1.0 : -1.0;

    allCardNodes.forEach(item => {
      let wheelSpeedFactor = 1.0;
      if (PARAMS.speedMode === 'staggered') {
        const staggeredFactors = [1.05, 0.88, 0.72];
        wheelSpeedFactor = staggeredFactors[item.wheelIndex];
      }

      // 1. Advance phase smoothly without any artificial jumps or offsets
      item.phase += directionSign * delta * PARAMS.baseSpeed * PARAMS.animSpeed * wheelSpeedFactor * 0.8;
      if (item.phase > Math.PI * 2) item.phase -= Math.PI * 2;
      if (item.phase < 0) item.phase += Math.PI * 2;

      // 2. Pure, steady position along the conical funnel trajectory (NO teleporting)
      const { x, y, z, u } = getConicalFunnelPosition(
        item.phase,
        item.side,
        item.wheelIndex,
        item.ry,
        item.rz
      );
      item.mesh.position.set(x, y, z);

      // 3. Glitch-Free Continuous Gradual Equator Boost (Cosine Power Curve)
      // Math.cos(phase) peaks at front equator (phase = 0), drops to 0 at poles/back
      // Power of 14 creates a focused bell curve that smoothly swells and shrinks with zero jumps
      const frontCosine = Math.max(0, Math.cos(item.phase));
      const equatorProximity = Math.pow(frontCosine, 14);
      const gradualBoost = 1.0 + (PARAMS.centerPopBoost - 1.0) * equatorProximity;

      // 4. Calculate Final Scale
      const baseWheelScale = item.wheelIndex === 0 ? PARAMS.scale_w0 : (item.wheelIndex === 1 ? PARAMS.scale_w1 : PARAMS.scale_w2);
      const depthScaleFactor = THREE.MathUtils.lerp(1.15, 0.35, Math.pow(u, 1.1));
      const finalScale = baseWheelScale * depthScaleFactor * gradualBoost;
      item.mesh.scale.set(finalScale, finalScale, 1);

      // 5. Depth Fading for Rear Apex Cards
      if (z < 0) {
        const depthRatio = Math.min(Math.abs(z) / item.rz, 1.0);
        const fade = THREE.MathUtils.lerp(PARAMS.frontOpacity, PARAMS.rearFadeMin, depthRatio);
        item.frontMat.opacity = fade;
      } else {
        item.frontMat.opacity = PARAMS.frontOpacity;
      }

      // Billboard orientation (cards always face camera)
      item.mesh.quaternion.copy(camera.quaternion);
    });
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();
