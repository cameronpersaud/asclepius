/* Asclepius rig demo engine: three.js r128 scene of the full simulator rig.
   Needs THREE, THREE.OrbitControls, THREE.GLTFLoader and window.ASCLEPIUS_RIG_GLB_B64 loaded first. */
window.AsclepiusRig = (function () {
"use strict";
const ITEMS = [
  { id: "right", group: "Controllers", name: "Right controller", qty: 1, at: [70, 200, 250], r: 260,
    role: "Right-hand master. Yaw, shoulder and elbow are capstan cable drives at about 14.7, 8.5 and 6 : 1, and the grip is a pair of geared pinch paddles at about 4.8 : 1.",
    links: ["3 × RS-385 + 1 × 130 motor ← DRV8833 ×2", "5 × AS5600 → TCA9548A", "Cable bundle → electronics tray", "Feet screw to the desk on M4 bolts"] },
  { id: "left", group: "Controllers", name: "Left controller", qty: 1, at: [70, -200, 250], r: 260,
    role: "Mirror image of the right controller. The handed parts print from the left_hand folder and the drums, cups and feet are shared.",
    links: ["3 × RS-385 + 1 × 130 motor ← DRV8833 ×2", "5 × AS5600 → TCA9548A", "Cable bundle → electronics tray"] },
  { id: "motors", group: "Controllers", name: "Drive motors", qty: 8, at: [-46, 234, 190], r: 150, xray: true,
    role: "Six RS-385s drive yaw, shoulder and elbow. Two 130 motors drive the grips. Each motor pulls braided line wrapped on a printed drum.",
    links: ["RS-385 ×6 ← DRV8833 outputs, 8 V", "130 ×2 ← DRV8833 outputs, PWM from UNO Q", "Printed parts fade out while this is selected"] },
  { id: "encoders", group: "Controllers", name: "AS5600 encoders", qty: 10, at: [121, 149, 210], r: 150, xray: true,
    role: "Five magnetic encoders per controller: yaw, shoulder, elbow, wrist roll and grip. Each reads a diametric magnet in a screw-on cap on the joint axle.",
    links: ["Fixed I2C address 0x36, so each one gets its own mux channel", "SDA/SCL → TCA9548A, 3.3 V"] },
  { id: "tray", group: "Electronics tray", name: "Printed electronics tray", qty: 1, at: [-40, 0, 40], r: 200,
    role: "Holds every board on M3 standoffs between the two controllers, with short wire runs to both sides. Not part of the v0.2 STL set yet.",
    links: ["Cable bundles exit both sides to the controllers", "12 V enters at the screw terminal"] },
  { id: "unoq", group: "Electronics tray", name: "Arduino UNO Q", qty: 1, at: [-62, 0, 14], r: 90,
    role: "Main board. Runs the 400 Hz haptic loop: reads ten encoders through the muxes, drives the arm motors through the PCA9685 and the grip motors directly.",
    links: ["I2C → PCA9685 0x40, TCA9548A 0x70 / 0x71", "D3 / D5, D6 / D9 → grip PWM", "D8 → DRV8833 sleep pins (kill line)", "D2 / D4 / D7 ← foot pedals", "D0 / D1 ↔ CP2102 UART", "USB-C ← laptop (power, flashing)"] },
  { id: "pca", group: "Electronics tray", name: "PCA9685 PWM driver", qty: 1, at: [2, 0, 14], r: 80,
    role: "16-channel PWM expander at 0x40. Channels 0–11 drive the six arm motors, two inputs per motor.",
    links: ["I2C ← UNO Q", "ch0–11 → DRV8833 inputs"] },
  { id: "drv", group: "Electronics tray", name: "DRV8833 motor drivers", qty: 4, at: [0, 70, 14], r: 110,
    role: "Dual H-bridges, two per controller, each with a 470 µF capacitor across the motor supply. All four sleep pins share the kill line.",
    links: ["IN ← PCA9685 ch0–11 and UNO Q grip PWM", "VM ← LM2596 at 8 V", "OUT → 3 × RS-385 + 1 × 130 per side", "nSLEEP ← UNO Q D8"] },
  { id: "tca", group: "Electronics tray", name: "TCA9548A I2C mux", qty: 2, at: [-62, 78, 14], r: 90,
    role: "I2C multiplexers at 0x70 and 0x71, one per controller. Five channels on each carry the encoders.",
    links: ["SDA/SCL ← UNO Q", "ch0–4 → AS5600 ×5"] },
  { id: "buck", group: "Power and safety", name: "LM2596 buck converters", qty: 2, at: [-122, 58, 14], r: 100,
    role: "Step 12 V down to 8.00 V, one per controller, so a stall on one side can’t sag the other. The displays show the output voltage.",
    links: ["IN ← 12 V through the e-stop", "OUT → DRV8833 VM"] },
  { id: "psu", group: "Power and safety", name: "12 V 5 A adapter", qty: 1, at: [-430, 420, 30], r: 160,
    role: "The only motor supply. Logic power comes from the laptop’s USB, so the boards stay alive when the e-stop is pressed.",
    links: ["→ latching e-stop → LM2596 ×2"] },
  { id: "estop", group: "Power and safety", name: "Latching e-stop", qty: 1, at: [300, 400, 80], r: 160,
    role: "Normally-closed mushroom switch in series with the 12 V line. Pressing it cuts motor power on both sides at once and stays latched until it is twisted out.",
    links: ["IN ← 12 V adapter", "OUT → tray screw terminal → LM2596 ×2"] },
  { id: "cp2102", group: "Computer link", name: "CP2102 USB–UART", qty: 1, at: [-130, 0, 14], r: 70,
    role: "Carries the binary protocol: 200 Hz state packets from the board, 100 Hz contact events back from the sim.",
    links: ["TX / RX ↔ UNO Q D0 / D1", "USB → laptop"] },
  { id: "laptop", group: "Computer link", name: "Laptop: bridge + Godot sim", qty: 1, at: [-330, 0, 230], r: 300,
    role: "Runs the Python serial bridge and the Godot 4 sim. The bridge relays packets over UDP on localhost ports 9001 and 9002. The screen shows the peg-transfer task.",
    links: ["USB ← CP2102", "USB-C → UNO Q", "UDP 9001 / 9002 ↔ Godot"] },
  { id: "pedals", group: "Operator I/O", name: "Foot pedals", qty: 3, at: [560, 0, -690], r: 320,
    role: "Clutch, camera and next-task switches, like the console’s foot pedals. Holding the clutch lets the operator re-center their hands without moving the virtual arms.",
    links: ["D2 / D4 / D7 → switch to ground", "Cable runs up through the desk grommet"] },
  { id: "headset", group: "Operator I/O", name: "VR headset (later)", qty: 1, at: [-300, -420, 120], r: 200,
    role: "Stretch goal: a Quest 3 as the display. The laptop screen is all the demo needs.",
    links: ["Godot OpenXR export", "Same sim, stereo camera at the console view"] },
  { id: "nano", group: "Spares", name: "Nano 33 BLE backup", qty: 1, at: [50, 0, 14], r: 70,
    role: "Spare controller kept in the tray and not wired. If the UNO Q fails, the same firmware moves over with an adjusted pin map.",
    links: ["Not connected"] },
];
const WIRES = [
  { k: "v12", label: "12 V", color: "#d23b3b" }, { k: "gnd", label: "Ground", color: "#22272a" },
  { k: "v8", label: "8 V motor supply", color: "#ef7a2f" }, { k: "i2c", label: "I2C", color: "#2f6fd6" },
  { k: "pwm", label: "PCA9685 → DRV8833", color: "#e3a21a" }, { k: "grip", label: "Grip PWM", color: "#2e9d5b" },
  { k: "kill", label: "Kill line D8", color: "#f2f2ee" }, { k: "uart", label: "UART", color: "#b04fc8" },
  { k: "usb", label: "USB", color: "#8a949a" }, { k: "bundle", label: "Controller and pedal cables", color: "#55606a" },
];
const WC = Object.fromEntries(WIRES.map(w => [w.k, w.color]));
const byId = Object.fromEntries(ITEMS.map(i => [i.id, i]));
ITEMS.forEach((it, i) => { it.n = i + 1; });
function mount(opts) {
if (!window.THREE || !THREE.OrbitControls || !THREE.GLTFLoader || !window.ASCLEPIUS_RIG_GLB_B64) { if (opts.onError) opts.onError("the 3D files were blocked."); return null; }
/* ---------- renderer, scene, camera ---------- */
const canvas = opts.canvas;
const stage = opts.stage;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 16 / 10, 5, 9000);
const controls = new THREE.OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.62;
// Keep the rig in view: zoom out no further than a little past the overview, zoom in no closer than a board,
// and keep the orbit centre over the bench so panning can't drag the camera off into empty space.
controls.minDistance = 120;
controls.maxDistance = 2300;
controls.zoomSpeed = .8;
const PAN_MIN = new THREE.Vector3(-600, -760, -650), PAN_MAX = new THREE.Vector3(700, 450, 650);
const panFix = new THREE.Vector3();
function clampView() {
  panFix.copy(controls.target).clamp(PAN_MIN, PAN_MAX).sub(controls.target);
  if (panFix.lengthSq() > 0) { controls.target.add(panFix); camera.position.add(panFix); }
}
scene.add(new THREE.HemisphereLight(0xffffff, 0x50585c, .55));
const sun = new THREE.DirectionalLight(0xffffff, .7);
sun.position.set(500, 1400, 700);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -900, right: 900, top: 900, bottom: -900, near: 200, far: 3500 }); sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0004;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xffffff, .2); fill.position.set(-700, 400, -500); scene.add(fill);

