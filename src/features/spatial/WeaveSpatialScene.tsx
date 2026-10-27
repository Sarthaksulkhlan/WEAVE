import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Link } from 'react-router-dom';
import {
  Box,
  ChevronDown,
  ChevronUp,
  Compass,
  Eye,
  Layers,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sliders,
} from 'lucide-react';

// Pre-allocated scratch math helpers at module scope — zero GC inside requestAnimationFrame
const _vec3 = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export type CameraPresetKey = 'overview' | 'vault' | 'gateways' | 'blueprint';

interface CameraPreset {
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

const CAMERA_PRESETS: Record<CameraPresetKey, CameraPreset> = {
  overview: {
    label: 'Isometric Overview',
    position: [10.5, 8.2, 11.5],
    target: [0, 1.4, 0],
  },
  vault: {
    label: 'Ed25519 Attestation Vault',
    position: [4.2, 3.6, 4.8],
    target: [0, 1.9, 0],
  },
  gateways: {
    label: 'Institution Gateways',
    position: [-9.5, 5.4, 8.8],
    target: [-2.2, 1.0, 1.5],
  },
  blueprint: {
    label: 'Top Planimetric View',
    position: [0.01, 16.5, 0.01],
    target: [0, 0, 0],
  },
};

interface NodeTelemetry {
  id: string;
  title: string;
  subtitle: string;
  roleScope: string;
  metrics: string;
  statusLabel: string;
}

const NODE_TELEMETRY: Record<string, NodeTelemetry> = {
  'VAULT-CORE': {
    id: 'VAULT-CORE',
    title: 'WEAVE Deterministic Verification & Attestation Core',
    subtitle: 'Ruleset 2026.10.v1 · Ed25519 Signing Authority · SHA-256 Audit Chain',
    roleScope: 'Platform Trust Anchor (SIH26263)',
    metrics: '12/12 Audit Links Verified · 0 Unmasked APAAR Leaks',
    statusLabel: 'VERIFIED_ACTIVE',
  },
  'INST-KKR-101': {
    id: 'INST-KKR-101',
    title: 'NIT Kurukshetra (Synthetic Gateway)',
    subtitle: 'Batch BAT-2026-003 · 5 Synthetic Records · 449/480 Approved Intake',
    roleScope: 'Institution Tenant Node',
    metrics: '93.5% Capacity · 1 Open Cross-Inst Conflict',
    statusLabel: 'ACTIVE_INGESTION',
  },
  'INST-DEL-202': {
    id: 'INST-DEL-202',
    title: 'Indraprastha Institute of Engg & Tech (Synthetic)',
    subtitle: 'Batch BAT-2026-002 · 288/300 Approved Intake',
    roleScope: 'Institution Tenant Node',
    metrics: '96.0% Capacity · Counterpart Collision on ****-8472',
    statusLabel: 'REVIEW_QUEUED',
  },
  'INST-BOM-304': {
    id: 'INST-BOM-304',
    title: 'Western Regional College of Technology (Synthetic)',
    subtitle: 'Batch BAT-2026-001 · 219/240 Approved Intake',
    roleScope: 'Institution Tenant Node',
    metrics: '91.3% Capacity · All Deterministic Rules Passed',
    statusLabel: 'VERIFIED_ACTIVE',
  },
  'AICTE-REG-01': {
    id: 'AICTE-REG-01',
    title: 'AICTE Regulatory Adjudication & Cap Monitor',
    subtitle: 'Cross-Institution Conflict Queue · Sanctioned Program Registry',
    roleScope: 'Regulator Oversight Node',
    metrics: '1,020 Total Sanctioned Seats · 2 Conflict Candidates',
    statusLabel: 'OVERSIGHT_READY',
  },
};

function createCalibrationDialTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#F2F0E8';
  ctx.fillRect(0, 0, 1024, 1024);

  const cx = 512;
  const cy = 512;

