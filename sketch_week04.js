let capture;
let filterSelect;

let pixelSlider;
let shiftSlider;
let edgeSlider;

let pixelLabel;
let shiftLabel;
let edgeLabel;

function setup() {
  createCanvas(640, 480).parent("camera-col");
  capture = createCapture(VIDEO);
  capture.size(width, height);
  capture.hide();

  // 任何滤镜模式下都可以保存当前画面（含滤镜效果）
  createButton("Save Photo")
    .parent("camera-col")
    .mousePressed(() => saveCanvas("filtered-photo-" + Date.now(), "png"));

  createDiv("Filter Mode").parent("camera-col");
  filterSelect = createSelect().parent("camera-col");
  ["Original", "Pixelate", "RGB Channel Shift", "Edge Detection"].forEach((o) => filterSelect.option(o));
  filterSelect.changed(updateSliderStates);

  pixelLabel = createDiv("Pixel Block Size").parent("camera-col");
  pixelSlider = createSlider(2, 30, 8).parent("camera-col");

  shiftLabel = createDiv("Channel Shift Amount").parent("camera-col");
  shiftSlider = createSlider(0, 60, 15).parent("camera-col");

  edgeLabel = createDiv("Edge Sensitivity").parent("camera-col");
  edgeSlider = createSlider(1, 15, 4).parent("camera-col");

  buildDudePanel(); // Pixel Dude 独立于滤镜，放在摄像头右侧
  updateSliderStates();
}

function draw() {
  capture.loadPixels();

  const mode = filterSelect.value();

  if (mode === "Original") {
    image(capture, 0, 0);
  } else if (mode === "Pixelate") {
    pixelateFilter();
  } else if (mode === "RGB Channel Shift") {
    rgbShiftFilter();
  } else if (mode === "Edge Detection") {
    edgeFilter();
  }

  drawDudePhoto();
}

// 只显示当前滤镜用得到的滑块
function updateSliderStates() {
  const mode = filterSelect.value();
  [
    [pixelLabel, pixelSlider, "Pixelate"],
    [shiftLabel, shiftSlider, "RGB Channel Shift"],
    [edgeLabel, edgeSlider, "Edge Detection"],
  ].forEach(([label, slider, m]) => {
    if (mode === m) { label.show(); slider.show(); }
    else { label.hide(); slider.hide(); }
  });
}

function pixelateFilter() {
  const block = pixelSlider.value();

  for (let x = 0; x < width; x += block) {
    for (let y = 0; y < height; y += block) {
      const idx = (y * width + x) * 4;

      const r = capture.pixels[idx];
      const g = capture.pixels[idx + 1];
      const b = capture.pixels[idx + 2];

      fill(r, g, b);
      noStroke();
      rect(x, y, block, block);
    }
  }
}

// 重写RGB通道偏移，错位效果大幅增强
function rgbShiftFilter() {
  const shift = shiftSlider.value();
  let shifted = createImage(width, height);
  shifted.loadPixels();

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4;

      // Red channel: offset LEFT & UP
      let rX = x - shift;
      let rY = y - shift;
      if (rX < 0) rX = 0;
      if (rY < 0) rY = 0;
      const rIndex = (rY * width + rX) * 4;

      // Green stays in original position
      const gIndex = idx;

      // Blue channel: offset RIGHT & DOWN
      let bX = x + shift;
      let bY = y + shift;
      if (bX >= width) bX = width - 1;
      if (bY >= height) bY = height - 1;
      const bIndex = (bY * width + bX) * 4;

      shifted.pixels[idx] = capture.pixels[rIndex];
      shifted.pixels[idx + 1] = capture.pixels[gIndex + 1];
      shifted.pixels[idx + 2] = capture.pixels[bIndex + 2];
      shifted.pixels[idx + 3] = 255;
    }
  }
  shifted.updatePixels();
  image(shifted, 0, 0);
}