const world = new THREE.Group();       // model frame (Z up) inside three.js (Y up)
world.rotation.x = -Math.PI / 2;
scene.add(world);
const T = (x, y, z) => new THREE.Vector3(x, z, -y);      // model → three.js world
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const pickables = [];
const itemMeshes = Object.fromEntries(ITEMS.map(i => [i.id, []]));
function mat(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? .6, metalness: o.metal ?? .05, ...(o.extra || {}) }); }
function tag(mesh, item, cast = true) {
  mesh.castShadow = cast; mesh.receiveShadow = true;
  if (item) { mesh.userData.item = item; itemMeshes[item].push(mesh); pickables.push(mesh); }
  return mesh;
}
function box(parent, item, w, d, h, x, y, z, color, o) {
  const m = tag(new THREE.Mesh(new THREE.BoxGeometry(w, d, h), o?.material || mat(color, o)), item);
  m.position.set(x, y, z + h / 2); parent.add(m); return m;
}
function cyl(parent, item, r, h, x, y, z, color, o = {}) {
  const g = new THREE.CylinderGeometry(o.r2 ?? r, r, h, o.seg ?? 32);
  g.rotateX(Math.PI / 2);                     // axis along model Z
  const m = tag(new THREE.Mesh(g, mat(color, o)), item);
  m.position.set(x, y, z + h / 2); parent.add(m); return m;
}
function textTexture(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
}