  // Concentric technical rings
  ctx.strokeStyle = '#C9C7BC';
  ctx.lineWidth = 3;
  [470, 420, 340, 240, 140].forEach((r) => {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Precision degree ticks
  for (let i = 0; i < 72; i++) {
    const angle = (i / 72) * Math.PI * 2;
    const isMajor = i % 6 === 0;
    const rInner = isMajor ? 430 : 450;
    const rOuter = 470;
    ctx.strokeStyle = isMajor ? '#244C3A' : '#8C8F87';
    ctx.lineWidth = isMajor ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * rInner, cy + Math.sin(angle) * rInner);
    ctx.lineTo(cx + Math.cos(angle) * rOuter, cy + Math.sin(angle) * rOuter);
    ctx.stroke();
  }

  // Crosshair axes
  ctx.strokeStyle = '#D5D3C8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 470, cy);
  ctx.lineTo(cx + 470, cy);
  ctx.moveTo(cx, cy - 470);
  ctx.lineTo(cx, cy + 470);
  ctx.stroke();

  ctx.fillStyle = '#20241F';
  ctx.font = '600 24px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('WEAVE · SIH26263 · RULESET 2026.10.V1', cx, cy - 365);
  ctx.fillText('MASKED APAAR ****-****-XXXX · ED25519', cx, cy + 385);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
  grad.addColorStop(0, 'rgba(32, 36, 31, 0.42)');
  grad.addColorStop(0.55, 'rgba(32, 36, 31, 0.16)');
  grad.addColorStop(1, 'rgba(32, 36, 31, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createArchitectGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#F7F6F2';
  ctx.fillRect(0, 0, 512, 512);

  // Sub-grid
  ctx.strokeStyle = '#EAE8E0';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Primary border grid
  ctx.strokeStyle = '#DCDAD0';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 512, 512);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export interface WeaveSpatialSceneProps {
  embedded?: boolean;
}

export const WeaveSpatialScene: React.FC<WeaveSpatialSceneProps> = ({ embedded = false }) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);

  const [activePreset, setActivePreset] = useState<CameraPresetKey>('overview');
  const [explodedFactor, setExplodedFactor] = useState<number>(0);
  const [flowSpeed, setFlowSpeed] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('VAULT-CORE');

  // Mutable refs read inside the WebGL animation loop without re-creating scene
  const stateRef = useRef({
    explodedTarget: 0,
    explodedCurrent: 0,
    flowSpeed: 1,
    isPaused: false,
    presetKey: 'overview' as CameraPresetKey,
    transitionActive: false,
  });

  useEffect(() => {
    stateRef.current.explodedTarget = explodedFactor;
  }, [explodedFactor]);

  useEffect(() => {
    stateRef.current.flowSpeed = flowSpeed;
  }, [flowSpeed]);

  useEffect(() => {
    stateRef.current.isPaused = isPaused;
  }, [isPaused]);

  const handleSelectPreset = (key: CameraPresetKey) => {
    setActivePreset(key);
    stateRef.current.presetKey = key;
    stateRef.current.transitionActive = true;
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          setDockCollapsed((prev) => !prev);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // Respect prefers-reduced-motion by starting with gentle slow speed if requested
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      stateRef.current.flowSpeed = 0.25;
    }

