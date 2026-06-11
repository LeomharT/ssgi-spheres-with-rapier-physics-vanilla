import { ColliderDesc, RigidBody, RigidBodyDesc, RigidBodyType, World } from '@dimforge/rapier3d';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  FXAAEffect,
  RenderPass,
  ToneMappingEffect,
} from 'postprocessing';
import {
  AxesHelper,
  BufferAttribute,
  BufferGeometry,
  Color,
  CubeCamera,
  CubeRefractionMapping,
  DoubleSide,
  Group,
  HalfFloatType,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NoToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  RingGeometry,
  Scene,
  SphereGeometry,
  Timer,
  Vector3,
  WebGLCubeRenderTarget,
  WebGLRenderer,
} from 'three';
import { ThreePerf } from 'three-perf';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { Pane } from 'tweakpane';
import { SSGIEffect, VelocityDepthNormalPass } from './lib/realism-effects/v2.js';
import './style.css';

// Variables
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: Math.min(2, window.devicePixelRatio),
};

const el = document.querySelector('#root');

const isDebug = window.location.hash === '#debug';

const gravity = { x: 0, y: 0, z: 0 };

let accent = 0;
const accents = ['#ff4060', '#ffcc00', '#20ffa0', '#4060ff'];
const shuffle = (accent = 0) => [
  { color: '#444', roughness: 0.1, metalness: 0.5 },
  { color: '#444', roughness: 0.1, metalness: 0.5 },
  { color: '#444', roughness: 0.1, metalness: 0.5 },
  { color: 'white', roughness: 0.1, metalness: 0.1 },
  { color: 'white', roughness: 0.1, metalness: 0.1 },
  { color: 'white', roughness: 0.1, metalness: 0.1 },
  { color: accents[accent], roughness: 0.1, accent: true },
  { color: accents[accent], roughness: 0.1, accent: true },
  { color: accents[accent], roughness: 0.1, accent: true },
  { color: '#444', roughness: 0.1 },
  { color: '#444', roughness: 0.3 },
  { color: '#444', roughness: 0.3 },
  { color: 'white', roughness: 0.1 },
  { color: 'white', roughness: 0.2 },
  { color: 'white', roughness: 0.1 },
  {
    color: accents[accent],
    roughness: 0.1,
    accent: true,
    transparent: true,
    opacity: 0.5,
  },
  { color: accents[accent], roughness: 0.3, accent: true },
  { color: accents[accent], roughness: 0.1, accent: true },
];

const spheres: Record<
  string,
  {
    mesh: Mesh<SphereGeometry, MeshStandardMaterial>;
    body: RigidBody;
    accent?: boolean;
  }
> = {};