/* ---------- desk, mat, floor ---------- */
const FLOOR_Z = -740;
const env = new THREE.Group(); world.add(env);
const floorMat = mat(0xb3bdc2, { rough: .95 });
const floor = tag(new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), floorMat), null, false);
floor.position.z = FLOOR_Z; env.add(floor);
box(env, null, 960, 1120, 28, -40, 0, -28, 0xd8d6cf, { rough: .75 });                 // desk top, x -520..440
box(env, null, 960, 1120, 2, -40, 0, -2.2, 0xd8d6cf, { rough: .75 }).visible = false;
for (const [lx, ly] of [[-490, -530], [-490, 530], [410, -530], [410, 530]])
  box(env, null, 44, 44, 712, lx, ly, FLOOR_Z, 0x3a4044, { metal: .5, rough: .4 });
box(env, null, 30, 1020, 60, -490, 0, -90, 0x3a4044, { metal: .5, rough: .4 });         // rear stretcher
const matTop = box(env, null, 640, 960, 2, -30, 0, -1.5, 0x3d5b66, { rough: .9 });       // ESD mat under the rig
matTop.receiveShadow = true;
const grom = new THREE.Mesh(new THREE.TorusGeometry(14, 4, 12, 32), mat(0x222628)); grom.position.set(95, -60, 0); env.add(grom);

/* ---------- electronics tray ---------- */
const trayG = new THREE.Group(); world.add(trayG);
const TRAY = { x0: -155, x1: 75, y0: -110, y1: 110 };
const trayCol = 0x4b555c;
box(trayG, "tray", TRAY.x1 - TRAY.x0, TRAY.y1 - TRAY.y0, 4, (TRAY.x0 + TRAY.x1) / 2, 0, 0, trayCol);
box(trayG, "tray", TRAY.x1 - TRAY.x0, 3, 18, (TRAY.x0 + TRAY.x1) / 2, TRAY.y0 + 1.5, 0, trayCol);
box(trayG, "tray", TRAY.x1 - TRAY.x0, 3, 18, (TRAY.x0 + TRAY.x1) / 2, TRAY.y1 - 1.5, 0, trayCol);
box(trayG, "tray", 3, TRAY.y1 - TRAY.y0, 18, TRAY.x0 + 1.5, 0, 0, trayCol);
box(trayG, "tray", 3, TRAY.y1 - TRAY.y0, 10, TRAY.x1 - 1.5, 0, 0, trayCol);
const BZ = 10;   // board underside height on standoffs

function board(item, cx, cy, wx, dy, color, label, o = {}) {
  const g = new THREE.Group(); g.position.set(cx, cy, 0); trayG.add(g);
  const tex = textTexture(Math.round(dy * 8), Math.round(wx * 8), (ctx, W, H) => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 3; ctx.strokeRect(8, 8, W - 16, H - 16);
    ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const fs = Math.min(W / (label.length * 0.62), H * 0.28, 64);
    ctx.font = `600 ${fs}px "IBM Plex Mono", monospace`;
    ctx.fillText(label, W / 2, (o.labelY ?? 0.5) * H);
    if (o.sub) { ctx.font = `400 ${fs * .55}px "IBM Plex Mono", monospace`; ctx.fillText(o.sub, W / 2, (o.labelY ?? 0.5) * H + fs * .9); }
    if (o.display) {
      const dw = W * .5, dh = H * .2, dx = (W - dw) / 2, dy2 = H * .62;
      ctx.fillStyle = "#101214"; ctx.fillRect(dx, dy2, dw, dh);
      ctx.fillStyle = "#ff3b2f"; ctx.font = `600 ${dh * .8}px "IBM Plex Mono", monospace`; ctx.fillText(o.display, W / 2, dy2 + dh / 2 + 2);
    }
  });
  const side = mat(color, { rough: .5 });
  const top = new THREE.MeshStandardMaterial({ map: tex, roughness: .5 });
  const pcb = tag(new THREE.Mesh(new THREE.BoxGeometry(dy, wx, 1.6), [side, side, side, side, top, side]), item);
  pcb.rotation.z = Math.PI / 2; pcb.position.z = BZ + .8; g.add(pcb);
  for (const [sx, sy] of [[-1, -1], [-1, 1], [1, -1], [1, 1]])
    cyl(g, item, 1.8, BZ - 4, sx * (wx / 2 - 3), sy * (dy / 2 - 3), 4, 0xc9b26a, { metal: .7, rough: .3, seg: 6 });
  if (o.headers !== false) for (const sy of [-1, 1])
    box(g, item, wx * .78, 2.6, 8.5, 0, sy * (dy / 2 - 2.5), BZ + 1.6, 0x16181a, { rough: .4 });
  return g;
}
board("unoq", -62, 0, 53.4, 68.6, "#0f7f86", "UNO Q", { sub: "STM32U585 + Linux" });
board("pca", 2, 0, 25, 62, "#1f4f9f", "PCA9685", { sub: "0x40" });
for (const s of [-1, 1]) {
  board("tca", -62, 78 * s, 21, 31, "#1f4f9f", "TCA9548A", { sub: s > 0 ? "0x70" : "0x71" });
  board("buck", -122, 58 * s, 36, 66, "#1f4f9f", "LM2596", { display: "8.00", labelY: .3, headers: false });
  for (const dy of [55, 84]) {
    board("drv", 0, dy * s, 18.5, 16, "#9c2a46", "DRV8833");
    cyl(trayG, "drv", 5, 12, 17, dy * s, BZ + 1.6, 0x1c1f22, { rough: .35 });
  }
}
board("cp2102", -130, 0, 24, 16, "#b23a2f", "CP2102", { headers: false });
box(trayG, "cp2102", 12, 12, 5, -146, 0, BZ + 1.6, 0xc9cdd1, { metal: .8, rough: .3 });       // USB-A plug
board("nano", 50, 0, 18, 45, "#0f7f86", "NANO 33", { sub: "spare" });
box(trayG, "tray", 20, 10, 10, -95, 101, 4, 0x2f8a4c);                                     // 12 V screw terminal

