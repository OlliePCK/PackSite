import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

let renderer;
let scene;
let camera;
let logoGroup;
let logoRadius = 1;

const canvas = document.getElementById('logo3d');

const targetRotation = new THREE.Vector2(0, 0);
const currentRotation = new THREE.Vector2(0, 0);
const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

// NOTE: The camera auto-fits to the logo bounds, so changing world-space scale alone won't
// change the on-screen size. Use fit padding (and a small Y offset) to balance layout.
const BASE_CAMERA_FIT_PADDING = 1.42;

if (!canvas) {
  // Only index.html has this canvas.
  console.debug('[logo3d] canvas not found, skipping');
} else {
  // Hide the SVG fallback immediately to prevent a flash during refresh.
  document.documentElement.classList.add('has-3d-logo');
  init().catch((err) => {
    console.error('[logo3d] init failed', err);
    document.documentElement.classList.remove('has-3d-logo');
    document.documentElement.classList.add('logo3d-failed');
  });
}

function getSafeArea() {
  const viewportH = Math.max(1, window.innerHeight || 1);
  const nav = document.querySelector('.navbar');
  const stats = document.querySelector('.home-stats');

  const navBottom = Math.min(
    viewportH,
    Math.max(0, nav?.getBoundingClientRect?.().bottom ?? 60),
  );
  const statsTop = Math.max(
    navBottom + 60,
    Math.min(viewportH, stats?.getBoundingClientRect?.().top ?? viewportH),
  );

  const heightPx = Math.max(1, statsTop - navBottom);
  const centerPx = navBottom + heightPx * 0.5;
  return { viewportH, navBottom, statsTop, heightPx, centerPx };
}

let layoutScheduled = false;
function scheduleLayout() {
  if (layoutScheduled) return;
  layoutScheduled = true;
  requestAnimationFrame(() => {
    layoutScheduled = false;
    applyHeroLayout();
  });
}

function setupLayoutObservers() {
  if (!('ResizeObserver' in window)) return;
  const stats = document.querySelector('.home-stats');
  if (!stats) return;
  const ro = new ResizeObserver(() => scheduleLayout());
  ro.observe(stats);
}

function applyHeroLayout() {
  if (!logoGroup || !camera) return;

  const safe = getSafeArea();
  fitCameraToRadius(camera, logoRadius, BASE_CAMERA_FIT_PADDING);

  // Align the logo with the visual center between navbar and stats widget.
  const targetNdcY = 1 - (2 * safe.centerPx) / safe.viewportH;
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const distance = camera.position.z;
  const yWorldAtZ0 = targetNdcY * distance * Math.tan(vFov / 2);
  logoGroup.position.y = yWorldAtZ0;

  if (prefersReducedMotion) renderOnce();
}

async function init() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.physicallyCorrectLights = true;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 30);

  const css = window.getComputedStyle(document.documentElement);
  const primaryHex = (css.getPropertyValue('--primary') || '#00a0da').trim();
  const iceHex = (css.getPropertyValue('--ice') || '#9fe8ff').trim();
  const hotHex = (css.getPropertyValue('--hot') || '#fe3c2f').trim();
  const bgDarkHex = (css.getPropertyValue('--bg-dark') || '#080c0f').trim();

  const primary = new THREE.Color(primaryHex);
  const ice = new THREE.Color(iceHex);
  const hot = new THREE.Color(hotHex);
  const bgDark = new THREE.Color(bgDarkHex);

  // Subtle environment for "neo-chrome" reflections without external HDRI assets.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  // Matte + reflective lighting (no harsh specular hotspots).
  scene.add(new THREE.HemisphereLight(primary, bgDark, 0.26));

  const key = new THREE.DirectionalLight(ice, 5.2);
  key.position.set(4.2, 3.4, 4.6);
  scene.add(key);

  const fill = new THREE.DirectionalLight(primary, 2.2);
  fill.position.set(-3.4, -2.2, 3.2);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(hot, 1.4);
  rim.position.set(-5.2, 2.6, -3.6);
  scene.add(rim);

  // Use the ExtrudeGeometry material groups:
  // - material[0] = caps (front/back)
  // - material[1] = sides (depth walls)
  const { normalMap, roughnessMap } = createBrushedMetalMaps(256);

  const logoMaterials = [
    new THREE.MeshPhysicalMaterial({
      color: bgDark.clone().lerp(primary, 0.10),
      roughness: 0.32,
      metalness: 1.0,
      clearcoat: 0.65,
      clearcoatRoughness: 0.30,
      envMapIntensity: 0.75,
      emissive: primary.clone(),
      emissiveIntensity: 0.06,
      normalMap,
      normalScale: new THREE.Vector2(0.35, 0.35),
      roughnessMap,
      anisotropy: 0.55,
      anisotropyRotation: Math.PI * 0.5,
      side: THREE.FrontSide,
    }),
    new THREE.MeshPhysicalMaterial({
      color: bgDark.clone().lerp(primary, 0.06),
      roughness: 0.62,
      metalness: 1.0,
      clearcoat: 0.15,
      clearcoatRoughness: 0.60,
      envMapIntensity: 0.45,
      emissive: primary.clone(),
      emissiveIntensity: 0.03,
      normalMap,
      normalScale: new THREE.Vector2(0.22, 0.22),
      roughnessMap,
      anisotropy: 0.30,
      anisotropyRotation: Math.PI * 0.5,
      side: THREE.FrontSide,
    }),
  ];

  const logoUrl = new URL('./img/pck.svg', import.meta.url);
  const svgData = await loadSVG(logoUrl.href);
  logoGroup = buildExtrudedLogo(svgData, logoMaterials);
  logoRadius = Number(logoGroup.userData?.radius) || 1;
  scene.add(logoGroup);

  applyHeroLayout();

  if (!prefersReducedMotion) addPointerEvents();
  resize();
  window.addEventListener('resize', resize);
  setupLayoutObservers();

  if (prefersReducedMotion) {
    renderOnce();
    return;
  }

  animate();
}

