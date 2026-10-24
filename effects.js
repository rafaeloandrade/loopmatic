function drawFitToCtx(ctxTarget, canvasW, canvasH, img, mode) {
  const imgRatio = img.width / img.height;
  const canvasRatio = canvasW / canvasH;

  if (mode === 'contain') {
    let dWidth, dHeight, dx, dy;
    if (imgRatio > canvasRatio) {
      dWidth = canvasW;
      dHeight = Math.round(canvasW / imgRatio);
      dx = 0;
      dy = Math.round((canvasH - dHeight) / 2);
    } else {
      dHeight = canvasH;
      dWidth = Math.round(canvasH * imgRatio);
      dy = 0;
      dx = Math.round((canvasW - dWidth) / 2);
    }
    ctxTarget.drawImage(img, 0, 0, img.width, img.height, dx, dy, dWidth, dHeight);
  } else {
    let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
    if (imgRatio > canvasRatio) {
      sHeight = img.height;
      sWidth = Math.round(sHeight * canvasRatio);
      sx = Math.round((img.width - sWidth) / 2);
      sy = 0;
    } else {
      sWidth = img.width;
      sHeight = Math.round(sWidth / canvasRatio);
      sx = 0;
      sy = Math.round((img.height - sHeight) / 2);
    }
    ctxTarget.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvasW, canvasH);
  }
}