// Core
const renderer = new WebGLRenderer({
  alpha: true,
  antialias: false,
  powerPreference: 'high-performance',
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
renderer.toneMapping = NoToneMapping;
el?.append(renderer.domElement);

const scene = new Scene();
scene.background = new Color('#141622');

const envScene = new Scene();

const camera = new PerspectiveCamera(17.5, sizes.width / sizes.height, 10, 100);
camera.position.set(0, 0, 30);
camera.lookAt(scene.position);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enabled = isDebug;

const timer = new Timer();

const cubeRenderTarget = new WebGLCubeRenderTarget(256, {
  generateMipmaps: true,
  type: HalfFloatType,
  mapping: CubeRefractionMapping,
});
const cubeCamera = new CubeCamera(0.1, 100, cubeRenderTarget);

scene.environment = cubeRenderTarget.texture;

// Post processiong
const composer = new EffectComposer(renderer, { alpha: true, multisampling: 0 });
composer.setSize(sizes.width, sizes.height);
const config = {
  importanceSampling: true,
  steps: 20,
  refineSteps: 4,
  spp: 1,
  resolutionScale: 1,
  missedRays: false,
  distance: 5.980000000000011,
  thickness: 2.829999999999997,
  denoiseIterations: 1,
  denoiseKernel: 3,
  denoiseDiffuse: 25,
  denoiseSpecular: 25.54,
  radius: 11,
  phi: 0.5760000000000001,
  lumaPhi: 20.651999999999997,
  depthPhi: 23.37,
  normalPhi: 26.087,
  roughnessPhi: 18.477999999999998,
  specularPhi: 7.099999999999999,
  envBlur: 0.8,
};
composer.addPass(new RenderPass(scene, camera));
const velocityDepthNormalPass = new VelocityDepthNormalPass(scene, camera);
composer.addPass(velocityDepthNormalPass);
composer.addPass(new EffectPass(camera, new SSGIEffect(composer, scene, camera, config)));
composer.addPass(
  new EffectPass(
    camera,
    new BloomEffect({
      mipmapBlur: true,
      luminanceThreshold: 0.1,
      intensity: 0.9,
      levels: 7,
    }),
  ),
);
composer.addPass(new EffectPass(camera, new FXAAEffect(), new ToneMappingEffect()));

// World
const world = new World(gravity);
world.timestep = 1 / 60;

const debug = new LineSegments(
  new BufferGeometry(),
  new LineBasicMaterial({
    vertexColors: true,
  }),
);
debug.frustumCulled = false;
debug.visible = isDebug;
scene.add(debug);

const sphereGeometry = new SphereGeometry(1, 64, 64);

function createSphere({ accent, ...props }: ReturnType<typeof shuffle>[number]) {
  const material = new MeshStandardMaterial({
    ...props,
  });
  const mesh = new Mesh(sphereGeometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

for (const s of shuffle(accent)) {
  const sphere = createSphere(s);
  scene.add(sphere);

  const pos = new Vector3(
    MathUtils.randFloatSpread(10),
    MathUtils.randFloatSpread(10),
    MathUtils.randFloatSpread(10),
  );

  const rigidBodyDesc = RigidBodyDesc.dynamic();
  rigidBodyDesc.setTranslation(pos.x, pos.y, pos.z);
  rigidBodyDesc.setLinearDamping(4);
  rigidBodyDesc.setAngularDamping(1);
  const rigidBody = world.createRigidBody(rigidBodyDesc);

  const colliderDesc = ColliderDesc.ball(1);
  world.createCollider(colliderDesc, rigidBody);

  spheres[sphere.uuid] = {
    mesh: sphere,
    body: rigidBody,
    accent: s.accent,
  };
}

const pointerRigidBodyDesc = RigidBodyDesc.dynamic();
const pointerRididBody = world.createRigidBody(pointerRigidBodyDesc);
pointerRididBody.setBodyType(RigidBodyType.KinematicPositionBased, true);

const pointerColliderDesc = ColliderDesc.ball(1);
world.createCollider(pointerColliderDesc, pointerRididBody);

function createLightFormer(
  form: 'circle' | 'ring' | 'rect' = 'rect',
  intensity: number = 1,
  color: string = 'white',
  scale: number,
  position: [number, number, number],
  rotation: [number, number, number],
) {
  const geometry = {
    circle: new RingGeometry(0, 0.5, 64),
    ring: new RingGeometry(0.25, 0.5, 64),
    rect: new PlaneGeometry(1, 1),
  };
  const material = new MeshBasicMaterial({
    color: new Color(color).multiplyScalar(intensity),
    toneMapped: false,
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry[form], material);
  mesh.scale.setScalar(scale);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
}

const group = new Group();

const lightFormer1 = createLightFormer('circle', 100, 'white', 2, [0, 5, -9], [Math.PI / 2, 0, 0]);
const lightFormer2 = createLightFormer('circle', 2, 'white', 2, [-5, 1, -1], [0, Math.PI / 2, 0]);
const lightFormer3 = createLightFormer('circle', 2, 'white', 2, [-5, -1, -1], [0, Math.PI / 2, 0]);
const lightFormer4 = createLightFormer('circle', 2, 'white', 8, [10, 1, 0], [0, -Math.PI / 2, 0]);
const lightFormer5 = createLightFormer('ring', 80, '#4060ff', 10, [10, 10, 0], [0, 0, 0]);
lightFormer5.lookAt(envScene.position);

group.add(lightFormer1);
group.add(lightFormer2);
group.add(lightFormer3);
group.add(lightFormer4);
group.add(lightFormer5);
group.rotation.set(-Math.PI / 3, 0, 1);

envScene.add(group);

// Helpers
const axesHelper = new AxesHelper(10);
scene.add(axesHelper);

// Pane
const pane = new Pane({ title: 'Debug Pane' });
pane.element.parentElement!.style.width = '380px';
pane.registerPlugin(EssentialsPlugin);

const fpsGraph: any = pane.addBlade({
  view: 'fpsgraph',
  label: undefined,
  rows: 3,
});
const f_physic = pane.addFolder({ title: '⚛️⚛️⚛️ Rapier World' });
f_physic.addBinding(debug, 'visible', {
  label: 'Debug Visibility',
});

const perf = new ThreePerf({
  anchorX: 'left',
  anchorY: 'top',
  domElement: document.body,
  renderer: renderer,
  backgroundOpacity: 0.0,
});

if (!isDebug) {
  pane.dispose();
  perf.dispose();
}

// Events

function renderDebug() {
  const { colors, vertices } = world.debugRender();

  debug.geometry.setAttribute('position', new BufferAttribute(vertices, 3));
  debug.geometry.setAttribute('color', new BufferAttribute(colors, 4));
}

const c = new Color();

function updateSphere(dt: number) {
  c.set(accents[accent]);

  for (const key in spheres) {
    const { mesh, body, accent } = spheres[key];

    mesh.position.copy(body.translation());
    mesh.quaternion.copy(body.rotation());

    body.applyImpulse(mesh.position.clone().negate().multiplyScalar(0.2), true);

    if (accent) {
      mesh.material.color.setRGB(
        MathUtils.damp(mesh.material.color.r, c.r, 2, dt),
        MathUtils.damp(mesh.material.color.g, c.g, 2, dt),
        MathUtils.damp(mesh.material.color.b, c.b, 2, dt),
      );
    }
  }
}

function render() {
  perf.begin();
  fpsGraph.begin();

  // Update
  timer.update();
  const dt = timer.getDelta();

  world.step();
  controls.update();

  updateSphere(dt);

  // Render
  renderDebug();

  cubeCamera.update(renderer, envScene);

  renderer.autoClear = true;

  composer.render(dt);

  perf.end();
  fpsGraph.end();
  // Loop
  requestAnimationFrame(render);
}
render();

window.addEventListener('pointerdown', () => {
  accent = (accent + 1) % accents.length;
});

window.addEventListener('pointermove', (e) => {
  const x = (e.clientX / sizes.width) * 2 - 1;
  const y = -(e.clientY / sizes.height) * 2 + 1;

  pointerRididBody.setNextKinematicTranslation({ x: x * 5, y: y * 5, z: 0 });
});

window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  renderer.setSize(sizes.width, sizes.height);

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
});
