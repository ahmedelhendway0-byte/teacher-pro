// التطبيق: الإعداد أول مرة ← الدخول ← الشاشات (الرئيسية، المجموعات، الإعدادات)
// مفيش onclick جوه الـ HTML (الـ CSP بيمنعه) — كل الأزرار بـ data-act
const App = (() => {
  const { esc, icon, $, $$, num, toast, sheet, close, busy, credit, ago } = U;
  const root = () => $('#app');
  const S = { me: null, groups: null, grades: null, feedMin: 1 };

  // ───── المميزات ومستوياتها (نفس جدول PLAN.md) ─────
  const FEATURES = [
    { k: 'pay', name: 'الدفع', lv: ['', 'كاش على الباب، الأسيستنت تسجّل بضغطة', 'اشتراك بالحصص + الشحن بالتحويل والأسيستنت توافق', 'اشتراك بالحصص + تأكيد التحويل أوتوماتيك'] },
    { k: 'door', name: 'تسجيل الحضور', lv: ['', 'بحث بالاسم أو الكود', 'QR بكاميرا الموبايل أو السكانر', 'QR + كارت NFC (اختياري)'] },
    { k: 'engage', name: 'تفاعل الطلاب', lv: ['', 'مقفول', 'بنك أسئلة + سؤال اليوم + الترتيب', 'كل اللي فات + مسابقات المجموعات والتحديات'] },
    { k: 'whatsapp', name: 'واتساب', lv: ['', 'من غير واتساب (البوابة والإشعارات بس)', 'رسالة جاهزة بزرار لكل طالب', 'إرسال أوتوماتيك'] },
    { k: 'facebook', name: 'فيسبوك', lv: ['', 'مقفول', 'صورة الأوائل + زرار مشاركة', 'نشر أوتوماتيك'] },
    { k: 'offline', name: 'الباب من غير نت', lv: ['مقفول', 'شغال لو النت فصل'] }
  ];
  const CONTACT = CFG.PORTFOLIO + '#contact';

  // ───── البداية ─────
  async function boot() {
    try {
      const st = await API.status();
      document.title = st.system_name || 'السيستم';
      if (!st.setup_done) return setup(st);
      // الديمو بس: ?as=teacher|assistant بيدخل على طول (للعرض التفاعلي جوه البرزنتيشن)
      const as = new URLSearchParams(location.search).get('as');
      if (st.demo && CFG.DEMO && (as === 'teacher' || as === 'assistant')) { CFG.MEM = true; await API.demoLogin(as); }
      if (!API.token()) return login(st);
      S.me = await API.me();
      shell();
    } catch (e) {
      root().innerHTML = '<div class="gate"><div class="gate-card"><h1>مش قادر يوصل للسيرفر</h1><p class="sub">' + esc(e.message) + '</p><button class="btn btn-ink btn-block" data-act="reload">جرب تاني</button></div>' + credit() + '</div>';
    }
  }

  // ───── الإعداد أول مرة (3 خطوات) ─────
  const DEFAULT_GRADES = ['أولى ثانوي', 'تانية ثانوي', 'تالتة ثانوي'];
  function setup(st) {
    if (!st.has_plan || !st.ready) {
      root().innerHTML = '<div class="gate"><div class="gate-card"><h1>السيستم لسه ماتفعّلش</h1><p class="sub">بنجهّز السيستم لكل مستر باسمه وباقته. كلّم HINDAWY ياخدوا بياناتك ويدّوك كود التفعيل.</p>' +
        '<a class="btn btn-ink btn-block" href="' + CFG.PORTFOLIO + '#contact" target="_blank" rel="noopener">كلّم HINDAWY</a></div>' + credit() + '</div>';
      return;
    }
    const d = { teacher_name: st.teacher_name || '', phone: '', grades: DEFAULT_GRADES.slice(), password: '', code: '' };
    let step = 1;
    const draw = () => {
      let body = '';
      if (step === 1) body =
        '<h1>أهلاً بيك</h1><p class="sub">تقدر تغيّر الاسم بعدين من الإعدادات.</p>' +
        fld('code', 'كود التفعيل', 'الكود اللي خدته من HINDAWY', d.code, 'text', 'ltr') +
        fld('teacher_name', 'الاسم اللي هيظهر للطلاب', '', d.teacher_name) +
        fld('phone', 'رقم موبايلك', 'هتدخل بيه السيستم', d.phone, 'tel', 'ltr');
      if (step === 2) body =
        '<h1>الصفوف اللي بتدرّسها</h1><p class="sub">اختار الصفوف. تقدر تضيف صف مش موجود.</p>' +
        '<div class="chips" id="gl">' + gradeChips() + '</div>' +
        '<div class="field" style="margin-top:var(--s4)"><label for="ng">صف تاني</label><div style="display:flex;gap:var(--s2)"><input class="inp" id="ng" placeholder="مثلاً: تالتة ثانوي أزهر"><button class="btn btn-line" data-act="addGrade">ضيف</button></div></div>';
      if (step === 3) body =
        '<h1>الباسورد بتاعك</h1><p class="sub">هتدخل بيه انت بس. خليه 6 حروف أو أرقام على الأقل.</p>' +
        fld('password', 'الباسورد', '', '', 'password', 'ltr') +
        fld('password2', 'اكتبه تاني', '', '', 'password', 'ltr');
      root().innerHTML = '<div class="gate"><div class="gate-card">' +
        '<div class="steps-bar">' + [1, 2, 3].map(i => '<i class="' + (i <= step ? 'on' : '') + '"></i>').join('') + '</div>' +
        body + '<p class="err" id="err"></p>' +
        '<div class="actions">' + (step > 1 ? '<button class="btn btn-line" data-act="back">رجوع</button>' : '') +
        '<button class="btn btn-ink" data-act="next">' + (step < 3 ? 'التالي' : 'ابدأ السيستم') + '</button></div>' +
        '</div>' + credit() + '</div>';
      const f = $('.gate input'); if (f) f.focus();
    };
    const gradeChips = () => d.grades.concat(DEFAULT_GRADES.filter(g => !d.grades.includes(g)))
      .map(g => '<button class="chip ' + (d.grades.includes(g) ? 'on' : '') + '" data-act="toggleGrade" data-g="' + esc(g) + '">' + (d.grades.includes(g) ? icon('check') : '') + esc(g) + '</button>').join('');
    const read = () => $$('.gate input[name]').forEach(i => { d[i.name] = i.value.trim(); });
    const err = m => { $('#err').textContent = m || ''; };

    root().onclick = async e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const a = b.dataset.act;
      if (a === 'toggleGrade') { const g = b.dataset.g; d.grades = d.grades.includes(g) ? d.grades.filter(x => x !== g) : d.grades.concat(g); $('#gl').innerHTML = gradeChips(); }
      if (a === 'addGrade') { const v = $('#ng').value.trim(); if (v && !d.grades.includes(v)) d.grades.push(v); $('#ng').value = ''; $('#gl').innerHTML = gradeChips(); }
      if (a === 'back') { read(); step--; draw(); }
      if (a === 'next') {
        read();
        if (step === 1) {
          if (!d.code) return err('اكتب كود التفعيل.');
          if (!d.teacher_name) return err('اكتب الاسم.');
          if ((d.phone.replace(/\D/g, '')).length !== 11) return err('رقم الموبايل لازم 11 رقم.');
          step = 2; return draw();
        }
        if (step === 2) { if (!d.grades.length) return err('اختار صف واحد على الأقل.'); step = 3; return draw(); }
        if (d.password.length < 6) return err('الباسورد لازم 6 حروف أو أرقام على الأقل.');
        if (d.password !== d.password2) return err('الباسورد مش زي بعض.');
        await busy(b, async () => {
          await API.setup({ code: d.code, teacher_name: d.teacher_name, phone: d.phone, grades: d.grades, password: d.password }).catch(x => {
            if (x.code === 'SETUP_CODE') { step = 1; draw(); err('كود التفعيل غلط.'); } throw x;
          });
          S.me = await API.me(); document.title = S.me.config.system_name; shell();
          toast('السيستم جاهز');
        });
      }
    };
    root().onkeydown = e => { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); (e.target.id === 'ng' ? $('[data-act=addGrade]') : $('[data-act=next]')).click(); } };
    draw();
  }

  function fld(name, label, hint, val, type = 'text', dir = '') {
    return '<div class="field"><label for="f_' + name + '">' + label + '</label>' +
      '<input class="inp" id="f_' + name + '" name="' + name + '" type="' + type + '" value="' + esc(val) + '"' +
      (dir ? ' dir="' + dir + '"' : '') + (type === 'tel' ? ' inputmode="numeric" autocomplete="tel"' : '') +
      (type === 'password' ? ' autocomplete="' + (name === 'password' && hint === '' ? 'new-password' : 'current-password') + '"' : '') + '>' +
      (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
  }

  // ───── الدخول ─────
  function login(st) {
    root().innerHTML = '<div class="gate"><div class="brand">' + esc(st.system_name) + '</div><div class="gate-card">' +
      '<h1>' + (CFG.ROLE === 'teacher' ? 'دخول المستر' : 'دخول الأسيستنت') + '</h1><p class="sub">بالموبايل والباسورد.</p>' +
      '<form id="lf" novalidate>' +
      '<div class="field"><label for="ph">رقم الموبايل</label><input class="inp" id="ph" type="tel" inputmode="numeric" dir="ltr" autocomplete="username" required></div>' +
      '<div class="field"><label for="pw">الباسورد</label><input class="inp" id="pw" type="password" dir="ltr" autocomplete="current-password" required></div>' +
      '<p class="err" id="err"></p><button class="btn btn-ink btn-lg btn-block" type="submit">ادخل</button></form>' +
      (st.demo ? '<div class="demo-box"><b>دي نسخة تجريبية</b><span class="tiny">ادخل وجرّب كل حاجة من غير تسجيل.</span>' +
        (CFG.ROLE === 'teacher' ? '<button class="btn btn-line btn-block" data-demo="teacher">ادخل الديمو كمستر</button>'
          : '<button class="btn btn-line btn-block" data-demo="assistant">ادخل الديمو كأسيستنت</button>' +
            '<span class="tiny">الأسيستنت في الديمو معاها صلاحيات: تسجيل الحضور، الطلاب، الدرجات، الفلوس.</span>') + '</div>' : '') +
      '</div>' + credit() + '</div>';
    $$('[data-demo]').forEach(b => { b.onclick = e => busy(e.currentTarget, async () => { await API.demoLogin(b.dataset.demo); location.hash = ''; S.me = await API.me(); shell(); }); });
    $('#ph').focus();
    $('#lf').onsubmit = async e => {
      e.preventDefault();
      const btn = $('#lf button'); $('#err').textContent = '';
      btn.disabled = true; btn.classList.add('busy');
      try { await API.login($('#ph').value, $('#pw').value); S.me = await API.me(); shell(); }
      catch (x) { $('#err').textContent = x.message; }
      finally { btn.disabled = false; btn.classList.remove('busy'); }
    };
  }

  // ───── الهيكل والتنقل ─────
  const isTeacher = () => S.me.staff.role === 'teacher';
  const can = p => isTeacher() || !!(S.me.staff.perms || {})[p];
  const ROUTES = {
    home: { name: 'الرئيسية', icon: 'home', show: () => true, draw: home },
    door: { name: 'الحضور', icon: 'qr', show: () => can('door'), draw: () => Door.draw({ me: S.me, can, level: k => +(S.me.levels || {})[k] || 0, openStudent: id => openStudent(id) }) },
    students: { name: 'الطلاب', icon: 'student', show: () => true, draw: students },
    exams: { name: 'الدرجات', icon: 'pen', show: () => can('grades'), draw: () => Screens.exams(sctx()) },
    money: { name: 'الفلوس', icon: 'cash', show: () => can('money'), draw: () => Screens.money(sctx()) },
    expenses: { name: 'المصروفات', icon: 'receipt', show: () => can('expenses'), draw: () => Screens.expenses(sctx()) },
    messages: { name: 'الرسايل', icon: 'send', show: () => can('messages') || can('notify_settings'), draw: () => Screens.messages(sctx()) },
    groups: { name: 'المجموعات', icon: 'groups', show: () => true, draw: groups },
    engage: { name: 'التفاعل', icon: 'trophy', show: () => can('bank'), draw: () => Screens.engage(sctx()) },
    reports: { name: 'التقارير', icon: 'chart', show: () => can('reports'), draw: () => Screens.reports(sctx()) },
    team: { name: 'الفريق', icon: 'team', show: isTeacher, draw: team },
    settings: { name: 'الإعدادات', icon: 'settings', show: isTeacher, draw: settings }
  };
  const sctx = () => ({ me: S.me, can, lvl, isTeacher, openStudent: id => openStudent(id) });

  function shell() {
    const c = S.me.config;
    root().innerHTML = '<div class="shell">' +
      '<header class="top">' + (c.logo ? '<img class="logo" src="' + esc(c.logo) + '" alt="">' : '') +
      '<span class="name">' + esc(c.system_name) + '</span>' + (c.demo ? '<span class="demo-tag">ديمو</span>' : '') +
      '<span class="who">' + esc(S.me.staff.name) + '<br><span class="tiny">' + (isTeacher() ? 'المستر' : 'أسيستنت') + '</span></span>' +
      '<button class="btn btn-ghost" data-act="logout" aria-label="خروج">' + icon('out') + '</button></header>' +
      '<nav class="nav" id="nav"></nav><main class="main" id="main"></main></div>';
    root().onclick = onClick;
    root().onkeydown = null;
    window.onhashchange = route;
    route();
  }

  function route() {
    // الأسيستنت اللي شغلها الباب بتفتح عليه على طول
    let r = (location.hash || (!isTeacher() && can('door') ? '#door' : '#home')).slice(1);
    if (!ROUTES[r] || !ROUTES[r].show()) r = 'home';
    Door.leave();
    $('#main').onclick = null;
    // على الموبايل: أول 4 صفحات تحت + «المزيد» للباقي. على الكمبيوتر: كله على الجنب
    const items = Object.entries(ROUTES).filter(([, v]) => v.show());
    const link = ([k, v]) => '<a href="#' + k + '" class="' + (k === r ? 'on' : '') + '"' + (k === r ? ' aria-current="page"' : '') + '>' + icon(v.icon) + v.name + '</a>';
    const extra = items.slice(4), inExtra = extra.some(([k]) => k === r);
    $('#nav').innerHTML = items.slice(0, 4).map(link).join('') +
      (extra.length ? '<button class="more-btn' + (inExtra ? ' on' : '') + '" data-act="more">' + icon('more') + 'المزيد</button><div class="nav-extra">' + extra.map(link).join('') + '</div>' : '');
    // الصفحة مابتطلعش لفوق ولا بتفضى غير لما تنقل لصفحة تانية (عشان مفيش نط)
    const changed = S.route !== r; S.route = r;
    if (changed) { $('#main').innerHTML = '<div class="loading">بيحمّل…</div>'; window.scrollTo(0, 0); }
    ROUTES[r].draw().catch(e => { $('#main').innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
  }

  const actions = {};
  async function onClick(e) {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const fn = actions[b.dataset.act]; if (fn) { e.preventDefault(); fn(b); }
  }
  actions.reload = () => location.reload();
  actions.more = () => sheet('<h2>المزيد</h2><nav class="more-list">' + Object.entries(ROUTES).filter(([, v]) => v.show()).slice(4)
    .map(([k, v]) => '<a href="#' + k + '" data-close>' + icon(v.icon) + v.name + '</a>').join('') + '</nav>');
  actions.logout = async () => { await API.logout(); location.hash = ''; location.reload(); };

  // ───── الرئيسية: عين المستر ─────
  async function home() {
    const [g, feed] = await Promise.all([API.groups(), can('log') ? API.log(null, S.feedMin) : Promise.resolve(null)]);
    S.groups = g;
    const c = S.me.config;
    let h = '<div class="head"><h1>أهلاً ' + esc(S.me.staff.name) + '</h1></div>' +
      '<div class="stats"><a class="stat" href="#students"><span class="muted">الطلاب</span><b>' + num(g.students_total) + '</b></a>' +
      '<a class="stat" href="#groups"><span class="muted">المجموعات</span><b>' + num(g.groups.length) + '</b>' +
      (g.groups_max ? '<span class="tiny">من ' + num(g.groups_max) + ' في باقتك</span>' : '') + '</a></div>';
    if (feed) {
      h += '<section class="sec"><div class="head"><h2>اللي حصل</h2><div class="chips">' +
        '<button class="chip ' + (S.feedMin === 1 ? 'on' : '') + '" data-act="feedMin" data-v="1">الكل</button>' +
        '<button class="chip ' + (S.feedMin === 2 ? 'on' : '') + '" data-act="feedMin" data-v="2">المهم بس</button></div></div>' +
        feedHtml(feed) + '</section>';
    }
    $('#main').innerHTML = h + credit();
  }
  function feedHtml(rows) {
    if (!rows.length) return '<div class="surface empty">' + icon('eye') + '<div>لسه مفيش حاجة حصلت.</div></div>';
    return '<ul class="feed">' + rows.map(r =>
      '<li><span class="lvl l' + r.importance + '"></span><div><b>' + esc(r.actor_name || 'السيستم') + '</b> ' + esc(r.summary || r.action) + '</div><span class="t">' + ago(r.at) + '</span></li>').join('') + '</ul>';
  }
  actions.feedMin = b => { S.feedMin = +b.dataset.v; home(); };

  // ───── المجموعات ─────
  async function groups() {
    const [g, grades] = await Promise.all([API.groups(), S.grades ? S.grades : API.grades()]);
    S.groups = g; S.grades = grades;
    const full = g.groups_max && g.groups.length >= g.groups_max;
    let h = '<div class="head"><h1>المجموعات</h1>' +
      (can('groups') ? '<button class="btn btn-ink" data-act="groupNew"' + (full ? ' disabled' : '') + '>' + icon('plus') + 'مجموعة جديدة</button>' : '') + '</div>';
    if (g.groups_max) h += '<p class="limit">مستخدم <b>' + num(g.groups.length) + '</b> من <b>' + num(g.groups_max) + '</b> مجموعات في باقتك' +
      (full ? ' · <a href="' + CONTACT + '" target="_blank" rel="noopener">كلّمنا عشان تزوّد</a>' : '') + '</p>';
    if (!g.groups.length) h += '<div class="surface empty">' + icon('groups') + '<div>لسه مفيش مجموعات.</div>' +
      (can('groups') ? '<button class="btn btn-ink" style="margin-top:var(--s4)" data-act="groupNew">' + icon('plus') + 'ضيف أول مجموعة</button>' : '') + '</div>';
    grades.forEach(gr => {
      const rows = g.groups.filter(x => x.grade_id === gr.id);
      if (!rows.length) return;
      h += '<h2 class="grade-h">' + esc(gr.name) + '</h2><ul class="list">' + rows.map(x =>
        '<li><div class="grow"><a class="plain" href="#students" data-act="openGroupStudents" data-id="' + x.id + '"><b>' + esc(x.name) + '</b></a><div class="tiny">' + esc(x.schedule || 'من غير ميعاد') +
        ' · ' + num(x.students) + (x.capacity ? ' / ' + num(x.capacity) : '') + ' طالب</div></div>' +
        '<span class="price">' + num(x.price) + ' ج</span>' +
        '<button class="btn btn-ghost btn-sm" data-act="homework" data-id="' + x.id + '" aria-label="واجب ' + esc(x.name) + '">' + icon('book') + '</button>' +
        '<a class="btn btn-ghost btn-sm" href="' + CFG.PRINT + '?group=' + x.id + '" target="_blank" rel="noopener" aria-label="اطبع كروت ' + esc(x.name) + '">' + icon('print') + '</a>' +
        (can('groups') ? '<button class="btn btn-ghost btn-sm" data-act="groupEdit" data-id="' + x.id + '" aria-label="تعديل ' + esc(x.name) + '">' + icon('pen') + '</button>' : '') +
        '</li>').join('') + '</ul>';
    });
    $('#main').innerHTML = h + credit();
  }

  const DAYS = [[6, 'السبت'], [0, 'الأحد'], [1, 'الاتنين'], [2, 'التلات'], [3, 'الأربع'], [4, 'الخميس'], [5, 'الجمعة']];
  function groupForm(x) {
    x = x || { grade_id: S.grades[0] && S.grades[0].id, name: '', schedule: '', price: '', capacity: '' };
    const spg = S.groups.students_per_group;
    sheet('<h2>' + (x.id ? 'تعديل المجموعة' : 'مجموعة جديدة') + '</h2><form id="gf" novalidate>' +
      '<div class="field"><label for="g_grade">الصف</label><select class="inp" id="g_grade">' +
      S.grades.map(gr => '<option value="' + gr.id + '"' + (gr.id === x.grade_id ? ' selected' : '') + '>' + esc(gr.name) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="g_name">اسم المجموعة</label><input class="inp" id="g_name" value="' + esc(x.name) + '" placeholder="مثلاً: السبت ٤ العصر"></div>' +
      '<div class="field"><span class="lbl">أيام الحصة</span><div class="chips" id="g_days">' + DAYS.map(([d, n]) =>
        '<button type="button" class="chip' + ((x.days || []).includes(d) ? ' on' : '') + '" data-day="' + d + '" aria-pressed="' + (x.days || []).includes(d) + '">' + n + '</button>').join('') + '</div></div>' +
      '<div class="row2"><div class="field"><label for="g_start">الساعة</label><input class="inp" id="g_start" type="time" value="' + esc(x.start || '') + '"></div>' +
      '<div class="field"><label for="g_min">مدة الحصة</label><select class="inp" id="g_min">' + [60, 90, 120, 150, 180].map(m =>
        '<option value="' + m + '"' + ((x.minutes || 120) === m ? ' selected' : '') + '>' + (m === 60 ? 'ساعة' : m === 90 ? 'ساعة ونص' : m === 120 ? 'ساعتين' : m === 150 ? 'ساعتين ونص' : '3 ساعات') + '</option>').join('') + '</select></div></div>' +
      '<p class="hint" style="margin-top:-8px">الباب بيفتح على المجموعة دي لوحده في ميعادها.</p>' +
      '<div class="row2"><div class="field"><label for="g_price">سعر الحصة (ج)</label><input class="inp" id="g_price" type="number" min="0" inputmode="numeric" value="' + esc(x.price) + '"></div>' +
      '<div class="field"><label for="g_cap">أقصى عدد</label><input class="inp" id="g_cap" type="number" min="1" inputmode="numeric" value="' + esc(x.capacity || '') + '" placeholder="' + (spg ? 'لحد ' + spg : 'مفتوح') + '"></div></div>' +
      '<p class="err" id="gerr"></p>' +
      '<div class="actions">' + (x.id ? '<button type="button" class="btn btn-red" data-act="groupArchive" data-id="' + x.id + '">' + icon('archive') + 'قفل المجموعة</button>' : '') +
      '<button class="btn btn-ink" type="submit">' + (x.id ? 'احفظ التعديل' : 'ضيف المجموعة') + '</button></div></form>', box => {
        box.onclick = e => {
          const b = e.target.closest('[data-act=groupArchive]'); if (b) archiveGroup(b, x);
          const d = e.target.closest('[data-day]'); if (d) { d.classList.toggle('on'); d.setAttribute('aria-pressed', d.classList.contains('on')); }
        };
        $('#gf', box).onsubmit = async e => {
          e.preventDefault();
          const btn = $('#gf button[type=submit]');
          const p = { id: x.id || null, grade_id: +$('#g_grade').value, name: $('#g_name').value.trim(),
            days: $$('#g_days .on').map(c => +c.dataset.day), start: $('#g_start').value, minutes: +$('#g_min').value,
            price: $('#g_price').value === '' ? null : +$('#g_price').value, capacity: $('#g_cap').value === '' ? null : +$('#g_cap').value };
          if (!p.name) return ($('#gerr').textContent = 'اكتب اسم المجموعة.');
          if (p.price == null || p.price < 0) return ($('#gerr').textContent = 'اكتب سعر الحصة.');
          await busy(btn, async () => { await API.saveGroup(p); close(); toast(x.id ? 'اتحفظ التعديل' : 'اتضافت المجموعة'); groups(); });
        };
      });
  }
  actions.groupNew = () => groupForm();
  actions.groupEdit = b => groupForm(S.groups.groups.find(g => g.id === +b.dataset.id));
  async function archiveGroup(b, x) {
    if (!confirm('تقفل مجموعة «' + x.name + '»؟ مش هتظهر في القوايم تاني.')) return;
    await busy(b, async () => { await API.archiveGroup(x.id); close(); toast('اتقفلت المجموعة'); groups(); });
  }

  // ───── الطلاب ─────
  // الطلاب متقسمين: الصف ← المجموعة ← طلابها (مش كل الطلاب في صفحة واحدة)
  const ST = { q: '', grade_id: null, group_id: null, nog: false, rows: [], total: 0, timer: null };
  const initials = n => esc(String(n || '').trim().charAt(0));   // حرف واحد: الحروف العربية بتتلزق في بعض
  const phoneLink = p => '<a class="num" dir="ltr" href="tel:' + esc(p) + '">' + esc(p) + '</a>';
  actions.openGroupStudents = b => {
    const g = (S.groups ? S.groups.groups : []).find(x => x.id === +b.dataset.id);
    ST.group_id = +b.dataset.id; ST.nog = false; ST.q = ''; if (g) ST.grade_id = g.grade_id;
    if (location.hash === '#students') students(); else location.hash = '#students';
  };
  actions.openNoGroup = () => { ST.group_id = null; ST.nog = true; ST.q = ''; students(); };
  actions.studentsBack = () => { ST.group_id = null; ST.nog = false; ST.q = ''; students(); };
  actions.studentsGrade = b => { ST.grade_id = +b.dataset.id; students(); };
  actions.importSheet = () => Importer.students({ grades: S.grades, groups: S.groups.groups, grade_id: ST.grade_id, group_id: ST.group_id,
    onDone: gid => { S.groups = null; ST.group_id = gid; ST.nog = !gid; students(); } });

  async function students() {
    [S.groups, S.grades] = await Promise.all([API.groups(), S.grades ? S.grades : API.grades()]);
    if (!S.grades.some(g => g.id === ST.grade_id)) ST.grade_id = (S.grades.find(gr => S.groups.groups.some(g => g.grade_id === gr.id)) || S.grades[0]).id;
    const grp = S.groups.groups.find(g => g.id === ST.group_id), inside = !!grp || ST.nog;
    if (ST.group_id && !grp) ST.group_id = null;
    const grade = S.grades.find(g => g.id === ST.grade_id);
    const btns = '<div class="head-btns">' +
      (navigator.mediaDevices ? '<button class="btn btn-line" data-act="scanProfile">' + icon('qr') + 'امسح QR</button>' : '') +
      (can('students') ? '<button class="btn btn-line" data-act="importSheet">' + icon('sheet') + 'استيراد شيت</button>' +
        '<button class="btn btn-ink" data-act="studentNew">' + icon('plus') + 'طالب جديد</button>' : '') + '</div>';
    const head = inside
      ? '<div class="head"><div><button class="linkish" data-act="studentsBack">← مجموعات ' + esc(grade.name) + '</button>' +
        '<h1>' + (grp ? esc(grp.name) : 'من غير مجموعة') + '</h1>' + (grp ? '<div class="tiny">' + esc(grp.schedule || 'من غير ميعاد') + (grp.price ? ' · الحصة ' + num(grp.price) + ' ج' : '') + '</div>' : '') + '</div>' + btns + '</div>'
      : '<div class="head"><div><h1>الطلاب</h1><div class="tiny">' + num(S.groups.students_total) + ' طالب في كل الصفوف</div></div>' + btns + '</div>';
    $('#main').innerHTML = head +
      '<div class="search" style="margin-bottom:var(--s3)">' + icon('search') + '<input class="inp" id="sq" type="search" placeholder="' + (inside ? 'دوّر في المجموعة دي' : 'دوّر في كل الطلاب: اسم، كود، أو موبايل') + '" value="' + esc(ST.q) + '" aria-label="دوّر على طالب"></div>' +
      (inside ? '' : '<div class="chips" role="tablist" style="margin-bottom:var(--s3)">' + S.grades.map(gr => '<button class="chip' + (gr.id === ST.grade_id ? ' on' : '') + '" role="tab" aria-selected="' + (gr.id === ST.grade_id) + '" data-act="studentsGrade" data-id="' + gr.id + '">' + esc(gr.name) +
        ' <span class="tiny num">' + num(S.groups.groups.filter(g => g.grade_id === gr.id).reduce((s, g) => s + g.students, 0) + (+(S.groups.nogroup || {})[gr.id] || 0)) + '</span></button>').join('') + '</div>') +
      '<div id="gcards"></div><p class="limit" id="scount"></p><ul class="list" id="slist"></ul><div id="smore"></div>' + credit();
    $('#sq').oninput = () => { clearTimeout(ST.timer); ST.timer = setTimeout(() => { ST.q = $('#sq').value.trim(); loadStudents(); }, 250); };
    await loadStudents();
  }

  // كروت مجموعات الصف (لما مش جوه مجموعة ومفيش بحث)
  function groupCards() {
    const gs = S.groups.groups.filter(g => g.grade_id === ST.grade_id), nog = +(S.groups.nogroup || {})[ST.grade_id] || 0;
    if (!gs.length && !nog) return '<div class="surface empty">' + icon('groups') + '<div>لسه مفيش مجموعات للصف ده.</div>' +
      (can('groups') ? '<a class="btn btn-ink" href="#groups">اعمل مجموعة</a>' : '') + '</div>';
    return '<div class="gcards">' + gs.map(g => '<button class="gcard" data-act="openGroupStudents" data-id="' + g.id + '"><b>' + esc(g.name) + '</b>' +
      '<span class="tiny">' + esc(g.schedule || 'من غير ميعاد') + '</span><span class="gnum"><b class="num">' + num(g.students) + '</b> طالب' + (g.capacity ? ' من ' + num(g.capacity) : '') + '</span>' +
      (g.capacity ? '<span class="bar g" style="--w:' + Math.min(100, Math.round(g.students / g.capacity * 100)) + '%"></span>' : '') + '</button>').join('') +
      (nog ? '<button class="gcard muted-card" data-act="openNoGroup"><b>من غير مجموعة</b><span class="tiny">طلاب محتاجين يتحطوا في مجموعة</span><span class="gnum"><b class="num">' + num(nog) + '</b> طالب</span></button>' : '') + '</div>';
  }

  async function loadStudents(more) {
    const inside = !!ST.group_id || ST.nog;
    if (!inside && !ST.q) {   // الصفحة الرئيسية: المجموعات بس
      $('#gcards').innerHTML = groupCards(); $('#scount').innerHTML = ''; $('#slist').innerHTML = ''; $('#smore').innerHTML = ''; $('#slist').hidden = true; return;
    }
    $('#gcards').innerHTML = ''; $('#slist').hidden = false;
    const off = more ? ST.rows.length : 0;
    const r = await API.students({ q: ST.q, group_id: ST.group_id, grade_id: ST.nog ? ST.grade_id : null, no_group: ST.nog, offset: off, limit: 50 });
    ST.rows = more ? ST.rows.concat(r.rows) : r.rows; ST.total = r.total;
    if (!$('#slist')) return;
    $('#scount').innerHTML = '<b>' + num(ST.total) + '</b> طالب' + (ST.q ? ' في البحث' : '') +
      (ST.group_id && !ST.q && ST.total ? ' · <a href="' + CFG.PRINT + '?group=' + ST.group_id + '" target="_blank" rel="noopener">' + 'اطبع كروت المجموعة</a>' : '');
    $('#slist').innerHTML = ST.rows.length ? ST.rows.map(s =>
      '<li class="tap" data-act="studentOpen" data-id="' + s.id + '"><span class="av ' + s.gender + '">' + initials(s.name) + '</span>' +
      '<div class="grow"><b>' + esc(s.name) + '</b><div class="tiny">' + s.code + ' · ' + esc(s.group || 'من غير مجموعة') + '</div></div>' +
      '<span class="tiny num" dir="ltr">' + esc(s.phone) + '</span></li>').join('')
      : '<li class="empty">' + (ST.q ? 'مفيش طالب بالاسم أو الرقم ده.' : 'لسه مفيش طلاب هنا. سجّل طالب أو استورد شيت المجموعة.') + '</li>';
    $('#smore').innerHTML = ST.rows.length < ST.total ? '<button class="btn btn-line btn-block" data-act="studentsMore" style="margin-top:var(--s3)">اعرض أكتر (' + num(ST.total - ST.rows.length) + ')</button>' : '';
  }
  actions.studentsMore = b => busy(b, () => loadStudents(true));

  // الـ QR برة الباب ⇒ يفتح ملف الطالب
  actions.scanProfile = () => Scanner.open(async code => {
    try { const s = await API.studentByCode(code); openStudent(s.id, s); return true; }
    catch (e) { toast('الكود ' + code + ' مش متسجل', 'err'); return false; }
  }, 'امسح QR الطالب عشان تفتح ملفه');

  actions.studentOpen = b => openStudent(+b.dataset.id);
  // ملف الطالب الكامل: البيانات + الرصيد + ملخص سريع + الدرجات بالترتيب + الحضور — بيفتح من أي مكان فيه اسم طالب
  const PTAB = { t: 'grades' };
  async function openStudent(id, pre) {
    const s = await API.studentFull(id || pre.id).catch(e => toast(e.message, 'err'));
    if (!s) return;
    const at = s.attendance, sc = s.scores || [], hwAll = at.hw_yes + at.hw_no;
    const avg = sc.length ? Math.round(sc.reduce((a, x) => a + x.score / x.max, 0) / sc.length * 100) : null;
    const dt = d => new Date(d).toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'short', day: 'numeric', month: 'short' });
    const tabsH = () => '<div class="tabs ptabs">' + [['grades', 'الدرجات'], ['att', 'الحضور'], ['info', 'البيانات']].map(([k, n]) =>
      '<button class="tab' + (PTAB.t === k ? ' on' : '') + '" data-pt="' + k + '">' + n + '</button>').join('') + '</div>';
    const body = () => PTAB.t === 'grades'
      ? (sc.length ? '<ul class="feed">' + sc.map(x => { const p = x.score / x.max;
          return '<li><div class="grow"><b>' + esc(x.title) + '</b> <span class="tiny">' + (x.kind === 'exam' ? 'امتحان' : 'كويز') + '</span>' +
            '<div class="tiny">' + dt(x.at) + ' · الترتيب <b class="num">' + x.rank.rank + '</b> من ' + num(x.rank.of) + ' · المتوسط ' + x.rank.avg +
            (x.wrong_q && x.wrong_q.length ? ' · غلط في ' + (x.wrong_q.length === 1 ? 'سؤال واحد' : x.wrong_q.length + (x.wrong_q.length <= 10 ? ' أسئلة' : ' سؤال')) : '') + (x.wrong && x.wrong.length ? ' · ' + x.wrong.map(esc).join('، ') : '') + '</div></div>' +
            '<b class="pgrade ' + (p >= .85 ? 'good' : p < .5 ? 'low' : '') + '">' + (+x.score) + '<small>/' + x.max + '</small></b></li>'; }).join('') + '</ul>'
        : '<div class="empty">لسه مفيش درجات.</div>')
      : PTAB.t === 'att'
        ? (at.last.length ? '<ul class="feed">' + at.last.map(a => '<li><span class="dot ' + (a.pay === 'wallet' ? 'g' : 'a') + '"></span><div class="grow">' + dt(a.at) +
            '<div class="tiny">' + (a.pay === 'wallet' ? 'من الاشتراك' : 'كاش') + (a.hw === true ? ' · عمل الواجب' : a.hw === false ? ' · ماعملش الواجب' : '') + '</div></div></li>').join('') + '</ul>'
          : '<div class="empty">لسه ماحضرش.</div>')
        : '<dl class="facts"><div><dt>الكود</dt><dd class="num">' + s.code + '</dd></div>' +
          '<div><dt>الرقم السري للبوابة</dt><dd class="num">' + esc(s.pin) + '</dd></div>' +
          '<div><dt>موبايل الطالب</dt><dd>' + phoneLink(s.phone) + '</dd></div>' +
          '<div><dt>موبايل ولي الأمر</dt><dd>' + phoneLink(s.parent_phone) + '</dd></div>' +
          (s.notes ? '<div class="wide"><dt>ملاحظات</dt><dd>' + esc(s.notes) + '</dd></div>' : '') + '</dl>';
    sheet('<div class="profile"><span class="av lg ' + s.gender + '">' + initials(s.name) + '</span><div><h2>' + esc(s.name) + '</h2>' +
      '<div class="muted">' + esc(s.grade) + ' · ' + esc(s.group || 'من غير مجموعة') + ' · <span class="num">' + s.code + '</span></div></div>' +
      '<button class="qr-mini" data-act="card" aria-label="كارت الطالب">' + Scanner.qrSvg(s.code, 3) + '</button></div>' +
      (lvl('pay') >= 2 ? '<div class="balance"><div><span class="muted">رصيده</span><div><span class="big mark">' + num(s.credits) + '</span> حصص</div></div>' +
        '<div class="balance-btns">' + (can('money') ? '<button class="btn btn-ink" data-act="buy">' + icon('ticket') + 'اشترك في حصص</button>' : '') +
        (can('money') || can('students') ? '<button class="btn btn-line" data-act="ledger">كشف الحساب</button>' : '') + '</div></div>' : '') +
      '<div class="pstats"><div><b class="num">' + at.month + '<small>/' + at.classes_month + '</small></b><span>حضور الشهر</span></div>' +
      '<div><b class="num">' + (hwAll ? Math.round(at.hw_yes / hwAll * 100) + '%' : '—') + '</b><span>عمل الواجب</span></div>' +
      '<div><b class="num">' + (avg != null ? avg + '%' : '—') + '</b><span>متوسط الدرجات</span></div>' +
      '<div><b class="num">#' + s.rank_xp + '</b><span>ترتيبه في التفاعل</span></div></div>' +
      '<div id="pt">' + tabsH() + body() + '</div>' +
      (can('students') ? '<div class="actions"><button class="btn btn-red" data-act="studentArchive">' + icon('archive') + 'شيله من القوايم</button>' +
        '<button class="btn btn-ink" data-act="studentEdit">' + icon('pen') + 'عدّل البيانات</button></div>' : ''), box => {
      box.onclick = e => {
        const t = e.target.closest('[data-pt]'); if (t) { PTAB.t = t.dataset.pt; $('#pt', box).innerHTML = tabsH() + body(); return; }
        const a = e.target.closest('[data-act]'); if (!a) return;
        if (a.dataset.act === 'studentEdit') studentForm(s);
        if (a.dataset.act === 'buy') buyForm(s);
        if (a.dataset.act === 'ledger') ledgerView(s);
        if (a.dataset.act === 'card') cardView(s);
        if (a.dataset.act === 'studentArchive') {
          if (!confirm('تشيل «' + s.name + '» من القوايم؟')) return;
          busy(a, async () => { await API.archiveStudent(s.id); close(); toast('اتشال من القوايم'); if ($('#slist')) students(); else S.groups = null; });
        }
      };
    });
  }

  // كارت الطالب: QR + الكود + طباعة + (اختياري) نكتب نفس الكود على كارت NFC ⇒ نفس الكارت يتقري بالكاميرا أو بالتقريب
  function cardView(s) {
    const nfcOk = lvl('door') >= 3;
    sheet('<h2>كارت «' + esc(s.name) + '»</h2>' +
      '<div class="id-card"><div class="id-top"><b>' + esc(S.me.config.system_name) + '</b><span>' + esc(s.grade) + '</span></div>' +
      '<div class="id-body"><div class="id-qr">' + Scanner.qrSvg(s.code, 5) + '</div><div><div class="id-name">' + esc(s.name) + '</div>' +
      '<div class="id-code num">' + s.code + '</div><div class="tiny">' + esc(s.group || '') + '</div></div></div>' +
      '<div class="id-foot">POWERED BY HINDAWY</div></div>' +
      '<p class="muted">الطالب يقدر يوري الـ QR ده من موبايله أو من الكارت المطبوع. الكود نفسه بيشتغل مع سكانر الباركود.</p>' +
      '<div class="actions"><a class="btn btn-ink" href="' + CFG.PRINT + '?student=' + s.id + '" target="_blank" rel="noopener">' + icon('print') + 'اطبع الكارت</a></div>' +
      (nfcOk ? '<div class="nfc-link"><b>كارت NFC (اختياري)</b><p class="tiny">نفس الكارت المطبوع عليه الـ QR ممكن يكون كارت NFC (نوع NTAG213 أو NTAG215). ' +
        'من موبايل أندرويد بكروم: دوس «اكتب الكود على الكارت» وقرّب الكارت من ضهر الموبايل ⇒ الكارت يبقى بيتقري بالتقريب كمان.</p>' +
        ('NDEFReader' in window && can('students') ? '<button class="btn btn-line" data-act="nfcWrite">' + icon('nfc') + 'اكتب الكود على الكارت</button>' : '<p class="tiny">الكتابة على الكارت بتشتغل من كروم على أندرويد بس.</p>') +
        (s.has_card && can('students') ? ' <button class="btn btn-ghost" data-act="nfcUnlink">فك الكارت القديم</button>' : '') + '</div>' : ''), box => {
      box.onclick = async e => {
        const a = e.target.closest('[data-act]'); if (!a) return;
        if (a.dataset.act === 'nfcUnlink') return busy(a, async () => { await API.studentCard(s.id, null); close(); toast('اتفك الكارت'); });
        if (a.dataset.act === 'nfcWrite') {
          try {
            a.textContent = 'قرّب الكارت دلوقتي من ضهر الموبايل…';
            await new NDEFReader().write({ records: [{ recordType: 'text', data: String(s.code) }] });
            toast('اتكتب كود ' + s.code + ' على الكارت'); a.innerHTML = icon('check') + 'اتكتب';
          } catch (x) { toast('ماتكتبش: اتأكد إن الـ NFC شغال وإن الكارت NTAG ومش مقفول.', 'err'); a.innerHTML = icon('nfc') + 'جرّب تاني'; }
        }
      };
    });
  }

  const lvl = k => +(S.me.levels || {})[k] || 0;

  // الواجب: الأسيستنت/المستر بينزّله للمجموعة، والطالب بيأكد من البوابة إنه عمله، والأسيستنت بتتأكد على الباب
  actions.homework = async b => {
    const g = S.groups.groups.find(x => x.id === +b.dataset.id), list = await API.homework(g.id).catch(e => toast(e.message, 'err'));
    if (!list) return;
    sheet('<h2>واجب «' + esc(g.name) + '»</h2>' +
      (can('students') ? '<form id="hf" class="inline-form"><input class="inp" id="h_t" placeholder="مثلاً: مسائل ص 45 من 1 لـ 10"><button class="btn btn-ink" type="submit">نزّل الواجب</button></form>' : '') +
      '<ul class="feed" style="margin-top:var(--s4)">' + (list.length ? list.map(h => '<li><div class="grow"><b>' + esc(h.title) + '</b><div class="tiny">' + esc(h.by || '') + ' · ' + ago(h.at) + '</div></div>' +
        '<span class="tiny">أكّد ' + num(h.done) + ' من ' + num(g.students) + '</span></li>').join('') : '<li class="empty">لسه مفيش واجبات.</li>') + '</ul>', box => {
      const f = $('#hf', box); if (f) f.onsubmit = e => { e.preventDefault(); busy($('button', f), async () => { await API.saveHomework(g.id, $('#h_t').value); toast('نزل الواجب للطلاب'); close(); }); };
    });
  };

  // اشتراك بعدد حصص (كاش عند الأسيستنت) — المبلغ بيتحسب لوحده، مفيش مبلغ حر
  function buyForm(s) {
    if (!s.price) return toast('الطالب ده مالوش مجموعة. حطه في مجموعة الأول.', 'err');
    let n = 4;
    const total = () => num(n * s.price);
    sheet('<h2>اشتراك «' + esc(s.name) + '»</h2><p class="muted" style="margin-top:0">سعر الحصة في مجموعته ' + num(s.price) + ' ج. فاضله دلوقتي ' + num(s.credits) + ' حصص.</p>' +
      '<div class="stepper"><button type="button" data-n="-1" aria-label="أقل">−</button><output id="bn">' + n + '<small>حصص</small></output><button type="button" data-n="1" aria-label="أكتر">+</button></div>' +
      '<div class="chips center">' + [4, 8, 12].map(x => '<button type="button" class="chip' + (x === n ? ' on' : '') + '" data-set="' + x + '">' + x + '</button>').join('') + '</div>' +
      '<div class="total"><span class="muted">قبضت كاش</span><b id="bt">' + total() + ' ج</b></div>' +
      '<div class="actions"><button class="btn btn-ink btn-lg" id="bgo">' + icon('cash') + 'قبضت ' + total() + ' ج — سجّل</button></div>', box => {
      const upd = () => { $('#bn').innerHTML = n + '<small>حصص</small>'; $('#bt').textContent = total() + ' ج'; $('#bgo').innerHTML = icon('cash') + 'قبضت ' + total() + ' ج — سجّل';
        $$('[data-set]', box).forEach(c => c.classList.toggle('on', +c.dataset.set === n)); };
      box.onclick = e => {
        const d = e.target.closest('[data-n]'), c = e.target.closest('[data-set]');
        if (d) { n = Math.min(100, Math.max(1, n + +d.dataset.n)); upd(); }
        if (c) { n = +c.dataset.set; upd(); }
      };
      $('#bgo').onclick = e => busy(e.currentTarget, async () => {
        const r = await API.buySessions(s.id, n); close(); toast('اتسجل · رصيد ' + r.name + ' بقى ' + r.credits + ' حصص');
      });
    });
  }

  const KIND = { buy: 'اشترك', use: 'حضر من الاشتراك', door_cash: 'دفع كاش على الباب', undo: 'إلغاء حضور', refund: 'استرداد', adjust: 'تعديل' };
  async function ledgerView(s) {
    const L = await API.ledger(s.id).catch(e => toast(e.message, 'err')); if (!L) return;
    sheet('<h2>كشف حساب «' + esc(s.name) + '»</h2><p class="muted" style="margin-top:0">رصيده دلوقتي <b>' + num(L.credits) + '</b> حصص.</p>' +
      (L.rows.length ? '<ul class="feed">' + L.rows.map(r => '<li><div class="grow"><b>' + KIND[r.kind] + '</b>' +
        (r.sessions ? ' <span class="num">' + (r.sessions > 0 ? '+' : '') + r.sessions + ' حصة</span>' : '') + (r.amount ? ' · <span class="num">' + num(r.amount) + ' ج</span>' : '') +
        '<div class="tiny">' + esc(r.group_name || '') + (r.staff_name ? (r.group_name ? ' · ' : '') + esc(r.staff_name) : '') + '</div></div>' +
        '<span class="t">' + new Date(r.at).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short' }) + '</span></li>').join('') + '</ul>'
        : '<div class="empty">لسه مفيش حركات.</div>'));
  }

  function studentForm(s) {
    const isNew = !s;
    const cur = S.groups.groups.find(g => g.id === ST.group_id);
    s = s || { name: '', gender: '', grade_id: cur ? cur.grade_id : S.grades[0].id, group_id: cur ? cur.id : null, phone: '', parent_phone: '', notes: '' };
    const groupOpts = grade => '<option value="">من غير مجموعة</option>' + S.groups.groups.filter(g => g.grade_id === grade).map(g =>
      '<option value="' + g.id + '"' + (g.id === s.group_id ? ' selected' : '') + '>' + esc(g.name) + ' (' + g.students + (g.capacity ? '/' + g.capacity : '') + ')</option>').join('');
    sheet('<h2>' + (isNew ? 'طالب جديد' : 'تعديل بيانات الطالب') + '</h2><form id="sf" novalidate>' +
      '<div class="field"><label for="s_name">الاسم</label><input class="inp" id="s_name" value="' + esc(s.name) + '" autocomplete="off"></div>' +
      '<div class="field"><span class="lbl">النوع</span><div class="chips" role="radiogroup">' +
      '<button type="button" class="chip ' + (s.gender === 'm' ? 'on' : '') + '" data-g="m" role="radio" aria-checked="' + (s.gender === 'm') + '">ولد</button>' +
      '<button type="button" class="chip ' + (s.gender === 'f' ? 'on' : '') + '" data-g="f" role="radio" aria-checked="' + (s.gender === 'f') + '">بنت</button></div></div>' +
      '<div class="row2"><div class="field"><label for="s_grade">الصف</label><select class="inp" id="s_grade">' +
      S.grades.map(gr => '<option value="' + gr.id + '"' + (gr.id === s.grade_id ? ' selected' : '') + '>' + esc(gr.name) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="s_group">المجموعة</label><select class="inp" id="s_group">' + groupOpts(s.grade_id) + '</select></div></div>' +
      '<div class="row2"><div class="field"><label for="s_phone">موبايل الطالب</label><input class="inp" id="s_phone" type="tel" inputmode="numeric" dir="ltr" value="' + esc(s.phone) + '"></div>' +
      '<div class="field"><label for="s_pphone">موبايل ولي الأمر</label><input class="inp" id="s_pphone" type="tel" inputmode="numeric" dir="ltr" value="' + esc(s.parent_phone) + '"></div></div>' +
      '<div class="field"><label for="s_notes">ملاحظات (اختياري)</label><input class="inp" id="s_notes" value="' + esc(s.notes || '') + '"></div>' +
      '<p class="err" id="serr"></p><div class="actions"><button class="btn btn-ink" type="submit">' + (isNew ? 'سجّل الطالب' : 'احفظ التعديل') + '</button></div></form>', box => {
      let gender = s.gender;
      box.onclick = e => { const c = e.target.closest('[data-g]'); if (!c) return; gender = c.dataset.g; $$('[data-g]', box).forEach(x => { x.classList.toggle('on', x === c); x.setAttribute('aria-checked', x === c); }); };
      $('#s_grade', box).onchange = () => { $('#s_group', box).innerHTML = groupOpts(+$('#s_grade', box).value); };
      $('#sf', box).onsubmit = async e => {
        e.preventDefault();
        const p = { id: s.id || null, name: $('#s_name').value.trim(), gender, grade_id: +$('#s_grade').value,
          group_id: $('#s_group').value ? +$('#s_group').value : null, phone: $('#s_phone').value, parent_phone: $('#s_pphone').value, notes: $('#s_notes').value };
        const er = m => { $('#serr').textContent = m; };
        if (!p.name) return er('اكتب اسم الطالب.');
        if (!gender) return er('اختار ولد ولا بنت.');
        if (p.phone.replace(/\D/g, '').length !== 11) return er('موبايل الطالب لازم 11 رقم.');
        if (p.parent_phone.replace(/\D/g, '').length !== 11) return er('موبايل ولي الأمر لازم 11 رقم.');
        await busy($('#sf button[type=submit]'), async () => {
          const r = await API.saveStudent(p); close(); S.groups = await API.groups();
          toast(isNew ? 'اتسجل ' + r.name + ' بكود ' + r.code : 'اتحفظ التعديل');
          if ($('#slist')) loadStudents();
        });
      };
    });
  }
  actions.studentNew = () => studentForm();

  // ───── الفريق: الأسيستنتس وصلاحياتهم ─────
  const PERMS = [
    ['door', 'تسجيل الحضور', 'تمسح QR الطلاب وتسجل الحضور والواجب والكاش'],
    ['students', 'الطلاب', 'تسجّل طلاب جداد وتعدّل بياناتهم وتنزّل الواجب'],
    ['grades', 'الدرجات', 'تعمل الكويز وتسجل الدرجات والأسئلة الغلط'],
    ['bank', 'بنك الأسئلة', 'تشوف وتضيف أسئلة البنك وسؤال اليوم (الأسئلة مابتطلعش لحد غيرها)'],
    ['groups', 'المجموعات', 'تضيف وتعدّل المجموعات'],
    ['money', 'الفلوس', 'تقبض اشتراكات وتوافق على الشحن وتلغي حضور'],
    ['expenses', 'المصروفات', 'تسجل المصروفات'],
    ['messages', 'الرسايل', 'تبعت رسايل وواتساب للطلاب وأولياء الأمور'],
    ['notify_settings', 'إعدادات الإشعارات', 'تحدد إيه يتبعت أوتوماتيك وإيه بزرار'],
    ['reports', 'التقارير والإكسل', 'تشوف التقارير وتنزّل ملفات إكسل'],
    ['log', 'اللي حصل', 'تشوف كل العمليات اللي اتعملت']
  ];
  const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
  // قيمة الصلاحية: true = دايماً، تاريخ = لحد اليوم ده (النهارده بس)
  const permState = v => v === true ? 'always' : (typeof v === 'string' && v >= today()) ? 'today' : 'off';
  async function team() {
    S.staff = await API.staff();
    $('#main').innerHTML = '<div class="head"><h1>الفريق</h1><button class="btn btn-ink" data-act="staffNew">' + icon('plus') + 'أسيستنت جديدة</button></div>' +
      '<ul class="list">' + S.staff.map(m =>
        '<li' + (m.role === 'assistant' ? ' class="tap" data-act="staffEdit" data-id="' + m.id + '"' : '') + '>' +
        '<span class="av">' + initials(m.name) + '</span><div class="grow"><b>' + esc(m.name) + '</b>' +
        '<div class="tiny">' + (m.role === 'teacher' ? 'المستر · كل الصلاحيات' : (m.active ? PERMS.filter(p => permState(m.perms[p[0]]) !== 'off')
          .map(p => p[1] + (permState(m.perms[p[0]]) === 'today' ? ' (النهارده)' : '')).join('، ') || 'من غير صلاحيات' : 'الحساب مقفول')) + '</div></div>' +
        '<span class="tiny num" dir="ltr">' + esc(m.phone) + '</span></li>').join('') + '</ul>' +
      (S.staff.length === 1 ? '<p class="muted">ضيف الأسيستنتس واختار لكل واحدة الصلاحيات اللي تقدر تعملها.</p>' : '') + credit();
  }
  const genPw = () => String(Math.floor(100000 + Math.random() * 900000));
  function staffForm(m) {
    const isNew = !m;
    m = m || { name: '', phone: '', perms: { door: true, students: true }, active: true };
    sheet('<h2>' + (isNew ? 'أسيستنت جديدة' : 'تعديل ' + esc(m.name)) + '</h2><form id="tf" novalidate>' +
      '<div class="field"><label for="t_name">الاسم</label><input class="inp" id="t_name" value="' + esc(m.name) + '"></div>' +
      '<div class="field"><label for="t_phone">الموبايل (هتدخل بيه)</label><input class="inp" id="t_phone" type="tel" inputmode="numeric" dir="ltr" value="' + esc(m.phone) + '"></div>' +
      '<div class="field"><label for="t_pw">' + (isNew ? 'الباسورد' : 'باسورد جديد (سيبه فاضي لو مش هتغيّره)') + '</label>' +
      '<div class="inline-form"><input class="inp" id="t_pw" dir="ltr" autocomplete="new-password" value="' + (isNew ? genPw() : '') + '"><button type="button" class="btn btn-line" data-act="genPw">باسورد جديد</button></div>' +
      '<span class="hint">ابعته للأسيستنت. لو اتغيّر، بتخرج من كل الأجهزة.</span></div>' +
      '<fieldset class="perms"><legend>الصلاحيات</legend>' + PERMS.map(p => { const v = permState(m.perms[p[0]]);
        return '<div class="perm3" data-perm="' + p[0] + '"><div><b>' + p[1] + '</b><span class="tiny">' + p[2] + '</span></div><div class="seg3" role="radiogroup" aria-label="' + p[1] + '">' +
          [['off', 'لأ'], ['today', 'النهارده بس'], ['always', 'دايماً']].map(([k, n]) => '<button type="button" role="radio" aria-checked="' + (v === k) + '" class="' + (v === k ? 'on' : '') + '" data-v="' + k + '">' + n + '</button>').join('') + '</div></div>'; }).join('') + '</fieldset>' +
      (isNew ? '' : '<label class="perm"><input type="checkbox" id="t_active"' + (m.active ? ' checked' : '') + '><span><b>الحساب شغال</b><span class="tiny">لو شلت العلامة، الأسيستنت مش هتقدر تدخل</span></span></label>') +
      '<p class="err" id="terr"></p><div class="actions"><button class="btn btn-ink" type="submit">' + (isNew ? 'ضيف الأسيستنت' : 'احفظ') + '</button></div></form>', box => {
      box.onclick = e => {
        if (e.target.closest('[data-act=genPw]')) $('#t_pw', box).value = genPw();
        const sb = e.target.closest('.seg3 [data-v]'); if (sb) $$('[data-v]', sb.parentNode).forEach(x => { x.classList.toggle('on', x === sb); x.setAttribute('aria-checked', x === sb); });
      };
      $('#tf', box).onsubmit = async e => {
        e.preventDefault();
        const perms = {}; $$('.perm3', box).forEach(r => { const v = ($('.on', r) || {}).dataset.v; perms[r.dataset.perm] = v === 'always' ? 'true' : v === 'today' ? 'today' : 'false'; });
        const p = { id: m.id || null, name: $('#t_name').value.trim(), phone: $('#t_phone').value, password: $('#t_pw').value.trim(), perms,
          active: isNew ? true : $('#t_active').checked };
        if (!p.name) return ($('#terr').textContent = 'اكتب الاسم.');
        if (p.phone.replace(/\D/g, '').length !== 11) return ($('#terr').textContent = 'الموبايل لازم 11 رقم.');
        if ((isNew || p.password) && p.password.length < 6) return ($('#terr').textContent = 'الباسورد لازم 6 حروف أو أرقام على الأقل.');
        await busy($('#tf button[type=submit]'), async () => { S.staff = await API.saveStaff(p); close(); toast(isNew ? 'اتضافت الأسيستنت' : 'اتحفظ'); team(); });
      };
    });
  }
  actions.staffNew = () => staffForm();
  actions.staffEdit = b => staffForm(S.staff.find(m => m.id === +b.dataset.id));

  // ───── الإعدادات: المستويات جوه الباقة ─────
  async function settings() {
    const plan = S.me.plan || {}, lv = S.me.levels || {}, st = await API.settings();
    let h = '<div class="head"><h1>الإعدادات</h1></div>' +
      '<section class="feat"><h3>الاسم اللي بيظهر</h3><form id="bf" class="inline-form">' +
      '<input class="inp" id="b_name" value="' + esc(S.me.config.system_name) + '" aria-label="الاسم اللي بيظهر">' +
      '<button class="btn btn-ink" type="submit">احفظ</button></form></section>' +
      (lvl('engage') >= 2 ? '<section class="feat"><label class="perm"><input type="checkbox" id="s_lb"' + (st.leaderboard !== false ? ' checked' : '') + '><span><b>الطالب يشوف ترتيبه وأوائل مجموعته</b>' +
        '<span class="tiny">لو قفلتها، الترتيب بيختفي من البوابة (المستر والأسيستنت بيشوفوه عادي).</span></span></label></section>' : '') +
      '<section><h2 class="grade-h">المميزات في باقتك</h2>' +
      '<p class="muted" style="margin-top:0">تقدر تشتغل بمستوى أقل من باقتك لو حابب. المقفول متاح في باقة أعلى.</p>';
    FEATURES.forEach(f => {
      const max = +plan[f.k] || 0, cur = lv[f.k] != null ? +lv[f.k] : max;
      const from = f.k === 'offline' ? 0 : 1;
      h += '<div class="feat"><h3>' + f.name + '</h3>';
      for (let i = from; i < f.lv.length; i++) {
        // المستوى المقفول div مش زرار، عشان لينك «كلّمنا» اللي جواه يشتغل
        h += i > max
          ? '<div class="lv locked"><span class="dot"></span><span>' + f.lv[i] + '</span><a class="lock" href="' + CONTACT + '" target="_blank" rel="noopener">' + icon('lock', 'sm') + 'كلّمنا عشان تضيفها</a></div>'
          : '<button class="lv ' + (i === cur ? 'on' : '') + '" data-act="setLevel" data-k="' + f.k + '" data-v="' + i + '" aria-pressed="' + (i === cur) + '"><span class="dot"></span><span>' + f.lv[i] + '</span></button>';
      }
      h += '</div>';
    });
    h += '</section>';
    $('#main').innerHTML = h + credit();
    $('#bf').onsubmit = e => {
      e.preventDefault();
      busy($('#bf button'), async () => { S.me = await API.saveBrand({ name: $('#b_name').value }); toast('اتحفظ الاسم'); shell(); location.hash = '#settings'; });
    };
    const lb = $('#s_lb'); if (lb) lb.onchange = async () => { await API.saveSettings({ leaderboard: lb.checked }).catch(e => toast(e.message, 'err')); toast(lb.checked ? 'الترتيب ظاهر للطلاب' : 'الترتيب مخفي عن الطلاب'); };
  }
  actions.setLevel = async b => {
    if (b.classList.contains('on')) return;
    await busy(b, async () => { S.me = await API.savePrefs({ [b.dataset.k]: +b.dataset.v }); toast('اتغيّر'); settings(); });
  };

  return { boot, openStudent: id => openStudent(id) };
})();

App.boot();
