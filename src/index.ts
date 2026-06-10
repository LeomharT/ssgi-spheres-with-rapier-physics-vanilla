import "./style.css";

function r(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

const colors = ["#ff4060", "#ffcc00", "#20ffa0", "#4060ff"];

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const el = document.querySelector("#root");

const canvas = document.createElement("canvas");
canvas.width = sizes.width;
canvas.height = sizes.height;
canvas.style.width = sizes.width + "px";
canvas.style.height = sizes.height + "px";
el?.append(canvas);

const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

const cursor = {
  x: sizes.width / 2,
  y: sizes.height / 2,
};

function clear() {
  ctx.save();
  ctx.fillStyle = "#141622";
  ctx.fillRect(0, 0, sizes.width, sizes.height);
  ctx.restore();
}
clear();

const position = Array.from({ length: 350 }, (_, i) => ({
  x: r(0, sizes.width),
  y: r(0, sizes.height),
  angle: 0,
  color: colors[i % colors.length],
  length: r(200, 450),
}));

function drawLines() {
  for (let i = 0; i < position.length; i++) {
    const p = position[i];

    ctx.save();

    ctx.lineWidth = 2;
    ctx.strokeStyle = p.color;

    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.beginPath();
    ctx.moveTo(-p.length / 2, 0);
    ctx.lineTo(p.length / 2, 0);
    ctx.stroke();

    ctx.restore();
  }
}

function drawPointer(x: number, y: number) {
  ctx.save();

  ctx.fillStyle = colors[0];
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

let prevTime = 0;

let angle = 0;

let accelerationX = 0;
let translateX = 0;

let accelerationY = 0;
let translateY = 0;

function render(time: number = 0) {
  const dt = (time - prevTime) / 1000;
  prevTime = time;

  angle += dt;

  accelerationX += cursor.x - translateX;
  accelerationX *= 0.9;
  translateX += accelerationX * 0.02;

  accelerationY += cursor.y - translateY;
  accelerationY *= 0.9;
  translateY += accelerationY * 0.02;

  for (const p of position) {
    p.angle = Math.atan2(translateY - p.y, translateX - p.x) + Math.PI / 2;
  }

  // Update
  clear();
  drawLines();
  drawPointer(translateX, translateY);

  // Animation
  requestAnimationFrame(render);
}

render();

drawPointer(sizes.width / 2, sizes.height / 2);

window.addEventListener("pointermove", (e) => {
  cursor.x = e.clientX;
  cursor.y = e.clientY;
});

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  canvas.width = sizes.width;
  canvas.height = sizes.height;
  canvas.style.width = sizes.width + "px";
  canvas.style.height = sizes.height + "px";

  clear();
});
