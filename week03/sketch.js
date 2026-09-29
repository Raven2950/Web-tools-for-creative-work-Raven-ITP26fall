let capture;
let filterSelect;

let pixelSlider;
let shiftSlider;
let edgeSlider;

let pixelLabel;
let shiftLabel;
let edgeLabel;

function setup() {
  createCanvas(640, 480);
  capture = createCapture(VIDEO);
  capture.size(width, height);
  capture.hide();

  createDiv("Filter Mode");
  filterSelect = createSelect();
  filterSelect.option("Original");
  filterSelect.option("Pixelate");
  filterSelect.option("RGB Channel Shift");
  filterSelect.option("Edge Detection");
  filterSelect.changed(updateSliderStates);

  pixelLabel = createDiv("Pixel Block Size");
  pixelSlider = createSlider(2, 30, 8);

  shiftLabel = createDiv("Channel Shift Amount");
  // 扩大滑块范围：0 ~ 60
  shiftSlider = createSlider(0, 60, 15);

  edgeLabel = createDiv("Edge Sensitivity");
  edgeSlider = createSlider(1, 15, 4);

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
}

function updateSliderStates() {
  const mode = filterSelect.value();

  pixelSlider.attribute("disabled", true);
  shiftSlider.attribute("disabled", true);
  edgeSlider.attribute("disabled", true);

  pixelLabel.addClass("disabled-text");
  shiftLabel.addClass("disabled-text");
  edgeLabel.addClass("disabled-text");

  if (mode === "Pixelate") {
    pixelSlider.removeAttribute("disabled");
    pixelLabel.removeClass("disabled-text");
  } else if (mode === "RGB Channel Shift") {
    shiftSlider.removeAttribute("disabled");
    shiftLabel.removeClass("disabled-text");
  } else if (mode === "Edge Detection") {
    edgeSlider.removeAttribute("disabled");
    edgeLabel.removeClass("disabled-text");
  }
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