/* ---------- power brick, e-stop, laptop, headset, pedals ---------- */
const gear = new THREE.Group(); world.add(gear);
box(gear, "psu", 120, 52, 32, -430, 420, 0, 0x1d2022, { rough: .5 });
cyl(gear, "psu", 2, 1, -380, 420, 32, 0x3cff7a, { extra: { emissive: 0x2bd662, emissiveIntensity: 1.2 } });
box(gear, "estop", 72, 72, 62, 300, 400, 0, 0xf2c21a, { rough: .45 });
cyl(gear, "estop", 20, 6, 300, 400, 62, 0x2a2a2a, { seg: 40 });
cyl(gear, "estop", 24, 12, 300, 400, 68, 0xd3261f, { r2: 20, seg: 48, rough: .35 });
{ const t = textTexture(256, 256, (c, W) => { c.fillStyle = "#f2c21a"; c.fillRect(0, 0, W, W); c.fillStyle = "#1a1a1a";
    c.font = "700 26px Archivo, sans-serif"; c.textAlign = "center"; c.fillText("EMERGENCY", W / 2, 34); c.fillText("STOP", W / 2, 238); });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(72, 72), new THREE.MeshStandardMaterial({ map: t, roughness: .5 }));
  p.rotation.z = Math.PI / 2; p.position.set(300, 400, 62.2); gear.add(p); }

// laptop: base on the far side, lid hinged at the back edge, screen faces the operator (+X)
const LAP = { x0: -445, x1: -215, w: 330 };
box(gear, "laptop", LAP.x1 - LAP.x0, LAP.w, 16, (LAP.x0 + LAP.x1) / 2, 0, 0, 0x8e979d, { metal: .6, rough: .35 });
box(gear, "laptop", 150, 290, .6, -350, 0, 16, 0x2a2f33, { rough: .7 });       // keyboard deck
box(gear, "laptop", 70, 100, .6, -255, 0, 16, 0x7d868c, { metal: .5, rough: .3 }); // trackpad
const lid = new THREE.Group(); lid.position.set(LAP.x0 + 6, 0, 16); lid.rotation.y = THREE.MathUtils.degToRad(-14); gear.add(lid);
box(lid, "laptop", 6, LAP.w, 222, -3, 0, 0, 0x8e979d, { metal: .6, rough: .35 });
const SIM_W = 1024, SIM_H = 640;
const simRT = new THREE.WebGLRenderTarget(SIM_W, SIM_H);
simRT.texture.encoding = THREE.sRGBEncoding;
const basis = new THREE.Matrix4().makeBasis(V(0, 1, 0), V(0, 0, 1), V(1, 0, 0));   // u → +Y, v → +Z, normal → +X
const scrGeo = new THREE.PlaneGeometry(310, 194); scrGeo.applyMatrix4(basis);
const screen = tag(new THREE.Mesh(scrGeo, new THREE.MeshBasicMaterial({ map: simRT.texture, toneMapped: false })), "laptop", false);
screen.position.set(0.4, 0, 114); lid.add(screen);
const hudCanvas = document.createElement("canvas"); hudCanvas.width = SIM_W; hudCanvas.height = SIM_H;
const hudTex = new THREE.CanvasTexture(hudCanvas); hudTex.encoding = THREE.sRGBEncoding;
const hudGeo = scrGeo.clone();
const hud = new THREE.Mesh(hudGeo, new THREE.MeshBasicMaterial({ map: hudTex, transparent: true, toneMapped: false }));
hud.position.set(0.8, 0, 114); lid.add(hud);

