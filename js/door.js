// شاشة الباب: الطالب يتقري (NFC / QR / كود من السكانر / بحث بالاسم) ⇒ يتخصم من اشتراكه أو يدفع كاش ⇒ الواجب
// بتتسجل في App من app.js (Door.draw)
const Door = (() => {
  const { esc, icon, $, num, toast, busy, credit } = U;
  const D = { cls: null, last: null, searchTimer: null, cam: null, nfc: null };
  let ctx = null;   // { me, can, level }

  async function draw(c) {
    ctx = c;
    if (!D.cls) return pick();
    try { D.cls = await API.classState(D.cls.id); } catch (e) { D.cls = null; return pick(); }
    if (D.cls.day !== today()) { D.cls = null; return pick(); }
    render();
  }
  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });

  // اختيار المجموعة اللي هتتفتح لها الحصة
  async function pick() {
    const [g, open] = await Promise.all([API.groups(), API.classesToday()]);
    const openIds = new Set(open.map(o => o.group_id));
    let h = '<div class="head"><h1>الباب</h1></div><p class="muted" style="margin-top:0">اختار المجموعة اللي داخلة دلوقتي.</p>';
    if (open.length) h += '<h2 class="grade-h">حصص مفتوحة النهارده</h2><ul class="list">' + open.map(o =>
      '<li class="tap" data-door="open" data-id="' + o.group_id + '"><span class="av">' + icon('door') + '</span><div class="grow"><b>' + esc(o.group) + '</b>' +
      '<div class="tiny">دخل ' + num(o.present) + '</div></div>' + icon('chev') + '</li>').join('') + '</ul>';
    const rest = g.groups.filter(x => !openIds.has(x.id));
    if (rest.length) h += '<h2 class="grade-h">كل المجموعات</h2><ul class="list">' + rest.map(x =>
      '<li class="tap" data-door="open" data-id="' + x.id + '"><div class="grow"><b>' + esc(x.name) + '</b><div class="tiny">' + esc(x.grade) + ' · ' + num(x.students) + ' طالب · ' + num(x.price) + ' ج</div></div>' + icon('chev') + '</li>').join('') + '</ul>';
    $('#main').innerHTML = h + credit();
    $('#main').onclick = async e => {
      const b = e.target.closest('[data-door=open]'); if (!b) return;
      b.classList.add('busy');
      try { D.cls = await API.openClass(+b.dataset.id); D.last = null; render(); } catch (x) { toast(x.message, 'err'); }
    };
  }

  function render() {
    const c = D.cls, lv = ctx.level;
    $('#main').innerHTML =
      '<div class="door-bar"><div><b>' + esc(c.group) + '</b><div class="tiny">' + esc(c.grade) + ' · ' + num(c.price) + ' ج الحصة</div></div>' +
      '<div class="door-count"><b>' + num(c.present) + '</b><span>/ ' + num(c.expected) + '</span><div class="tiny">دخلوا</div></div>' +
      '<button class="btn btn-ghost btn-sm" data-door="change">غيّر</button></div>' +
      '<div class="door-in">' +
      '<div class="search">' + icon('search') + '<input class="inp inp-lg" id="dq" autocomplete="off" placeholder="' +
      'الكود أو الاسم' + '" aria-label="كود الطالب أو اسمه"></div>' +
      (lv('door') >= 2 && 'BarcodeDetector' in window ? '<button class="btn btn-line btn-icon" data-door="cam" aria-label="امسح QR بالكاميرا">' + icon('qr') + '</button>' : '') +
      (lv('door') >= 3 && 'NDEFReader' in window ? '<button class="btn btn-line btn-icon' + (D.nfc ? ' on' : '') + '" data-door="nfc" aria-label="قراية الكروت">' + icon('nfc') + '</button>' : '') +
      '</div><p class="tiny door-hint">' + (lv('door') >= 3 ? 'قرّب الكارت، أو امسح الـ QR، أو اكتب الكود أو الاسم.' : lv('door') >= 2 ? 'امسح الـ QR بالسكانر أو الكاميرا، أو اكتب الكود أو الاسم.' : 'اكتب كود الطالب أو اسمه.') + '</p>' +
      '<ul class="list hits" id="dhits" hidden></ul>' +
      '<div id="dres">' + resultHtml() + '</div>' +
      '<div class="door-sum"><span>اشتراك <b>' + num(c.wallet) + '</b></span><span>كاش <b>' + num(c.cash) + '</b> · ' + num(c.cash_total) + ' ج</span></div>' +
      '<h2 class="grade-h">آخر اللي دخلوا</h2><ul class="list" id="drecent">' + recentHtml() + '</ul>' + credit();
    bind();
    $('#dq').focus();
  }

  function face(s) { return '<span class="av lg ' + (s.gender || '') + '">' + esc(String(s.name || '').charAt(0)) + '</span>'; }

  function resultHtml() {
    const r = D.last; if (!r) return '';
    if (r.status === 'unknown') return '<div class="verdict no">' + icon('x', 'lg') + '<div><b>الكود ده مش متسجل</b><div class="tiny">اتأكد من الكود أو دوّر بالاسم.</div></div></div>';
    const s = r.student, payLv = ctx.level('pay');
    let v = '';
    if (r.status === 'ok') v = '<div class="verdict ok">' + icon('check', 'lg') + '<div>' +
      (r.pay === 'wallet' ? 'اتخصمت حصة · فاضل <span class="big mark">' + num(s.credits) + '</span>' : 'دفع ' + num(D.cls.price) + ' ج كاش') + '</div></div>';
    if (r.status === 'already') v = '<div class="verdict warn">' + icon('check', 'lg') + '<div><b>اتسجل قبل كده</b><div class="tiny">' + (r.pay === 'wallet' ? 'من الاشتراك' : 'كاش') + '</div></div></div>';
    if (r.status === 'need_cash') v = '<div class="verdict ' + (payLv >= 2 ? 'no' : 'info') + '">' + icon(payLv >= 2 ? 'x' : 'cash', 'lg') + '<div><b>' +
      (payLv >= 2 ? 'مفيش رصيد' : 'الحصة ' + num(r.price) + ' ج') + '</b><div class="tiny">' + (payLv >= 2 ? 'يدفع ' + num(r.price) + ' ج كاش أو مايدخلش' : 'ادفع كاش وسجّله') + '</div></div></div>' +
      '<div class="door-act"><button class="btn btn-green btn-lg" data-door="cash">' + icon('cash') + 'دفع كاش ' + num(r.price) + ' ج</button>' +
      '<button class="btn btn-line btn-lg" data-door="skip">مايدخلش</button></div>';
    const hw = r.attendance_id ? '<div class="hw" role="group" aria-label="الواجب"><button class="' + (r.hw === true ? 'on-yes' : '') + '" data-door="hw" data-v="1">' + icon('check') + 'عمل الواجب</button>' +
      '<button class="' + (r.hw === false ? 'on-no' : '') + '" data-door="hw" data-v="0">' + icon('x') + 'ماعملش</button></div>' : '';
    return '<div class="surface door-res"><div class="who">' + face(s) + '<div><h3>' + esc(s.name) + '</h3><div class="tiny">' + s.code + ' · ' + esc(s.group || 'من غير مجموعة') + '</div>' +
      (r.visitor ? '<span class="tag">من مجموعة تانية</span>' : '') + '</div></div>' + v + hw + '</div>';
  }

  function recentHtml() {
    const rows = D.cls.recent || [];
    if (!rows.length) return '<li class="empty">لسه محدش دخل.</li>';
    return rows.map(a => '<li><span class="dot ' + (a.pay === 'wallet' ? 'g' : 'a') + '"></span><div class="grow"><b>' + esc(a.name) + '</b>' +
      '<div class="tiny">' + (a.pay === 'wallet' ? 'اشتراك · فاضل ' + num(a.credits) : 'كاش ' + num(a.amount) + ' ج') +
      (a.hw === true ? ' · عمل الواجب' : a.hw === false ? ' · ماعملش الواجب' : '') + (a.visitor ? ' · من مجموعة تانية' : '') + '</div></div>' +
      '<span class="tiny">' + new Date(a.at).toLocaleTimeString('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit' }) + '</span>' +
      (ctx.can('money') ? '<button class="btn btn-ghost btn-sm" data-door="undo" data-id="' + a.id + '" aria-label="إلغاء حضور ' + esc(a.name) + '">' + icon('undo') + '</button>' : '') + '</li>').join('');
  }

  async function refresh() { D.cls = await API.classState(D.cls.id); $('#drecent').innerHTML = recentHtml(); $('.door-count b').textContent = num(D.cls.present);
    $('.door-sum').innerHTML = '<span>اشتراك <b>' + num(D.cls.wallet) + '</b></span><span>كاش <b>' + num(D.cls.cash) + '</b> · ' + num(D.cls.cash_total) + ' ج</span>'; }
  function show(r) { D.last = r; $('#dres').innerHTML = resultHtml(); beep(r.status); }

  // صوت قصير: نجاح / محتاج انتباه
  function beep(status) {
    try {
      const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain();
      o.frequency.value = status === 'ok' ? 880 : status === 'already' ? 660 : 300; g.gain.value = .08;
      o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + (status === 'ok' ? .12 : .3));
    } catch (e) { }
  }

  async function scan(p) {
    try { const r = await API.scan(D.cls.id, p); show(r); if (r.status === 'ok') await refresh(); }
    catch (e) { toast(e.message, 'err'); if (e.code === 'CLASS_CLOSED') { D.cls = null; pick(); } }
  }

  function bind() {
    const q = $('#dq');
    q.onkeydown = e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const v = q.value.trim(); if (!v) return;
      if (/^\d+$/.test(v)) { q.value = ''; hideHits(); scan({ code: v, method: v.length <= 6 ? 'search' : 'qr' }); }
      else { const first = $('#dhits li[data-id]'); if (first) first.click(); }
    };
    q.oninput = () => {
      clearTimeout(D.searchTimer);
      const v = q.value.trim();
      if (v.length < 2 || /^\d+$/.test(v)) return hideHits();
      D.searchTimer = setTimeout(async () => {
        const r = await API.students({ q: v, limit: 8 }).catch(() => null); if (!r) return;
        const h = $('#dhits'); h.hidden = false;
        h.innerHTML = r.rows.length ? r.rows.map(s => '<li class="tap" data-door="pick" data-id="' + s.id + '"><div class="grow"><b>' + esc(s.name) + '</b><div class="tiny">' + s.code + ' · ' + esc(s.group || '') + '</div></div></li>').join('') : '<li class="empty">مفيش طالب بالاسم ده.</li>';
      }, 200);
    };
    $('#main').onclick = async e => {
      const b = e.target.closest('[data-door]'); if (!b) return;
      const a = b.dataset.door;
      if (a === 'change') { stopCam(); D.cls = null; D.last = null; return pick(); }
      if (a === 'pick') { $('#dq').value = ''; hideHits(); return scan({ student_id: +b.dataset.id, method: 'search' }); }
      if (a === 'cash') return busy(b, async () => {
        const r = await API.doorCash(D.cls.id, D.last.student.id, D.last.method); show(r); await refresh(); $('#dq').focus();
      });
      if (a === 'skip') { D.last = null; $('#dres').innerHTML = ''; return $('#dq').focus(); }
      if (a === 'hw') {
        const v = b.dataset.v === '1';
        await API.doorHw(D.last.attendance_id, v).catch(x => toast(x.message, 'err'));
        D.last.hw = v; $('#dres').innerHTML = resultHtml(); refresh(); return $('#dq').focus();
      }
      if (a === 'undo') {
        const row = D.cls.recent.find(x => x.id === +b.dataset.id);
        if (!confirm('تلغي حضور «' + row.name + '»؟ ' + (row.pay === 'wallet' ? 'الحصة هترجع لرصيده.' : 'والـ ' + row.amount + ' ج ترجع له.'))) return;
        return busy(b, async () => { D.cls = await API.doorUndo(row.id); D.last = null; render(); toast('اتلغى الحضور'); });
      }
      if (a === 'cam') return startCam();
      if (a === 'nfc') return toggleNfc(b);
    };
  }
  function hideHits() { const h = $('#dhits'); if (h) { h.hidden = true; h.innerHTML = ''; } }

  // ───── QR بالكاميرا (BarcodeDetector — موجود في كروم أندرويد) ─────
  async function startCam() {
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); }
    catch (e) { return toast('مش قادر يفتح الكاميرا. اسمح للموقع يستخدمها.', 'err'); }
    const w = document.createElement('div'); w.className = 'cam';
    w.innerHTML = '<video playsinline muted></video><div class="cam-frame"></div><button class="btn btn-line" data-cam="close">قفل الكاميرا</button>';
    document.body.appendChild(w);
    const v = $('video', w); v.srcObject = stream; await v.play();
    const det = new BarcodeDetector({ formats: ['qr_code', 'code_128'] });
    let lastCode = '', lastAt = 0;
    D.cam = { stream, w, alive: true };
    w.onclick = e => { if (e.target.closest('[data-cam=close]')) stopCam(); };
    const loop = async () => {
      if (!D.cam || !D.cam.alive) return;
      try {
        const codes = await det.detect(v);
        const raw = codes[0] && codes[0].rawValue, code = raw && (raw.match(/\d+/) || [])[0];
        if (code && (code !== lastCode || Date.now() - lastAt > 4000)) { lastCode = code; lastAt = Date.now(); await scan({ code, method: 'qr' }); }
      } catch (e) { }
      setTimeout(loop, 250);
    };
    loop();
  }
  function stopCam() { if (!D.cam) return; D.cam.alive = false; D.cam.stream.getTracks().forEach(t => t.stop()); D.cam.w.remove(); D.cam = null; }

  // ───── NFC (Web NFC — كروم أندرويد) ─────
  async function toggleNfc(btn) {
    if (D.nfc) { D.nfc.abort(); D.nfc = null; btn.classList.remove('on'); return toast('وقفت قراية الكروت'); }
    try {
      const reader = new NDEFReader(), ctl = new AbortController();
      await reader.scan({ signal: ctl.signal });
      reader.onreading = e => { if (D.cls) scan({ card: e.serialNumber, method: 'nfc' }); };
      D.nfc = ctl; btn.classList.add('on'); toast('قرّب الكارت من ضهر الموبايل');
    } catch (e) { toast('مش قادر يشغّل NFC. اتأكد إنه شغال في الموبايل.', 'err'); }
  }

  return { draw, leave: stopCam };
})();
