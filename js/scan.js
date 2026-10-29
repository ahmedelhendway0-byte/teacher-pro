// الكاميرا بتقرا QR: BarcodeDetector لو المتصفح فيه (كروم أندرويد)، وإلا jsQR (آيفون وأي متصفح) — بيتحمّل أول ما الكاميرا تتفتح بس
const Scanner = (() => {
  let cur = null;

  function loadJsQR() {
    if (window.jsQR) return Promise.resolve();
    return new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = (CFG.ROOT || '') + 'js/vendor/jsQR.js?v=1.4.0'; s.onload = ok; s.onerror = no;
      document.head.appendChild(s);
    });
  }

  // onCode(code) بترجع true لو عايز الكاميرا تقفل بعد القراية
  async function open(onCode, title) {
    close();
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }); }
    catch (e) { U.toast('مش قادر يفتح الكاميرا. اسمح للموقع يستخدمها من إعدادات المتصفح.', 'err'); return; }
    const w = document.createElement('div');
    w.className = 'cam';
    w.innerHTML = '<p class="cam-title">' + U.esc(title || 'وجّه الكاميرا على الـ QR') + '</p><div class="cam-box"><video playsinline muted></video><div class="cam-frame"></div></div>' +
      '<button class="btn btn-line" data-cam="close">قفل الكاميرا</button>';
    document.body.appendChild(w);
    const v = w.querySelector('video'); v.srcObject = stream; await v.play().catch(() => { });
    cur = { stream, w, alive: true };
    w.onclick = e => { if (e.target.closest('[data-cam=close]')) close(); };

    let detect;
    if ('BarcodeDetector' in window) {
      const det = new BarcodeDetector({ formats: ['qr_code'] });
      detect = async () => { const c = await det.detect(v); return c[0] && c[0].rawValue; };
    } else {
      try { await loadJsQR(); } catch (e) { U.toast('مش قادر يحمّل قارئ الـ QR.', 'err'); return close(); }
      const cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
      detect = async () => {
        const vw = v.videoWidth, vh = v.videoHeight; if (!vw) return null;
        const sc = Math.min(1, 640 / vw); cv.width = vw * sc; cv.height = vh * sc;
        cx.drawImage(v, 0, 0, cv.width, cv.height);
        const r = window.jsQR(cx.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height, { inversionAttempts: 'dontInvert' });
        return r && r.data;
      };
    }
    let last = '', lastAt = 0;
    const loop = async () => {
      if (!cur || !cur.alive) return;
      try {
        const raw = await detect(), code = raw && (String(raw).match(/\d{3,}/) || [])[0];
        if (code && (code !== last || Date.now() - lastAt > 4000)) {
          last = code; lastAt = Date.now();
          w.classList.add('hit'); setTimeout(() => w.classList.remove('hit'), 400);
          if (await onCode(code)) return close();
        }
      } catch (e) { }
      setTimeout(loop, 200);
    };
    loop();
  }

  function close() { if (!cur) return; cur.alive = false; cur.stream.getTracks().forEach(t => t.stop()); cur.w.remove(); cur = null; }

  // QR كـ SVG (للكارت وملف الطالب)
  function qrSvg(text, cell) {
    const q = qrcode(0, 'M'); q.addData(String(text)); q.make();
    return q.createSvgTag({ cellSize: cell || 4, margin: 2, scalable: true });
  }

  return { open, close, qrSvg };
})();