// generic headset, resting on the desk
const hs = new THREE.Group(); hs.position.set(-300, -420, 0); hs.rotation.z = THREE.MathUtils.degToRad(25); gear.add(hs);
{ const g = new THREE.BoxGeometry(95, 175, 92);
  const m = tag(new THREE.Mesh(g, mat(0xeef0f1, { rough: .55 })), "headset"); m.position.set(0, 0, 46); hs.add(m);
  box(hs, "headset", 30, 160, 70, -60, 0, 12, 0x2b2f33, { rough: .9 });       // face foam
  const strap = tag(new THREE.Mesh(new THREE.TorusGeometry(95, 9, 12, 48, Math.PI * 1.2), mat(0x3a3f44, { rough: .8 })), "headset");
  strap.rotation.z = Math.PI / 2 + Math.PI * .4; strap.position.set(-150, 0, 14); hs.add(strap);
  for (const sy of [-1, 1]) cyl(hs, "headset", 6, 4, 46, sy * 52, 60, 0x15181a, { seg: 20 }).rotation.set(0, Math.PI / 2, 0); }

// foot pedals on the floor in front of the desk
const pedalNames = ["CAMERA", "CLUTCH", "NEXT"];
[-140, 0, 140].forEach((py, k) => {
  const g = new THREE.Group(); g.position.set(560, py, FLOOR_Z); gear.add(g);
  box(g, "pedals", 150, 105, 22, 0, 0, 0, 0x2a2e31, { rough: .6 });
  const plate = box(g, "pedals", 125, 88, 8, 0, 0, 0, k === 1 ? 0x23726d : 0x5a646b, { metal: .3, rough: .45 });
  plate.position.set(-6, 0, 34); plate.rotation.y = THREE.MathUtils.degToRad(-12);
  const t = textTexture(256, 64, (c, W, H) => { c.fillStyle = "#2a2e31"; c.fillRect(0, 0, W, H); c.fillStyle = "#e9eef0";
    c.font = "600 34px 'IBM Plex Mono', monospace"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(pedalNames[k], W / 2, H / 2); });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(64, 16), new THREE.MeshBasicMaterial({ map: t }));
  p.rotation.z = Math.PI / 2; p.position.set(64, 0, 22.3); g.add(p);
});

/* ---------- wiring ---------- */
const wires = new THREE.Group(); world.add(wires);
function wire(kind, pts, r = 1.1) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => V(...p)), false, "centripetal");
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(24, pts.length * 14), r, 8, false),
    mat(WC[kind], { rough: .55 }));
  m.castShadow = true; wires.add(m); return m;
}
function hop(a, b, h = 10, kind, r) {      // short jumper arching over the boards
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.max(a[2], b[2]) + h];
  return wire(kind, [a, [a[0] + (m[0] - a[0]) * .3, a[1] + (m[1] - a[1]) * .3, a[2] + h * .8], m, [b[0] + (m[0] - b[0]) * .3, b[1] + (m[1] - b[1]) * .3, b[2] + h * .8], b], r);
}
const Z = BZ + 2.5;
const UNO = { sda: [-42, -30, Z], scl: [-45, -30, Z], d0: [-84, -30, Z], d2: [-78, -30, Z], d35: [-72, -30, Z], d69: [-66, -30, Z], d8: [-60, -30, Z], usb: [-89, 18, Z] };
// 12 V: adapter → e-stop → tray terminal
const v12a = [[-370, 420, 10], [-340, 470, 2], [200, 470, 2], [262, 430, 8], [266, 410, 30]];
wire("bundle", v12a, 2.6);
wire("bundle", [[300, 364, 20], [290, 340, 2], [120, 300, 2], [-160, 300, 2], [-175, 140, 2], [-120, 112, 16], [-95, 106, 14]], 2.6);
for (const s of [-1, 1]) {
  // terminal → buck inputs (12 V and ground)
  hop([-99, 101, 14], [-110, 64 * s, Z], 16, "v12");
  hop([-91, 101, 14], [-110, 52 * s, Z], 18, "gnd");
  // buck outputs → DRV8833 VM, daisy-chained
  for (const dy of [55, 84]) { hop([-106, (70 + (dy - 55) * .3) * s, Z], [8, (dy + 4) * s, Z], 26, "v8"); hop([-106, 76 * s, Z], [8, (dy - 4) * s, Z], 24, "gnd"); }
  // I2C to the mux
  hop(UNO.sda, [-58, (66 * s), Z], s > 0 ? 34 : 14, "i2c"); hop(UNO.scl, [-66, 66 * s, Z], s > 0 ? 30 : 12, "i2c");
  // PCA9685 → DRV inputs
  for (const dy of [55, 84]) for (const off of [-4, 0, 4]) hop([off, 28 * s, Z], [-8, (dy + off * .6) * s, Z], 8 + (dy - 55) * .25, "pwm", .7);
  // grip PWM to the second DRV on each side
  hop(s < 0 ? UNO.d35 : UNO.d69, [-8, 88 * s, Z], s > 0 ? 40 : 18, "grip");
  // kill line
  for (const dy of [55, 84]) hop(UNO.d8, [-8, (dy - 6) * s, Z], s > 0 ? 44 : 20, "kill", .8);
  // controller bundles: motors + encoders leave the tray toward each base
  wire("bundle", [[0, 92 * s, Z], [-10, 104 * s, 20], [-20, 120 * s, 6], [-40, 132 * s, 30], [-45, 135 * s, 48]], 3.4);
  wire("bundle", [[-62, 93 * s, Z], [-62, 108 * s, 20], [-60, 125 * s, 8], [-50, 132 * s, 40]], 2.4);
}
hop(UNO.sda, [-6, -24, Z], 10, "i2c"); hop(UNO.scl, [-2, -24, Z], 12, "i2c");
hop(UNO.d0, [-122, -6, Z], 10, "uart"); hop([-82, -30, Z], [-122, 6, Z], 12, "uart");
// USB: CP2102 and UNO Q to the laptop
wire("usb", [[-152, 0, Z], [-170, 0, 8], [-190, -40, 2], [-200, -190, 2], [-300, -200, 2], [-310, -170, 8]], 2);
wire("usb", [UNO.usb, [-110, 30, 20], [-160, 40, 20], [-190, 60, 2], [-205, 190, 2], [-300, 200, 2], [-310, 170, 8]], 2);
// pedals: floor run back under the desk and up through the grommet to D2 / D4 / D7
for (const py of [-140, 0, 140]) wire("bundle", [[485, py, FLOOR_Z + 10], [460, py * .6, FLOOR_Z + 3], [300, -40, FLOOR_Z + 3], [120, -60, FLOOR_Z + 3], [95, -60, FLOOR_Z + 40], [95, -60, -40], [95, -60, 4], [70, -46, 10]], 2.2);
wire("bundle", [[95, -60, 4], [70, -46, 12], [30, -42, 14], [-40, -40, 16], [-70, -36, 16], UNO.d2], 2.2);

