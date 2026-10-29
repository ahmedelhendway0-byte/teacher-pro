// بوابة الطالب وولي الأمر: الرصيد والشحن، الواجب، الدرجات و«أخطائي»، التمرين وسؤال اليوم، الترتيب والتحديات، الإشعارات
const Portal = (() => {
  const { esc, icon, $, $$, num, toast, sheet, close, busy, credit, ago } = U;
  const TK = 'ptoken_' + (CFG.P || 'tp_');
  const tok = () => { try { return localStorage.getItem(TK); } catch (e) { return null; } };
  const setTok = t => { try { t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK); } catch (e) { } };
  window.onAuthFail = () => setTok(null);
  const call = (fn, args) => API.rpc(fn, Object.assign({ p_token: tok() }, args || {}));
  const root = () => $('#app');
  const P = { me: null, tab: 'home' };
  const lv = k => +(P.me.levels || {})[k] || 0;
  const isStudent = () => P.me.role === 'student';

  async function boot() {
    try {
      const st = await API.status();
      document.title = (st.system_name || 'البوابة') + ' · البوابة';
      if (!tok()) return login(st);
      P.me = await call('tp_portal_me');
      shell();
    } catch (e) { root().innerHTML = '<div class="gate"><div class="gate-card"><h1>مش قادر يوصل</h1><p class="sub">' + esc(e.message) + '</p></div>' + credit() + '</div>'; }
  }

  // ───── الدخول بالكود والرقم السري ─────
  function login(st) {
    let role = 'student';
    root().innerHTML = '<div class="gate"><div class="brand">' + esc(st.system_name || '') + '</div><div class="gate-card">' +
      '<h1>بوابة الطالب وولي الأمر</h1><p class="sub">بكود الطالب والرقم السري اللي معاك من السنتر.</p>' +
      '<div class="seg" role="radiogroup"><button class="on" data-role="student" role="radio" aria-checked="true">' + icon('student') + 'طالب</button><button data-role="parent" role="radio" aria-checked="false">' + icon('user') + 'ولي أمر</button></div>' +
      '<form id="pl" novalidate><div class="field"><label for="pc">كود الطالب</label><input class="inp" id="pc" inputmode="numeric" dir="ltr" autocomplete="username"></div>' +
      '<div class="field"><label for="pp">الرقم السري (4 أرقام)</label><input class="inp" id="pp" type="password" inputmode="numeric" maxlength="4" dir="ltr" autocomplete="current-password"></div>' +
      '<p class="err" id="perr"></p><button class="btn btn-ink btn-lg btn-block" type="submit">ادخل</button></form>' +
      (st.demo ? '<div class="demo-box"><b>دي نسخة تجريبية</b><button class="btn btn-line btn-block" data-demo="student">ادخل الديمو كطالب</button><button class="btn btn-line btn-block" data-demo="parent">ادخل الديمو كولي أمر</button></div>' : '') +
      '</div>' + credit() + '</div>';
    root().onclick = e => {
      const r = e.target.closest('[data-role]'); if (r) { role = r.dataset.role; $$('[data-role]').forEach(b => { b.classList.toggle('on', b === r); b.setAttribute('aria-checked', b === r); }); }
      const d = e.target.closest('[data-demo]'); if (d) busy(d, async () => { const x = await API.rpc('tp_portal_demo', { p_role: d.dataset.demo }); setTok(x.token); P.me = await call('tp_portal_me'); shell(); });
    };
    $('#pl').onsubmit = async e => {
      e.preventDefault(); $('#perr').textContent = '';
      const b = $('#pl button'); b.disabled = true; b.classList.add('busy');
      try { const x = await API.rpc('tp_portal_login', { p_code: $('#pc').value, p_pin: $('#pp').value, p_role: role }); setTok(x.token); P.me = await call('tp_portal_me'); shell(); }
      catch (x) { $('#perr').textContent = x.message; }
      finally { b.disabled = false; b.classList.remove('busy'); }
    };
  }

  // ───── الهيكل ─────
  const TABS = () => (isStudent()
    ? [['home', 'الرئيسية', 'home'], ['grades', 'درجاتي', 'pen'], ['practice', 'التمرين', 'bolt'], ['notes', 'الإشعارات', 'bell'], ['account', 'حسابي', 'user']]
    : [['home', 'الرئيسية', 'home'], ['grades', 'الدرجات', 'pen'], ['notes', 'الإشعارات', 'bell'], ['account', 'الحساب', 'user']])
    .filter(t => t[0] !== 'practice' || lv('engage') >= 2);

  function shell() {
    const s = P.me.student;
    root().innerHTML = '<div class="pshell"><header class="top"><span class="name">' + esc(P.me.config.system_name) + '</span>' + (P.me.config.demo ? '<span class="demo-tag">ديمو</span>' : '') +
      '<span class="who">' + esc(s.name.split(' ').slice(0, 2).join(' ')) + '<br><span class="tiny">' + (isStudent() ? 'طالب' : 'ولي أمر') + '</span></span>' +
      '<button class="btn btn-ghost" data-p="logout" aria-label="خروج">' + icon('out') + '</button></header>' +
      '<main class="main" id="main"></main><nav class="nav" id="nav"></nav></div>';
    root().onclick = onClick;
    window.onhashchange = () => go((location.hash || '#home').slice(1));
    go((location.hash || '#home').slice(1), true);
  }
  function nav() {
    $('#nav').innerHTML = TABS().map(([k, n, i]) => '<a href="#' + k + '" class="' + (k === P.tab ? 'on' : '') + '">' + icon(i) + n +
      (k === 'notes' && P.me.unread ? '<span class="badge">' + P.me.unread + '</span>' : '') + '</a>').join('');
  }
  async function go(tab, first) {
    if (!TABS().some(t => t[0] === tab)) tab = 'home';
    const changed = P.tab !== tab || first; P.tab = tab; nav();
    if (changed) { $('#main').innerHTML = '<div class="loading">بيحمّل…</div>'; window.scrollTo(0, 0); }
    try { await ({ home, grades, practice, notes, account })[tab](); } catch (e) { $('#main').innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; }
  }
  async function refreshMe() { P.me = await call('tp_portal_me'); nav(); }

  // ───── الرئيسية ─────
  async function home() {
    await refreshMe();
    const m = P.me, s = m.student, last = m.scores[0];
    const daily = isStudent() && lv('engage') >= 2 ? await call('tp_portal_daily').catch(() => null) : null;
    let h = '<h1 class="hello">أهلاً ' + esc(isStudent() ? s.name.split(' ')[0] : 'بولي أمر ' + s.name.split(' ')[0]) + '</h1>' +
      '<p class="muted hello-sub">' + esc(s.group || '') + (s.schedule ? ' · ' + esc(s.schedule) : '') + '</p>';
    if (lv('pay') >= 2) h += '<div class="card bal"><div><span class="muted">' + (isStudent() ? 'فاضلك' : 'فاضل لـ ' + esc(s.name.split(' ')[0])) + '</span>' +
      '<div><span class="n mark">' + num(s.credits) + '</span> <span class="muted">حصص</span></div>' +
      (m.topups.some(t => t.status === 'pending') ? '<span class="tag">فيه طلب شحن مستني مراجعة</span>' : '') + '</div>' +
      '<button class="btn btn-ink" data-p="topup">' + icon('ticket') + 'اشحن</button></div>';
    if (m.homework) h += '<div class="card todo">' + icon('book') + '<div class="grow"><b>الواجب</b><div class="tiny">' + esc(m.homework.title) + '</div></div>' +
      (m.homework.done ? '<span class="tag ok">' + icon('check', 'sm') + 'عملته</span>' : isStudent() ? '<button class="btn btn-ink btn-sm" data-p="hw" data-id="' + m.homework.id + '">عملته</button>' : '<span class="tag">لسه ماأكدش</span>') + '</div>';
    if (last) h += '<div class="card"><div class="quiz"><div class="grade">' + (+last.score) + '<small> / ' + last.max + '</small></div><div><b>' + esc(last.title) + '</b>' +
      (last.note ? '<div class="tiny">' + esc(last.note) + '</div>' : '') + '</div></div>' +
      (last.wrong.length ? '<div class="wrong">' + last.wrong.map(w => '<span>' + esc(w) + '</span>').join('') + '</div>' +
        (isStudent() && lv('engage') >= 2 ? '<button class="btn btn-ghost btn-sm mist-btn" data-p="mistakes">' + icon('bolt') + 'حل أسئلة على أخطائي</button>' : '') : '<div class="tiny" style="color:var(--pen-green);margin-top:6px">مفيش أخطاء — برافو</div>') + '</div>';
    if (daily) h += dailyCard(daily);
    if (s.rank && lv('engage') >= 2) h += '<button class="card rank plain-btn" data-p="rank"><div class="grow"><b>ترتيبك في المجموعة</b><div class="tiny">' + num(s.xp) + ' نقطة · مستوى ' + s.level +
      (s.streak ? ' · ' + icon('fire', 'sm') + ' ' + s.streak + ' يوم' : '') + '</div></div><span class="rank-n">#' + s.rank + '</span></button>';
    if (m.contest) { const top = Math.max(1, ...m.contest.standings.map(x => +x.avg));
      h += '<div class="card"><b>' + icon('trophy', 'sm') + ' ' + esc(m.contest.title) + '</b><div class="tiny" style="margin-bottom:8px">لحد ' + m.contest.ends + '</div>' +
        m.contest.standings.map(x => '<div class="bar-row"><span>' + esc(x.name) + '</span><span class="bar g" style="--w:' + Math.round(x.avg / top * 100) + '%"></span><b class="num">' + x.avg + '</b></div>').join('') + '</div>'; }
    if (!isStudent() && m.attendance.length) h += '<h2 class="grade-h">آخر الحصص</h2><ul class="list">' + m.attendance.map(a => '<li><span class="dot g"></span><div class="grow">حضر ' + esc(a.group_name) +
      '<div class="tiny">' + new Date(a.at).toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'short' }) + (a.hw === true ? ' · عمل الواجب' : a.hw === false ? ' · ماعملش الواجب' : '') + '</div></div></li>').join('') + '</ul>';
    $('#main').innerHTML = h + credit();
  }

  function dailyCard(d) {
    return '<div class="card dq" id="dq"><div class="row-top"><b>' + icon('bolt', 'sm') + ' سؤال اليوم</b><span class="tiny">' + num(d.solvers) + ' حلّوه' +
      (P.me.student.streak ? ' · ' + icon('fire', 'sm') + ' ' + P.me.student.streak : '') + '</span></div><p>' + esc(d.body) + '</p>' +
      '<div class="opts">' + d.choices.map((c, i) => '<button data-p="daily" data-q="' + d.id + '" data-i="' + i + '"' + (d.answered ? ' disabled' : '') +
        ' class="' + (d.answered && i === d.answer ? 'right' : '') + '">' + esc(c) + '</button>').join('') + '</div>' +
      (d.answered ? '<p class="tiny">' + (d.correct ? 'صح! خدت 20 نقطة.' : 'المرة الجاية. خدت 5 نقط على المحاولة.') + ' تعالى بكرة على سؤال جديد.</p>' : '') + '</div>';
  }

  // ───── الدرجات ─────
  async function grades() {
    await refreshMe();
    const sc = P.me.scores;
    $('#main').innerHTML = '<h1 class="page-h">' + (isStudent() ? 'درجاتي' : 'الدرجات') + '</h1>' +
      (P.me.mistakes.length ? '<div class="card"><b>' + (isStudent() ? 'أخطائي' : 'الأجزاء اللي محتاجة مراجعة') + '</b><div class="wrong">' + P.me.mistakes.map(w => '<span>' + esc(w) + '</span>').join('') + '</div>' +
        (isStudent() && lv('engage') >= 2 ? '<button class="btn btn-ink btn-sm mist-btn" data-p="mistakes">' + icon('bolt') + 'حل أسئلة عليها</button>' : '') + '</div>' : '') +
      (sc.length ? '<ul class="list">' + sc.map(x => { const pct = x.score / x.max;
        return '<li class="col"><div class="row-top"><div class="grow"><b>' + esc(x.title) + '</b><div class="tiny">' + (x.kind === 'exam' ? 'امتحان' : 'كويز') + ' · ' + ago(x.at) + '</div></div>' +
          '<div class="grade sm ' + (pct >= .85 ? 'good' : pct < .5 ? 'low' : '') + '">' + (+x.score) + '<small> / ' + x.max + '</small></div></div>' +
          (x.wrong.length ? '<div class="wrong">' + x.wrong.map(w => '<span>' + esc(w) + '</span>').join('') + '</div>' : '') + (x.note ? '<div class="tiny">' + esc(x.note) + '</div>' : '') + '</li>'; }).join('') + '</ul>'
        : '<div class="card empty">' + icon('pen') + '<div>لسه مفيش درجات.</div></div>') + credit();
  }

  // ───── التمرين: الوحدات + أخطائي + التحديات ─────
  async function practice() {
    const [units, ch] = await Promise.all([call('tp_portal_units'), lv('engage') >= 3 ? call('tp_portal_challenges') : Promise.resolve(null)]);
    let h = '<h1 class="page-h">التمرين</h1><p class="muted" style="margin-top:0">كل إجابة صح أول مرة بـ 10 نقط. النقط بتعلّي مستواك وترتيبك.</p>';
    if (P.me.mistakes.length) h += '<button class="card plain-btn mist-card" data-p="mistakes">' + icon('bolt') + '<div class="grow"><b>أخطائي</b><div class="tiny">' + P.me.mistakes.map(esc).join('، ') + '</div></div>' + icon('chev') + '</button>';
    h += '<h2 class="grade-h">الوحدات</h2><ul class="list">' + units.map(u => '<li class="tap" data-p="unit" data-u="' + esc(u.unit) + '"><div class="grow"><b>' + esc(u.unit) + '</b>' +
      '<div class="prog"><span style="--w:' + Math.round(u.solved / u.total * 100) + '%"></span></div><div class="tiny">' + u.solved + ' من ' + u.total + '</div></div>' + icon('chev') + '</li>').join('') + '</ul>';
    if (ch) {
      h += '<div class="head" style="margin-top:var(--s6)"><h2>التحديات</h2><button class="btn btn-ink btn-sm" data-p="challenge-new">' + icon('bolt') + 'تحدّى زميل</button></div>' +
        '<p class="tiny" style="margin-top:-8px">5 أسئلة، وكل واحد بيحلها في وقته خلال 24 ساعة. الكسبان ياخد 30 نقطة.</p>' +
        (ch.length ? '<ul class="list">' + ch.map(c => '<li><div class="grow"><b>' + (c.mine ? 'انت ضد ' : 'تحدي من ') + esc(c.other) + '</b><div class="tiny">' +
          (c.status === 'done' ? 'خلص · ' + c.my_score + ' ضد ' + c.their_score + (c.my_score > c.their_score ? ' · كسبت' : c.my_score < c.their_score ? ' · خسرت' : ' · تعادل')
            : c.status === 'expired' ? 'الوقت خلص' : c.played ? 'مستني زميلك يحل' : 'مستنيك تحل') + '</div></div>' +
          (c.status === 'open' && !c.played ? '<button class="btn btn-green btn-sm" data-p="play" data-id="' + c.id + '">العب</button>' : '') + '</li>').join('') + '</ul>'
          : '<div class="card empty">لسه مفيش تحديات.</div>');
    }
    $('#main').innerHTML = h + credit();
  }

  // جلسة أسئلة: سؤال سؤال وبعدها النتيجة
  function quiz(qs, title, onDone) {
    if (!qs.length) return toast('مفيش أسئلة هنا لسه', 'err');
    let i = 0, right = 0, pts = 0; const answers = [];
    const draw = () => {
      const q = qs[i];
      sheet('<div class="qhead"><b>' + esc(title) + '</b><span class="tiny">' + (i + 1) + ' من ' + qs.length + '</span></div><div class="prog"><span style="--w:' + Math.round(i / qs.length * 100) + '%"></span></div>' +
        '<p class="qbody">' + esc(q.body) + '</p><div class="opts col">' + q.choices.map((c, k) => '<button data-k="' + k + '">' + esc(c) + '</button>').join('') + '</div><div id="qfb"></div>', box => {
        box.onclick = async e => {
          const b = e.target.closest('[data-k]'); if (!b || box.dataset.done) return;
          box.dataset.done = 1; const k = +b.dataset.k; answers.push(k);
          let ok = null, ans = null;
          if (!onDone) { const r = await call('tp_portal_answer', { p_q: q.id, p_choice: k, p_source: 'bank' }).catch(x => (toast(x.message, 'err'), null)); if (r) { ok = r.correct; ans = r.answer; pts += r.points; } }
          $$('[data-k]', box).forEach(x => { x.disabled = true; if (ans != null && +x.dataset.k === ans) x.classList.add('right'); });
          if (ok === false) b.classList.add('wrong-a'); if (ok) right++;
          if (onDone) b.classList.add('picked');
          $('#qfb', box).innerHTML = (ok == null ? '' : '<p class="fb ' + (ok ? 'ok' : 'no') + '">' + (ok ? 'صح' : 'غلط') + '</p>') +
            '<button class="btn btn-ink btn-block" data-next>' + (i < qs.length - 1 ? 'اللي بعده' : 'خلصت') + '</button>';
          $('[data-next]', box).onclick = async () => {
            i++; if (i < qs.length) return draw();
            if (onDone) return onDone(answers);
            sheet('<div class="result"><div class="big">' + right + ' / ' + qs.length + '</div><p>خدت <b>' + pts + '</b> نقطة.</p><button class="btn btn-ink btn-block" data-close>تمام</button></div>');
            refreshMe();
          };
        };
      });
    };
    draw();
  }

  // ───── الإشعارات ─────
  async function notes() {
    const rows = await call('tp_portal_notes'); P.me.unread = 0; nav();
    $('#main').innerHTML = '<h1 class="page-h">الإشعارات</h1>' + (rows.length ? '<ul class="feed">' + rows.map(n => '<li class="' + (n.read ? '' : 'unread') + '"><span class="lvl ' + (/no|out|absent|missing/.test(n.kind) ? 'l3' : n.kind === 'grade' ? 'l2' : '') + '"></span>' +
      '<div class="grow">' + esc(n.body) + '</div><span class="t">' + ago(n.at) + '</span></li>').join('') + '</ul>' : '<div class="card empty">' + icon('bell') + '<div>مفيش إشعارات.</div></div>') + credit();
  }

  // ───── الحساب: الرصيد والشحن والكارت ─────
  async function account() {
    await refreshMe();
    const m = P.me, s = m.student;
    $('#main').innerHTML = '<h1 class="page-h">' + (isStudent() ? 'حسابي' : 'الحساب') + '</h1>' +
      '<div class="card id-wrap"><div class="id-card"><div class="id-top"><b>' + esc(m.config.system_name) + '</b><span>' + esc(s.grade) + '</span></div>' +
      '<div class="id-body"><div class="id-qr">' + Scanner.qrSvg(s.code, 5) + '</div><div><div class="id-name">' + esc(s.name) + '</div><div class="id-code num">' + s.code + '</div><div class="tiny">' + esc(s.group || '') + '</div></div></div>' +
      '<div class="id-foot">POWERED BY HINDAWY</div></div><p class="tiny center">' + (isStudent() ? 'ورّي الـ QR ده على الباب لو نسيت الكارت.' : 'ده كارت ابنك — الـ QR بيتقري على الباب.') + '</p></div>' +
      (lv('pay') >= 2 ? '<div class="card bal"><div><span class="muted">الرصيد</span><div><span class="n mark">' + num(s.credits) + '</span> <span class="muted">حصص</span></div><div class="tiny">سعر الحصة ' + num(s.price) + ' ج</div></div>' +
        '<button class="btn btn-ink" data-p="topup">' + icon('ticket') + 'اشحن</button></div>' +
        (m.topups.length ? '<h2 class="grade-h">طلبات الشحن</h2><ul class="list">' + m.topups.map(t => '<li><div class="grow"><b>' + num(t.amount) + ' ج</b> · ' + t.sessions + ' حصص<div class="tiny">' + ago(t.created_at) + (t.note ? ' · ' + esc(t.note) : '') + '</div></div>' +
          '<span class="tag ' + (t.status === 'approved' ? 'ok' : t.status === 'rejected' ? 'no' : '') + '">' + (t.status === 'approved' ? (t.auto ? 'اتأكد أوتوماتيك' : 'اتشحن') : t.status === 'rejected' ? 'اترفض' : 'مستني') + '</span></li>').join('') + '</ul>' : '') : '') +
      credit();
  }

  // شحن: بعدد حصص (+ منتجات) — المبلغ بيتحسب لوحده، والطالب مابيكتبش مبلغ
  function topup() {
    const m = P.me, s = m.student, w = m.wallets || {};
    if (!s.price) return toast('مالكش مجموعة لسه. كلّم السنتر.', 'err');
    let n = 4, method = w.vodafone ? 'vodafone' : 'instapay', receipt = null; const prods = new Set();
    const total = () => n * s.price + m.products.filter(p => prods.has(p.id)).reduce((a, p) => a + p.price, 0);
    sheet('<h2>اشحن حصص</h2><p class="muted" style="margin-top:0">سعر الحصة ' + num(s.price) + ' ج</p>' +
      '<div class="stepper"><button type="button" data-n="-1" aria-label="أقل">−</button><output id="tn"></output><button type="button" data-n="1" aria-label="أكتر">+</button></div>' +
      '<div class="chips center">' + [4, 8, 12].map(x => '<button type="button" class="chip" data-set="' + x + '">' + x + '</button>').join('') + '</div>' +
      (m.products.length ? '<div class="prods">' + m.products.map(p => '<label class="perm"><input type="checkbox" data-prod="' + p.id + '"><span class="grow"><b>' + esc(p.name) + '</b></span><b class="num">' + num(p.price) + ' ج</b></label>').join('') + '</div>' : '') +
      '<div class="total"><span class="muted">المطلوب بالظبط</span><b id="tt"></b></div>' +
      '<div class="seg" style="margin-top:var(--s4)">' + (w.vodafone ? '<button type="button" data-m="vodafone">فودافون كاش</button>' : '') + (w.instapay ? '<button type="button" data-m="instapay">انستاباي</button>' : '') + '</div>' +
      '<ol class="steps" id="tsteps"></ol>' +
      '<div class="field"><label for="ts">' + 'الرقم أو الاسم اللي حوّلت منه' + '</label><input class="inp" id="ts" dir="ltr" value="' + esc(isStudent() ? s.phone : s.parent_phone) + '"></div>' +
      '<div class="field"><label for="tr">صورة الإيصال (اختياري — بتسرّع المراجعة)</label><input class="inp" id="tr" type="file" accept="image/*"></div>' +
      '<p class="err" id="terr"></p><button class="btn btn-ink btn-lg btn-block" id="tgo"></button>', box => {
      const upd = () => {
        $('#tn').innerHTML = n + '<small>حصص</small>'; $('#tt').textContent = num(total()) + ' ج';
        $$('[data-set]', box).forEach(c => c.classList.toggle('on', +c.dataset.set === n));
        $$('[data-m]', box).forEach(c => c.classList.toggle('on', c.dataset.m === method));
        $('#tsteps').innerHTML = '<li><span>حوّل <b>' + num(total()) + ' ج بالظبط</b> ' + (method === 'vodafone' ? 'فودافون كاش على <span class="num" dir="ltr">' + esc(w.vodafone) + '</span>' : 'انستاباي على <span class="num" dir="ltr">' + esc(w.instapay) + '</span>') + '</span></li>' +
          '<li><span>اكتب تحت الرقم أو الاسم اللي حوّلت منه</span></li><li><span>دوس «حوّلت». لو المبلغ وصل بيتشحن على طول، ولو لأ بيروح للمراجعة.</span></li>';
        $('#tgo').innerHTML = icon('receipt') + 'حوّلت ' + num(total()) + ' ج — أكّد';
      };
      box.onclick = e => {
        const d = e.target.closest('[data-n]'), c = e.target.closest('[data-set]'), mm = e.target.closest('[data-m]');
        if (d) n = Math.min(100, Math.max(0, n + +d.dataset.n)); if (c) n = +c.dataset.set; if (mm) method = mm.dataset.m;
        if (d || c || mm) upd();
      };
      box.onchange = async e => {
        if (e.target.dataset.prod) { e.target.checked ? prods.add(+e.target.dataset.prod) : prods.delete(+e.target.dataset.prod); upd(); }
        if (e.target.id === 'tr' && e.target.files[0]) receipt = await shrink(e.target.files[0]).catch(() => null);
      };
      $('#tgo').onclick = e => {
        if (total() <= 0) return ($('#terr').textContent = 'اختار عدد حصص أو منتج.');
        if (!$('#ts').value.trim()) return ($('#terr').textContent = 'اكتب الرقم أو الاسم اللي حوّلت منه.');
        busy(e.currentTarget, async () => {
          const r = await call('tp_portal_topup', { p: { sessions: n, products: [...prods], method, sender: $('#ts').value.trim(), sent_at: new Date().toISOString(), receipt } });
          sheet('<div class="result">' + icon(r.status === 'approved' ? 'check' : 'receipt', 'lg') + '<h2>' + (r.status === 'approved' ? 'اتشحن رصيدك' : 'الطلب وصل') + '</h2><p class="muted">' +
            (r.status === 'approved' ? 'المبلغ وصل واتأكد أوتوماتيك.' : 'هيتراجع من السنتر ويوصلك إشعار. لو المبلغ ماوصلش، الطلب هيترفض وكلّم الدعم.') + '</p><button class="btn btn-ink btn-block" data-close>تمام</button></div>');
          go(P.tab);
        });
      };
      upd();
    });
  }
  // الإيصال بيتصغر على الموبايل قبل الرفع (أقل من 250KB)
  function shrink(file) {
    return new Promise((ok, no) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => { const sc = Math.min(1, 1100 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = img.width * sc; c.height = img.height * sc; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', .6)); };
      img.onerror = no; img.src = url;
    });
  }

  // ───── الأزرار ─────
  async function onClick(e) {
    const b = e.target.closest('[data-p]'); if (!b) return;
    const a = b.dataset.p;
    if (a === 'logout') { await call('tp_portal_logout').catch(() => { }); setTok(null); location.hash = ''; return location.reload(); }
    if (a === 'topup') return topup();
    if (a === 'hw') return busy(b, async () => { await call('tp_portal_hw', { p_hw: +b.dataset.id }); toast('اتسجل إنك عملت الواجب — ورّيه للأسيستنت على الباب'); home(); });
    if (a === 'daily') return busy(b, async () => {
      const r = await call('tp_portal_answer', { p_q: +b.dataset.q, p_choice: +b.dataset.i, p_source: 'daily' });
      toast(r.correct ? 'صح! +' + r.points + ' نقطة' : 'غلط · +' + r.points + ' نقط على المحاولة', r.correct ? 'ok' : 'err');
      $('#dq').outerHTML = dailyCard(await call('tp_portal_daily'));
    });
    if (a === 'mistakes') { const qs = await call('tp_portal_practice', { p: { mistakes: true } }); return quiz(qs, 'أخطائي'); }
    if (a === 'unit') { const qs = await call('tp_portal_practice', { p: { unit: b.dataset.u } }); return quiz(qs, b.dataset.u); }
    if (a === 'rank') {
      const r = await call('tp_portal_rank'); if (!r) return;
      return sheet('<h2>أوائل مجموعتك</h2><ol class="list top-list">' + r.map((x, i) => '<li class="' + (x.me ? 'me' : '') + '"><span class="rank">' + (i + 1) + '</span><div class="grow">' + esc(x.name) + (x.me ? ' (انت)' : '') + '</div><b class="num">' + x.xp + '</b></li>').join('') + '</ol>');
    }
    if (a === 'challenge-new') return mates();
    if (a === 'play') {
      const id = +b.dataset.id, qs = await call('tp_portal_challenge_play', { p_id: id });
      return quiz(qs, 'التحدي', async ans => {
        const r = await call('tp_portal_challenge_submit', { p_id: id, p_answers: ans });
        sheet('<div class="result"><div class="big">' + r.score + ' / ' + r.of + '</div><p>' + (r.done ? (r.score > r.their ? 'كسبت! +30 نقطة' : r.score < r.their ? 'زميلك كسب المرة دي' : 'تعادل · +10 نقط') + ' (' + r.their + ' لزميلك)' : 'مستني زميلك يحل') + '</p><button class="btn btn-ink btn-block" data-close>تمام</button></div>');
        practice();
      });
    }
  }

  function mates() {
    sheet('<h2>تحدّى زميل</h2><p class="tiny" style="margin-top:0">زمايلك في نفس الصف بس.</p><div class="search">' + icon('search') + '<input class="inp" id="mq" placeholder="دوّر بالاسم"></div><ul class="list" id="ml" style="margin-top:var(--s3)"></ul>', async box => {
      const load = async q => { const r = await call('tp_portal_mates', { p_q: q || '' }); $('#ml').innerHTML = r.map(x => '<li class="tap" data-to="' + x.id + '"><div class="grow"><b>' + esc(x.name) + '</b><div class="tiny">' + esc(x.group || '') + '</div></div>' + icon('bolt') + '</li>').join('') || '<li class="empty">مفيش حد بالاسم ده.</li>'; };
      let t; $('#mq').oninput = () => { clearTimeout(t); t = setTimeout(() => load($('#mq').value), 250); };
      box.onclick = async e => { const li = e.target.closest('[data-to]'); if (!li) return;
        try { await call('tp_portal_challenge_new', { p_to: +li.dataset.to }); close(); toast('اتبعت التحدي — العب دورك دلوقتي'); practice(); } catch (x) { toast(x.message, 'err'); } };
      load('');
    });
  }

  return { boot };
})();
Portal.boot();