// ---------- Effects pipeline ----------
function applyEffectsToContext(ctxTarget, canvasW, canvasH, img, options = {}) {
  let seed = (frameSeed + 1) * 1234567;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  ctxTarget.clearRect(0,0,canvasW,canvasH);
  ctxTarget.fillStyle = '#101418'; ctxTarget.fillRect(0,0,canvasW,canvasH);
  ctxTarget.imageSmoothingEnabled = true;
  const values = options.values || Object.fromEntries(Object.entries(controls).map(([k,v])=>[k,+v.value]));
  const mode = (options.mode === 'cover') ? 'cover' : 'contain';
  drawFitToCtx(ctxTarget, canvasW, canvasH, img, mode);

  let imageData = ctxTarget.getImageData(0, 0, canvasW, canvasH);
  let data = imageData.data;

  const pixelateVal = parseInt(values.pixelate);
  const rs = parseInt(values.rgbSplit);
  const shiftXVal = parseInt(values.shiftX);
  const shiftYVal = parseInt(values.shiftY);
  const nz = parseInt(values.noise);
  const sc = parseInt(values.scanlines);
  const wv = parseInt(values.waves);
  const bl = parseInt(values.blocks);
  const bri = parseInt(values.brightness);
  const sat = parseInt(values.saturation) / 100;
  const hu = parseInt(values.hue);
  const cd = parseInt(values.colorDistortion);

  // Pixelate
  if (pixelateVal > 1) {
    const tmp = document.createElement('canvas');
    tmp.width = Math.max(1, Math.round(canvasW / pixelateVal));
    tmp.height = Math.max(1, Math.round(canvasH / pixelateVal));
    const tctx = tmp.getContext('2d');
    drawFitToCtx(tctx, tmp.width, tmp.height, img, mode);
    ctxTarget.clearRect(0, 0, canvasW, canvasH);
    ctxTarget.imageSmoothingEnabled = false;
    ctxTarget.drawImage(tmp, 0, 0, tmp.width, tmp.height, 0, 0, canvasW, canvasH);
    imageData = ctxTarget.getImageData(0, 0, canvasW, canvasH);
    data = imageData.data;
  }

  // RGB Split
  if (rs !== 0) {
    const temp = new Uint8ClampedArray(data);
    const w = canvasW, h = canvasH;
    const xShift = Math.max(1, Math.round(rs * (w / 480)));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const rPos = Math.min(w - 1, x + xShift);
        const bPos = Math.max(0, x - xShift);
        const rIdx = (y * w + rPos) * 4;
        const bIdx = (y * w + bPos) * 4;
        data[i] = temp[rIdx];
        data[i + 2] = temp[bIdx + 2];
        data[i + 1] = temp[i + 1];
      }
    }
  }

  // Shifts
  if (shiftXVal !== 0 || shiftYVal !== 0) {
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = canvasW; tmpCanvas.height = canvasH;
    const tctx = tmpCanvas.getContext('2d');
    tctx.putImageData(imageData, 0, 0);
    ctxTarget.clearRect(0, 0, canvasW, canvasH);
    ctxTarget.drawImage(tmpCanvas, shiftXVal, shiftYVal);
    ctxTarget.globalAlpha = 0.6;
    ctxTarget.drawImage(tmpCanvas, Math.round(shiftXVal * 0.5), Math.round(shiftYVal * 0.5));
    ctxTarget.globalAlpha = 1;
    imageData = ctxTarget.getImageData(0, 0, canvasW, canvasH);
    data = imageData.data;
  }

  // Noise
  if (nz > 0) {
    for (let i = 0; i < data.length; i += 4) {
      if (random() < nz / 200) {
        const v = random() * 255 | 0;
        data[i] = v; data[i + 1] = v; data[i + 2] = v;
      }
    }
  }

  // Scanlines
  if (sc > 0) {
    for (let y = 0; y < canvasH; y += 2) {
      for (let x = 0; x < canvasW; x++) {
        const idx = (y * canvasW + x) * 4;
        data[idx] = data[idx] * (100 - sc) / 100;
        data[idx + 1] = data[idx + 1] * (100 - sc) / 100;
        data[idx + 2] = data[idx + 2] * (100 - sc) / 100;
      }
    }
  }

  // HSL adjustments
  if (hu !== 0 || sat !== 1 || bri !== 100) {
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      h = (h + hu / 360) % 1; if (h < 0) h += 1;
      s = Math.min(1, Math.max(0, s * sat));
      l = Math.min(1, Math.max(0, l * (bri / 100)));

      let r1, g1, b1;
      if (s === 0) r1 = g1 = b1 = l;
      else {
        const qv = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const pv = 2 * l - qv;
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };
        r1 = hue2rgb(pv, qv, h + 1 / 3);
        g1 = hue2rgb(pv, qv, h);
        b1 = hue2rgb(pv, qv, h - 1 / 3);
      }
      data[i] = Math.round(r1 * 255); data[i + 1] = Math.round(g1 * 255); data[i + 2] = Math.round(b1 * 255);
    }
  }

  // Waves
  if (wv > 0) {
    const temp = new Uint8ClampedArray(data);
    const w = canvasW, h = canvasH;
    for (let y = 0; y < h; y++) {
      const offset = Math.round(Math.sin(y / 8 + frameSeed * 0.73) * wv);
      for (let x = 0; x < w; x++) {
        const dst = (y * w + x) * 4;
        const srcX = ((x - offset) % w + w) % w;
        const src = (y * w + srcX) * 4;
        data[dst] = temp[src]; data[dst + 1] = temp[src + 1]; data[dst + 2] = temp[src + 2]; data[dst + 3] = temp[src + 3];
      }
    }
  }

  ctxTarget.putImageData(imageData, 0, 0);
  // Blocks
  if (bl > 0) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasW; tempCanvas.height = canvasH;
    const tctx = tempCanvas.getContext('2d');
    tctx.putImageData(imageData, 0, 0);
    const blockSize = Math.max(8, Math.floor(Math.min(canvasW, canvasH) / 12));
    for (let y = 0; y < canvasH; y += blockSize) {
      for (let x = 0; x < canvasW; x += blockSize) {
        if (random() * 100 < bl) {
          const dx = x + Math.round((random() - 0.5) * blockSize * 2);
          const dy = y + Math.round((random() - 0.5) * blockSize * 2);
          ctxTarget.drawImage(tempCanvas, x, y, blockSize, blockSize, dx, dy, blockSize, blockSize);
        }
      }
    }
    imageData = ctxTarget.getImageData(0, 0, canvasW, canvasH);
    data = imageData.data;
  }

  ctxTarget.putImageData(imageData, 0, 0);
  // Color Distortion smear
  if (cd > 0) {
    const temp = document.createElement('canvas'); temp.width = canvasW; temp.height = canvasH;
    const tctx = temp.getContext('2d'); tctx.putImageData(imageData, 0, 0);
    ctxTarget.globalCompositeOperation = 'lighter';
    for (let i = -cd; i <= cd; i += Math.max(1, Math.round(cd / 6))) {
      ctxTarget.globalAlpha = 0.04;
      ctxTarget.drawImage(temp, i, 0);
    }
    ctxTarget.globalAlpha = 1;
    ctxTarget.globalCompositeOperation = 'source-over';
    imageData = ctxTarget.getImageData(0, 0, canvasW, canvasH);
    data = imageData.data;
  }

  ctxTarget.putImageData(imageData, 0, 0);
}