function loadSVG(url) {
  return new Promise((resolve, reject) => {
    const loader = new SVGLoader();
    loader.load(url, resolve, undefined, reject);
  });
}

function buildExtrudedLogo(svgData, materials) {
  const paths = svgData.paths || [];
  const baseGeometries = [];

  const extrudeSettings = {
    depth: 34,
    bevelEnabled: true,
    bevelThickness: 2.4,
    bevelSize: 1.7,
    bevelSegments: 12,
    curveSegments: 96,
    steps: 1,
  };

  const MIN_CONTOUR_AREA = 0.002; // filters tiny artifacts (e.g. stray dots) without killing logo details
  const DETAIL_SEGMENTS = 64;

  // Keep SVG holes (eyes/mouth/inner ears) so details exist as true cutouts.
  for (const path of paths) {
    const fill = path.userData?.style?.fill;
    const fillOpacityRaw = path.userData?.style?.fillOpacity;
    const fillOpacity = fillOpacityRaw === undefined ? 1 : Number.parseFloat(fillOpacityRaw);

    // Only extrude filled paths. This prevents helper paths (fill:none) from producing geometry.
    if (!fill || fill === 'none' || fillOpacity === 0) continue;

    const shapes = SVGLoader.createShapes(path);
    for (const shape of shapes) {
      const outlinePts = shape.getPoints(DETAIL_SEGMENTS);
      if (!outlinePts || outlinePts.length < 3) continue;
      const outlineArea = Math.abs(THREE.ShapeUtils.area(outlinePts));
      if (outlineArea < MIN_CONTOUR_AREA) continue;

      // Base: keep holes so we get the intended mouth/ear/eye cavities.
      baseGeometries.push(new THREE.ExtrudeGeometry(shape, extrudeSettings));
    }
  }

  if (baseGeometries.length === 0) {
    throw new Error('SVG produced no extrudable shapes (likely style/fill parsing issue).');
  }

  const merged = mergeGeometries(baseGeometries, false);
  for (const g of baseGeometries) g.dispose();

  merged.computeVertexNormals();
  ensurePlanarUVs(merged);

  // Center geometry and compute bounds for camera fit.
  merged.computeBoundingBox();
  const center = new THREE.Vector3();
  merged.boundingBox?.getCenter(center);
  const bboxSize = new THREE.Vector3();
  merged.boundingBox?.getSize(bboxSize);
  merged.translate(-center.x, -center.y, -center.z);
  merged.computeBoundingSphere();
  const radius = merged.boundingSphere?.radius ?? 1;

  const group = new THREE.Group();
  group.userData.radius = radius;
  group.userData.size = { x: bboxSize.x, y: bboxSize.y, z: bboxSize.z };
  group.userData.boundsY = { min: -bboxSize.y * 0.5, max: bboxSize.y * 0.5 };

  const baseMaterial = Array.isArray(materials) ? materials[0] : materials;
  const mesh = new THREE.Mesh(merged, baseMaterial);
  mesh.renderOrder = 0;
  group.add(mesh);

  // SVG Y+ points downward; flip once at the group level so geometry winding stays stable.
  group.scale.y = -1;

  return group;
}

