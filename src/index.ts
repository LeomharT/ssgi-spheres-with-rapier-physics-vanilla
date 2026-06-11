import { ColliderDesc, RigidBody, RigidBodyDesc, RigidBodyType, World } from '@dimforge/rapier3d';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import {
  AmbientLight,
  AxesHelper,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  Timer,
  Vector3,
  WebGLRenderer,
} from 'three';
import { ThreePerf } from 'three-perf';
import { OrbitControls } from 'three/examples/jsm/Addons.js';
import { Pane } from 'tweakpane';
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
el?.append(renderer.domElement);

const scene = new Scene();
scene.background = new Color('#141622');

const camera = new PerspectiveCamera(17.5, sizes.width / sizes.height, 10, 100);
camera.position.set(0, 0, 30);
camera.lookAt(scene.position);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enabled = isDebug;

const timer = new Timer();

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

const planeGeometry = new PlaneGeometry(10, 10, 16, 16);
const planeMaterial = new MeshBasicMaterial({
  wireframe: true,
});
const plane = new Mesh(planeGeometry, planeMaterial);
scene.add(plane);

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

const light = new DirectionalLight('#ffffff', 1);
light.position.set(5, 5, 5);
light.castShadow = true;
scene.add(light);

scene.add(new AmbientLight(0xffffff, 0.5));

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
  renderer.render(scene, camera);

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
