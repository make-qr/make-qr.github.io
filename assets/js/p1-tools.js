/**
 * Shared logic for Make QR P1 utility tools (client-side only).
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

  function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
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
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Conversion failed'))),
        mime,
        quality
      );
    });
  }

  async function convertImageFile(file, mime, quality, ext) {
    const img = await loadImageFromFile(file);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (mime === 'image/jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    const blob = await canvasToBlob(canvas, mime, quality);
    const name = file.name.replace(/\.[^.]+$/, '') + ext;
    return { blob, name, url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height };
  }

  function initFormatConverter() {
    const root = document.querySelector('[data-format-converter]');
    if (!root) return;

    const fromLabel = root.dataset.fromLabel || 'image';
    const mime = root.dataset.toMime || 'image/png';
    const ext = root.dataset.toExt || '.png';
    const accept = root.dataset.accept || 'image/*';
    const qualityDefault = Number(root.dataset.quality || '0.92');

    const fileInput = $('fc-file');
    const dropZone = $('fc-drop');
    const convertBtn = $('fc-convert');
    const qualityEl = $('fc-quality');
    const qualityVal = $('fc-quality-val');
    const results = $('fc-results');
    const list = $('fc-list');
    const status = $('fc-status');

    if (fileInput) fileInput.accept = accept;

    if (qualityEl && qualityVal) {
      qualityVal.textContent = qualityEl.value;
      qualityEl.addEventListener('input', () => {
        qualityVal.textContent = qualityEl.value;
      });
    }

    function setFiles(files) {
      const arr = Array.from(files || []);
      if (!arr.length) return;
      const dt = new DataTransfer();
      arr.forEach((f) => dt.items.add(f));
      fileInput.files = dt.files;
      if (status) status.textContent = arr.length + ' file(s) ready';
      if (convertBtn) convertBtn.disabled = false;
    }

    if (dropZone) {
      ['dragenter', 'dragover'].forEach((ev) => {
        dropZone.addEventListener(ev, (e) => {
          e.preventDefault();
          dropZone.classList.add('ring-2', 'ring-blue-500');
        });
      });
      ['dragleave', 'drop'].forEach((ev) => {
        dropZone.addEventListener(ev, (e) => {
          e.preventDefault();
          dropZone.classList.remove('ring-2', 'ring-blue-500');
        });
      });
      dropZone.addEventListener('drop', (e) => setFiles(e.dataTransfer.files));
      dropZone.addEventListener('click', () => fileInput && fileInput.click());
    }
    if (fileInput) fileInput.addEventListener('change', () => setFiles(fileInput.files));

    if (convertBtn) {
      convertBtn.addEventListener('click', async () => {
        const files = Array.from(fileInput.files || []);
        if (!files.length) return;
        convertBtn.disabled = true;
        if (status) status.textContent = 'Converting…';
        list.innerHTML = '';
        results.classList.remove('hidden');
        const q = qualityEl ? Number(qualityEl.value) / 100 : qualityDefault;
        for (const file of files) {
          try {
            const result = await convertImageFile(file, mime, q, ext);
            const row = document.createElement('div');
            row.className = 'flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 rounded-lg border';
            row.innerHTML =
              '<img src="' +
              result.url +
              '" alt="" class="h-16 w-16 object-contain bg-white rounded border">' +
              '<div class="flex-1 min-w-0"><p class="font-medium truncate">' +
              result.name +
              '</p><p class="text-sm text-gray-500">' +
              result.width +
              '×' +
              result.height +
              ' · ' +
              formatBytes(result.blob.size) +
              '</p></div>';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700';
            btn.textContent = 'Download';
            btn.addEventListener('click', () => downloadBlob(result.blob, result.name));
            row.appendChild(btn);
            list.appendChild(row);
          } catch (err) {
            const row = document.createElement('div');
            row.className = 'p-3 bg-red-50 text-red-700 rounded-lg text-sm';
            row.textContent = file.name + ': ' + (err.message || 'failed');
            list.appendChild(row);
          }
        }
        if (status) status.textContent = 'Done — ' + fromLabel + ' → ' + ext.replace('.', '').toUpperCase();
        convertBtn.disabled = false;
      });
    }
  }

  function initImageToBase64() {
    const input = $('i2b-file');
    const out = $('i2b-out');
    const copyBtn = $('i2b-copy');
    const preview = $('i2b-preview');
    if (!input || !out) return;
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        out.value = reader.result;
        if (preview) {
          preview.src = reader.result;
          preview.classList.remove('hidden');
        }
      };
      reader.readAsDataURL(file);
    });
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        if (!out.value) return;
        await navigator.clipboard.writeText(out.value);
        copyBtn.textContent = 'Copied';
        setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
      });
    }
  }

  function initBase64ToImage() {
    const input = $('b2i-in');
    const btn = $('b2i-convert');
    const preview = $('b2i-preview');
    const dl = $('b2i-download');
    if (!input || !btn) return;
    let lastUrl = '';
    btn.addEventListener('click', () => {
      let raw = (input.value || '').trim();
      if (!raw) return;
      if (!raw.startsWith('data:')) raw = 'data:image/png;base64,' + raw.replace(/\s+/g, '');
      preview.src = raw;
      preview.classList.remove('hidden');
      lastUrl = raw;
      dl.classList.remove('hidden');
    });
    if (dl) {
      dl.addEventListener('click', () => {
        if (!lastUrl) return;
        downloadDataUrl(lastUrl, 'decoded-image.png');
      });
    }
  }

  function initWhatIsMyIp() {
    const el = $('my-ip-value');
    const err = $('my-ip-error');
    const btn = $('my-ip-refresh');
    if (!el) return;
    async function load() {
      el.textContent = 'Loading…';
      if (err) err.textContent = '';
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        if (!res.ok) throw new Error('Lookup failed');
        const data = await res.json();
        el.textContent = data.ip || 'Unknown';
      } catch (e) {
        el.textContent = '—';
        if (err) err.textContent = 'Could not fetch public IP. Check your connection.';
      }
    }
    load();
    if (btn) btn.addEventListener('click', load);
  }

  function initBrowserInfo() {
    const ua = $('my-ua-value');
    if (ua) ua.textContent = navigator.userAgent || '—';

    const browser = $('my-browser-value');
    if (browser) {
      const uaStr = navigator.userAgent;
      let name = 'Unknown';
      if (/Edg\//.test(uaStr)) name = 'Microsoft Edge';
      else if (/Chrome\//.test(uaStr) && !/Edg\//.test(uaStr)) name = 'Google Chrome';
      else if (/Firefox\//.test(uaStr)) name = 'Mozilla Firefox';
      else if (/Safari\//.test(uaStr) && !/Chrome\//.test(uaStr)) name = 'Safari';
      else if (/OPR\//.test(uaStr) || /Opera/.test(uaStr)) name = 'Opera';
      browser.textContent =
        name +
        ' · ' +
        (navigator.platform || '') +
        ' · ' +
        (navigator.language || '');
    }

    const screenEl = $('my-screen-value');
    if (screenEl) {
      const update = () => {
        screenEl.textContent =
          window.screen.width +
          ' × ' +
          window.screen.height +
          ' · avail ' +
          window.screen.availWidth +
          ' × ' +
          window.screen.availHeight +
          ' · DPR ' +
          (window.devicePixelRatio || 1) +
          ' · viewport ' +
          window.innerWidth +
          ' × ' +
          window.innerHeight;
      };
      update();
      window.addEventListener('resize', update);
    }
  }

  function initWordCounter() {
    const input = $('wc-input');
    if (!input) return;
    const words = $('wc-words');
    const chars = $('wc-chars');
    const charsNo = $('wc-chars-no-space');
    const sentences = $('wc-sentences');
    const lines = $('wc-lines');
    function count() {
      const t = input.value;
      const w = t.trim() ? t.trim().split(/\s+/).length : 0;
      if (words) words.textContent = String(w);
      if (chars) chars.textContent = String(t.length);
      if (charsNo) charsNo.textContent = String(t.replace(/\s/g, '').length);
      if (sentences) {
        const s = t.trim() ? (t.match(/[.!?]+(\s|$)/g) || []).length || (t.trim() ? 1 : 0) : 0;
        sentences.textContent = String(s);
      }
      if (lines) lines.textContent = String(t ? t.split(/\n/).length : 0);
    }
    input.addEventListener('input', count);
    count();
  }

  function initUuid() {
    const out = $('uuid-out');
    const btn = $('uuid-gen');
    const copyBtn = $('uuid-copy');
    if (!out || !btn) return;
    function gen() {
      out.value =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === 'x' ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });
    }
    btn.addEventListener('click', gen);
    gen();
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        await navigator.clipboard.writeText(out.value);
        copyBtn.textContent = 'Copied';
        setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
      });
    }
  }

  function initBase64Text() {
    const mode = document.body.dataset.tool;
    const input = $('b64-in');
    const out = $('b64-out');
    const btn = $('b64-run');
    if (!input || !out || !btn) return;
    btn.addEventListener('click', () => {
      try {
        if (mode === 'base64-encode') {
          out.value = btoa(unescape(encodeURIComponent(input.value)));
        } else {
          out.value = decodeURIComponent(escape(atob(input.value.trim())));
        }
      } catch (e) {
        out.value = 'Error: invalid input';
      }
    });
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const next = text[i + 1];
      if (inQuotes) {
        if (ch === '"' && next === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') inQuotes = false;
        else cur += ch;
      } else if (ch === '"') inQuotes = true;
      else if (ch === ',') {
        row.push(cur);
        cur = '';
      } else if (ch === '\n') {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = '';
      } else if (ch !== '\r') cur += ch;
    }
    if (cur.length || row.length) {
      row.push(cur);
      rows.push(row);
    }
    return rows.filter((r) => r.some((c) => c !== ''));
  }

  function initCsvJson() {
    const mode = document.body.dataset.tool;
    const input = $('cj-in');
    const out = $('cj-out');
    const btn = $('cj-run');
    if (!input || !out || !btn) return;
    btn.addEventListener('click', () => {
      try {
        if (mode === 'csv-to-json') {
          const rows = parseCsv(input.value.trim());
          if (!rows.length) throw new Error('empty');
          const headers = rows[0];
          const data = rows.slice(1).map((r) => {
            const obj = {};
            headers.forEach((h, i) => {
              obj[h] = r[i] != null ? r[i] : '';
            });
            return obj;
          });
          out.value = JSON.stringify(data, null, 2);
        } else {
          const data = JSON.parse(input.value);
          const arr = Array.isArray(data) ? data : [data];
          const headers = Array.from(
            arr.reduce((set, row) => {
              Object.keys(row || {}).forEach((k) => set.add(k));
              return set;
            }, new Set())
          );
          const escape = (v) => {
            const s = v == null ? '' : String(v);
            return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
          };
          const lines = [headers.join(',')].concat(
            arr.map((row) => headers.map((h) => escape(row[h])).join(','))
          );
          out.value = lines.join('\n');
        }
      } catch (e) {
        out.value = 'Error: ' + (e.message || 'invalid input');
      }
    });
  }

  async function initMd5() {
    const input = $('md5-in');
    const out = $('md5-out');
    const btn = $('md5-run');
    if (!input || !out || !btn) return;
    btn.addEventListener('click', async () => {
      const data = new TextEncoder().encode(input.value);
      // Prefer SubtleCrypto SHA-256 label clearly if MD5 unavailable (browsers lack native MD5).
      // Use a tiny pure JS MD5.
      out.value = md5(input.value);
    });
  }

  // Compact MD5 for arbitrary-length UTF-8 strings
  function md5(input) {
    function toUtf8(s) {
      return unescape(encodeURIComponent(s));
    }
    function add32(a, b) {
      return (a + b) & 0xffffffff;
    }
    function cmn(q, a, b, x, s, t) {
      a = add32(add32(a, q), add32(x, t));
      return add32((a << s) | (a >>> (32 - s)), b);
    }
    function ff(a, b, c, d, x, s, t) {
      return cmn((b & c) | (~b & d), a, b, x, s, t);
    }
    function gg(a, b, c, d, x, s, t) {
      return cmn((b & d) | (c & ~d), a, b, x, s, t);
    }
    function hh(a, b, c, d, x, s, t) {
      return cmn(b ^ c ^ d, a, b, x, s, t);
    }
    function ii(a, b, c, d, x, s, t) {
      return cmn(c ^ (b | ~d), a, b, x, s, t);
    }
    function md51(s) {
      const n = s.length;
      const state = [1732584193, -271733879, -1732584194, 271733878];
      let i;
      for (i = 64; i <= n; i += 64) {
        md5cycle(state, md5blk(s.substring(i - 64, i)));
      }
      s = s.substring(i - 64);
      const tail = new Array(16).fill(0);
      for (i = 0; i < s.length; i++) tail[i >> 2] |= s.charCodeAt(i) << (i % 4) * 8;
      tail[i >> 2] |= 0x80 << (i % 4) * 8;
      if (i > 55) {
        md5cycle(state, tail);
        for (i = 0; i < 16; i++) tail[i] = 0;
      }
      tail[14] = n * 8;
      md5cycle(state, tail);
      return state;
    }
    function md5blk(s) {
      const md5blks = [];
      for (let i = 0; i < 64; i += 4) {
        md5blks[i >> 2] =
          s.charCodeAt(i) +
          (s.charCodeAt(i + 1) << 8) +
          (s.charCodeAt(i + 2) << 16) +
          (s.charCodeAt(i + 3) << 24);
      }
      return md5blks;
    }
    function md5cycle(x, k) {
      let [a, b, c, d] = x;
      a = ff(a, b, c, d, k[0], 7, -680876936);
      d = ff(d, a, b, c, k[1], 12, -389564586);
      c = ff(c, d, a, b, k[2], 17, 606105819);
      b = ff(b, c, d, a, k[3], 22, -1044525330);
      a = ff(a, b, c, d, k[4], 7, -176418897);
      d = ff(d, a, b, c, k[5], 12, 1200080426);
      c = ff(c, d, a, b, k[6], 17, -1473231341);
      b = ff(b, c, d, a, k[7], 22, -45705983);
      a = ff(a, b, c, d, k[8], 7, 1770035416);
      d = ff(d, a, b, c, k[9], 12, -1958414417);
      c = ff(c, d, a, b, k[10], 17, -42063);
      b = ff(b, c, d, a, k[11], 22, -1990404162);
      a = ff(a, b, c, d, k[12], 7, 1804603682);
      d = ff(d, a, b, c, k[13], 12, -40341101);
      c = ff(c, d, a, b, k[14], 17, -1502002290);
      b = ff(b, c, d, a, k[15], 22, 1236535329);
      a = gg(a, b, c, d, k[1], 5, -165796510);
      d = gg(d, a, b, c, k[6], 9, -1069501632);
      c = gg(c, d, a, b, k[11], 14, 643717713);
      b = gg(b, c, d, a, k[0], 20, -373897302);
      a = gg(a, b, c, d, k[5], 5, -701558691);
      d = gg(d, a, b, c, k[10], 9, 38016083);
      c = gg(c, d, a, b, k[15], 14, -660478335);
      b = gg(b, c, d, a, k[4], 20, -405537848);
      a = gg(a, b, c, d, k[9], 5, 568446438);
      d = gg(d, a, b, c, k[14], 9, -1019803690);
      c = gg(c, d, a, b, k[3], 14, -187363961);
      b = gg(b, c, d, a, k[8], 20, 1163531501);
      a = gg(a, b, c, d, k[13], 5, -1444681467);
      d = gg(d, a, b, c, k[2], 9, -51403784);
      c = gg(c, d, a, b, k[7], 14, 1735328473);
      b = gg(b, c, d, a, k[12], 20, -1926607734);
      a = hh(a, b, c, d, k[5], 4, -378558);
      d = hh(d, a, b, c, k[8], 11, -2022574463);
      c = hh(c, d, a, b, k[11], 16, 1839030562);
      b = hh(b, c, d, a, k[14], 23, -35309556);
      a = hh(a, b, c, d, k[1], 4, -1530992060);
      d = hh(d, a, b, c, k[4], 11, 1272893353);
      c = hh(c, d, a, b, k[7], 16, -155497632);
      b = hh(b, c, d, a, k[10], 23, -1094730640);
      a = hh(a, b, c, d, k[13], 4, 681279174);
      d = hh(d, a, b, c, k[0], 11, -358537222);
      c = hh(c, d, a, b, k[3], 16, -722521979);
      b = hh(b, c, d, a, k[6], 23, 76029189);
      a = hh(a, b, c, d, k[9], 4, -640364487);
      d = hh(d, a, b, c, k[12], 11, -421815835);
      c = hh(c, d, a, b, k[15], 16, 530742520);
      b = hh(b, c, d, a, k[2], 23, -995338651);
      a = ii(a, b, c, d, k[0], 6, -198630844);
      d = ii(d, a, b, c, k[7], 10, 1126891415);
      c = ii(c, d, a, b, k[14], 15, -1416354905);
      b = ii(b, c, d, a, k[5], 21, -57434055);
      a = ii(a, b, c, d, k[12], 6, 1700485571);
      d = ii(d, a, b, c, k[3], 10, -1894986606);
      c = ii(c, d, a, b, k[10], 15, -1051523);
      b = ii(b, c, d, a, k[1], 21, -2054922799);
      a = ii(a, b, c, d, k[8], 6, 1873313359);
      d = ii(d, a, b, c, k[15], 10, -30611744);
      c = ii(c, d, a, b, k[6], 15, -1560198380);
      b = ii(b, c, d, a, k[13], 21, 1309151649);
      a = ii(a, b, c, d, k[4], 6, -145523070);
      d = ii(d, a, b, c, k[11], 10, -1120210379);
      c = ii(c, d, a, b, k[2], 15, 718787259);
      b = ii(b, c, d, a, k[9], 21, -343485551);
      x[0] = add32(a, x[0]);
      x[1] = add32(b, x[1]);
      x[2] = add32(c, x[2]);
      x[3] = add32(d, x[3]);
    }
    function rhex(n) {
      let j,
        s = '';
      for (j = 0; j < 4; j++) s += ('0' + ((n >> (j * 8)) & 255).toString(16)).slice(-2);
      return s;
    }
    const s = toUtf8(input);
    const state = md51(s);
    return rhex(state[0]) + rhex(state[1]) + rhex(state[2]) + rhex(state[3]);
  }

  function ytId(url) {
    if (!url) return null;
    const m =
      url.match(/[?&]v=([\w-]{11})/) ||
      url.match(/youtu\.be\/([\w-]{11})/) ||
      url.match(/youtube\.com\/(?:embed|shorts|live)\/([\w-]{11})/) ||
      url.match(/^([\w-]{11})$/);
    return m ? m[1] : null;
  }

  function initYoutubeThumbnail() {
    const input = $('yt-url');
    const btn = $('yt-run');
    const box = $('yt-thumbs');
    if (!input || !btn || !box) return;
    btn.addEventListener('click', () => {
      const id = ytId(input.value.trim());
      if (!id) {
        box.innerHTML = '<p class="text-red-600 text-sm">Enter a valid YouTube URL or video ID.</p>';
        return;
      }
      const qualities = [
        ['maxresdefault', 'Max'],
        ['sddefault', 'SD'],
        ['hqdefault', 'HQ'],
        ['mqdefault', 'MQ'],
        ['default', 'Default'],
      ];
      box.innerHTML = qualities
        .map(
          ([q, label]) =>
            '<div class="p-3 border rounded-lg bg-white"><p class="text-sm font-medium mb-2">' +
            label +
            '</p><img src="https://i.ytimg.com/vi/' +
            id +
            '/' +
            q +
            '.jpg" alt="' +
            label +
            ' thumbnail" class="w-full rounded mb-2" loading="lazy"><a class="text-blue-600 text-sm underline" href="https://i.ytimg.com/vi/' +
            id +
            '/' +
            q +
            '.jpg" target="_blank" rel="noopener">Open / download</a></div>'
        )
        .join('');
    });
  }

  function initYoutubeEmbed() {
    const input = $('yt-url');
    const out = $('yt-embed');
    const btn = $('yt-run');
    if (!input || !out || !btn) return;
    btn.addEventListener('click', () => {
      const id = ytId(input.value.trim());
      if (!id) {
        out.value = 'Invalid YouTube URL';
        return;
      }
      out.value =
        '<iframe width="560" height="315" src="https://www.youtube.com/embed/' +
        id +
        '" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
    });
  }

  function initYoutubeTimestamp() {
    const input = $('yt-url');
    const h = $('yt-h');
    const m = $('yt-m');
    const s = $('yt-s');
    const out = $('yt-out');
    const btn = $('yt-run');
    if (!input || !out || !btn) return;
    btn.addEventListener('click', () => {
      const id = ytId(input.value.trim());
      if (!id) {
        out.value = 'Invalid YouTube URL';
        return;
      }
      const sec = (Number(h.value) || 0) * 3600 + (Number(m.value) || 0) * 60 + (Number(s.value) || 0);
      out.value = 'https://www.youtube.com/watch?v=' + id + '&t=' + sec + 's';
    });
  }

  function initYoutubeTitleChecker() {
    const input = $('yt-title');
    const count = $('yt-count');
    const tip = $('yt-tip');
    if (!input) return;
    function update() {
      const n = input.value.length;
      if (count) count.textContent = String(n);
      if (tip) {
        if (n === 0) tip.textContent = 'Enter a title';
        else if (n <= 60) tip.textContent = 'Good length for search results';
        else if (n <= 100) tip.textContent = 'Acceptable, but may truncate in some places';
        else tip.textContent = 'Long — YouTube may truncate this title';
      }
    }
    input.addEventListener('input', update);
    update();
  }

  function initYoutubeMoney() {
    const views = $('yt-views');
    const rpm = $('yt-rpm');
    const out = $('yt-money');
    const btn = $('yt-run');
    if (!views || !rpm || !out || !btn) return;
    btn.addEventListener('click', () => {
      const v = Number(views.value) || 0;
      const r = Number(rpm.value) || 0;
      const earn = (v / 1000) * r;
      out.textContent =
        'Estimated earnings: $' +
        earn.toLocaleString(undefined, { maximumFractionDigits: 2 }) +
        ' (rough RPM estimate only)';
    });
  }

  function initYoutubeSubscribe() {
    const input = $('yt-channel');
    const out = $('yt-out');
    const btn = $('yt-run');
    if (!input || !out || !btn) return;
    btn.addEventListener('click', () => {
      let v = input.value.trim();
      if (!v) return;
      if (v.startsWith('UC') && v.length >= 22) {
        out.value = 'https://www.youtube.com/channel/' + v + '?sub_confirmation=1';
      } else {
        v = v.replace(/^@/, '');
        out.value = 'https://www.youtube.com/@' + v + '?sub_confirmation=1';
      }
    });
  }

  function initYoutubeCapitalizer() {
    const input = $('yt-title');
    const out = $('yt-out');
    const btn = $('yt-run');
    if (!input || !out || !btn) return;
    const small = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'of', 'in', 'with']);
    btn.addEventListener('click', () => {
      const words = input.value.trim().split(/\s+/);
      out.value = words
        .map((w, i) => {
          const lower = w.toLowerCase();
          if (i !== 0 && i !== words.length - 1 && small.has(lower)) return lower;
          return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join(' ');
    });
  }

  function initMetaTags() {
    const btn = $('meta-run');
    const out = $('meta-out');
    if (!btn || !out) return;
    btn.addEventListener('click', () => {
      const title = ($('meta-title') || {}).value || '';
      const desc = ($('meta-desc') || {}).value || '';
      const url = ($('meta-url') || {}).value || '';
      const image = ($('meta-image') || {}).value || '';
      out.value = [
        '<title>' + title + '</title>',
        '<meta name="description" content="' + desc.replace(/"/g, '&quot;') + '">',
        '<meta property="og:title" content="' + title.replace(/"/g, '&quot;') + '">',
        '<meta property="og:description" content="' + desc.replace(/"/g, '&quot;') + '">',
        url ? '<meta property="og:url" content="' + url + '">' : '',
        image ? '<meta property="og:image" content="' + image + '">' : '',
        '<meta name="twitter:card" content="summary_large_image">',
      ]
        .filter(Boolean)
        .join('\n');
    });
  }

  function initRobots() {
    const btn = $('robots-run');
    const out = $('robots-out');
    if (!btn || !out) return;
    btn.addEventListener('click', () => {
      const allowAll = $('robots-allow-all') && $('robots-allow-all').checked;
      const sitemap = ($('robots-sitemap') || {}).value || '';
      let body = allowAll
        ? 'User-agent: *\nAllow: /\n'
        : 'User-agent: *\nDisallow: /\n';
      if (sitemap) body += '\nSitemap: ' + sitemap + '\n';
      out.value = body;
    });
  }

  function initLorem() {
    const btn = $('lorem-run');
    const out = $('lorem-out');
    const count = $('lorem-count');
    if (!btn || !out) return;
    const sample =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
    btn.addEventListener('click', () => {
      const n = Math.min(20, Math.max(1, Number((count || {}).value) || 1));
      out.value = Array.from({ length: n }, () => sample).join('\n\n');
    });
  }

  function initHashtags() {
    const input = $('hash-in');
    const out = $('hash-out');
    const btn = $('hash-run');
    if (!input || !out || !btn) return;
    btn.addEventListener('click', () => {
      const words = input.value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2);
      const uniq = Array.from(new Set(words)).slice(0, 30);
      out.value = uniq.map((w) => '#' + w).join(' ');
    });
  }

  function initImageResizer() {
    const input = $('rz-file');
    const wEl = $('rz-w');
    const hEl = $('rz-h');
    const keep = $('rz-keep');
    const btn = $('rz-run');
    const preview = $('rz-preview');
    const dl = $('rz-download');
    if (!input || !btn) return;
    let lastUrl = '';
    let natural = { w: 0, h: 0 };
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const img = await loadImageFromFile(file);
      natural = { w: img.naturalWidth, h: img.naturalHeight };
      if (wEl) wEl.value = natural.w;
      if (hEl) hEl.value = natural.h;
      preview.src = img.src;
      preview.classList.remove('hidden');
    });
    if (keep && wEl && hEl) {
      wEl.addEventListener('input', () => {
        if (!keep.checked || !natural.w) return;
        hEl.value = Math.round((Number(wEl.value) / natural.w) * natural.h);
      });
    }
    btn.addEventListener('click', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const img = await loadImageFromFile(file);
      const canvas = document.createElement('canvas');
      canvas.width = Number(wEl.value) || img.naturalWidth;
      canvas.height = Number(hEl.value) || img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToBlob(canvas, file.type || 'image/png', 0.92);
      lastUrl = URL.createObjectURL(blob);
      preview.src = lastUrl;
      dl.classList.remove('hidden');
      dl.onclick = () => downloadBlob(blob, 'resized-' + file.name);
    });
  }

  function initRotateFlip() {
    const mode = document.body.dataset.tool;
    const input = $('rf-file');
    const btn = $('rf-run');
    const preview = $('rf-preview');
    const dl = $('rf-download');
    const angle = $('rf-angle');
    if (!input || !btn) return;
    btn.addEventListener('click', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const img = await loadImageFromFile(file);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (mode === 'flip-image') {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);
      } else {
        const deg = Number((angle || {}).value) || 90;
        const rad = (deg * Math.PI) / 180;
        const qw = Math.abs(Math.cos(rad)) * img.naturalWidth + Math.abs(Math.sin(rad)) * img.naturalHeight;
        const qh = Math.abs(Math.sin(rad)) * img.naturalWidth + Math.abs(Math.cos(rad)) * img.naturalHeight;
        canvas.width = Math.round(qw);
        canvas.height = Math.round(qh);
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      }
      const blob = await canvasToBlob(canvas, 'image/png', 1);
      const url = URL.createObjectURL(blob);
      preview.src = url;
      preview.classList.remove('hidden');
      dl.classList.remove('hidden');
      dl.onclick = () => downloadBlob(blob, (mode === 'flip-image' ? 'flipped-' : 'rotated-') + file.name.replace(/\.[^.]+$/, '.png'));
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initFormatConverter();
    initImageToBase64();
    initBase64ToImage();
    initWhatIsMyIp();
    initBrowserInfo();
    initWordCounter();
    initUuid();
    initBase64Text();
    initCsvJson();
    initMd5();
    initYoutubeThumbnail();
    initYoutubeEmbed();
    initYoutubeTimestamp();
    initYoutubeTitleChecker();
    initYoutubeMoney();
    initYoutubeSubscribe();
    initYoutubeCapitalizer();
    initMetaTags();
    initRobots();
    initLorem();
    initHashtags();
    initImageResizer();
    initRotateFlip();
  });
})();
