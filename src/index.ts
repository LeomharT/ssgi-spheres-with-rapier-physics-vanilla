import { World } from "@dimforge/rapier3d";
import * as EssentialsPlugin from "@tweakpane/plugin-essentials";
import {
  AxesHelper,
  Color,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from "three";
import { ThreePerf } from "three-perf";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { Pane } from "tweakpane";
import "./style.css";

// Variables
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: Math.min(2, window.devicePixelRatio),
};

const el = document.querySelector("#root");

const isDebug = window.location.hash === "#debug";

const gravity = { x: 0, y: -9.81, z: 0 };

// Core
const renderer = new WebGLRenderer({
  alpha: true,
  antialias: false,
  powerPreference: "high-performance",
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(sizes.pixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFShadowMap;
el?.append(renderer.domElement);

const scene = new Scene();
scene.background = new Color("#141622");

const camera = new PerspectiveCamera(17.5, sizes.width / sizes.height, 10, 40);
camera.position.set(0, 0, 30);
camera.lookAt(scene.position);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enabled = isDebug;

// World
const world = new World(gravity);
world.timestep = 1 / 60;

// Helpers
const axesHelper = new AxesHelper(10);
scene.add(axesHelper);

// Pane
const pane = new Pane({ title: "Debug Pane" });
pane.element.parentElement!.style.width = "380px";
pane.registerPlugin(EssentialsPlugin);

const fpsGraph: any = pane.addBlade({
  view: "fpsgraph",
  label: undefined,
  rows: 3,
});
const perf = new ThreePerf({
  anchorX: "left",
  anchorY: "top",
  domElement: document.body,
  renderer: renderer,
  backgroundOpacity: 0.0,
});

if (!isDebug) {
  pane.dispose();
  perf.dispose();
}

// Events
function render() {
  perf.begin();
  fpsGraph.begin();

  // Update
  world.step();
  controls.update();
  // Render
  renderer.render(scene, camera);

  perf.end();
  fpsGraph.end();
  // Loop
  requestAnimationFrame(render);
}
render();

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  renderer.setSize(sizes.width, sizes.height);

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
});