/* ---------- controllers (GLB) ---------- */
const ctrlMeshes = [];
function loadGLB() {
  return new Promise((res, rej) => {
    const bytes = Uint8Array.from(atob(window.ASCLEPIUS_RIG_GLB_B64), c => c.charCodeAt(0));
    new THREE.GLTFLoader().parse(bytes.buffer, "", gltf => {
      gltf.scene.traverse(o => {
        if (!o.isMesh) return;
        const m = o.name.match(/^(left|right)_(.+)_\d+$/) || (o.parent && o.parent.name.match(/^(left|right)_(.+)_\d+$/));
        if (!m) return;
        const part = m[2];
        const item = /^motor/.test(part) ? "motors" : part === "as5600" ? "encoders" : m[1];
        const metal = /^motor/.test(part);
        if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
        o.material = new THREE.MeshStandardMaterial({ color: o.material.color, vertexColors: !!o.geometry.attributes.color,
          roughness: metal ? .3 : .62, metalness: metal ? .75 : .05 });
        tag(o, item);
        if (item === "left" || item === "right") ctrlMeshes.push(o);
      });
      world.add(gltf.scene); res();
    }, rej);
  });
}

/* ---------- the sim on the laptop screen ---------- */
const sim = new THREE.Scene();
sim.background = new THREE.Color(0x0c1316);
const simCam = new THREE.PerspectiveCamera(42, SIM_W / SIM_H, 1, 2000);
simCam.position.set(0, 260, 300); simCam.lookAt(0, 0, 10);
sim.add(new THREE.HemisphereLight(0xfff2e6, 0x223036, .28));
const sl = new THREE.DirectionalLight(0xffffff, .42); sl.position.set(60, 400, 200); sim.add(sl);
const pad = new THREE.Mesh(new THREE.BoxGeometry(420, 10, 300), new THREE.MeshStandardMaterial({ color: 0xb98a80, roughness: .9 })); pad.position.y = -5; sim.add(pad);
const board2 = new THREE.Mesh(new THREE.BoxGeometry(260, 8, 140), new THREE.MeshStandardMaterial({ color: 0x5e7480, roughness: .6 })); board2.position.y = 4; sim.add(board2);
const pegs = [];
for (let i = 0; i < 6; i++) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 34, 16), new THREE.MeshStandardMaterial({ color: 0xdfe5e8, roughness: .4 }));
  p.position.set(-100 + i * 40, 25, i % 2 ? 30 : -30); sim.add(p); pegs.push(p.position.clone());
}
const ringCols = [0xd94b3d, 0x3f8fd8, 0x46b36a];
const rings = ringCols.map((c, i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(10, 3.4, 10, 3), new THREE.MeshStandardMaterial({ color: c, roughness: .5 }));
  r.rotation.x = Math.PI / 2; r.position.copy(pegs[i]).setY(12); sim.add(r); return r; });