function edgeFilter() {
  const sensitivity = edgeSlider.value();

  let result = createImage(width, height);
  result.loadPixels();

  for (let x = 1; x < width - 1; x++) {
    for (let y = 1; y < height - 1; y++) {
      const idx = (y * width + x) * 4;
      const upIdx = ((y - 1) * width + x) * 4;
      const leftIdx = (y * width + (x - 1)) * 4;

      const bright =
        (capture.pixels[idx] +
          capture.pixels[idx + 1] +
          capture.pixels[idx + 2]) /
        3;
      const brightUp =
        (capture.pixels[upIdx] +
          capture.pixels[upIdx + 1] +
          capture.pixels[upIdx + 2]) /
        3;
      const brightLeft =
        (capture.pixels[leftIdx] +
          capture.pixels[leftIdx + 1] +
          capture.pixels[leftIdx + 2]) /
        3;

      const edge = abs(bright - brightUp) + abs(bright - brightLeft);
      const colorVal = edge * sensitivity;

      result.pixels[idx] = colorVal;
      result.pixels[idx + 1] = colorVal;
      result.pixels[idx + 2] = colorVal;
      result.pixels[idx + 3] = 255;
    }
  }

  result.updatePixels();
  image(result, 0, 0);
}


// =====================================================
// Pixel Dude：拍照取色 -> 生成像素小人 -> 自定义 -> 导出
// 想加新发型/帽子/眼镜：在下面的 HAIRS / HATS / GLASSES 里照样子加一行即可
// =====================================================
const DW = 16, DH = 20, PS = 10; // 小人 16x20 像素，预览放大 10 倍
const PANTS = "#2b2d42", SHOE = "#14141f", EYE = "#1b1b1b", MOUTH = "#a8574a", GOLD = "#f2c14e";

function fillBox(x, y, w, h, c) { dctx.fillStyle = c; dctx.fillRect(x, y, w, h); }
function dot(x, y, c) { fillBox(x, y, 1, 1, c); }

// 头部范围：x 3~12, y 5~11
const HAIRS = {
  short: (c) => { fillBox(4, 4, 8, 1, c); fillBox(3, 5, 10, 2, c); },
  long: (c) => { fillBox(4, 4, 8, 1, c); fillBox(3, 5, 10, 2, c); fillBox(2, 6, 1, 7, c); fillBox(13, 6, 1, 7, c); },
  spiky: (c) => { fillBox(3, 4, 10, 3, c); [4, 6, 9, 11].forEach((x) => dot(x, 3, c)); },
  buzz: (c) => { fillBox(4, 5, 8, 1, c); },
  mohawk: (c) => { fillBox(7, 1, 2, 5, c); },
  bob: (c) => { fillBox(4, 4, 8, 1, c); fillBox(3, 5, 10, 2, c); fillBox(2, 5, 1, 5, c); fillBox(13, 5, 1, 5, c); },
  afro: (c) => { fillBox(5, 2, 6, 1, c); fillBox(3, 3, 10, 2, c); fillBox(2, 5, 12, 2, c); fillBox(2, 7, 1, 3, c); fillBox(13, 7, 1, 3, c); },
  bun: (c) => { fillBox(4, 4, 8, 1, c); fillBox(3, 5, 10, 2, c); fillBox(6, 2, 4, 2, c); },
  bald: () => {},
};