    // 1. Detect Software WebGL (SwiftShader / llvmpipe / Basic Render) from renderer string
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 600;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7f6f2);
    scene.fog = new THREE.FogExp2(0xf7f6f2, 0.025);

    // 2. Studio Environment Map via RoomEnvironment + PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 120);
    camera.position.set(...CAMERA_PRESETS.overview.position);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...CAMERA_PRESETS.overview.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 3.2;
    controls.maxDistance = 26;
    controls.update();

    const onControlStart = () => {
      stateRef.current.transitionActive = false;
    };
    controls.addEventListener('start', onControlStart);

    // 3. Balanced 3-Point Studio Lighting Rig (Warm Key + Cool Hemisphere Fill + Rim)
    const hemiLight = new THREE.HemisphereLight(0xfcfbf7, 0xd8d5c8, 0.85);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff6e5, 1.65);
    keyLight.position.set(9, 14, 8);
    keyLight.castShadow = !isSoftwareGl;
    const d = 11;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 35;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xdce8e2, 0.75);
    rimLight.position.set(-10, 8, -9);
    scene.add(rimLight);

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const disposables: Array<{ dispose: () => void }> = [envTarget];

    // 4. Architectural Ground Plane + Radial Contact Shadow Helper
    const gridTex = createArchitectGridTexture(maxAnisotropy);
    disposables.push(gridTex);
    const groundGeo = new THREE.PlaneGeometry(48, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      map: gridTex,
      roughness: 0.92,
      metalness: 0.02,
    });
    disposables.push(groundGeo, groundMat);
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = 0;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const shadowTex = createContactShadowTexture();
    disposables.push(shadowTex);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.65,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    disposables.push(shadowMat);

    // 5. Shared PBR Material Palette (Varied Roughness & Metalness across adjacent parts)
    const stonePlinthMat = new THREE.MeshStandardMaterial({
      color: 0xe6e4dc,
      roughness: 0.86,
      metalness: 0.05,
    });
    const forestLacquerMat = new THREE.MeshPhysicalMaterial({
      color: 0x244c3a,
      roughness: 0.34,
      metalness: 0.25,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
    });
    const brushedBronzeMat = new THREE.MeshPhysicalMaterial({
      color: 0x9b7127,
      roughness: 0.22,
      metalness: 0.88,
      anisotropy: 0.6,
    });
    const brushedSteelMat = new THREE.MeshStandardMaterial({
      color: 0x4c5d67,
      roughness: 0.28,
      metalness: 0.82,
    });
    const emeraldCoreMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e563b,
      roughness: 0.14,
      metalness: 0.45,
      clearcoat: 0.9,
    });
    const ivoryCeramicMat = new THREE.MeshStandardMaterial({
      color: 0xfaf9f5,
      roughness: 0.58,
      metalness: 0.08,
    });
    const crystalDomeMat = new THREE.MeshPhysicalMaterial({
      color: 0xebf3ef,
      metalness: 0.0,
      roughness: 0.08,
      transmission: isSoftwareGl ? 0 : 0.9,
      transparent: true,
      opacity: isSoftwareGl ? 0.28 : 1.0,
      ior: 1.52,
      thickness: 0.6,
      depthWrite: false,
    });
    disposables.push(
      stonePlinthMat,
      forestLacquerMat,
      brushedBronzeMat,
      brushedSteelMat,
      emeraldCoreMat,
      ivoryCeramicMat,
      crystalDomeMat
    );

    const pickableProxies: THREE.Object3D[] = [];

    // =========================================================================
    // HERO SUBJECT: 9-Part Procedural Cryptographic Attestation Vault (`THREE.Group`)
    // Grounded flush at y = 0 with bottom-center pivot
    // =========================================================================
    const vaultGroup = new THREE.Group();
    vaultGroup.position.set(0, 0, 0);
    scene.add(vaultGroup);

    // Contact shadow beneath Vault
    const vaultShadowGeo = new THREE.PlaneGeometry(5.8, 5.8);
    disposables.push(vaultShadowGeo);
    const vaultShadow = new THREE.Mesh(vaultShadowGeo, shadowMat);
    vaultShadow.rotation.x = -Math.PI / 2;
    vaultShadow.position.y = 0.015;
    vaultGroup.add(vaultShadow);

    // Part 1: Stepped Octagonal Stone Plinth (Primary Silhouette)
    const plinthGeo = new THREE.CylinderGeometry(2.15, 2.35, 0.36, 8);
    plinthGeo.translate(0, 0.18, 0);
    disposables.push(plinthGeo);
    const plinthMesh = new THREE.Mesh(plinthGeo, stonePlinthMat);
    plinthMesh.castShadow = true;
    plinthMesh.receiveShadow = true;
    vaultGroup.add(plinthMesh);

    // Part 2: Lathe-Turned Brushed Bronze Collar Ring (Secondary Read)
    const lathePoints = [
      new THREE.Vector2(1.65, 0.36),
      new THREE.Vector2(1.98, 0.36),
      new THREE.Vector2(1.92, 0.54),
      new THREE.Vector2(1.72, 0.64),
      new THREE.Vector2(1.58, 0.64),
    ];
    const collarGeo = new THREE.LatheGeometry(lathePoints, 32);
    disposables.push(collarGeo);
    const collarMesh = new THREE.Mesh(collarGeo, brushedBronzeMat);
    collarMesh.castShadow = true;
    collarMesh.receiveShadow = true;
    vaultGroup.add(collarMesh);

    // Part 3: Precision Engraved Calibration Dial Plate
    const dialTex = createCalibrationDialTexture(maxAnisotropy);
    const dialMat = new THREE.MeshStandardMaterial({
      map: dialTex,
      roughness: 0.42,
      metalness: 0.15,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const dialGeo = new THREE.CylinderGeometry(1.56, 1.56, 0.08, 48);
    dialGeo.translate(0, 0.64, 0);
    disposables.push(dialTex, dialMat, dialGeo);
    const dialMesh = new THREE.Mesh(dialGeo, dialMat);
    dialMesh.receiveShadow = true;
    vaultGroup.add(dialMesh);

    // Part 4: Four Bevelled Architectural Buttress Pillars (`ExtrudeGeometry`)
    const pillarShape = new THREE.Shape();
    pillarShape.moveTo(-0.14, -0.22);
    pillarShape.lineTo(0.14, -0.22);
    pillarShape.lineTo(0.1, 0.22);
    pillarShape.lineTo(-0.1, 0.22);
    pillarShape.closePath();
    const pillarGeo = new THREE.ExtrudeGeometry(pillarShape, {
      depth: 1.55,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.025,
      bevelSegments: 2,
    });
    pillarGeo.rotateX(-Math.PI / 2);
    disposables.push(pillarGeo);

    const pillarsGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const pMesh = new THREE.Mesh(pillarGeo, forestLacquerMat);
      pMesh.position.set(Math.cos(angle) * 1.48, 0.62, Math.sin(angle) * 1.48);
      pMesh.rotation.y = -angle + Math.PI / 2;
      pMesh.castShadow = true;
      pillarsGroup.add(pMesh);
    }
    vaultGroup.add(pillarsGroup);

    // Part 5: Outer Deterministic Rule Gimbal Ring (`TorusGeometry`)
    const outerRingGeo = new THREE.TorusGeometry(1.12, 0.065, 20, 64);
    disposables.push(outerRingGeo);
    const outerRingMesh = new THREE.Mesh(outerRingGeo, brushedSteelMat);
    outerRingMesh.position.set(0, 1.85, 0);
    outerRingMesh.castShadow = true;
    vaultGroup.add(outerRingMesh);

    // Part 6: Inner SHA-256 Hash-Chain Gimbal Ring (`TorusGeometry`)
    const innerRingGeo = new THREE.TorusGeometry(0.84, 0.05, 18, 56);
    disposables.push(innerRingGeo);
    const innerRingMesh = new THREE.Mesh(innerRingGeo, brushedBronzeMat);
    innerRingMesh.position.set(0, 1.85, 0);
    innerRingMesh.castShadow = true;
    vaultGroup.add(innerRingMesh);

    // Part 7: Suspended Ed25519 Cryptographic Crystal Core (`OctahedronGeometry` + Equatorial Collar)
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 1.85, 0);
    const octaGeo = new THREE.OctahedronGeometry(0.46, 0);
    const coreBandGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.07, 8);
    disposables.push(octaGeo, coreBandGeo);
    const octaMesh = new THREE.Mesh(octaGeo, emeraldCoreMat);
    const coreBandMesh = new THREE.Mesh(coreBandGeo, brushedBronzeMat);
    octaMesh.castShadow = true;
    coreGroup.add(octaMesh, coreBandMesh);
    vaultGroup.add(coreGroup);

    // Part 8: Optical Protective Glass Canopy Dome (`SphereGeometry` Hemisphere)
    const domeGeo = new THREE.SphereGeometry(1.42, 36, 24, 0, Math.PI * 2, 0, Math.PI * 0.52);
    disposables.push(domeGeo);
    const domeMesh = new THREE.Mesh(domeGeo, crystalDomeMat);
    domeMesh.position.set(0, 1.55, 0);
    domeMesh.renderOrder = 5;
    vaultGroup.add(domeMesh);

    // Part 9: Upper Crown Ring & Finial Beacon (`LatheGeometry`)
    const crownPoints = [
      new THREE.Vector2(0.0, 0.45),
      new THREE.Vector2(0.18, 0.35),
      new THREE.Vector2(0.08, 0.15),
      new THREE.Vector2(0.32, 0.0),
      new THREE.Vector2(0.0, 0.0),
    ];
    const crownGeo = new THREE.LatheGeometry(crownPoints, 24);
    disposables.push(crownGeo);
    const crownMesh = new THREE.Mesh(crownGeo, brushedBronzeMat);
    crownMesh.position.set(0, 3.05, 0);
    crownMesh.castShadow = true;
    vaultGroup.add(crownMesh);

    // Invisible Raycast Proxy for Vault
    const vaultProxyGeo = new THREE.CylinderGeometry(2.1, 2.2, 3.5, 12);
    vaultProxyGeo.translate(0, 1.75, 0);
    const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
    disposables.push(vaultProxyGeo, proxyMat);
    const vaultProxy = new THREE.Mesh(vaultProxyGeo, proxyMat);
    vaultProxy.layers.set(1);
    vaultProxy.userData = { nodeId: 'VAULT-CORE' };
    vaultGroup.add(vaultProxy);
    pickableProxies.push(vaultProxy);

    // =========================================================================
    // FOUR SURROUNDING INSTITUTIONAL & REGULATORY STATIONS (6-Part `THREE.Group` each)
    // =========================================================================
    const stationSpecs = [
      { id: 'INST-KKR-101', pos: new THREE.Vector3(-5.2, 0, 3.8), color: 0x244c3a },
      { id: 'INST-DEL-202', pos: new THREE.Vector3(5.2, 0, 3.8), color: 0x8e6218 },
      { id: 'INST-BOM-304', pos: new THREE.Vector3(-5.2, 0, -3.8), color: 0x1e563b },
      { id: 'AICTE-REG-01', pos: new THREE.Vector3(5.2, 0, -3.8), color: 0x475863 },
    ];

    const stationBaseGeo = new THREE.CylinderGeometry(1.15, 1.28, 0.24, 6);
    stationBaseGeo.translate(0, 0.12, 0);
    const stationDeckGeo = new THREE.CylinderGeometry(0.88, 0.96, 0.18, 6);
    stationDeckGeo.translate(0, 0.33, 0);
    const stationColGeo = new THREE.BoxGeometry(0.18, 1.15, 0.18);
    stationColGeo.translate(0, 0.95, 0);
    const stationLintelGeo = new THREE.BoxGeometry(1.25, 0.16, 0.44);
    stationLintelGeo.translate(0, 1.58, 0);
    const stationRotorGeo = new THREE.TorusGeometry(0.42, 0.04, 14, 36);
    const stationBeaconGeo = new THREE.OctahedronGeometry(0.2, 0);
    const stationShadowGeo = new THREE.PlaneGeometry(3.2, 3.2);
    const stationProxyGeo = new THREE.CylinderGeometry(1.25, 1.25, 2.2, 8);
    stationProxyGeo.translate(0, 1.1, 0);

    disposables.push(
      stationBaseGeo,
      stationDeckGeo,
      stationColGeo,
      stationLintelGeo,
      stationRotorGeo,
      stationBeaconGeo,
      stationShadowGeo,
      stationProxyGeo
    );

    const stationRotors: THREE.Mesh[] = [];
    const stationLintelMeshes: THREE.Mesh[] = [];
    const conduitCurves: THREE.CatmullRomCurve3[] = [];

    stationSpecs.forEach((spec) => {
      const stGroup = new THREE.Group();
      stGroup.position.copy(spec.pos);
      stGroup.lookAt(0, 0, 0);
      scene.add(stGroup);

      // Contact shadow
      const stShadow = new THREE.Mesh(stationShadowGeo, shadowMat);
      stShadow.rotation.x = -Math.PI / 2;
      stShadow.position.y = 0.015;
      stGroup.add(stShadow);

      // Part 1: Hexagonal Plinth
      const baseMesh = new THREE.Mesh(stationBaseGeo, stonePlinthMat);
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;
      stGroup.add(baseMesh);

      // Part 2: Ceramic Upper Deck
      const deckMesh = new THREE.Mesh(stationDeckGeo, ivoryCeramicMat);
      deckMesh.castShadow = true;
      deckMesh.receiveShadow = true;
      stGroup.add(deckMesh);

      // Part 3 & 4: Twin Architectural Columns
      const colLeft = new THREE.Mesh(stationColGeo, brushedSteelMat);
      colLeft.position.x = -0.42;
      colLeft.castShadow = true;
      const colRight = new THREE.Mesh(stationColGeo, brushedSteelMat);
      colRight.position.x = 0.42;
      colRight.castShadow = true;
      stGroup.add(colLeft, colRight);

      // Part 5: Cantilevered Intake Lintel Cap
      const lintelMat = new THREE.MeshStandardMaterial({
        color: spec.color,
        roughness: 0.38,
        metalness: 0.3,
      });
      disposables.push(lintelMat);
      const lintelMesh = new THREE.Mesh(stationLintelGeo, lintelMat);
      lintelMesh.castShadow = true;
      stGroup.add(lintelMesh);
      stationLintelMeshes.push(lintelMesh);

      // Part 6: Rotating Telemetry Ring + Signal Octahedron
      const rotorMesh = new THREE.Mesh(stationRotorGeo, brushedBronzeMat);
      rotorMesh.position.set(0, 0.96, 0);
      stGroup.add(rotorMesh);
      stationRotors.push(rotorMesh);

      const beaconMesh = new THREE.Mesh(stationBeaconGeo, emeraldCoreMat);
      beaconMesh.position.set(0, 0.96, 0);
      stGroup.add(beaconMesh);

      // Raycast proxy
      const stProxy = new THREE.Mesh(stationProxyGeo, proxyMat);
      stProxy.layers.set(1);
      stProxy.userData = { nodeId: spec.id };
      stGroup.add(stProxy);
      pickableProxies.push(stProxy);

      // Woven Verification Conduit (`TubeGeometry` along `CatmullRomCurve3`)
      const midPoint = spec.pos.clone().multiplyScalar(0.52);
      midPoint.y = 1.45;
      const startPoint = spec.pos.clone().setY(0.95);
      const endPoint = new THREE.Vector3(
        Math.sign(spec.pos.x) * 1.15,
        1.75,
        Math.sign(spec.pos.z) * 1.15
      );
      const curve = new THREE.CatmullRomCurve3([startPoint, midPoint, endPoint]);
      conduitCurves.push(curve);

      const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.032, 8, false);
      disposables.push(tubeGeo);
      const tubeMesh = new THREE.Mesh(tubeGeo, brushedBronzeMat);
      tubeMesh.castShadow = true;
      scene.add(tubeMesh);
    });

    // =========================================================================
    // INSTANCED MESH: 36 Deterministic Record Packets Flowing Along Conduits
    // =========================================================================
    const packetCount = 36;
    const packetGeo = new THREE.BoxGeometry(0.22, 0.09, 0.32);
    const packetMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.45,
    });
    disposables.push(packetGeo, packetMat);

    const packetsInstanced = new THREE.InstancedMesh(packetGeo, packetMat, packetCount);
    packetsInstanced.castShadow = !isSoftwareGl;
    packetsInstanced.frustumCulled = false;

    const paletteHex = [0x1e563b, 0x244c3a, 0x8e6218, 0x475863];
    for (let i = 0; i < packetCount; i++) {
      _color.setHex(paletteHex[i % paletteHex.length]);
      packetsInstanced.setColorAt(i, _color);
      _dummy.position.set(0, 1, 0);
      _dummy.updateMatrix();
      packetsInstanced.setMatrixAt(i, _dummy.matrix);
    }
    if (packetsInstanced.instanceColor) {
      packetsInstanced.instanceColor.needsUpdate = true;
    }
    packetsInstanced.instanceMatrix.needsUpdate = true;
    packetsInstanced.computeBoundingSphere();
    scene.add(packetsInstanced);

    // Pre-warm shaders on hardware GPUs
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting on Layer 1 for Interactive Node Inspection
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const mouse = new THREE.Vector2();

    const onPointerDown = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(pickableProxies, false);
      if (hits.length > 0 && hits[0].object.userData?.nodeId) {
        setSelectedNodeId(hits[0].object.userData.nodeId);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    };
    window.addEventListener('resize', handleResize);

    // Software-WebGL Safe Animation Loop (`afterDraw` with WebGL2 fenceSync)
    let frameId = 0;
    let isDisposed = false;
    const clock = new THREE.Clock();
    let elapsedSim = 0;

    function afterDraw(cb: () => void) {
      if (isDisposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (sync && state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (isDisposed) return;
      const dt = Math.min(clock.getDelta(), 0.1);
      const st = stateRef.current;

      if (!st.isPaused) {
        elapsedSim += dt * st.flowSpeed;
      }

      // 1. Exponential damping for Exploded View Assembly separation
      st.explodedCurrent = THREE.MathUtils.damp(
        st.explodedCurrent,
        st.explodedTarget,
        6.5,
        dt
      );
      const exp = st.explodedCurrent;

      // Apply exploded view vertical offsets smoothly
      dialMesh.position.y = exp * 0.35;
      pillarsGroup.position.y = exp * 0.55;
      outerRingMesh.position.y = 1.85 + exp * 0.95;
      innerRingMesh.position.y = 1.85 + exp * 1.25;
      coreGroup.position.y = 1.85 + exp * 1.65 + Math.sin(elapsedSim * 1.8) * 0.05;
      domeMesh.position.y = 1.55 + exp * 2.35;
      crownMesh.position.y = 3.05 + exp * 2.85;

      for (let i = 0; i < stationLintelMeshes.length; i++) {
        stationLintelMeshes[i].position.y = exp * 0.5;
      }

      // 2. Smooth mechanical rotation of gimbals and cryptographic core
      outerRingMesh.rotation.y = elapsedSim * 0.45;
      outerRingMesh.rotation.x = Math.sin(elapsedSim * 0.6) * 0.35;
      innerRingMesh.rotation.y = -elapsedSim * 0.72;
      innerRingMesh.rotation.z = Math.cos(elapsedSim * 0.5) * 0.42;
      coreGroup.rotation.y = elapsedSim * 0.9;

      for (let i = 0; i < stationRotors.length; i++) {
        stationRotors[i].rotation.z = elapsedSim * 0.8 + i;
        stationRotors[i].rotation.y = Math.sin(elapsedSim * 0.5 + i) * 0.4;
      }

      // 3. Update 36 InstancedMesh Record Packets along the 4 CatmullRomCurve3 Conduits
      for (let i = 0; i < packetCount; i++) {
        const curveIdx = i % conduitCurves.length;
        const curve = conduitCurves[curveIdx];
        const progress = ((i / packetCount) + elapsedSim * 0.16) % 1;
        curve.getPointAt(progress, _vec3);
        curve.getTangentAt(progress, _tangent);

        _dummy.position.copy(_vec3);
        _dummy.position.y += Math.sin(progress * Math.PI) * 0.12;
        _mat4.lookAt(_vec3, _vec3.clone().add(_tangent), _up);
        _quat.setFromRotationMatrix(_mat4);
        _dummy.quaternion.copy(_quat);
        const pulseScale = 0.85 + Math.sin(progress * Math.PI) * 0.25;
        _dummy.scale.setScalar(pulseScale);
        _dummy.updateMatrix();
        packetsInstanced.setMatrixAt(i, _dummy.matrix);
      }
      packetsInstanced.instanceMatrix.needsUpdate = true;

      // 4. Smooth Damped Camera Preset Transitions
      if (st.transitionActive) {
        const preset = CAMERA_PRESETS[st.presetKey];
        _targetPos.set(...preset.position);
        _targetLook.set(...preset.target);

        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetPos.x, 5.5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetPos.y, 5.5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetPos.z, 5.5, dt);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLook.x, 5.5, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLook.y, 5.5, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLook.z, 5.5, dt);

        if (
          camera.position.distanceToSquared(_targetPos) < 0.01 &&
          controls.target.distanceToSquared(_targetLook) < 0.01
        ) {
          st.transitionActive = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      controls.removeEventListener('start', onControlStart);
      controls.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    };
  }, []);

  const activeNode = NODE_TELEMETRY[selectedNodeId] || NODE_TELEMETRY['VAULT-CORE'];

  return (
    <div
      className={`relative overflow-hidden bg-[#F7F6F2] select-none ${
        embedded ? 'w-full h-[540px] rounded border border-[#DEDDD5]' : 'w-screen h-screen'
      }`}
    >
      {/* Isolated WebGL Mount Container */}
      <div
        ref={canvasMountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        aria-label="Interactive 3D WEAVE Cryptographic Attestation & Institutional Topology"
      />

      {/* Minimal Top-Left Specification & Selected Node Telemetry Header */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-start justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto bg-[#FFFFFF] border border-[#DEDDD5] rounded px-4 py-3 shadow-xs max-w-md">
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#244C3A] font-semibold">
              3D SPATIAL VERIFICATION TOPOLOGY · {activeNode.id}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EAF2EE] text-[#1E563B] border border-[#1E563B]/20">
              {activeNode.statusLabel}
            </span>
          </div>
          <h2 className="text-sm font-semibold text-[#20241F] leading-snug">{activeNode.title}</h2>
          <p className="text-xs text-[#686B65] mt-0.5">{activeNode.subtitle}</p>
          <div className="mt-2 pt-2 border-t border-[#F0EFE9] flex items-center justify-between text-[11px] font-mono text-[#20241F]">
            <span>{activeNode.metrics}</span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          {embedded ? (
            <Link
              to="/app/topology"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#FFFFFF] text-[#20241F] border border-[#DEDDD5] rounded hover:border-[#244C3A] transition-colors shadow-xs"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#244C3A]" /> Fullscreen 3D Inspector
            </Link>
          ) : (
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#244C3A] text-white rounded hover:bg-[#193B2C] transition-colors shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Return to Workspace
            </Link>
          )}
        </div>
      </div>

      {/* Unified Collapsible Bottom Control Dock (Zero Side-Panel Clutter, No Backdrop-Filter over WebGL) */}
      <div
        className="absolute inset-x-0 mx-auto bottom-4 z-20 w-[min(920px,94vw)] transition-transform duration-300"
        style={{
          transform: dockCollapsed ? 'translateY(calc(100% - 34px))' : 'translateY(0)',
        }}
      >
        <div className="flex justify-center mb-1">
          <button
            type="button"
            onClick={() => setDockCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono bg-[#FFFFFF] text-[#20241F] border border-[#DEDDD5] rounded-t shadow-xs hover:bg-[#F0EFE9] transition-colors"
            title="Toggle Control Dock (Shortcut: H)"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-[#244C3A]" /> Show 3D Controls (H)
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-[#686B65]" /> Hide Controls (H)
              </>
            )}
          </button>
        </div>

        <div className="bg-[#FFFFFF] border border-[#DEDDD5] rounded px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Camera View Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#686B65] mr-1 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-[#244C3A]" /> Camera:
              </span>
              {(Object.keys(CAMERA_PRESETS) as CameraPresetKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelectPreset(key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${
                    activePreset === key
                      ? 'bg-[#244C3A] text-white border-[#244C3A]'
                      : 'bg-[#F7F6F2] text-[#20241F] border-[#DEDDD5] hover:bg-[#E9E7DF]'
                  }`}
                >
                  {CAMERA_PRESETS[key].label}
                </button>
              ))}
            </div>

            {/* Exploded View Slider */}
            <div className="flex items-center gap-2.5">
              <label
                htmlFor="weave-exploded-slider"
                className="text-[11px] font-mono uppercase tracking-wider text-[#686B65] flex items-center gap-1"
              >
                <Layers className="w-3.5 h-3.5 text-[#244C3A]" /> Exploded Assembly:
              </label>
              <input
                id="weave-exploded-slider"
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={explodedFactor}
                onChange={(e) => setExplodedFactor(parseFloat(e.target.value))}
                className="w-24 accent-[#244C3A] cursor-pointer"
              />
              <span className="text-xs font-mono text-[#20241F] w-9 text-right">
                {Math.round(explodedFactor * 100)}%
              </span>
            </div>

            {/* Record Flow Playback Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPaused((p) => !p)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-[#DEDDD5] bg-[#F7F6F2] text-[#20241F] hover:bg-[#E9E7DF] transition-colors"
              >
                {isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 text-[#244C3A]" /> Resume Flow
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 text-[#686B65]" /> Pause Flow
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setExplodedFactor(0);
                  handleSelectPreset('overview');
                  setSelectedNodeId('VAULT-CORE');
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded border border-[#DEDDD5] bg-[#FFFFFF] text-[#686B65] hover:text-[#20241F] transition-colors"
                title="Reset Camera and Assembly"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>
          </div>

          {/* Node Quick-Select Bar */}
          <div className="mt-2.5 pt-2 border-t border-[#F0EFE9] flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#686B65] flex items-center gap-1 mr-1">
                <Box className="w-3 h-3 text-[#244C3A]" /> Inspect Node:
              </span>
              {Object.keys(NODE_TELEMETRY).map((nodeKey) => (
                <button
                  key={nodeKey}
                  type="button"
                  onClick={() => {
                    setSelectedNodeId(nodeKey);
                    if (nodeKey === 'VAULT-CORE') handleSelectPreset('vault');
                    else handleSelectPreset('gateways');
                  }}
                  className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-colors ${
                    selectedNodeId === nodeKey
                      ? 'bg-[#EAF2EE] text-[#1E563B] border-[#1E563B]/40 font-semibold'
                      : 'bg-[#F7F6F2] text-[#686B65] border-[#DEDDD5] hover:text-[#20241F]'
                  }`}
                >
                  {nodeKey}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#686B65]">
              <Sliders className="w-3 h-3 text-[#244C3A]" />
              <span>Click any 3D structure to inspect · Drag to orbit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