function instrument() {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 320, 16), new THREE.MeshStandardMaterial({ color: 0x2d3236, metalness: .6, roughness: .35 }));
  shaft.position.y = 160; g.add(shaft);
  const wrist = new THREE.Mesh(new THREE.SphereGeometry(5.5, 16, 12), new THREE.MeshStandardMaterial({ color: 0x9aa4aa, metalness: .8, roughness: .25 })); g.add(wrist);
  const jaws = [-1, 1].map(s => { const j = new THREE.Mesh(new THREE.BoxGeometry(2.6, 20, 5), new THREE.MeshStandardMaterial({ color: 0xc6ced3, metalness: .85, roughness: .25 }));
    j.geometry.translate(0, -10, 0); g.add(j); return j; });
  sim.add(g); return { g, jaws };
}
const instL = instrument(), instR = instrument();
const tipPos = new THREE.Vector3();
function poseInstrument(inst, tip, port, open) {
  inst.g.position.copy(tip);
  const dir = port.clone().sub(tip).normalize();
  inst.g.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
  inst.jaws[0].rotation.z = open * .5; inst.jaws[1].rotation.z = -open * .5;
}
const portL = V(-260, 380, 120), portR = V(260, 380, 120);
let grip = 0;
function stepSim(t) {
  // right instrument carries the red ring from peg 0 to peg 5 and back; left instrument hovers as the assist
  const cycle = 9, u = (t % cycle) / cycle;
  const from = pegs[0], to = pegs[5];
  const forward = Math.floor(t / cycle) % 2 === 0;
  const A = forward ? from : to, B = forward ? to : from;
  let pos, open, carry;
  if (u < .18) { const k = u / .18; pos = A.clone().setY(70 - 52 * k); open = 1; carry = false; }
  else if (u < .28) { pos = A.clone().setY(18); open = 1 - (u - .18) / .1; carry = false; }
  else if (u < .72) { const k = (u - .28) / .44, e = k * k * (3 - 2 * k); pos = A.clone().lerp(B, e).setY(18 + Math.sin(Math.PI * e) * 70); open = 0; carry = true; }
  else if (u < .82) { pos = B.clone().setY(18); open = (u - .72) / .1; carry = false; }
  else { const k = (u - .82) / .18; pos = B.clone().setY(18 + 52 * k); open = 1; carry = false; }
  poseInstrument(instR, pos, portR, open);
  if (carry || (u >= .72 && u < .73)) rings[0].position.set(pos.x, pos.y - 8, pos.z);
  else if (u >= .72) rings[0].position.copy(B).setY(12);
  else rings[0].position.copy(A).setY(12);
  poseInstrument(instL, V(-130 + Math.sin(t * .7) * 14, 60 + Math.sin(t * 1.1) * 8, 40 + Math.cos(t * .6) * 10), portL, .4 + .3 * Math.sin(t * 1.3));
  grip = carry ? 2.2 + Math.sin(t * 9) * .15 : Math.max(0, grip - .08);
}
function drawHud(t) {
  const c = hudCanvas.getContext("2d"), W = SIM_W, H = SIM_H;
  c.clearRect(0, 0, W, H);
  c.font = "500 26px 'IBM Plex Mono', monospace"; c.textBaseline = "top"; c.fillStyle = "rgba(230,240,242,.92)";
  const s = Math.floor(t) % 600;
  c.fillText(`PEG TRANSFER   ${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`, 28, 24);
  c.textAlign = "right"; c.fillText("BOARD 200 Hz  ·  HAPTICS 100 Hz", W - 28, 24); c.textAlign = "left";
  for (const [k, side, val] of [[0, "L GRIP", .4], [1, "R GRIP", grip]]) {
    const x = k ? W - 330 : 28, y = H - 64;
    c.fillStyle = "rgba(230,240,242,.92)"; c.fillText(`${side}  ${val.toFixed(1)} N`, x, y - 36);
    c.fillStyle = "rgba(255,255,255,.18)"; c.fillRect(x, y, 300, 14);
    c.fillStyle = "#5cb8b0"; c.fillRect(x, y, 300 * Math.min(val / 3, 1), 14);
  }
  hudTex.needsUpdate = true;
}

/* ---------- views, selection, labels ---------- */
const VIEWS = {
  overview: { cam: [1350, 820, 820], tgt: [0, 0, -120] },
  operator: { cam: [760, 0, 430], tgt: [-180, 0, 70] },
  tray: { cam: [150, -30, 330], tgt: [-45, 0, 10] },
  pedals: { cam: [1150, -380, -360], tgt: [520, 0, -700] },
  screen: { cam: [20, 0, 170], tgt: [-440, 0, 130] },
};
const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
let tween = null;
function flyTo(cam, tgt, ms = 800) {
  const c = T(...cam), t = T(...tgt);
  if (reduce) { camera.position.copy(c); controls.target.copy(t); controls.update(); return; }
  tween = { c0: camera.position.clone(), t0: controls.target.clone(), c, t, start: performance.now(), ms };
}
function setView(k) { if (VIEWS[k]) flyTo(VIEWS[k].cam, VIEWS[k].tgt); }
camera.position.copy(T(...VIEWS.overview.cam)); controls.target.copy(T(...VIEWS.overview.tgt));