const HATS = {
  none: () => {},
  wizard: (c) => { fillBox(7, 0, 2, 1, c); fillBox(6, 1, 4, 1, c); fillBox(5, 2, 6, 2, c); fillBox(2, 4, 12, 1, c); fillBox(5, 3, 6, 1, GOLD); },
  cap: (c) => { fillBox(4, 3, 8, 3, c); fillBox(3, 6, 10, 1, c); },
  crown: (c) => { fillBox(4, 3, 8, 2, c); [4, 7, 8, 11].forEach((x) => dot(x, 2, c)); },
  beanie: (c) => { fillBox(5, 2, 6, 1, c); fillBox(4, 3, 8, 1, c); fillBox(3, 4, 10, 2, c); fillBox(7, 1, 2, 1, "#fff"); },
  tophat: (c) => { fillBox(5, 0, 6, 4, c); fillBox(2, 4, 12, 1, c); fillBox(5, 3, 6, 1, "#d94f4f"); },
  cowboy: (c) => { fillBox(4, 1, 8, 3, c); fillBox(4, 3, 8, 1, "#5a3a1f"); fillBox(1, 4, 14, 1, c); dot(1, 3, c); dot(14, 3, c); },
  party: (c) => { dot(7, 0, GOLD); dot(8, 0, GOLD); fillBox(7, 1, 2, 1, c); fillBox(6, 2, 4, 1, c); fillBox(5, 3, 6, 2, c); dot(8, 2, "#fff"); dot(6, 3, "#fff"); dot(9, 4, "#fff"); },
  bandana: (c) => { fillBox(4, 4, 8, 1, c); fillBox(3, 5, 10, 2, c); fillBox(13, 6, 2, 1, c); dot(14, 7, c); dot(5, 5, "#fff"); dot(8, 5, "#fff"); dot(10, 6, "#fff"); },
};

// 眼镜只画镜框，镜片中间留空（能看到眼睛）；round 镜框 4x3，square/catEye 4x4，左框 x3~6，右框 x9~12
const GLASSES = {
  none: () => {},
  round: (c) => {
    [3, 9].forEach((x) => { fillBox(x + 1, 7, 2, 1, c); fillBox(x + 1, 9, 2, 1, c); dot(x, 8, c); dot(x + 3, 8, c); });
    dot(7, 7, c); dot(8, 7, c);
  },
  square: (c) => {
    [3, 9].forEach((x) => { fillBox(x, 7, 4, 1, c); fillBox(x, 10, 4, 1, c); fillBox(x, 8, 1, 2, c); fillBox(x + 3, 8, 1, 2, c); });
    dot(7, 7, c); dot(8, 7, c);
  },
  catEye: (c) => {
    [3, 9].forEach((x) => { fillBox(x, 7, 4, 1, c); fillBox(x, 10, 4, 1, c); fillBox(x, 8, 1, 2, c); fillBox(x + 3, 8, 1, 2, c); });
    dot(7, 7, c); dot(8, 7, c); dot(3, 6, c); dot(12, 6, c);
  },
};

let dudeCanvas, dctx, previewCanvas, pctx, photoCanvas, photoCtx, snapCanvas, snapCtx;
let shotBtn, hairSel, hatSel, glassesSel, scaleSel, idleBox;
let skinPick, hairPick, shirtPick, hatPick, glassPick;
let frozen = false;

// 取色区域（坐标按 640x480 摄像头画面计算）
const SAMPLE = {
  hair: { x: 300, y: 80, w: 40, h: 20 },
  skin: { x: 305, y: 215, w: 30, h: 15 },
  shirt: { x: 290, y: 420, w: 60, h: 30 },
};

