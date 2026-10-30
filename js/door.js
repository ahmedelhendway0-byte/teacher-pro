// تسجيل الحضور (أي أسيستنت معاها الصلاحية، من موبايلها): بتفتح على المجموعة الشغالة دلوقتي ⇒
// الطالب يتقري (QR بالكاميرا أو السكانر / الكود / الاسم / كارت NFC اختياري) ⇒ يتخصم من اشتراكه أو يدفع كاش ⇒ الواجب
// ⇒ يتخصم من اشتراكه أو يدفع كاش ⇒ الواجب. الضغط على الطالب بيفتح ملفه كامل.
const Door = (() => {
  const { esc, icon, $, num, toast, busy, credit } = U;
  const D = { cls: null, last: null, searchTimer: null, nfc: null, left: false };
  let ctx = null;   // { can, level, openStudent }

  const cairoNow = () => {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    const g = t => (p.find(x => x.type === t) || {}).value;
    return { dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g('weekday')), min: +g('hour') * 60 + +g('minute') };
  };
  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
  // المجموعة «شغالة دلوقتي» من نص ساعة قبل ميعادها لحد ما تخلص
  function isNow(g, n) {
    if (!g.start || !(g.days || []).includes(n.dow)) return false;
    const [h, m] = g.start.split(':').map(Number), s = h * 60 + m;
    return n.min >= s - 30 && n.min <= s + (g.minutes || 120);
  }

  async function draw(c) {
    ctx = c;
    if (D.cls) {
      try { D.cls = await API.classState(D.cls.id); } catch (e) { D.cls = null; }
      if (D.cls && D.cls.day === today()) return render();
      D.cls = null;
    }
    return pick();
  }

  async function pick() {
    const [g, open] = await Promise.all([API.groups(), API.classesToday()]);
    const n = cairoNow(), now = g.groups.filter(x => isNow(x, n));
    // الدخول التلقائي على المجموعة الشغالة (لو واحدة بس ومارجعتش منها بنفسك)
    if (now.length === 1 && !D.left) {
      try { D.cls = await API.openClass(now[0].id); D.last = null; return render(); } catch (e) { toast(e.message, 'err'); }
    }
    const openIds = new Set(open.map(o => o.group_id)), shown = new Set();
    const row = (x, extra) => '<li class="tap" data-door="open" data-id="' + x.id + '"><div class="grow"><b>' + esc(x.name) + '</b>' + (extra || '') +
      '<div class="tiny">' + esc(x.grade) + ' · ' + num(x.students) + ' طالب · ' + num(x.price) + ' ج</div></div>' + icon('chev') + '</li>';
    let h = '<div class="head"><h1>تسجيل الحضور</h1></div>';
    if (now.length) { h += '<h2 class="grade-h">شغالة دلوقتي</h2><ul class="list">' + now.map(x => { shown.add(x.id); return row(x, ' <span class="tag ok">دلوقتي</span>'); }).join('') + '</ul>'; }
    const opened = g.groups.filter(x => openIds.has(x.id) && !shown.has(x.id));
    if (opened.length) { h += '<h2 class="grade-h">اتفتحت النهارده</h2><ul class="list">' + opened.map(x => { shown.add(x.id); const o = open.find(y => y.group_id === x.id); return row(x, ' <span class="tag">دخل ' + num(o.present) + '</span>'); }).join('') + '</ul>'; }
    const todays = g.groups.filter(x => !shown.has(x.id) && (x.days || []).includes(n.dow)).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    if (todays.length) { h += '<h2 class="grade-h">مواعيد النهارده</h2><ul class="list">' + todays.map(x => { shown.add(x.id); return row(x, ' <span class="tiny">' + esc(x.schedule || '') + '</span>'); }).join('') + '</ul>'; }
    const rest = g.groups.filter(x => !shown.has(x.id));
    if (rest.length) h += '<h2 class="grade-h">باقي المجموعات</h2><ul class="list">' + rest.map(x => row(x)).join('') + '</ul>';
    if (!g.groups.length) h += '<div class="surface empty">لسه مفيش مجموعات. ضيف مجموعة الأول.</div>';
    $('#main').innerHTML = h + credit();
    $('#main').onclick = async e => {
      const b = e.target.closest('[data-door=open]'); if (!b) return;
      b.classList.add('busy');
      try { D.cls = await API.openClass(+b.dataset.id); D.last = null; D.left = false; render(); window.scrollTo(0, 0); } catch (x) { toast(x.message, 'err'); }
    };
  }

  function render() {
    const c = D.cls, lv = ctx.level;
    const nfcOk = lv('door') >= 3 && 'NDEFReader' in window, camOk = lv('door') >= 2 && navigator.mediaDevices;
    $('#main').innerHTML =
      '<div class="door-bar"><div><b>' + esc(c.group) + '</b><div class="tiny">' + esc(c.grade) + ' · ' + num(c.price) + ' ج الحصة</div></div>' +
      '<div class="door-count"><b>' + num(c.present) + '</b><span>/ ' + num(c.expected) + '</span><div class="tiny">دخلوا</div></div>' +
      '<button class="btn btn-ghost btn-sm" data-door="change">غيّر</button></div>' +
      '<div class="door-in"><div class="search">' + icon('search') + '<input class="inp inp-lg" id="dq" autocomplete="off" enterkeyhint="go" placeholder="الكود أو الاسم" aria-label="كود الطالب أو اسمه"></div>' +
      (camOk ? '<button class="btn btn-ink btn-qr" data-door="cam">' + icon('qr') + 'امسح QR</button>' : '') +
      (nfcOk ? '<button class="btn btn-line btn-icon' + (D.nfc ? ' on' : '') + '" data-door="nfc" aria-label="قراية الكروت">' + icon('nfc') + '</button>' : '') + '</div>' +
      '<p class="tiny door-hint">' + (camOk ? 'امسح QR الكارت أو موبايل الطالب ورا بعض، أو اكتب الكود أو الاسم' + (nfcOk ? '، أو شغّل قارئ الكروت' : '') + '.' : 'اكتب كود الطالب أو اسمه.') +
      (CFG.DEMO && lv('door') >= 3 ? ' <button class="linkish" data-door="sim">جرّب تقريب كارت (محاكاة)</button>' : '') + '</p>' +
      '<ul class="list hits" id="dhits" hidden></ul>' +
      '<div id="dres">' + resultHtml() + '</div>' +
      '<div class="door-sum" id="dsum">' + sumHtml() + '</div>' +
      '<h2 class="grade-h">آخر اللي دخلوا</h2><ul class="list" id="drecent">' + recentHtml() + '</ul>' +
      '<div class="actions"><button class="btn btn-line" data-door="close">' + icon('check') + 'قفل الحصة وابعت الغياب</button></div>' + credit();
    bind();
    if (matchMedia('(pointer:fine)').matches) $('#dq').focus();   // على الموبايل مانفتحش الكيبورد لوحده
  }

  const face = s => '<span class="av lg ' + (s.gender || '') + '">' + esc(String(s.name || '').charAt(0)) + '</span>';
  const sumHtml = () => '<span>اشتراك <b>' + num(D.cls.wallet) + '</b></span><span>كاش <b>' + num(D.cls.cash) + '</b> · ' + num(D.cls.cash_total) + ' ج</span>';

  function resultHtml() {
    const r = D.last; if (!r) return '';
    if (r.status === 'unknown') return '<div class="verdict no">' + icon('x', 'lg') + '<div><b>الكود ده مش متسجل</b><div class="tiny">اتأكد من الكود أو دوّر بالاسم.</div></div></div>';
    const s = r.student, payLv = ctx.level('pay'), pol = (ctx.me && ctx.me.hw_policy) || 'ask';
    let v = '';
    if (r.status === 'ok') v = '<div class="verdict ok">' + icon('check', 'lg') + '<div>' +
      (r.pay === 'wallet' ? 'اتخصمت حصة · فاضل <span class="big mark">' + num(s.credits) + '</span>' : 'دفع ' + num(D.cls.price) + ' ج كاش') + '</div></div>';
    if (r.status === 'already') v = '<div class="verdict warn">' + icon('check', 'lg') + '<div><b>اتسجل قبل كده</b><div class="tiny">' + (r.pay === 'wallet' ? 'من الاشتراك' : 'كاش') + '</div></div></div>';
    if (r.status === 'need_cash') v = '<div class="verdict ' + (payLv >= 2 ? 'no' : 'info') + '">' + icon(payLv >= 2 ? 'x' : 'cash', 'lg') + '<div><b>' +
      (payLv >= 2 ? 'مفيش رصيد' : 'الحصة ' + num(r.price) + ' ج') + '</b><div class="tiny">' + (payLv >= 2 ? 'يدفع ' + num(r.price) + ' ج كاش أو مايدخلش' : 'ادفع كاش وسجّله') + '</div></div></div>' +
      '<div class="door-act"><button class="btn btn-green btn-lg" data-door="cash">' + icon('cash') + 'دفع كاش ' + num(r.price) + ' ج</button>' +
      '<button class="btn btn-line btn-lg" data-door="skip">مايدخلش</button></div>';
    const hw = r.attendance_id ? (r.hw_claimed ? '<p class="tiny claim">' + icon('check', 'sm') + ' أكّد من البوابة إنه عمل آخر واجب — اتأكد من الكشكول.</p>' : '') +
      // اللي ماعملش: يدخل عادي أو يطلع (مايتسجلش ولا تتخصم الحصة) — حسب اختيار المستر
      '<div class="hw' + (pol === 'ask' ? ' three' : '') + '" role="group" aria-label="الواجب"><button class="' + (r.hw === true ? 'on-yes' : '') + '" data-door="hw" data-v="1">' + icon('check') + 'عمل الواجب</button>' +
      (pol !== 'out' ? '<button class="' + (r.hw === false ? 'on-no' : '') + '" data-door="hw" data-v="0">' + icon('x') + (pol === 'ask' ? 'ماعملش · يدخل' : 'ماعملش') + '</button>' : '') +
      (pol !== 'in' ? '<button class="out" data-door="hwout">' + icon('out') + 'ماعملش · يطلع</button>' : '') + '</div>' : '';
    return '<div class="surface door-res"><button class="who plain-btn" data-door="profile" aria-label="افتح ملف ' + esc(s.name) + '">' + face(s) +
      '<div><h3>' + esc(s.name) + '</h3><div class="tiny">' + s.code + ' · ' + esc(s.group || 'من غير مجموعة') + ' · ملفه ' + icon('chev', 'sm') + '</div>' +
      (r.visitor ? '<span class="tag">من مجموعة تانية</span>' : '') + '</div></button>' + v + hw + '</div>';
  }

  function recentHtml() {
    const rows = D.cls.recent || [];
    if (!rows.length) return '<li class="empty">لسه محدش دخل.</li>';
    return rows.map(a => '<li><span class="dot ' + (a.pay === 'wallet' ? 'g' : 'a') + '"></span><button class="grow plain-btn" data-door="open-st" data-id="' + a.student_id + '"><b>' + esc(a.name) + '</b>' +
      '<div class="tiny">' + (a.pay === 'wallet' ? 'اشتراك · فاضل ' + num(a.credits) : 'كاش ' + num(a.amount) + ' ج') +
      (a.method === 'nfc' ? ' · كارت' : a.method === 'qr' ? ' · QR' : '') +
      (a.hw === true ? ' · عمل الواجب' : a.hw === false ? ' · ماعملش الواجب' : '') + (a.visitor ? ' · من مجموعة تانية' : '') + '</div></button>' +
      '<span class="tiny">' + new Date(a.at).toLocaleTimeString('ar-EG-u-nu-latn', { hour: 'numeric', minute: '2-digit' }) + '</span>' +
      (ctx.can('money') ? '<button class="btn btn-ghost btn-sm" data-door="undo" data-id="' + a.id + '" aria-label="إلغاء حضور ' + esc(a.name) + '">' + icon('undo') + '</button>' : '') + '</li>').join('');
  }

  async function refresh() {
    D.cls = await API.classState(D.cls.id);
    $('#drecent').innerHTML = recentHtml(); $('.door-count b').textContent = num(D.cls.present); $('#dsum').innerHTML = sumHtml();
  }
  function show(r) { D.last = r; $('#dres').innerHTML = resultHtml(); beep(r.status); }

  function beep(status) {
    try {
      const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain();
      o.frequency.value = status === 'ok' ? 880 : status === 'already' ? 660 : 300; g.gain.value = .08;
      o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + (status === 'ok' ? .12 : .3));
      if (navigator.vibrate) navigator.vibrate(status === 'ok' ? 60 : [80, 60, 80]);
    } catch (e) { }
  }

  async function scan(p) {
    try { const r = await API.scan(D.cls.id, p); show(r); if (r.status === 'ok') await refresh(); return r; }
    catch (e) { toast(e.message, 'err'); if (e.code === 'CLASS_CLOSED') { D.cls = null; pick(); } }
  }

  function bind() {
    const q = $('#dq');
    q.onkeydown = e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const v = q.value.trim(); if (!v) return;
      if (/^\d+$/.test(v)) { q.value = ''; hideHits(); scan({ code: v, method: 'search' }); }
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
      if (a === 'change') { Scanner.close(); D.cls = null; D.last = null; D.left = true; window.scrollTo(0, 0); return pick(); }
      if (a === 'pick') { $('#dq').value = ''; hideHits(); return scan({ student_id: +b.dataset.id, method: 'search' }); }
      if (a === 'profile') return ctx.openStudent(D.last.student.id);
      if (a === 'open-st') return ctx.openStudent(+b.dataset.id);
      if (a === 'cash') return busy(b, async () => { const r = await API.doorCash(D.cls.id, D.last.student.id, D.last.method); show(r); await refresh(); });
      if (a === 'skip') { D.last = null; $('#dres').innerHTML = ''; return; }
      if (a === 'hw') {
        const v = b.dataset.v === '1';
        await API.doorHw(D.last.attendance_id, v).catch(x => toast(x.message, 'err'));
        D.last.hw = v; $('#dres').innerHTML = resultHtml(); return refresh();
      }
      if (a === 'hwout') {
        const nm = D.last.student.name;
        return busy(b, async () => {
          D.cls = await API.doorHwOut(D.last.attendance_id); D.last = null;
          $('#dres').innerHTML = '<div class="surface door-res"><div class="verdict no">' + icon('out', 'lg') + '<div><b>' + esc(nm) + ' مادخلش</b><div class="tiny">ماعملش الواجب · الحصة ماتخصمتش وحضوره ماتسجلش</div></div></div></div>';
          await refresh();
        });
      }
      if (a === 'undo') {
        const row = D.cls.recent.find(x => x.id === +b.dataset.id);
        if (!confirm('تلغي حضور «' + row.name + '»؟ ' + (row.pay === 'wallet' ? 'الحصة هترجع لرصيده.' : 'والـ ' + row.amount + ' ج ترجع له.'))) return;
        return busy(b, async () => { D.cls = await API.doorUndo(row.id); D.last = null; render(); toast('اتلغى الحضور'); });
      }
      if (a === 'cam') return Scanner.open(async code => { await scan({ code, method: 'qr' }); return false; }, 'امسح QR الطلاب ورا بعض');
      if (a === 'nfc') return toggleNfc(b);
      if (a === 'sim') return simulateCard();
      if (a === 'close') {
        if (!confirm('تقفل الحصة؟ اللي ماجاش هيتسجل غايب ويتبعت لولي أمره.')) return;
        return busy(b, async () => { const r = await API.closeClass(D.cls.id); toast(r.already ? 'الغياب اتبعت قبل كده' : 'اتسجل غياب ' + r.absent + ' طالب'); });
      }
    };
  }
  function hideHits() { const h = $('#dhits'); if (h) { h.hidden = true; h.innerHTML = ''; } }

  // ───── NFC (Web NFC — كروم أندرويد): الكارت بيتقري من ضهر الموبايل ─────
  async function toggleNfc(btn) {
    if (D.nfc) { D.nfc.abort(); D.nfc = null; btn.classList.remove('on'); return toast('وقفت قراية الكروت'); }
    try {
      const reader = new NDEFReader(), ctl = new AbortController();
      await reader.scan({ signal: ctl.signal });
      // الكارت متسجل عليه كود الطالب (نفس الـ QR) ⇒ بنقراه. لو كارت قديم من غير كود ⇒ بنستخدم رقمه التسلسلي المربوط
      reader.onreading = e => {
        if (!D.cls) return;
        let code = null;
        for (const r of e.message.records) {
          if (r.recordType === 'text') { try { code = (new TextDecoder(r.encoding || 'utf-8').decode(r.data).match(/\d{3,}/) || [])[0]; } catch (x) { } }
        }
        scan(code ? { code, method: 'nfc' } : { card: e.serialNumber, method: 'nfc' });
      };
      D.nfc = ctl; btn.classList.add('on'); toast('جاهز · قرّب الكارت من ضهر الموبايل');
    } catch (e) { toast('مش قادر يشغّل NFC. اتأكد إنه شغال من إعدادات الموبايل.', 'err'); }
  }

  // الديمو بس: محاكاة كارت بيتقرّب (عشان تشوف الشكل من الكمبيوتر)
  async function simulateCard() {
    // أول تقريب = طالب الديمو (اللي على موبايل الطالب وولي الأمر) عشان الحضور يظهر عندهم، وبعده طلاب عشوائي من المجموعة
    const demo = await API.rpc('tp_demo_student').catch(() => null);
    let s = demo && !(D.cls.recent || []).some(a => a.student_id === demo.id) ? demo : null;
    if (!s) {
      const r = await API.students({ group_id: D.cls.group_id, limit: 60 }).catch(() => null);
      if (!r || !r.rows.length) return;
      s = r.rows[Math.floor(Math.random() * r.rows.length)];
    }
    const w = document.createElement('div'); w.className = 'nfc-sim';
    w.innerHTML = '<div class="nfc-phone">' + icon('nfc', 'lg') + '</div><div class="nfc-card"><b>' + esc(s.name) + '</b><span>' + s.code + '</span></div><p>الكارت بيقرّب من ضهر الموبايل…</p>';
    document.body.appendChild(w);
    await new Promise(ok => setTimeout(ok, 1300));
    w.remove();
    scan({ student_id: s.id, method: 'nfc' });
  }

  return { draw, leave: () => { Scanner.close(); if (D.nfc) { D.nfc.abort(); D.nfc = null; } } };
})();