let selected = null;
const glowCol = new THREE.Color(0x23726d);
function setXray(on) {
  for (const m of ctrlMeshes) { m.material.transparent = on; m.material.opacity = on ? .16 : 1; m.material.depthWrite = !on; m.castShadow = !on; m.material.needsUpdate = true; }
}
function select(id, fly = true) {
  if (selected && itemMeshes[selected]) for (const m of itemMeshes[selected]) { const ms = Array.isArray(m.material) ? m.material : [m.material]; ms.forEach(x => { if (x.emissive) x.emissive.setHex(0x000000); }); }
  selected = id || null;
  const it = selected && byId[selected];
  setXray(!!(it && it.xray));
  if (it && fly) {
    const dir = V(1, Math.sign(it.at[1]) * .55, .8).normalize().multiplyScalar(it.r * 2.7);
    flyTo([it.at[0] + dir.x, it.at[1] + dir.y, it.at[2] + dir.z], it.at);
  }
}

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let down = null;
const onDown = e => { down = [e.clientX, e.clientY]; };
const onUp = e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(pickables.filter(m => m.visible && !(m.material.transparent && m.material.opacity < .5)), false)[0];
  const id = hit ? hit.object.userData.item : null;
  select(id, !!hit);
  if (opts.onSelect) opts.onSelect(id);
};
canvas.addEventListener("pointerdown", onDown);
canvas.addEventListener("pointerup", onUp);

let showLabels = true;
let themeKey = "";
function themeColors() {
  const cs = getComputedStyle(opts.root || document.documentElement);
  const st = cs.getPropertyValue("--stage").trim() || "#c9d2d7", fl = cs.getPropertyValue("--floor").trim() || "#b3bdc2", ac = cs.getPropertyValue("--accent").trim() || "#23726d";
  const key = st + fl + ac; if (key === themeKey) return; themeKey = key;
  scene.background = new THREE.Color(st); floorMat.color.set(fl); glowCol.set(ac);
}
themeColors();

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  camera.fov = w / h < 1 ? 50 : 35; camera.updateProjectionMatrix();
}
const ro = new ResizeObserver(resize); ro.observe(stage); resize();

const tmp = new THREE.Vector3();
function placePins() {
  const w = stage.clientWidth, h = stage.clientHeight;
  for (const it of ITEMS) {
    const el = opts.getPin && opts.getPin(it.id);
    if (!el) continue;
    if (!showLabels) { el.style.display = "none"; continue; }
    tmp.copy(T(...it.at)).project(camera);
    const far = it.group === "Electronics tray" || it.id === "buck" || it.id === "cp2102" || it.id === "nano" ? camera.position.distanceTo(T(...it.at)) > 1100 && it.id !== "tray" && it.id !== selected : false;
    const off = far || tmp.z > 1 || Math.abs(tmp.x) > 1.05 || Math.abs(tmp.y) > 1.05;
    el.style.display = off ? "none" : "flex";
    if (!off) el.style.transform = `translate(${((tmp.x * .5 + .5) * w).toFixed(1)}px, ${((-tmp.y * .5 + .5) * h).toFixed(1)}px) translate(-50%, -50%)`;
  }
}

const clock = new THREE.Clock();
let frame = 0;
function animate() {
  const t = clock.getElapsedTime();
  if (++frame % 60 === 0) themeColors();
  if (tween) {
    const k = Math.min(1, (performance.now() - tween.start) / tween.ms), e = 1 - Math.pow(1 - k, 3);
    camera.position.lerpVectors(tween.c0, tween.c, e); controls.target.lerpVectors(tween.t0, tween.t, e);
    if (k >= 1) tween = null;
  }
  controls.update();
  if (!tween) clampView();
  if (selected && itemMeshes[selected]) {
    const pulse = reduce ? .35 : .22 + .18 * Math.sin(t * 4);
    for (const m of itemMeshes[selected]) { const ms = Array.isArray(m.material) ? m.material : [m.material];
      ms.forEach(x => { if (x.emissive) { x.emissive.copy(glowCol); x.emissiveIntensity = pulse; } }); }
  }
  stepSim(reduce ? 4 : t);
  if (frame % 2 === 0) { renderer.setRenderTarget(simRT); renderer.render(sim, simCam); renderer.setRenderTarget(null); }
  if (frame % 8 === 1) drawHud(t);
  renderer.render(scene, camera);
  placePins();
}

let ready = false, onScreen = true, dead = false;
const io = new IntersectionObserver(es => { onScreen = es[0].isIntersecting; if (ready && !dead) renderer.setAnimationLoop(onScreen ? animate : null); }, { rootMargin: "100px" });
io.observe(stage);
loadGLB().then(() => {
  if (dead) return;
  ready = true;
  if (opts.onReady) opts.onReady();
  if (onScreen) renderer.setAnimationLoop(animate);
}).catch(err => { if (opts.onError) opts.onError("the rig model did not load (" + ((err && err.message) || err) + ")."); });

return {
  select, setView,
  setLabels(on) { showLabels = !!on; },
  setWires(on) { wires.visible = !!on; },
  dispose() {
    dead = true; renderer.setAnimationLoop(null); io.disconnect(); ro.disconnect();
    canvas.removeEventListener("pointerdown", onDown); canvas.removeEventListener("pointerup", onUp);
    controls.dispose(); renderer.dispose();
  },
};
}
return { ITEMS, WIRES, mount };
})();