function buildDudePanel() {
  const col = document.getElementById("dude-col");
  createDiv("Pixel Dude").parent("dude-col").style("font-weight", "bold");
  createDiv("Drag a box to move it, drag its corner to resize.").parent("dude-col").style("font-size", "12px");

  photoCanvas = document.createElement("canvas");
  photoCanvas.id = "photo-canvas";
  photoCanvas.width = 320;
  photoCanvas.height = 240;
  photoCtx = photoCanvas.getContext("2d");
  col.appendChild(photoCanvas);
  snapCanvas = document.createElement("canvas");
  snapCanvas.width = 640;
  snapCanvas.height = 480;
  snapCtx = snapCanvas.getContext("2d", { willReadFrequently: true });
  attachBoxDrag(photoCanvas);

  shotBtn = createButton("Take Photo").parent("dude-col");
  shotBtn.mousePressed(toggleShot);

  const row = createDiv().id("dude-row").parent("dude-col");
  dudeCanvas = document.createElement("canvas");
  dudeCanvas.width = DW;
  dudeCanvas.height = DH;
  dctx = dudeCanvas.getContext("2d");
  previewCanvas = document.createElement("canvas");
  previewCanvas.id = "dude-preview";
  previewCanvas.width = DW * PS;
  previewCanvas.height = DH * PS;
  pctx = previewCanvas.getContext("2d");
  row.elt.appendChild(previewCanvas);

  const ui = createDiv().id("dude-ui").parent(row);
  hairSel = addSelect(ui, "Hair", Object.keys(HAIRS));
  hatSel = addSelect(ui, "Hat", Object.keys(HATS));
  hatSel.selected("wizard");
  glassesSel = addSelect(ui, "Glasses", Object.keys(GLASSES));
  [hairSel, hatSel, glassesSel].forEach((s) => s.changed(updateVisibility));

  skinPick = addPicker(ui, "Skin", "#f0c8a0");
  hairPick = addPicker(ui, "Hair color", "#4a3020");
  shirtPick = addPicker(ui, "Shirt", "#3a6ea5");
  hatPick = addPicker(ui, "Hat color", "#6a3da0");
  glassPick = addPicker(ui, "Frame color", "#2e4a8f");

  idleBox = createCheckbox(" Idle animation", true).parent(ui);

  const sizeRow = createDiv("Export size ").parent(ui);
  scaleSel = createSelect().parent(sizeRow);
  [1, 4, 8, 16].forEach((n) => scaleSel.option(n + "x", n));
  scaleSel.selected("8");
  createButton("Download still PNG").parent(ui).mousePressed(() => exportDude(1, "pixel-dude.png"));
  createButton("Download idle sheet").parent(ui).mousePressed(() => exportDude(2, "pixel-dude-idle-sheet.png"));

  updateVisibility();
}

function addSelect(parent, label, opts) {
  const row = createDiv(label + " ").parent(parent);
  const sel = createSelect().parent(row);
  opts.forEach((o) => sel.option(o));
  return sel;
}

function addPicker(parent, label, hex) {
  const row = createDiv(label + " ").parent(parent);
  return createColorPicker(hex).parent(row);
}

// 只显示当前选择下用得到的颜色选项
function updateVisibility() {
  const set = (p, on) => (p.elt.parentElement.style.display = on ? "" : "none");
  set(hairPick, hairSel.value() !== "bald");
  set(hatPick, hatSel.value() !== "none");
  set(glassPick, glassesSel.value() !== "none");
}

function toggleShot() {
  if (frozen) {
    frozen = false;
    shotBtn.html("Take Photo");
    return;
  }
  snapCtx.drawImage(capture.elt, 0, 0, 640, 480);
  frozen = true;
  shotBtn.html("Retake");
  for (const k in SAMPLE) applySample(k);
}

function applySample(k) {
  const picks = { hair: hairPick, skin: skinPick, shirt: shirtPick };
  picks[k].value(avgColor(SAMPLE[k]));
}

function avgColor(r) {
  const x = constrain(Math.round(r.x), 0, 639), y = constrain(Math.round(r.y), 0, 479);
  const w = Math.max(1, Math.min(640 - x, Math.round(r.w)));
  const h = Math.max(1, Math.min(480 - y, Math.round(r.h)));
  const d = snapCtx.getImageData(x, y, w, h).data;
  let sr = 0, sg = 0, sb = 0;
  const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) { sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; }
  return "#" + [sr, sg, sb].map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("");
}

// 右侧的小画面：实时画面或拍下的照片 + 可拖动的取色框
function drawDudePhoto() {
  try {
    photoCtx.drawImage(frozen ? snapCanvas : capture.elt, 0, 0, 640, 480, 0, 0, 320, 240);
  } catch (e) {}
  photoCtx.font = "11px sans-serif";
  for (const k in SAMPLE) {
    const s = SAMPLE[k];
    const x = s.x / 2, y = s.y / 2, w = s.w / 2, h = s.h / 2;
    photoCtx.lineWidth = 3;
    photoCtx.strokeStyle = "#000";
    photoCtx.strokeRect(x, y, w, h);
    photoCtx.lineWidth = 1;
    photoCtx.strokeStyle = "#fff";
    photoCtx.strokeRect(x, y, w, h);
    photoCtx.fillStyle = "#fff";
    photoCtx.fillRect(x + w - 4, y + h - 4, 8, 8);
    photoCtx.strokeStyle = "#000";
    photoCtx.strokeRect(x + w - 4, y + h - 4, 8, 8);
    photoCtx.fillText(k, x, y - 3);
  }
  renderPreview();
}