function ensurePlanarUVs(geometry) {
  if (!geometry || geometry.attributes.uv) return;
  geometry.computeBoundingBox();
  const bbox = geometry.boundingBox;
  if (!bbox) return;

  const size = new THREE.Vector3();
  bbox.getSize(size);
  const invX = 1 / Math.max(1e-6, size.x);
  const invY = 1 / Math.max(1e-6, size.y);

  const pos = geometry.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = (pos.getX(i) - bbox.min.x) * invX;
    const y = (pos.getY(i) - bbox.min.y) * invY;
    uvs[i * 2 + 0] = x;
    uvs[i * 2 + 1] = y;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
}

function createBrushedMetalMaps(size) {
  const w = Math.max(8, size | 0);
  const h = w;

  const normalData = new Uint8Array(w * h * 3);
  const roughData = new Uint8Array(w * h);

  // Horizontal "brushed" streaks: low-frequency noise blurred along X.
  const base = new Float32Array(w * h);
  for (let i = 0; i < base.length; i++) base[i] = Math.random();

  const blur = 18;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = 0; k < blur; k++) {
        const xx = (x - k + w) % w;
        acc += base[row + xx];
      }
      const n = acc / blur; // 0..1

      // Roughness: mostly smooth with subtle streak variation.
      const rough = THREE.MathUtils.clamp(0.35 + (n - 0.5) * 0.22, 0.0, 1.0);
      roughData[row + x] = Math.round(rough * 255);

      // Normal: perturb X a bit to mimic microscratches.
      const nx = THREE.MathUtils.clamp(0.5 + (n - 0.5) * 0.16, 0.0, 1.0);
      const ny = 0.5;
      const nz = 1.0;
      const idx = (row + x) * 3;
      normalData[idx + 0] = Math.round(nx * 255);
      normalData[idx + 1] = Math.round(ny * 255);
      normalData[idx + 2] = Math.round(nz * 255);
    }
  }

  const normalMap = new THREE.DataTexture(normalData, w, h, THREE.RGBFormat);
  normalMap.colorSpace = THREE.NoColorSpace;
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(2, 2);
  normalMap.needsUpdate = true;

  const roughnessMap = new THREE.DataTexture(roughData, w, h, THREE.RedFormat);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 2);
  roughnessMap.needsUpdate = true;

  return { normalMap, roughnessMap };
}

function fitCameraToRadius(cam, radius, padding = 1.2) {
  const vFov = THREE.MathUtils.degToRad(cam.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (cam.aspect || 1));

  const safe = getSafeArea();
  const safeFactor = Math.min(2.75, safe.viewportH / Math.max(160, safe.heightPx));

  const vDistance = (radius * padding * safeFactor) / Math.tan(vFov / 2);
  const hDistance = (radius * padding) / Math.tan(hFov / 2);
  const distance = Math.max(vDistance, hDistance);

  cam.position.set(0, 0, distance);
  cam.near = Math.max(0.1, distance - radius * 3);
  cam.far = distance + radius * 8;
  cam.lookAt(0, 0, 0);
  cam.updateProjectionMatrix();
}

function addPointerEvents() {
  const wrap = canvas.parentElement;
  if (!wrap) return;

  wrap.addEventListener('pointermove', (e) => {
    const rect = wrap.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    targetRotation.set(ny * 0.35, nx * 0.45);
  });

  wrap.addEventListener('pointerleave', () => {
    targetRotation.set(0, 0);
  });
}

function resize() {
  const wrap = canvas.parentElement;
  const width = wrap?.clientWidth ?? 300;
  const height = wrap?.clientHeight ?? 300;

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  applyHeroLayout();
  camera.updateProjectionMatrix();
  if (prefersReducedMotion) renderOnce();
}

function animate() {
  requestAnimationFrame(animate);

  const seconds = performance.now() * 0.001;
  currentRotation.lerp(targetRotation, 0.06);

  if (logoGroup) {
    // Keep a constant spin around Y, but limit tilt so it doesn't linger upside-down/flat.
    const baseY = seconds * 0.18;
    const tilt = Math.sin(seconds * 0.35) * 0.22;
    logoGroup.rotation.order = 'YXZ';
    logoGroup.rotation.x = tilt + currentRotation.x;
    logoGroup.rotation.y = baseY + currentRotation.y;
    logoGroup.rotation.z = currentRotation.y * 0.10;
  }

  renderer.render(scene, camera);
}

function renderOnce() {
  if (!renderer || !scene || !camera) return;
  renderer.render(scene, camera);
}
