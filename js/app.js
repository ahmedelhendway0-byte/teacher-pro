// التطبيق: الإعداد أول مرة ← الدخول ← الشاشات (الرئيسية، المجموعات، الإعدادات)
// مفيش onclick جوه الـ HTML (الـ CSP بيمنعه) — كل الأزرار بـ data-act
const App = (() => {
  const { esc, icon, $, $$, num, toast, sheet, close, busy, credit, ago } = U;
  const root = () => $('#app');
  const S = { me: null, groups: null, grades: null, feedMin: 1 };

  // ───── المميزات ومستوياتها (نفس جدول PLAN.md) ─────
  const FEATURES = [
    { k: 'pay', name: 'الدفع', lv: ['', 'كاش على الباب، الأسيستنت تسجّل بضغطة', 'اشتراك بالحصص + الشحن بالتحويل والأسيستنت توافق', 'اشتراك بالحصص + تأكيد التحويل أوتوماتيك'] },
    { k: 'door', name: 'الحضور على الباب', lv: ['', 'بحث بالاسم أو الكود', 'QR بكاميرا الموبايل', 'كارت NFC'] },
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
    if (!st.has_plan) {
      root().innerHTML = '<div class="gate"><div class="gate-card"><h1>الباقة لسه ماتفعّلتش</h1><p class="sub">كلّم HINDAWY عشان يفعّلوا باقتك، وبعدها افتح الصفحة دي تاني.</p></div>' + credit() + '</div>';
      return;
    }
    const d = { teacher_name: st.teacher_name || '', phone: '', grades: DEFAULT_GRADES.slice(), password: '' };
    let step = 1;
    const draw = () => {
      let body = '';
      if (step === 1) body =
        '<h1>أهلاً بيك</h1><p class="sub">تقدر تغيّر الاسم بعدين من الإعدادات.</p>' +
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
          if (!d.teacher_name) return err('اكتب الاسم.');
          if ((d.phone.replace(/\D/g, '')).length !== 11) return err('رقم الموبايل لازم 11 رقم.');
          step = 2; return draw();
        }
        if (step === 2) { if (!d.grades.length) return err('اختار صف واحد على الأقل.'); step = 3; return draw(); }
        if (d.password.length < 6) return err('الباسورد لازم 6 حروف أو أرقام على الأقل.');
        if (d.password !== d.password2) return err('الباسورد مش زي بعض.');
        await busy(b, async () => {
          await API.setup({ teacher_name: d.teacher_name, phone: d.phone, grades: d.grades, password: d.password });
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
      '<h1>دخول المستر والأسيستنت</h1><p class="sub">بالموبايل والباسورد.</p>' +
      '<form id="lf" novalidate>' +
      '<div class="field"><label for="ph">رقم الموبايل</label><input class="inp" id="ph" type="tel" inputmode="numeric" dir="ltr" autocomplete="username" required></div>' +
      '<div class="field"><label for="pw">الباسورد</label><input class="inp" id="pw" type="password" dir="ltr" autocomplete="current-password" required></div>' +
      '<p class="err" id="err"></p><button class="btn btn-ink btn-lg btn-block" type="submit">ادخل</button></form>' +
      (st.demo ? '<div class="demo-box"><b>دي نسخة تجريبية</b><span class="tiny">ادخل وجرّب كل حاجة من غير تسجيل.</span>' +
        '<button class="btn btn-line btn-block" id="demo">ادخل الديمو كمستر</button></div>' : '') +
      '</div>' + credit() + '</div>';
    if (st.demo) $('#demo').onclick = e => busy(e.currentTarget, async () => { await API.demoLogin(); S.me = await API.me(); shell(); });
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
    groups: { name: 'المجموعات', icon: 'groups', show: () => true, draw: groups },
    settings: { name: 'الإعدادات', icon: 'settings', show: isTeacher, draw: settings }
  };

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
    let r = (location.hash || '#home').slice(1);
    if (!ROUTES[r] || !ROUTES[r].show()) r = 'home';
    $('#nav').innerHTML = Object.entries(ROUTES).filter(([, v]) => v.show())
      .map(([k, v]) => '<a href="#' + k + '" class="' + (k === r ? 'on' : '') + '"' + (k === r ? ' aria-current="page"' : '') + '>' + icon(v.icon) + v.name + '</a>').join('');
    $('#main').innerHTML = '<div class="loading">بيحمّل…</div>';
    ROUTES[r].draw().catch(e => { $('#main').innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; });
    window.scrollTo(0, 0);
  }

  const actions = {};
  async function onClick(e) {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const fn = actions[b.dataset.act]; if (fn) { e.preventDefault(); fn(b); }
  }
  actions.reload = () => location.reload();
  actions.logout = async () => { await API.logout(); location.hash = ''; location.reload(); };

  // ───── الرئيسية: عين المستر ─────
  async function home() {
    const [g, feed] = await Promise.all([API.groups(), can('log') ? API.log(null, S.feedMin) : Promise.resolve(null)]);
    S.groups = g;
    const c = S.me.config;
    let h = '<div class="head"><h1>أهلاً ' + esc(S.me.staff.name) + '</h1></div>' +
      '<div class="stats"><div class="stat"><span class="muted">المجموعات</span><b>' + num(g.groups.length) + '</b>' +
      (g.groups_max ? '<span class="tiny">من ' + num(g.groups_max) + ' في باقتك</span>' : '') + '</div></div>';
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
        '<li><div class="grow"><b>' + esc(x.name) + '</b><div class="tiny">' + esc(x.schedule || 'من غير ميعاد') +
        (x.capacity ? ' · أقصى عدد ' + num(x.capacity) : '') + '</div></div>' +
        '<span class="price">' + num(x.price) + ' ج</span>' +
        (can('groups') ? '<button class="btn btn-ghost btn-sm" data-act="groupEdit" data-id="' + x.id + '" aria-label="تعديل ' + esc(x.name) + '">' + icon('pen') + '</button>' : '') +
        '</li>').join('') + '</ul>';
    });
    $('#main').innerHTML = h + credit();
  }

  function groupForm(x) {
    x = x || { grade_id: S.grades[0] && S.grades[0].id, name: '', schedule: '', price: '', capacity: '' };
    const spg = S.groups.students_per_group;
    sheet('<h2>' + (x.id ? 'تعديل المجموعة' : 'مجموعة جديدة') + '</h2><form id="gf" novalidate>' +
      '<div class="field"><label for="g_grade">الصف</label><select class="inp" id="g_grade">' +
      S.grades.map(gr => '<option value="' + gr.id + '"' + (gr.id === x.grade_id ? ' selected' : '') + '>' + esc(gr.name) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="g_name">اسم المجموعة</label><input class="inp" id="g_name" value="' + esc(x.name) + '" placeholder="مثلاً: السبت ٤ العصر"></div>' +
      '<div class="field"><label for="g_sch">الميعاد</label><input class="inp" id="g_sch" value="' + esc(x.schedule || '') + '" placeholder="مثلاً: السبت والتلات ٤ العصر"></div>' +
      '<div class="row2"><div class="field"><label for="g_price">سعر الحصة (ج)</label><input class="inp" id="g_price" type="number" min="0" inputmode="numeric" value="' + esc(x.price) + '"></div>' +
      '<div class="field"><label for="g_cap">أقصى عدد</label><input class="inp" id="g_cap" type="number" min="1" inputmode="numeric" value="' + esc(x.capacity || '') + '" placeholder="' + (spg ? 'لحد ' + spg : 'مفتوح') + '"></div></div>' +
      '<p class="err" id="gerr"></p>' +
      '<div class="actions">' + (x.id ? '<button type="button" class="btn btn-red" data-act="groupArchive" data-id="' + x.id + '">' + icon('archive') + 'قفل المجموعة</button>' : '') +
      '<button class="btn btn-ink" type="submit">' + (x.id ? 'احفظ التعديل' : 'ضيف المجموعة') + '</button></div></form>', box => {
        box.onclick = e => { const b = e.target.closest('[data-act=groupArchive]'); if (b) archiveGroup(b, x); };
        $('#gf', box).onsubmit = async e => {
          e.preventDefault();
          const btn = $('#gf button[type=submit]');
          const p = { id: x.id || null, grade_id: +$('#g_grade').value, name: $('#g_name').value.trim(), schedule: $('#g_sch').value.trim(),
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

  // ───── الإعدادات: المستويات جوه الباقة ─────
  async function settings() {
    const plan = S.me.plan || {}, lv = S.me.levels || {};
    let h = '<div class="head"><h1>الإعدادات</h1></div>' +
      '<section class="feat"><h3>الاسم اللي بيظهر</h3><form id="bf" class="inline-form">' +
      '<input class="inp" id="b_name" value="' + esc(S.me.config.system_name) + '" aria-label="الاسم اللي بيظهر">' +
      '<button class="btn btn-ink" type="submit">احفظ</button></form></section>' +
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
  }
  actions.setLevel = async b => {
    if (b.classList.contains('on')) return;
    await busy(b, async () => { S.me = await API.savePrefs({ [b.dataset.k]: +b.dataset.v }); toast('اتغيّر'); settings(); });
  };

  return { boot };
})();

App.boot();