function attachBoxDrag(cv) {
  let key = null, mode = null, dx = 0, dy = 0;
  const pos = (e) => {
    const r = cv.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * 640) / r.width, y: ((e.clientY - r.top) * 480) / r.height };
  };
  cv.addEventListener("pointerdown", (e) => {
    const p = pos(e);
    const keys = Object.keys(SAMPLE).reverse();
    for (const k of keys) {
      const s = SAMPLE[k];
      if (Math.abs(p.x - (s.x + s.w)) < 14 && Math.abs(p.y - (s.y + s.h)) < 14) { key = k; mode = "resize"; break; }
    }
    if (!key) {
      for (const k of keys) {
        const s = SAMPLE[k];
        if (p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h) { key = k; mode = "move"; dx = p.x - s.x; dy = p.y - s.y; break; }
      }
    }
    if (key) cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointermove", (e) => {
    if (!key) return;
    const p = pos(e), s = SAMPLE[key];
    if (mode === "move") {
      s.x = constrain(p.x - dx, 0, 640 - s.w);
      s.y = constrain(p.y - dy, 0, 480 - s.h);
    } else {
      s.w = constrain(p.x - s.x, 8, 640 - s.x);
      s.h = constrain(p.y - s.y, 8, 480 - s.y);
    }
    if (frozen) applySample(key); // 已拍照时，拖动后立即重新取色
  });
  const end = () => { key = null; };
  cv.addEventListener("pointerup", end);
  cv.addEventListener("pointercancel", end);
}

function renderPreview() {
  const frame = idleBox.checked() ? Math.floor(millis() / 450) % 2 : 0;
  drawDude(frame);
  pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  pctx.imageSmoothingEnabled = false;
  pctx.drawImage(dudeCanvas, 0, 0, DW, DH, 0, 0, previewCanvas.width, previewCanvas.height);
}

// frame 0 = 站立，frame 1 = 身体下沉 1 像素（腿不动）
function drawDude(frame) {
  dctx.clearRect(0, 0, DW, DH);
  const skin = skinPick.value(), shirt = shirtPick.value();

  fillBox(5, 17, 2, 2, PANTS); fillBox(9, 17, 2, 2, PANTS);
  fillBox(5, 19, 2, 1, SHOE); fillBox(9, 19, 2, 1, SHOE);

  dctx.save();
  dctx.translate(0, frame === 1 ? 1 : 0);

  fillBox(3, 12, 10, 5, shirt);              // 身体
  fillBox(2, 12, 1, 4, shirt); fillBox(13, 12, 1, 4, shirt); // 手臂
  dot(2, 16, skin); dot(13, 16, skin);       // 手
  fillBox(3, 5, 10, 7, skin);                // 头
  dot(5, 8, EYE); dot(10, 8, EYE);           // 眼睛
  fillBox(7, 10, 2, 1, MOUTH);               // 嘴

  HAIRS[hairSel.value()](hairPick.value());
  GLASSES[glassesSel.value()](glassPick.value());
  HATS[hatSel.value()](hatPick.value());

  dctx.restore();
}

// frames=1 导出静止图；frames=2 导出 idle 两帧并排的精灵表（背景透明）
function exportDude(frames, filename) {
  const s = parseInt(scaleSel.value());
  const out = document.createElement("canvas");
  out.width = DW * s * frames;
  out.height = DH * s;
  const c = out.getContext("2d");
  c.imageSmoothingEnabled = false;
  for (let f = 0; f < frames; f++) {
    drawDude(f);
    c.drawImage(dudeCanvas, 0, 0, DW, DH, f * DW * s, 0, DW * s, DH * s);
  }
  const a = document.createElement("a");
  a.download = filename;
  a.href = out.toDataURL("image/png");
  a.click();
}
