/**
 * Remaining P1 tools: crop/enlarge/ICO/BMP/GIF, legal generators,
 * domain/HTTP checks, YouTube oEmbed + optional Data API key.
 */
(function () {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Could not decode image'));
        img.src = reader.result;
      };
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Encode failed'))), mime, quality);
    });
  }

  function canvasFromImage(img, bg) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    return canvas;
  }

  /* ---- BMP encoder ---- */
  function canvasToBmpBlob(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext('2d');
    const img = ctx.getImageData(0, 0, w, h);
    const rowSize = (w * 3 + 3) & ~3;
    const pixelSize = rowSize * h;
    const fileSize = 54 + pixelSize;
    const buf = new ArrayBuffer(fileSize);
    const view = new DataView(buf);
    const u8 = new Uint8Array(buf);
    u8[0] = 0x42;
    u8[1] = 0x4d;
    view.setUint32(2, fileSize, true);
    view.setUint32(10, 54, true);
    view.setUint32(14, 40, true);
    view.setInt32(18, w, true);
    view.setInt32(22, -h, true); // top-down
    view.setUint16(26, 1, true);
    view.setUint16(28, 24, true);
    view.setUint32(34, pixelSize, true);
    let o = 54;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        u8[o++] = img.data[i + 2];
        u8[o++] = img.data[i + 1];
        u8[o++] = img.data[i];
      }
      while ((o - 54) % rowSize) u8[o++] = 0;
    }
    return new Blob([buf], { type: 'image/bmp' });
  }

  /* ---- simple single-frame GIF encoder ---- */
  function canvasToGifBlob(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const { data } = canvas.getContext('2d').getImageData(0, 0, w, h);
    // Build 256-color palette by quantizing to 3-3-2
    const palette = new Uint8Array(256 * 3);
    for (let i = 0; i < 256; i++) {
      palette[i * 3] = ((i >> 5) & 7) * 36;
      palette[i * 3 + 1] = ((i >> 2) & 7) * 36;
      palette[i * 3 + 2] = (i & 3) * 85;
    }
    const index = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      index[p] = ((r >> 5) << 5) | ((g >> 5) << 2) | (b >> 6);
    }
    const parts = [];
    function pushBytes(arr) {
      parts.push(arr instanceof Uint8Array ? arr : new Uint8Array(arr));
    }
    pushBytes([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a
    const hdr = new DataView(new ArrayBuffer(7));
    hdr.setUint16(0, w, true);
    hdr.setUint16(2, h, true);
    hdr.setUint8(4, 0xf7); // GCT 256
    hdr.setUint8(5, 0);
    hdr.setUint8(6, 0);
    pushBytes(new Uint8Array(hdr.buffer));
    pushBytes(palette);
    pushBytes([0x2c, 0, 0, 0, 0]); // image descriptor start
    const id = new DataView(new ArrayBuffer(5));
    id.setUint16(0, w, true);
    id.setUint16(2, h, true);
    id.setUint8(4, 0);
    pushBytes(new Uint8Array(id.buffer));
    // LZW min code size 8
    pushBytes([8]);
    const lzw = lzwEncode(index, 8);
    for (let i = 0; i < lzw.length; i += 255) {
      const chunk = lzw.subarray(i, Math.min(i + 255, lzw.length));
      pushBytes([chunk.length]);
      pushBytes(chunk);
    }
    pushBytes([0x00, 0x3b]);
    let total = 0;
    parts.forEach((p) => (total += p.length));
    const out = new Uint8Array(total);
    let o = 0;
    parts.forEach((p) => {
      out.set(p, o);
      o += p.length;
    });
    return new Blob([out], { type: 'image/gif' });
  }

  function lzwEncode(indexStream, minCodeSize) {
    const clear = 1 << minCodeSize;
    const end = clear + 1;
    let codeSize = minCodeSize + 1;
    let nextCode = end + 1;
    const dict = new Map();
    for (let i = 0; i < clear; i++) dict.set(String.fromCharCode(i), i);
    const outBits = [];
    let cur = '';
    function writeCode(code) {
      outBits.push({ code, size: codeSize });
    }
    writeCode(clear);
    for (let i = 0; i < indexStream.length; i++) {
      const k = String.fromCharCode(indexStream[i]);
      const nk = cur + k;
      if (dict.has(nk)) cur = nk;
      else {
        writeCode(dict.get(cur));
        if (nextCode < 4096) {
          dict.set(nk, nextCode++);
          if (nextCode === 1 << codeSize && codeSize < 12) codeSize++;
        } else {
          writeCode(clear);
          dict.clear();
          for (let j = 0; j < clear; j++) dict.set(String.fromCharCode(j), j);
          codeSize = minCodeSize + 1;
          nextCode = end + 1;
        }
        cur = k;
      }
    }
    if (cur) writeCode(dict.get(cur));
    writeCode(end);
    // pack bits little-endian into bytes
    const bytes = [];
    let buf = 0;
    let bits = 0;
    outBits.forEach(({ code, size }) => {
      buf |= code << bits;
      bits += size;
      while (bits >= 8) {
        bytes.push(buf & 255);
        buf >>= 8;
        bits -= 8;
      }
    });
    if (bits > 0) bytes.push(buf & 255);
    return new Uint8Array(bytes);
  }

  /* ---- ICO (PNG payload) ---- */
  async function canvasToIcoBlob(canvas) {
    const png = await canvasToBlob(canvas, 'image/png', 1);
    const pngBuf = new Uint8Array(await png.arrayBuffer());
    const size = 6 + 16 + pngBuf.length;
    const out = new Uint8Array(size);
    const view = new DataView(out.buffer);
    view.setUint16(0, 0, true);
    view.setUint16(2, 1, true);
    view.setUint16(4, 1, true);
    const w = canvas.width >= 256 ? 0 : canvas.width;
    const h = canvas.height >= 256 ? 0 : canvas.height;
    out[6] = w;
    out[7] = h;
    out[8] = 0;
    out[9] = 0;
    view.setUint16(10, 1, true);
    view.setUint16(12, 32, true);
    view.setUint32(14, pngBuf.length, true);
    view.setUint32(18, 22, true);
    out.set(pngBuf, 22);
    return new Blob([out], { type: 'image/x-icon' });
  }

  async function encodeCanvas(canvas, format) {
    if (format === 'bmp') return { blob: canvasToBmpBlob(canvas), ext: '.bmp', mime: 'image/bmp' };
    if (format === 'gif') return { blob: canvasToGifBlob(canvas), ext: '.gif', mime: 'image/gif' };
    if (format === 'ico') return { blob: await canvasToIcoBlob(canvas), ext: '.ico', mime: 'image/x-icon' };
    if (format === 'jpg' || format === 'jpeg') {
      const c = document.createElement('canvas');
      c.width = canvas.width;
      c.height = canvas.height;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(canvas, 0, 0);
      return { blob: await canvasToBlob(c, 'image/jpeg', 0.92), ext: '.jpg', mime: 'image/jpeg' };
    }
    if (format === 'webp') return { blob: await canvasToBlob(canvas, 'image/webp', 0.92), ext: '.webp', mime: 'image/webp' };
    return { blob: await canvasToBlob(canvas, 'image/png', 1), ext: '.png', mime: 'image/png' };
  }

  function initUniversalConverter() {
    const input = $('uc-file');
    const toEl = $('uc-to');
    const btn = $('uc-run');
    const preview = $('uc-preview');
    const dl = $('uc-download');
    if (!input || !btn || !toEl) return;
    btn.addEventListener('click', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const img = await loadImageFromFile(file);
      const canvas = canvasFromImage(img);
      const format = toEl.value;
      const { blob, ext } = await encodeCanvas(canvas, format);
      const url = URL.createObjectURL(blob);
      if (preview) {
        preview.src = url;
        preview.classList.remove('hidden');
      }
      if (dl) {
        dl.classList.remove('hidden');
        dl.onclick = () => downloadBlob(blob, file.name.replace(/\.[^.]+$/, '') + ext);
      }
    });
  }

  function initFixedFormatOut() {
    const root = document.querySelector('[data-encode-format]');
    if (!root) return;
    const format = root.dataset.encodeFormat;
    const input = $('ef-file');
    const btn = $('ef-run');
    const preview = $('ef-preview');
    const dl = $('ef-download');
    if (!input || !btn) return;
    btn.addEventListener('click', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const img = await loadImageFromFile(file);
        // For ICO, max useful size often 256
        let canvas = canvasFromImage(img, format === 'jpg' ? '#fff' : null);
        if (format === 'ico' && (canvas.width > 256 || canvas.height > 256)) {
          const scale = Math.min(256 / canvas.width, 256 / canvas.height);
          const c2 = document.createElement('canvas');
          c2.width = Math.max(1, Math.round(canvas.width * scale));
          c2.height = Math.max(1, Math.round(canvas.height * scale));
          c2.getContext('2d').drawImage(canvas, 0, 0, c2.width, c2.height);
          canvas = c2;
        }
        const { blob, ext } = await encodeCanvas(canvas, format);
        const url = URL.createObjectURL(blob);
        if (preview) {
          preview.src = format === 'ico' ? url : url;
          preview.classList.remove('hidden');
        }
        if (dl) {
          dl.classList.remove('hidden');
          dl.onclick = () => downloadBlob(blob, file.name.replace(/\.[^.]+$/, '') + ext);
        }
      } catch (e) {
        alert(e.message || 'Conversion failed');
      }
    });
  }

  function initIcoToPng() {
    const input = $('ico-file');
    const btn = $('ico-run');
    const preview = $('ico-preview');
    const dl = $('ico-download');
    if (!input || !btn) return;
    btn.addEventListener('click', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const buf = new Uint8Array(await file.arrayBuffer());
      // Prefer embedded PNG in ICO
      const pngSig = [0x89, 0x50, 0x4e, 0x47];
      let pngStart = -1;
      for (let i = 0; i < buf.length - 4; i++) {
        if (buf[i] === pngSig[0] && buf[i + 1] === pngSig[1] && buf[i + 2] === pngSig[2] && buf[i + 3] === pngSig[3]) {
          pngStart = i;
          break;
        }
      }
      if (pngStart >= 0) {
        const png = buf.slice(pngStart);
        const blob = new Blob([png], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        preview.src = url;
        preview.classList.remove('hidden');
        dl.classList.remove('hidden');
        dl.onclick = () => downloadBlob(blob, file.name.replace(/\.[^.]+$/, '.png'));
        return;
      }
      // Fallback: let browser decode if possible
      try {
        const img = await loadImageFromFile(file);
        const canvas = canvasFromImage(img);
        const blob = await canvasToBlob(canvas, 'image/png', 1);
        const url = URL.createObjectURL(blob);
        preview.src = url;
        preview.classList.remove('hidden');
        dl.classList.remove('hidden');
        dl.onclick = () => downloadBlob(blob, file.name.replace(/\.[^.]+$/, '.png'));
      } catch (e) {
        alert('Could not decode this ICO. Try a PNG-compressed ICO.');
      }
    });
  }

  function initImageCropper() {
    const input = $('crop-file');
    const canvas = $('crop-canvas');
    const btn = $('crop-run');
    const dl = $('crop-download');
    if (!input || !canvas || !btn) return;
    const ctx = canvas.getContext('2d');
    let img = null;
    let start = null;
    let rect = null;

    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      img = await loadImageFromFile(file);
      const maxW = 700;
      const scale = Math.min(1, maxW / img.naturalWidth);
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.dataset.scale = String(scale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      rect = null;
    });

    function pos(e) {
      const r = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: Math.max(0, Math.min(canvas.width, ((clientX - r.left) / r.width) * canvas.width)),
        y: Math.max(0, Math.min(canvas.height, ((clientY - r.top) / r.height) * canvas.height)),
      };
    }

    function redraw() {
      if (!img) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      if (rect) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.clearRect(rect.x, rect.y, rect.w, rect.h);
        ctx.drawImage(img, rect.x / (+canvas.dataset.scale), rect.y / (+canvas.dataset.scale), rect.w / (+canvas.dataset.scale), rect.h / (+canvas.dataset.scale), rect.x, rect.y, rect.w, rect.h);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      }
    }

    canvas.addEventListener('mousedown', (e) => {
      start = pos(e);
      rect = { x: start.x, y: start.y, w: 0, h: 0 };
    });
    canvas.addEventListener('mousemove', (e) => {
      if (!start) return;
      const p = pos(e);
      rect = {
        x: Math.min(start.x, p.x),
        y: Math.min(start.y, p.y),
        w: Math.abs(p.x - start.x),
        h: Math.abs(p.y - start.y),
      };
      redraw();
    });
    window.addEventListener('mouseup', () => {
      start = null;
    });

    btn.addEventListener('click', async () => {
      if (!img || !rect || rect.w < 2 || rect.h < 2) {
        alert('Drag on the image to select a crop area.');
        return;
      }
      const scale = +canvas.dataset.scale || 1;
      const out = document.createElement('canvas');
      out.width = Math.round(rect.w / scale);
      out.height = Math.round(rect.h / scale);
      out.getContext('2d').drawImage(img, rect.x / scale, rect.y / scale, out.width, out.height, 0, 0, out.width, out.height);
      const blob = await canvasToBlob(out, 'image/png', 1);
      dl.classList.remove('hidden');
      dl.onclick = () => downloadBlob(blob, 'cropped.png');
    });
  }

  function initImageEnlarger() {
    const input = $('en-file');
    const scaleEl = $('en-scale');
    const btn = $('en-run');
    const preview = $('en-preview');
    const dl = $('en-download');
    if (!input || !btn) return;
    btn.addEventListener('click', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const img = await loadImageFromFile(file);
      const scale = Number((scaleEl || {}).value) || 2;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToBlob(canvas, 'image/png', 1);
      const url = URL.createObjectURL(blob);
      preview.src = url;
      preview.classList.remove('hidden');
      dl.classList.remove('hidden');
      dl.onclick = () => downloadBlob(blob, 'enlarged-' + file.name.replace(/\.[^.]+$/, '.png'));
    });
  }

  function initPrivacyTerms() {
    const tool = document.body.dataset.tool;
    const btn = $('legal-run');
    const out = $('legal-out');
    if (!btn || !out) return;
    btn.addEventListener('click', () => {
      const name = ($('legal-name') || {}).value || 'Company Name';
      const site = ($('legal-site') || {}).value || 'https://example.com';
      const email = ($('legal-email') || {}).value || 'privacy@example.com';
      const country = ($('legal-country') || {}).value || 'United States';
      const date = new Date().toISOString().slice(0, 10);
      if (tool === 'privacy-policy-generator') {
        out.value = `Privacy Policy\n\nEffective date: ${date}\n\n${name} ("we", "us") operates ${site}.\n\n1. Information We Collect\nWe may collect information you provide directly (such as name, email) and technical data such as IP address, browser type, and usage analytics.\n\n2. How We Use Information\nWe use information to operate and improve the website, communicate with you, and comply with legal obligations.\n\n3. Cookies\nWe may use cookies or similar technologies for analytics and advertising.\n\n4. Third-Party Services\nWe may use third-party providers (for example analytics or ads). Their use of data is governed by their own policies.\n\n5. Data Retention\nWe retain information only as long as needed for the purposes described in this policy.\n\n6. Your Rights\nDepending on your location (${country}), you may have rights to access, correct, or delete personal data. Contact ${email}.\n\n7. Children's Privacy\nThis site is not directed to children under 13.\n\n8. Changes\nWe may update this policy. The effective date above will change when we do.\n\n9. Contact\nEmail: ${email}\nWebsite: ${site}\n\nThis template is not legal advice. Review with a qualified attorney.`;
      } else {
        out.value = `Terms and Conditions\n\nEffective date: ${date}\n\nThese Terms govern your use of ${site}, operated by ${name}.\n\n1. Acceptance\nBy accessing the site, you agree to these Terms.\n\n2. Use of the Service\nYou agree not to misuse the site, attempt unauthorized access, or use it for unlawful purposes.\n\n3. Intellectual Property\nContent and branding on the site belong to ${name} or its licensors.\n\n4. Disclaimer\nTools and content are provided "as is" without warranties of any kind.\n\n5. Limitation of Liability\nTo the maximum extent permitted by law in ${country}, ${name} is not liable for indirect or consequential damages arising from use of the site.\n\n6. Third-Party Links\nWe are not responsible for third-party websites linked from the service.\n\n7. Termination\nWe may suspend access if you violate these Terms.\n\n8. Governing Law\nThese Terms are governed by the laws of ${country}.\n\n9. Contact\nQuestions: ${email}\n\nThis template is not legal advice. Review with a qualified attorney.`;
      }
    });
  }

  async function initHttpStatus() {
    const input = $('http-url');
    const btn = $('http-run');
    const out = $('http-out');
    if (!input || !btn || !out) return;
    btn.addEventListener('click', async () => {
      let url = input.value.trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      out.textContent = 'Checking…';
      try {
        const proxy = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url);
        const res = await fetch(proxy);
        const data = await res.json();
        const code = data.status && data.status.http_code;
        out.innerHTML =
          '<p class="text-2xl font-bold">' +
          (code || 'Unknown') +
          '</p><p class="text-sm text-gray-600 break-all">' +
          url +
          '</p><p class="text-xs text-gray-500 mt-2">Checked via public CORS proxy (allorigins). For production monitoring, use a server-side checker.</p>';
      } catch (e) {
        out.textContent = 'Lookup failed. The target may block proxies or be unreachable.';
      }
    });
  }

  async function initDomainAge() {
    const input = $('dom-input');
    const btn = $('dom-run');
    const out = $('dom-out');
    if (!input || !btn || !out) return;
    btn.addEventListener('click', async () => {
      let domain = input.value.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
      if (!domain) return;
      out.textContent = 'Looking up…';
      try {
        // who-dat free whois API
        const res = await fetch('https://who-dat.as93.net/' + encodeURIComponent(domain));
        if (!res.ok) throw new Error('lookup failed');
        const data = await res.json();
        const created =
          (data.createdDate || data.creationDate || data.created || (data.dates && data.dates.created) || '').toString();
        const registrar = data.registrar || (data.registrar && data.registrar.name) || '';
        let ageText = 'Creation date not found in WHOIS record.';
        if (created) {
          const d = new Date(created);
          if (!isNaN(d)) {
            const years = ((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)).toFixed(1);
            ageText = 'Created: ' + d.toISOString().slice(0, 10) + ' · Age ≈ ' + years + ' years';
          } else ageText = 'Created: ' + created;
        }
        out.innerHTML =
          '<p class="font-semibold">' +
          domain +
          '</p><p>' +
          ageText +
          '</p><p class="text-sm text-gray-600">' +
          (registrar ? 'Registrar: ' + registrar : '') +
          '</p><p class="text-xs text-gray-500 mt-2">Source: public WHOIS API. Accuracy varies by TLD.</p>';
      } catch (e) {
        out.textContent = 'WHOIS lookup failed for this domain/TLD.';
      }
    });
  }

  /* ---- YouTube helpers ---- */
  function ytId(url) {
    if (!url) return null;
    const m =
      url.match(/[?&]v=([\w-]{11})/) ||
      url.match(/youtu\.be\/([\w-]{11})/) ||
      url.match(/youtube\.com\/(?:embed|shorts|live)\/([\w-]{11})/) ||
      url.match(/^([\w-]{11})$/);
    return m ? m[1] : null;
  }

  function getYtKey() {
    try {
      return localStorage.getItem('make-qr-yt-api-key') || (($('yt-api-key') || {}).value || '').trim();
    } catch (e) {
      return '';
    }
  }

  function saveYtKey() {
    const el = $('yt-api-key');
    if (!el) return;
    const v = el.value.trim();
    try {
      if (v) localStorage.setItem('make-qr-yt-api-key', v);
      else localStorage.removeItem('make-qr-yt-api-key');
    } catch (e) {}
  }

  function initYtKeyField() {
    const el = $('yt-api-key');
    if (!el) return;
    try {
      el.value = localStorage.getItem('make-qr-yt-api-key') || '';
    } catch (e) {}
    el.addEventListener('change', saveYtKey);
  }

  async function ytApi(path, params) {
    const key = getYtKey();
    if (!key) throw new Error('Add your YouTube Data API key (stored only in this browser).');
    const url = new URL('https://www.googleapis.com/youtube/v3/' + path);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    url.searchParams.set('key', key);
    const res = await fetch(url.toString());
    const data = await res.json();
    if (!res.ok) throw new Error((data.error && data.error.message) || 'YouTube API error');
    return data;
  }

  async function oembed(url) {
    const res = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(url));
    if (!res.ok) throw new Error('oEmbed failed');
    return res.json();
  }

  function initYtTitleExtractor() {
    const input = $('yt-url');
    const btn = $('yt-run');
    const out = $('yt-out');
    if (!input || !btn || !out) return;
    btn.addEventListener('click', async () => {
      const id = ytId(input.value.trim());
      if (!id) return (out.textContent = 'Invalid URL');
      try {
        const data = await oembed('https://www.youtube.com/watch?v=' + id);
        out.textContent = data.title || '';
      } catch (e) {
        out.textContent = e.message;
      }
    });
  }

  function initYtDescriptionExtractor() {
    const input = $('yt-url');
    const btn = $('yt-run');
    const out = $('yt-out');
    if (!input || !btn || !out) return;
    btn.addEventListener('click', async () => {
      const id = ytId(input.value.trim());
      if (!id) return (out.value = 'Invalid URL');
      try {
        saveYtKey();
        const data = await ytApi('videos', { part: 'snippet', id });
        const item = data.items && data.items[0];
        out.value = item ? item.snippet.description : 'No video found';
      } catch (e) {
        out.value = e.message;
      }
    });
  }

  function initYtTagExtractor() {
    const input = $('yt-url');
    const btn = $('yt-run');
    const out = $('yt-out');
    if (!input || !btn || !out) return;
    btn.addEventListener('click', async () => {
      const id = ytId(input.value.trim());
      if (!id) return (out.value = 'Invalid URL');
      try {
        saveYtKey();
        const data = await ytApi('videos', { part: 'snippet', id });
        const tags = (data.items && data.items[0] && data.items[0].snippet.tags) || [];
        out.value = tags.length ? tags.join(', ') : 'No tags (or API key required / tags hidden).';
      } catch (e) {
        out.value = e.message;
      }
    });
  }

  function initYtTagGenerator() {
    const input = $('yt-in');
    const btn = $('yt-run');
    const out = $('yt-out');
    if (!input || !btn || !out) return;
    btn.addEventListener('click', () => {
      const words = input.value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2);
      const uniq = Array.from(new Set(words)).slice(0, 25);
      out.value = uniq.join(', ');
    });
  }

  function initYtHashtagGenerator() {
    const input = $('yt-in');
    const btn = $('yt-run');
    const out = $('yt-out');
    if (!input || !btn || !out) return;
    btn.addEventListener('click', () => {
      const words = input.value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2);
      out.value = Array.from(new Set(words))
        .slice(0, 15)
        .map((w) => '#' + w)
        .join(' ');
    });
  }

  function initYtHashtagExtractor() {
    const input = $('yt-in');
    const btn = $('yt-run');
    const out = $('yt-out');
    if (!input || !btn || !out) return;
    btn.addEventListener('click', () => {
      const tags = input.value.match(/#[\w]+/g) || [];
      out.value = Array.from(new Set(tags)).join(' ');
    });
  }

  function initYtTitleGenerator() {
    const input = $('yt-in');
    const btn = $('yt-run');
    const out = $('yt-out');
    if (!input || !btn || !out) return;
    btn.addEventListener('click', () => {
      const topic = input.value.trim() || 'My Topic';
      const ideas = [
        topic + ' — Beginner Guide',
        'How to ' + topic + ' in 2026',
        topic + ' Tips You Need',
        'I Tried ' + topic + ' for 7 Days',
        'The Truth About ' + topic,
        topic + ' Explained Simply',
      ];
      out.value = ideas.join('\n');
    });
  }

  function initYtDescriptionGenerator() {
    const input = $('yt-in');
    const btn = $('yt-run');
    const out = $('yt-out');
    if (!input || !btn || !out) return;
    btn.addEventListener('click', () => {
      const topic = input.value.trim() || 'this video';
      out.value =
        'In this video, we cover ' +
        topic +
        '.\n\nTimestamps:\n0:00 Intro\n\nIf this helped, like and subscribe.\n\n#' +
        topic.replace(/\s+/g, '') +
        ' #YouTube';
    });
  }

  function initYtChannelId() {
    const input = $('yt-url');
    const btn = $('yt-run');
    const out = $('yt-out');
    if (!input || !btn || !out) return;
    btn.addEventListener('click', async () => {
      let v = input.value.trim();
      if (!v) return;
      const uc = v.match(/(UC[\w-]{22})/);
      if (uc) {
        out.textContent = uc[1];
        return;
      }
      try {
        saveYtKey();
        let q = v;
        const handle = v.match(/youtube\.com\/@([\w.-]+)/) || v.match(/^@([\w.-]+)$/);
        if (handle) {
          const data = await ytApi('channels', { part: 'id', forHandle: handle[1] });
          out.textContent = (data.items && data.items[0] && data.items[0].id) || 'Not found';
          return;
        }
        const vid = ytId(v);
        if (vid) {
          const data = await ytApi('videos', { part: 'snippet', id: vid });
          out.textContent = (data.items && data.items[0] && data.items[0].snippet.channelId) || 'Not found';
          return;
        }
        // search
        const data = await ytApi('search', { part: 'snippet', type: 'channel', q: q, maxResults: '1' });
        out.textContent = (data.items && data.items[0] && data.items[0].snippet.channelId) || 'Not found';
      } catch (e) {
        out.textContent = e.message;
      }
    });
  }

  function initYtChannelStats() {
    const input = $('yt-url');
    const btn = $('yt-run');
    const out = $('yt-out');
    if (!input || !btn || !out) return;
    btn.addEventListener('click', async () => {
      try {
        saveYtKey();
        let id = (input.value.match(/(UC[\w-]{22})/) || [])[1];
        if (!id) {
          const handle = input.value.match(/@([\w.-]+)/);
          if (handle) {
            const d = await ytApi('channels', { part: 'id', forHandle: handle[1] });
            id = d.items && d.items[0] && d.items[0].id;
          }
        }
        if (!id) throw new Error('Provide channel ID (UC…) or @handle');
        const data = await ytApi('channels', { part: 'snippet,statistics', id });
        const item = data.items && data.items[0];
        if (!item) throw new Error('Channel not found');
        const s = item.statistics;
        out.innerHTML =
          '<p class="font-semibold">' +
          item.snippet.title +
          '</p><p>Subscribers: ' +
          (s.subscriberCount || 'hidden') +
          '</p><p>Views: ' +
          s.viewCount +
          '</p><p>Videos: ' +
          s.videoCount +
          '</p><p class="text-sm text-gray-600">Published: ' +
          (item.snippet.publishedAt || '').slice(0, 10) +
          '</p>';
      } catch (e) {
        out.textContent = e.message;
      }
    });
  }

  function initYtChannelAge() {
    // reuse stats publishedAt
    initYtChannelStats();
  }

  function initYtVideoStats() {
    const input = $('yt-url');
    const btn = $('yt-run');
    const out = $('yt-out');
    if (!input || !btn || !out) return;
    btn.addEventListener('click', async () => {
      const id = ytId(input.value.trim());
      if (!id) return (out.textContent = 'Invalid URL');
      try {
        saveYtKey();
        const data = await ytApi('videos', { part: 'snippet,statistics,contentDetails', id });
        const item = data.items && data.items[0];
        if (!item) throw new Error('Video not found');
        const s = item.statistics;
        out.innerHTML =
          '<p class="font-semibold">' +
          item.snippet.title +
          '</p><p>Views: ' +
          s.viewCount +
          '</p><p>Likes: ' +
          (s.likeCount || 'hidden') +
          '</p><p>Comments: ' +
          (s.commentCount || 'hidden') +
          '</p><p>Duration: ' +
          item.contentDetails.duration +
          '</p>';
      } catch (e) {
        out.textContent = e.message;
      }
    });
  }

  function initYtViewsRatio() {
    const input = $('yt-url');
    const btn = $('yt-run');
    const out = $('yt-out');
    if (!input || !btn || !out) return;
    btn.addEventListener('click', async () => {
      const id = ytId(input.value.trim());
      if (!id) return (out.textContent = 'Invalid URL');
      try {
        saveYtKey();
        const data = await ytApi('videos', { part: 'statistics', id });
        const s = data.items && data.items[0] && data.items[0].statistics;
        if (!s) throw new Error('No stats');
        const views = +s.viewCount || 0;
        const likes = +s.likeCount || 0;
        const comments = +s.commentCount || 0;
        out.innerHTML =
          '<p>Like/View ratio: ' +
          (views ? ((likes / views) * 100).toFixed(3) : 0) +
          '%</p><p>Comment/View ratio: ' +
          (views ? ((comments / views) * 100).toFixed(3) : 0) +
          '%</p>';
      } catch (e) {
        out.textContent = e.message;
      }
    });
  }

  function initYtVideoCount() {
    initYtChannelStats();
  }

  function initYtRegion() {
    const input = $('yt-url');
    const btn = $('yt-run');
    const out = $('yt-out');
    if (!input || !btn || !out) return;
    btn.addEventListener('click', async () => {
      const id = ytId(input.value.trim());
      if (!id) return (out.textContent = 'Invalid URL');
      try {
        saveYtKey();
        const data = await ytApi('videos', { part: 'contentDetails', id });
        const rest = data.items && data.items[0] && data.items[0].contentDetails.regionRestriction;
        if (!rest) out.textContent = 'No region restriction listed (available in most countries).';
        else
          out.textContent =
            (rest.allowed ? 'Allowed: ' + rest.allowed.join(', ') : '') +
            (rest.blocked ? 'Blocked: ' + rest.blocked.join(', ') : '');
      } catch (e) {
        out.textContent = e.message;
      }
    });
  }

  function initYtCommentPicker() {
    const input = $('yt-url');
    const btn = $('yt-run');
    const out = $('yt-out');
    if (!input || !btn || !out) return;
    btn.addEventListener('click', async () => {
      const id = ytId(input.value.trim());
      if (!id) return (out.textContent = 'Invalid URL');
      try {
        saveYtKey();
        const data = await ytApi('commentThreads', {
          part: 'snippet',
          videoId: id,
          maxResults: '50',
          order: 'relevance',
          textFormat: 'plainText',
        });
        const comments = (data.items || []).map(
          (it) => it.snippet.topLevelComment.snippet.authorDisplayName + ': ' + it.snippet.topLevelComment.snippet.textDisplay
        );
        if (!comments.length) throw new Error('No comments');
        const pick = comments[Math.floor(Math.random() * comments.length)];
        out.textContent = pick;
      } catch (e) {
        out.textContent = e.message;
      }
    });
  }

  function initYtChannelSearch() {
    const input = $('yt-q');
    const btn = $('yt-run');
    const out = $('yt-out');
    if (!input || !btn || !out) return;
    btn.addEventListener('click', async () => {
      try {
        saveYtKey();
        const data = await ytApi('search', {
          part: 'snippet',
          type: 'channel',
          q: input.value.trim(),
          maxResults: '8',
        });
        out.innerHTML = (data.items || [])
          .map(
            (it) =>
              '<div class="p-3 border rounded-lg"><p class="font-medium">' +
              it.snippet.channelTitle +
              '</p><p class="text-sm text-gray-600">' +
              it.snippet.channelId +
              '</p><a class="text-blue-600 text-sm" target="_blank" rel="noopener" href="https://www.youtube.com/channel/' +
              it.snippet.channelId +
              '">Open</a></div>'
          )
          .join('') || 'No results';
      } catch (e) {
        out.textContent = e.message;
      }
    });
  }

  function initYtChannelImages(kind) {
    const input = $('yt-url');
    const btn = $('yt-run');
    const out = $('yt-out');
    if (!input || !btn || !out) return;
    btn.addEventListener('click', async () => {
      try {
        saveYtKey();
        let id = (input.value.match(/(UC[\w-]{22})/) || [])[1];
        if (!id) {
          const handle = input.value.match(/@([\w.-]+)/);
          if (handle) {
            const d = await ytApi('channels', { part: 'id', forHandle: handle[1] });
            id = d.items && d.items[0] && d.items[0].id;
          }
        }
        if (!id) throw new Error('Provide channel ID or @handle + API key');
        const data = await ytApi('channels', { part: 'brandingSettings,snippet', id });
        const item = data.items && data.items[0];
        if (!item) throw new Error('Not found');
        if (kind === 'logo') {
          const thumbs = item.snippet.thumbnails || {};
          const url = (thumbs.high || thumbs.medium || thumbs.default || {}).url;
          out.innerHTML = url
            ? '<img src="' + url + '" class="max-h-40 mx-auto rounded" alt="logo"><p class="text-center mt-2"><a class="text-blue-600" href="' + url + '" target="_blank" rel="noopener">Open image</a></p>'
            : 'No logo';
        } else {
          const banner =
            item.brandingSettings &&
            item.brandingSettings.image &&
            item.brandingSettings.image.bannerExternalUrl;
          out.innerHTML = banner
            ? '<img src="' + banner + '" class="w-full rounded" alt="banner"><p class="text-center mt-2"><a class="text-blue-600" href="' + banner + '" target="_blank" rel="noopener">Open banner</a></p>'
            : 'No banner URL (API key required; some channels hide branding).';
        }
      } catch (e) {
        out.textContent = e.message;
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initYtKeyField();
    initUniversalConverter();
    initFixedFormatOut();
    initIcoToPng();
    initImageCropper();
    initImageEnlarger();
    initPrivacyTerms();
    initHttpStatus();
    initDomainAge();
    initYtTitleExtractor();
    initYtDescriptionExtractor();
    initYtTagExtractor();
    initYtTagGenerator();
    initYtHashtagGenerator();
    initYtHashtagExtractor();
    initYtTitleGenerator();
    initYtDescriptionGenerator();
    initYtChannelId();
    const tool = document.body.dataset.tool;
    if (tool === 'youtube-channel-statistics' || tool === 'youtube-channel-age-checker' || tool === 'youtube-video-count-checker')
      initYtChannelStats();
    if (tool === 'youtube-video-statistics') initYtVideoStats();
    if (tool === 'youtube-views-ratio-calculator') initYtViewsRatio();
    if (tool === 'youtube-region-restriction-checker') initYtRegion();
    if (tool === 'youtube-comment-picker') initYtCommentPicker();
    if (tool === 'youtube-channel-search') initYtChannelSearch();
    if (tool === 'youtube-channel-logo-downloader') initYtChannelImages('logo');
    if (tool === 'youtube-channel-banner-downloader') initYtChannelImages('banner');
  });
})();
