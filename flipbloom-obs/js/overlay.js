(function () {
  'use strict';

  function params() {
    return new URLSearchParams(window.location.search);
  }

  function applyChrome() {
    const q = params();
    if (q.get('transparent') === '1' || q.get('transparent') === 'true') {
      document.body.classList.add('transparent');
    }
    const title = q.get('title');
    const sub = q.get('sub');
    const titleEl = document.querySelector('[data-obs-title]');
    const subEl = document.querySelector('[data-obs-sub]');
    if (title && titleEl) titleEl.textContent = title;
    if (sub && subEl) subEl.textContent = sub;
  }

  function pad2(n) {
    return String(Math.max(0, n | 0)).padStart(2, '0');
  }

  function formatHMS(total) {
    total = Math.max(0, Math.floor(total));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return [pad2(h), pad2(m), pad2(s)];
    return [pad2(m), pad2(s)];
  }

  function renderClock(el, parts) {
    if (!el) return;
    const nodes = [];
    parts.forEach((part, idx) => {
      if (idx) nodes.push('<span class="fb-colon">:</span>');
      for (const ch of part) {
        nodes.push('<span class="fb-digit">' + ch + '</span>');
      }
    });
    el.innerHTML = nodes.join('');
  }

  function parseDuration(q) {
    if (q.get('seconds')) return Math.max(1, parseInt(q.get('seconds'), 10) || 300);
    if (q.get('minutes')) return Math.max(1, (parseInt(q.get('minutes'), 10) || 5) * 60);
    if (q.get('duration')) {
      const d = q.get('duration');
      if (/^\d+$/.test(d)) return Math.max(1, parseInt(d, 10));
      const m = d.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
      if (m) {
        return Math.max(1, (parseInt(m[1] || '0', 10) * 3600) + (parseInt(m[2] || '0', 10) * 60) + (parseInt(m[3] || '0', 10)));
      }
    }
    return 300;
  }

  function startCountdown(options) {
    const q = params();
    const total = options.total != null ? options.total : parseDuration(q);
    const clock = document.querySelector('[data-obs-clock]');
    const bar = document.querySelector('[data-obs-progress] span');
    const phase = document.querySelector('[data-obs-phase]');
    let left = total;
    const started = Date.now();

    function tick() {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      left = Math.max(0, total - elapsed);
      renderClock(clock, formatHMS(left));
      if (bar) bar.style.transform = 'scaleX(' + (left / total) + ')';
      if (phase && left === 0) phase.textContent = options.doneLabel || 'Time’s up';
      if (left > 0) requestAnimationFrame(() => setTimeout(tick, 200));
    }
    tick();
    return { total: total };
  }

  function startLiveClock() {
    const clock = document.querySelector('[data-obs-clock]');
    const tz = params().get('tz') || undefined;
    function tick() {
      const now = new Date();
      let h = now.getHours();
      let m = now.getMinutes();
      let s = now.getSeconds();
      if (tz) {
        try {
          const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: tz,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }).formatToParts(now);
          const map = {};
          parts.forEach((p) => { map[p.type] = p.value; });
          h = parseInt(map.hour, 10);
          m = parseInt(map.minute, 10);
          s = parseInt(map.second, 10);
        } catch (e) { /* keep local */ }
      }
      renderClock(clock, [pad2(h), pad2(m), pad2(s)]);
      setTimeout(tick, 250);
    }
    tick();
  }

  function startPomodoro() {
    const q = params();
    const work = Math.max(60, (parseInt(q.get('work') || '25', 10) || 25) * 60);
    const brk = Math.max(60, (parseInt(q.get('break') || '5', 10) || 5) * 60);
    const clock = document.querySelector('[data-obs-clock]');
    const bar = document.querySelector('[data-obs-progress] span');
    const phase = document.querySelector('[data-obs-phase]');
    const title = document.querySelector('[data-obs-title]');
    let mode = 'work';
    let total = work;
    let started = Date.now();

    function switchMode() {
      mode = mode === 'work' ? 'break' : 'work';
      total = mode === 'work' ? work : brk;
      started = Date.now();
      if (phase) phase.textContent = mode === 'work' ? 'Focus' : 'Break';
      if (title) title.textContent = mode === 'work' ? 'Pomodoro Focus' : 'Pomodoro Break';
    }

    function tick() {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      let left = total - elapsed;
      if (left <= 0) {
        switchMode();
        left = total;
      }
      renderClock(clock, formatHMS(left));
      if (bar) bar.style.transform = 'scaleX(' + (left / total) + ')';
      setTimeout(tick, 200);
    }
    if (phase) phase.textContent = 'Focus';
    tick();
  }

  window.FlipBloomOBS = {
    applyChrome: applyChrome,
    startCountdown: startCountdown,
    startLiveClock: startLiveClock,
    startPomodoro: startPomodoro,
    parseDuration: parseDuration
  };
})();
