// شاشات الفريق التانية: الفلوس (طلبات الشحن والإعدادات)، التقارير، الدرجات، الرسايل وواتساب، التفاعل (البنك والمسابقات والأوائل)
// كل شاشة بتاخد ctx = { me, can, lvl, openStudent, isTeacher }
const Screens = (() => {
  const { esc, icon, $, $$, num, toast, sheet, close, busy, credit, ago } = U;
  const main = () => $('#main');
  const dt = iso => new Date(iso).toLocaleString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const tabs = (items, cur, attr) => '<div class="tabs-row" role="tablist">' + items.map(([k, n]) =>
    '<button role="tab" class="tab' + (k === cur ? ' on' : '') + '" aria-selected="' + (k === cur) + '" data-' + attr + '="' + k + '">' + n + '</button>').join('') + '</div>';
  const waPhone = p => '2' + String(p || '').replace(/\D/g, '');
  const lockBox = msg => '<div class="surface empty">' + icon('lock') + '<div>' + msg + '</div><a class="btn btn-line" style="margin-top:var(--s3)" href="' + CFG.PORTFOLIO + '#contact" target="_blank" rel="noopener">كلّمنا عشان تضيفها</a></div>';

  // ═════════ الفلوس ═════════
  const M = { tab: 'pending' };
  async function money(ctx) {
    if (ctx.lvl('pay') < 2) { main().innerHTML = '<div class="head"><h1>الفلوس</h1></div>' + lockBox('الشحن من البوابة والاشتراك بالحصص مش في باقتك. الكاش على الباب شغال عادي.') + credit(); return; }
    const ms = await API.moneySummary().catch(() => null);
    const badge = n => n ? ' <span class="cnt">' + num(n) + '</span>' : '';
    const t = [['pending', 'طلبات الشحن' + badge(ms && ms.pending)], ['sms', 'تحويلات وصلت' + badge(ms && ms.sms)], ['approved', 'اتأكدت'], ['rejected', 'اترفضت']].concat(ctx.isTeacher() ? [['setup', 'الإعدادات']] : []);
    let h = '<div class="head"><h1>الفلوس</h1></div>' +
      (ms ? '<div class="mstats">' +
        '<button class="mst' + (ms.pending ? ' warn' : '') + '" data-mtab="pending"><span>طلبات مستنية تأكيد</span><b class="num">' + num(ms.pending) + '</b><small>' + num(ms.pending_amount) + ' ج</small></button>' +
        '<button class="mst' + (ms.sms ? ' warn' : '') + '" data-mtab="sms"><span>تحويلات وصلت محتاجة ربط</span><b class="num">' + num(ms.sms) + '</b><small>آخر 14 يوم</small></button>' +
        '<div class="mst"><span>دخل النهارده</span><b class="num">' + num(ms.today_in) + ' ج</b><small>كاش ' + num(ms.today_cash) + ' · تحويل ' + num(ms.today_transfer) + (ms.today_auto ? ' · ' + ms.today_auto + ' أوتوماتيك' : '') + '</small></div>' +
        '<div class="mst"><span>أمانات الطلاب</span><b class="num">' + num(ms.held) + ' ج</b><small>' + num(ms.no_balance) + ' طالب رصيدهم خلص</small></div></div>' : '') +
      tabs(t, M.tab, 'mtab');
    if (M.tab === 'setup') h += await moneySetup(ctx);
    else if (M.tab === 'sms') {
      // رسايل المحفظة اللي وصلت ومااتربطتش أوتوماتيك (الطالب حوّل من غير ما يبعت طلب، أو الرسالة محتاجة مراجعة)
      const rows = await API.smsUnmatched();
      h += '<p class="muted" style="margin-top:0">تحويلات وصلت لموبايل الاستلام وماتشحنتش لوحدها. اربطها بالطالب بضغطة (لو المبلغ عدد حصص بالظبط).</p>' +
        (!rows.length ? '<div class="surface empty">' + icon('check') + '<div>مفيش تحويلات مستنية.</div></div>' :
        '<ul class="list tcards-sms">' + rows.map(r => '<li class="col"><div class="row-top"><div class="grow"><b class="num">' + num(r.amount) + ' ج</b> <span class="tiny">' + esc(r.sender) + (r.from_phone ? ' · من <span dir="ltr">' + esc(r.from_phone) + '</span>' : '') + ' · ' + dt(r.at) + '</span></div></div>' +
          (r.suspicious ? '<div class="tag warn-tag">' + esc(r.suspicious) + '</div>' : '') + '<div class="msg-prev">' + esc(r.body) + '</div>' +
          '<div class="row-btns">' + (r.students || []).map(s => '<button class="btn btn-green btn-sm" data-m="smsapply" data-sms="' + r.id + '" data-id="' + s.id + '">' + icon('check') + 'اشحن لـ ' + esc(s.name.split(' ').slice(0, 2).join(' ')) + '</button>').join('') +
          '<button class="btn btn-line btn-sm" data-m="smspick" data-sms="' + r.id + '">طالب تاني بالكود</button>' +
          (ctx.isTeacher() && r.suspicious && r.suspicious.startsWith('أول رسالة') ? '<button class="btn btn-ghost btn-sm" data-m="smstrust" data-sms="' + r.id + '">الرسالة سليمة · ثبّت الرصيد</button>' : '') + '</div></li>').join('') + '</ul>');
    } else {
      const rows = await API.topups(M.tab);
      h += !rows.length ? '<div class="surface empty">' + icon('check') + '<div>' + (M.tab === 'pending' ? 'مفيش طلبات مستنية.' : 'مفيش حاجة هنا.') + '</div></div>'
        : (M.tab === 'pending' ? '<p class="muted" style="margin-top:0">قبل ما تدوس «وصل»: افتح المحفظة واتأكد إن المبلغ ده وصل من الرقم ده في الوقت ده.</p>' : '') +
          '<div class="tcards">' + rows.map(r => '<div class="tcard ' + M.tab + '">' +
          '<div class="tc-top"><button class="plain-btn grow" data-m="student" data-id="' + r.student_id + '"><b>' + esc(r.name) + '</b>' +
          '<span class="tiny">' + r.code + ' · ' + esc(r.group_name || '') + ' · طلبه ' + (r.by_role === 'parent' ? 'ولي الأمر' : 'الطالب') + '</span></button>' +
          '<div class="tc-amt"><b class="num">' + num(r.amount) + '</b><small>جنيه</small></div></div>' +
          '<dl class="tc-dl"><div><dt>اشترى</dt><dd>' + (r.sessions ? r.sessions + ' حصص' : '') + (r.products.length ? (r.sessions ? ' + ' : '') + r.products.map(p => esc(p.name)).join('، ') : '') + '</dd></div>' +
          '<div><dt>حوّل على</dt><dd>' + (r.method === 'vodafone' ? 'فودافون كاش' : 'انستاباي') + '</dd></div>' +
          '<div><dt>من رقم</dt><dd class="num" dir="ltr">' + esc(r.sender) + '</dd></div><div><dt>الوقت</dt><dd>' + dt(r.sent_at) + '</dd></div></dl>' +
          (M.tab === 'pending' ? '<div class="tc-act">' + (r.has_receipt ? '<button class="btn btn-line btn-sm" data-m="receipt" data-id="' + r.id + '">' + icon('receipt') + 'الإيصال</button>' : '<span class="tiny">من غير إيصال</span>') +
            '<button class="btn btn-red btn-sm" data-m="reject" data-id="' + r.id + '">رفض</button><button class="btn btn-green" data-m="approve" data-id="' + r.id + '">' + icon('check') + 'وصل · اشحن</button></div>'
            : '<div class="tc-foot">' + (r.auto ? '<span class="tag ok">اتأكد أوتوماتيك</span> ' : '') + (r.reviewed_name ? esc(r.reviewed_name) + ' · ' : '') + (r.reviewed_at ? dt(r.reviewed_at) : '') + (r.note ? ' · ' + esc(r.note) : '') + '</div>') +
          '</div>').join('') + '</div>';
    }
    main().innerHTML = h + credit();
    main().onclick = async e => {
      const tb = e.target.closest('[data-mtab]'); if (tb) { M.tab = tb.dataset.mtab; return money(ctx); }
      const b = e.target.closest('[data-m]'); if (!b) return;
      const a = b.dataset.m, id = +b.dataset.id;
      if (a === 'student') return ctx.openStudent(id);
      if (a === 'receipt') { const img = await API.receipt(id).catch(x => toast(x.message, 'err')); if (img) sheet('<h2>الإيصال</h2><img class="receipt" alt="صورة الإيصال" src="' + esc(img) + '">'); return; }
      if (a === 'approve') return busy(b, async () => { await API.reviewTopup(id, true); toast('اتشحن الرصيد'); money(ctx); });
      if (a === 'reject') {
        const note = prompt('سبب الرفض (هيوصل للطالب):', 'المبلغ ماوصلش. كلّم الأسيستنت.'); if (note === null) return;
        return busy(b, async () => { await API.reviewTopup(id, false, note); toast('اترفض الطلب'); money(ctx); });
      }
      if (a === 'smsapply') return busy(b, async () => { await API.smsApply(+b.dataset.sms, id); toast('اتشحن الرصيد'); money(ctx); });
      if (a === 'smstrust') return busy(b, async () => { await API.smsTrust(+b.dataset.sms); toast('اتثبت الرصيد — الرسايل الجاية هتتأكد لوحدها'); money(ctx); });
      if (a === 'smspick') {
        const code = prompt('كود الطالب:'); if (!code) return;
        return busy(b, async () => { const s = await API.studentByCode(code); if (!confirm('تشحن التحويل لـ «' + s.name + '»؟')) return; await API.smsApply(+b.dataset.sms, s.id); toast('اتشحن لـ ' + s.name); money(ctx); });
      }
      if (a === 'secret') return busy(b, async () => { const r = await API.smsSecret(); sheet('<h2>المفتاح السري لموبايل الاستلام</h2><p class="muted">انسخه دلوقتي — مش هيظهر تاني.</p><code class="secret" dir="ltr">' + esc(r.secret) + '</code>'); });
    };
    if (M.tab === 'setup') bindSetup(ctx);
  }

  async function moneySetup(ctx) {
    const s = await API.settings(), w = s.wallets || {};
    return '<section class="feat"><h3>أرقام الاستلام (بتظهر للطالب في تعليمات الدفع)</h3><form id="wf">' +
      '<div class="row2"><div class="field"><label for="w_vf">رقم فودافون كاش</label><input class="inp" id="w_vf" dir="ltr" inputmode="numeric" value="' + esc(w.vodafone || '') + '"></div>' +
      '<div class="field"><label for="w_ip">عنوان انستاباي</label><input class="inp" id="w_ip" dir="ltr" value="' + esc(w.instapay || '') + '"></div></div>' +
      '<button class="btn btn-ink" type="submit">احفظ الأرقام</button></form></section>' +
      '<section class="feat"><h3>المنتجات (مذكرات وامتحانات بسعر ثابت)</h3><ul class="list flat" id="plist">' + s.products.map(p =>
        '<li><div class="grow">' + esc(p.name) + '</div><b class="num">' + num(p.price) + ' ج</b><button class="btn btn-ghost btn-sm" data-prod="del" data-id="' + p.id + '" aria-label="شيل ' + esc(p.name) + '">' + icon('x') + '</button></li>').join('') +
      '</ul><form id="pf" class="inline-form" style="margin-top:var(--s3)"><input class="inp" id="p_name" placeholder="اسم المنتج"><input class="inp num" id="p_price" style="max-width:110px" type="number" min="0" inputmode="numeric" placeholder="السعر"><button class="btn btn-line" type="submit">ضيف</button></form></section>' +
      '<section class="feat"><h3>تأكيد التحويل أوتوماتيك</h3>' + (ctx.lvl('pay') < 3 ? '<p class="muted">مش في باقتك. التحويلات بتتراجع من الأسيستنت بضغطة.</p>' :
        '<p class="muted" style="margin-top:0">موبايل أندرويد عليه خط الاستلام + تطبيق MacroDroid (ببلاش) بيبعت كل رسالة من فودافون كاش أو البنك للسيستم، والسيستم بيطابقها بطلب الشحن (نفس المبلغ + نفس الرقم + في نفس الوقت) ويشحن لوحده.</p>' +
        '<ol class="howto"><li>نزّل MacroDroid على الموبايل اللي عليه الخط.</li><li>Trigger: <b>SMS Received</b> (وNotification لو انستاباي).</li>' +
        '<li>Action: <b>HTTP Request · POST</b> على:<code dir="ltr">' + esc(CFG.SUPABASE_URL) + '/rest/v1/rpc/' + (CFG.P || 'tp_') + 'sms_in</code></li>' +
        '<li>Headers: <code dir="ltr">apikey: ' + esc(CFG.SUPABASE_KEY) + '</code></li>' +
        '<li>Body: <code dir="ltr">{"p_secret":"المفتاح","p_sender":"[sms_number]","p_body":"[sms_message]"}</code></li></ol>' +
        '<p class="tiny">' + (s.sms_ready ? 'فيه مفتاح شغال. لو عملت جديد، القديم بيقف.' : 'لسه مفيش مفتاح.') + '</p>' +
        '<button class="btn btn-ink" data-m="secret">' + icon('lock') + (s.sms_ready ? 'اعمل مفتاح جديد' : 'اعمل المفتاح') + '</button>' +
        '<h4 class="mini-h" style="margin-top:var(--s5)">الحماية من الرسايل المزيفة</h4><ul class="howto">' +
        '<li>الرسايل من أرقام عادية بتترفض — لازم تكون من فودافون كاش أو البنك.</li>' +
        '<li>رصيد المحفظة اللي في الرسالة لازم يساوي الرصيد اللي قبله + المبلغ. اللي بيزوّر رسالة مايعرفش رصيدك الحقيقي، فرسالته بتروح مراجعة.</li>' +
        '<li>أول رسالة خالص بتتراجع مرة واحدة (من «تحويلات وصلت») عشان نثبّت الرصيد.</li>' +
        '<li>نفس الرسالة لو اتبعتت مرتين بتتحسب مرة واحدة.</li></ul>' +
        '<form id="af" class="row2"><div class="field"><label for="a_max">أقصى مبلغ بيتأكد لوحده (ج)</label><input class="inp num" id="a_max" type="number" min="0" inputmode="numeric" value="' + esc(s.auto_max || 3000) + '"></div>' +
        '<div class="field"><label class="perm" style="margin-top:28px"><input type="checkbox" id="a_nobal"' + (s.allow_no_balance ? ' checked' : '') + '><span><b>اقبل رسايل من غير رصيد</b><span class="tiny">زي إشعارات انستاباي — أقل أمان</span></span></label></div>' +
        '<button class="btn btn-line" type="submit">احفظ</button></form>') + '</section>';
  }
  function bindSetup(ctx) {
    $('#wf').onsubmit = e => { e.preventDefault(); busy($('#wf button'), async () => { await API.saveSettings({ wallets: { vodafone: $('#w_vf').value.trim(), instapay: $('#w_ip').value.trim() } }); toast('اتحفظت الأرقام'); }); };
    $('#pf').onsubmit = e => {
      e.preventDefault();
      const n = $('#p_name').value.trim(), p = $('#p_price').value;
      if (!n || p === '') return toast('اكتب اسم المنتج وسعره', 'err');
      busy($('#pf button'), async () => { await API.saveProduct({ name: n, price: +p }); money(ctx); });
    };
    $('#plist').onclick = e => { const b = e.target.closest('[data-prod=del]'); if (b) busy(b, async () => { await API.saveProduct({ id: +b.dataset.id, remove: true }); money(ctx); }); };
    const af = $('#af'); if (af) af.onsubmit = e => { e.preventDefault(); busy($('button', af), async () => { await API.saveSettings({ auto_max: +$('#a_max').value || 0, allow_no_balance: $('#a_nobal').checked }); toast('اتحفظ'); }); };
  }

  // ═════════ المصروفات ═════════
  const X = { month: null };
  const REP = { once: 'مرة واحدة', daily: 'كل يوم', weekly: 'كل أسبوع', monthly: 'كل شهر' };
  async function expenses(ctx) {
    const now = new Date(); X.month = X.month || iso(now).slice(0, 7);
    const [y, m] = X.month.split('-').map(Number), from = X.month + '-01', to = iso(new Date(y, m, 0, 12));
    const d = await API.expenses(from, to);
    main().innerHTML = '<div class="head"><h1>المصروفات</h1><input class="inp" type="month" id="xm" value="' + X.month + '" style="max-width:180px" aria-label="الشهر"></div>' +
      '<form id="xf" class="surface" novalidate><div class="row2"><div class="field"><label for="x_c">البند</label><input class="inp" id="x_c" list="xcats" placeholder="مثلاً: إيجار القاعة، طباعة، مرتبات"><datalist id="xcats">' +
      d.cats.map(c => '<option value="' + esc(c) + '">').join('') + '</datalist></div>' +
      '<div class="field"><label for="x_a">المبلغ (ج)</label><input class="inp num" id="x_a" type="number" min="1" inputmode="numeric"></div></div>' +
      '<div class="field"><span class="lbl">بيتكرر؟</span><div class="seg" id="x_r">' + Object.entries(REP).map(([v, n]) => '<button type="button" data-rep="' + v + '" class="' + (v === 'once' ? 'on' : '') + '">' + n + '</button>').join('') + '</div>' +
      '<span class="hint" id="x_rh">مصروف النهارده بس (أو اليوم اللي تختاره).</span></div>' +
      '<div class="row2"><div class="field"><label for="x_d" id="x_dl">اليوم</label><input class="inp" id="x_d" type="date" value="' + iso(now) + '"></div>' +
      '<div class="field"><label for="x_n">ملاحظة (اختياري)</label><input class="inp" id="x_n"></div></div>' +
      '<button class="btn btn-ink" type="submit">' + icon('plus') + 'سجّل المصروف</button></form>' +
      (d.recurring.length ? '<section class="sec"><h2>مصروفات ثابتة بتتحسب لوحدها</h2><ul class="list">' + d.recurring.map(r => '<li><div class="grow"><b>' + esc(r.category) + '</b>' +
        '<div class="tiny">' + num(r.amount) + ' ج ' + REP[r.repeat] + ' · من ' + r.since + ' · حوالي ' + num(r.monthly) + ' ج في الشهر' + (r.note ? ' · ' + esc(r.note) : '') + '</div></div>' +
        (ctx.isTeacher() ? '<button class="btn btn-ghost btn-sm" data-xstop="' + r.id + '">وقّفه</button>' : '') + '</li>').join('') + '</ul>' +
        '<p class="tiny">بتدخل في الصافي والتقارير لوحدها كل ' + 'يوم/أسبوع/شهر. «وقّفه» بيوقفها من النهارده واللي فات بيفضل محسوب.</p></section>' : '') +
      '<div class="stats" style="margin-top:var(--s4)"><div class="stat"><span class="muted">مصروفات الشهر</span><b>' + num(d.total) + ' ج</b></div>' +
      d.by_cat.slice(0, 3).map(c => '<div class="stat"><span class="muted">' + esc(c.category) + '</span><b>' + num(c.total) + ' ج</b></div>').join('') + '</div>' +
      (d.rows.length ? '<ul class="list" style="margin-top:var(--s4)">' + d.rows.map(r => '<li><div class="grow"><b>' + esc(r.category) + '</b>' + (r.repeat !== 'once' ? ' <span class="tag">' + REP[r.repeat] + '</span>' : '') +
        '<div class="tiny">' + r.day + (r.note ? ' · ' + esc(r.note) : '') + ' · ' + esc(r.by_name || '') + '</div></div>' +
        '<b class="num">' + num(r.amount) + ' ج</b>' + (ctx.isTeacher() && r.repeat === 'once' ? '<button class="btn btn-ghost btn-sm" data-xdel="' + r.id + '" aria-label="امسح">' + icon('x') + '</button>' : '') + '</li>').join('') + '</ul>'
        : '<div class="surface empty" style="margin-top:var(--s4)">مفيش مصروفات في الشهر ده.</div>') + credit();
    let rep = 'once';
    const RH = { once: ['اليوم', 'مصروف مرة واحدة بس (حاجة استثنائية).'], daily: ['من يوم', 'بيتحسب كل يوم لوحده لحد ما توقفه.'],
      weekly: ['من يوم', 'بيتحسب كل أسبوع في نفس اليوم لحد ما توقفه.'], monthly: ['من يوم', 'بيتحسب كل شهر في نفس اليوم (زي الإيجار والمرتبات) لحد ما توقفه.'] };
    $$('[data-rep]').forEach(b => { b.onclick = () => { rep = b.dataset.rep; $$('[data-rep]').forEach(x => x.classList.toggle('on', x === b)); $('#x_dl').textContent = RH[rep][0]; $('#x_rh').textContent = RH[rep][1]; }; });
    $('#xm').onchange = () => { X.month = $('#xm').value; expenses(ctx); };
    $('#xf').onsubmit = e => {
      e.preventDefault();
      const p = { category: $('#x_c').value.trim(), amount: +$('#x_a').value, day: $('#x_d').value, note: $('#x_n').value, repeat: rep };
      if (!p.category || !p.amount) return toast('اكتب البند والمبلغ', 'err');
      busy($('#xf button[type=submit]'), async () => { await API.saveExpense(p); toast(rep === 'once' ? 'اتسجل' : 'اتسجل — هيتحسب ' + REP[rep] + ' لوحده'); expenses(ctx); });
    };
    main().onclick = e => {
      const b = e.target.closest('[data-xdel]'); if (b && confirm('تمسح المصروف ده؟')) return busy(b, async () => { await API.saveExpense({ id: +b.dataset.xdel, remove: true }); expenses(ctx); });
      const s = e.target.closest('[data-xstop]'); if (s && confirm('توقّف المصروف ده من النهارده؟')) busy(s, async () => { await API.saveExpense({ id: +s.dataset.xstop, stop: true }); toast('اتوقف'); expenses(ctx); });
    };
  }

  // ═════════ تصدير إكسل (CSV بيتفتح في Excel بالعربي) ═════════
  async function exportCsv(kind, from, to, name) {
    const rows = await API.exportRows(kind, from, to);
    if (!rows.length) return toast('مفيش بيانات في الفترة دي', 'err');
    const cols = Object.keys(rows[0]), cell = v => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const csv = '﻿' + [cols.map(cell).join(',')].concat(rows.map(r => cols.map(c => cell(r[c])).join(','))).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = name + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('اتنزل ' + rows.length + ' سطر');
  }

  // تفاصيل رقم من التقارير: توزيعه (بالنوع/المجموعة) + كل الحركات (الاسم بيفتح ملف الطالب)
  async function reportDetail(ctx, kind, f, t) {
    const d = await API.reportDetail(kind, f, t);
    const T = { revenue: 'تفاصيل الإيراد', cash: 'تفاصيل دخل الخزنة كاش', transfer: 'تفاصيل التحويلات', expenses: 'تفاصيل المصروفات', net: 'الصافي = الإيراد − المصروفات', held: 'أمانات الطلاب (حصص مدفوعة لسه ماتخصمتش)' };
    const bars = (rows, title, cls) => { if (!rows || !rows.length) return ''; const mx = Math.max(1, ...rows.map(r => Math.abs(+r.total)));
      return '<h3 class="mini-h">' + title + '</h3>' + rows.map(r => '<div class="bar-row"><span>' + esc(r.label) + (r.n != null ? ' <span class="tiny">(' + num(r.n) + (kind === 'held' ? ' حصة' : ' مرة') + ')</span>' : '') + '</span>' +
        '<span class="bar ' + (cls || '') + '" style="--w:' + Math.round(Math.abs(r.total) / mx * 100) + '%"></span><b class="num">' + num(r.total) + ' ج</b></div>').join(''); };
    const sum = rs => (rs || []).reduce((a, r) => a + +r.total, 0);
    let h = '<h2>' + T[kind] + '</h2><p class="tiny" style="margin-top:-6px">' + (kind === 'held' ? 'دلوقتي' : f + ' ← ' + t) + '</p>';
    if (kind === 'net') {
      h += '<div class="net-eq"><div><span class="muted">الإيراد</span><b class="num">' + num(sum(d.in)) + ' ج</b></div><span>−</span><div><span class="muted">المصروفات</span><b class="num">' + num(sum(d.out)) + ' ج</b></div><span>=</span>' +
        '<div class="ok"><span class="muted">الصافي</span><b class="num">' + num(sum(d.in) - sum(d.out)) + ' ج</b></div></div>' + bars(d.in, 'الإيراد جه منين', 'g') + bars(d.out, 'المصروفات راحت فين', 'r');
    } else {
      h += bars(d.by, kind === 'expenses' ? 'بالبند' : 'بالنوع', kind === 'expenses' ? 'r' : 'g') + bars(d.by_group, 'بالمجموعة', 'g') +
        (d.rows && d.rows.length ? '<h3 class="mini-h">' + (kind === 'held' ? 'الطلاب' : 'كل الحركات') + ' (' + num(d.rows.length) + (d.rows.length >= 300 ? '+' : '') + ')</h3><div class="table-wrap"><table class="tbl"><tbody>' +
          d.rows.map(r => '<tr><td class="tiny">' + (r.at ? dt(r.at) : r.day || '') + '</td><td>' + (r.sid ? '<button class="plain-btn name-btn" data-act="studentOpen" data-id="' + r.sid + '">' + esc(r.name) + '</button>' : esc(r.label)) + '</td>' +
            '<td class="tiny">' + (r.sid ? esc(r.label || '') : esc(r.note || '')) + (r.sessions ? ' · ' + r.sessions + ' حصة' : '') + (r.repeat && r.repeat !== 'once' ? ' · ' + REP[r.repeat] : '') + '</td>' +
            '<td class="num">' + num(r.total) + ' ج</td><td class="tiny">' + esc(r.by || '') + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="empty">مفيش حركات في الفترة دي.</div>');
    }
    sheet('<div class="rdetail">' + h + '</div>', box => { box.closest('.sheet-box').classList.add('wide'); box.onclick = e => { const b = e.target.closest('[data-act=studentOpen]'); if (b) ctx.openStudent(+b.dataset.id); }; });
  }

  // ═════════ التقارير ═════════
  const R = { range: 'today', from: null, to: null };
  const iso = d => d.toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
  function rangeDates() {
    const now = new Date(), t = iso(now);
    if (R.range === 'today') return [t, t];
    if (R.range === 'week') { const d = new Date(now); d.setDate(d.getDate() - 6); return [iso(d), t]; }
    if (R.range === 'month') { const d = new Date(now); d.setDate(d.getDate() - 29); return [iso(d), t]; }
    return [R.from || t, R.to || t];
  }
  async function reports(ctx) {
    const [f, t] = rangeDates();
    const r = await API.report(f, t), a = r.attendance, m = r.money;
    const bar = (v, max, cls) => '<span class="bar ' + (cls || '') + '" style="--w:' + (max ? Math.round(v / max * 100) : 0) + '%"></span>';
    const maxDay = Math.max(1, ...r.days.map(d => d.present));
    let h = '<div class="head"><h1>التقارير</h1></div>' + tabs([['today', 'النهارده'], ['week', 'آخر 7 أيام'], ['month', 'آخر 30 يوم'], ['custom', 'فترة']], R.range, 'rr') +
      (R.range === 'custom' ? '<div class="inline-form" style="margin-bottom:var(--s3)"><input class="inp" type="date" id="rf" value="' + f + '"><input class="inp" type="date" id="rt" value="' + t + '"><button class="btn btn-line" data-rgo="1">اعرض</button></div>' : '') +
      // كل رقم بيفتح تفاصيله
      '<div class="stats rstats">' +
      [['revenue', 'الإيراد', num(m.revenue) + ' ج', 'حصص اتخصمت + كاش + منتجات', ''],
       ['cash', 'دخل الخزنة كاش', num(m.cash_in) + ' ج', 'حصص ' + num(m.door_cash) + ' · اشتراكات ' + num(m.subs_cash), ''],
       ['transfer', 'تحويلات', num(m.transfer_in) + ' ج', num(r.topups.approved) + ' طلب (' + num(r.topups.auto) + ' أوتوماتيك)', ''],
       ['expenses', 'المصروفات', num(r.expenses) + ' ج', r.expenses_by_cat[0] ? 'أكبر بند: ' + esc(r.expenses_by_cat[0].category) : 'مفيش', ''],
       ['net', 'الصافي', num(r.net) + ' ج', 'الإيراد − المصروفات', ' net'],
       ['held', 'أمانات الطلاب دلوقتي', num(r.held) + ' ج', num(r.held_sessions) + ' حصة لسه ماتخصمتش', '']]
        .map(([k, n, v, sub, cl]) => '<button class="stat' + cl + '" data-rd="' + k + '"><span class="muted">' + n + '</span><b>' + v + '</b><span class="tiny">' + sub + '</span><span class="more-t">التفاصيل ' + icon('chev', 'sm') + '</span></button>').join('') + '</div>' +
      '<section class="sec"><h2>الملفات</h2><div class="files">' +
      [['students', 'كل الطلاب وبياناتهم', 'الكود والرقم السري والموبايلات والرصيد والمتوسط'], ['attendance', 'الحضور', 'للفترة دي'], ['scores', 'الدرجات', 'للفترة دي'],
       ['money', 'الحسابات', 'كل حركة فلوس للفترة دي'], ['expenses', 'المصروفات', 'للفترة دي بالمتكرر']].map(([k, n, s]) =>
        '<button class="file-b" data-xp="' + k + '">' + icon('sheet') + '<div><b>' + n + '</b><span class="tiny">' + s + '</span></div></button>').join('') +
      '<a class="file-b" href="' + CFG.PRINT + '?all=1" target="_blank" rel="noopener">' + icon('print') + '<div><b>كروت كل الطلاب</b><span class="tiny">للطباعة (10 في الورقة)</span></div></a></div>' +
      '<p class="tiny">ملفات Excel بتتفتح في Excel أو Google Sheets بالعربي. كروت كل مجموعة لوحدها من صفحة المجموعة في «الطلاب».</p></section>' +
      '<section class="sec"><h2>الحضور · ' + num(a.total) + '</h2><div class="surface split">' +
      '<div><h3 class="mini-h">طريقة الدخول</h3>' + [['nfc', 'كارت NFC'], ['qr', 'QR'], ['search', 'يدوي']].map(([k, n]) => '<div class="bar-row"><span>' + n + '</span>' + bar(a[k], a.total) + '<b class="num">' + num(a[k]) + '</b></div>').join('') + '</div>' +
      '<div><h3 class="mini-h">طريقة الدفع</h3>' + [['wallet', 'من الاشتراك'], ['cash', 'كاش على الباب']].map(([k, n]) => '<div class="bar-row"><span>' + n + '</span>' + bar(a[k], a.total, k === 'cash' ? 'a' : 'g') + '<b class="num">' + num(a[k]) + '</b></div>').join('') +
      '<h3 class="mini-h">الواجب</h3><div class="bar-row"><span>عملوه</span>' + bar(a.hw_yes, a.hw_yes + a.hw_no, 'g') + '<b class="num">' + num(a.hw_yes) + '</b></div><div class="bar-row"><span>ماعملوش</span>' + bar(a.hw_no, a.hw_yes + a.hw_no, 'r') + '<b class="num">' + num(a.hw_no) + '</b></div></div></div></section>' +
      (r.days.length > 1 ? '<section class="sec"><h2>كل يوم</h2><div class="surface days">' + r.days.map(d => '<div class="day" title="' + d.d + ': ' + d.present + ' حضور"><span style="--h:' + Math.round(d.present / maxDay * 100) + '%"></span><small>' + d.d.slice(8) + '</small></div>').join('') + '</div></section>' : '') +
      '<section class="sec"><h2>المجموعات</h2><div class="table-wrap"><table class="tbl"><thead><tr><th>المجموعة</th><th>الطلاب</th><th>الحضور</th><th>الإيراد</th></tr></thead><tbody>' +
      r.groups.map(g => '<tr><td>' + esc(g.name) + '</td><td class="num">' + num(g.students) + '</td><td class="num">' + num(g.present) + '</td><td class="num">' + num(g.revenue) + ' ج</td></tr>').join('') + '</tbody></table></div></section>' +
      (r.staff.length ? '<section class="sec"><h2>الفريق: مين قبض كام</h2><div class="table-wrap"><table class="tbl"><thead><tr><th>الاسم</th><th>كاش قبضه</th><th>عمليات</th></tr></thead><tbody>' +
        r.staff.map(s => '<tr><td>' + esc(s.name) + '</td><td class="num">' + num(s.collected) + ' ج</td><td class="num">' + num(s.ops) + '</td></tr>').join('') + '</tbody></table></div></section>' : '');
    main().innerHTML = h + credit();
    main().onclick = e => {
      const b = e.target.closest('[data-rr]'); if (b) { R.range = b.dataset.rr; return reports(ctx); }
      if (e.target.closest('[data-rgo]')) { R.from = $('#rf').value; R.to = $('#rt').value; return reports(ctx); }
      const x = e.target.closest('[data-xp]'); if (x) return busy(x, () => exportCsv(x.dataset.xp, f, t, x.dataset.xp + '_' + f + '_' + t));
      const rd = e.target.closest('[data-rd]'); if (rd) return busy(rd, () => reportDetail(ctx, rd.dataset.rd, f, t));
    };
  }

  // ═════════ الدرجات: كويز بأسئلته + الإجابة الصح والشرح + لينك الحل + إحصائية كل سؤال ═════════
  const E = { open: null, stats: false };
  const LET = ['أ', 'ب', 'ج', 'د', 'هـ'];
  async function exams(ctx) {
    if (E.open) return E.stats ? examStats(ctx, E.open) : examSheet(ctx, E.open);
    const all = await API.exams(), list = all.filter(x => !E.kind || x.kind === E.kind);
    main().innerHTML = '<div class="head"><h1>الدرجات</h1>' + (ctx.can('grades') ? '<div class="head-btns"><button class="btn btn-line" data-ex="new" data-kind="exam">' + icon('plus') + 'امتحان جديد</button>' +
      '<button class="btn btn-ink" data-ex="new" data-kind="quiz">' + icon('plus') + 'كويز جديد</button></div>' : '') + '</div>' +
      tabs([['', 'الكل'], ['quiz', 'الكويزات'], ['exam', 'الامتحانات']], E.kind || '', 'ek') +
      (list.length ? '<ul class="list">' + list.map(x => '<li class="tap" data-ex="open" data-id="' + x.id + '"><span class="av">' + icon('pen') + '</span><div class="grow"><b>' + esc(x.title) + '</b>' +
        '<div class="tiny">' + (x.kind === 'exam' ? 'امتحان' : 'كويز') + ' · ' + esc(x.group_name || x.grade) + ' · من ' + x.max_score + '</div></div>' +
        '<div class="tiny" style="text-align:left">' + num(x.scored) + ' درجة' + (x.avg != null ? '<br>متوسط ' + x.avg : '') + '</div></li>').join('') + '</ul>'
        : '<div class="surface empty">' + icon('pen') + '<div>لسه مفيش ' + (E.kind === 'exam' ? 'امتحانات' : 'كويزات') + '.</div></div>') + credit();
    main().onclick = e => {
      const tk = e.target.closest('[data-ek]'); if (tk) { E.kind = tk.dataset.ek || null; return exams(ctx); }
      const b = e.target.closest('[data-ex]'); if (!b) return;
      if (b.dataset.ex === 'open') { E.open = +b.dataset.id; E.stats = false; return examSheet(ctx, E.open); }
      if (b.dataset.ex === 'new') return examForm(ctx, null, b.dataset.kind);
    };
  }

  // نموذج الإجابة: لكل سؤال الإجابة الصح (حرف أو كلام) + الشرح ونص السؤال (اختياري).
  // لما المصحح يقول «الطالب غلط في سؤال 3»، الطالب بيوصله الصح والشرح لوحده.
  const keyRow = (q, i) => {
    const mcq = q.kind !== 'essay', ch = (q.choices || []).concat(['', '', '', '']).slice(0, 4), open = !!(q.text || q.explain || q.part || ch.some(Boolean));
    return '<div class="krow" data-i="' + i + '"><b class="kn">' + (i + 1) + '</b>' +
      (mcq ? '<div class="kbub">' + LET.slice(0, 4).map((L, k) => '<button type="button" data-ka="' + k + '" class="' + (q.answer != null && q.answer !== '' && +q.answer === k ? 'on' : '') + '" aria-label="سؤال ' + (i + 1) + ': الصح ' + L + '">' + L + '</button>').join('') + '</div>'
        : '<input class="inp kess" data-kf="answer" value="' + esc(q.answer || '') + '" placeholder="الإجابة الصح">') +
      '<button type="button" class="btn btn-ghost btn-sm" data-kt="1">' + (mcq ? 'مقالي؟' : 'اختياري؟') + '</button>' +
      '<button type="button" class="btn btn-ghost btn-sm' + (q.explain ? ' has' : '') + '" data-km="1">' + icon('pen', 'sm') + 'الشرح</button>' +
      '<div class="kmore"' + (open ? '' : ' hidden') + '>' +
      '<textarea class="inp" data-kf="explain" rows="2" placeholder="الشرح: ليه دي الإجابة الصح (بيوصل للطالب اللي غلط فيه)">' + esc(q.explain || '') + '</textarea>' +
      '<textarea class="inp" data-kf="text" rows="1" placeholder="نص السؤال (اختياري)">' + esc(q.text || '') + '</textarea>' +
      (mcq ? '<div class="kch">' + ch.map((c, k) => '<input class="inp" data-kc="' + k + '" value="' + esc(c) + '" placeholder="' + LET[k] + ') (اختياري)">').join('') + '</div>' : '') +
      '<input class="inp" data-kf="part" value="' + esc(q.part || '') + '" placeholder="الجزء/الدرس (اختياري — لـ «أخطائي»)"></div></div>';
  };

  async function examForm(ctx, ex, kind0) {
    const [grades, g] = await Promise.all([API.grades(), API.groups()]);
    const isNew = !ex; ex = ex || { title: '', kind: kind0 || 'quiz', max: kind0 === 'exam' ? 50 : 20, questions: [], solution_url: '' };
    const KN = k => k === 'exam' ? 'امتحان' : 'كويز';
    const K = (ex.questions || []).map(q => ({ ...q }));
    sheet('<h2>' + (isNew ? KN(ex.kind) + ' جديد' : 'تعديل «' + esc(ex.title) + '»') + '</h2><form id="ef" novalidate>' +
      '<div class="field"><label for="e_t">اسم ال' + KN(ex.kind) + '</label><input class="inp" id="e_t" value="' + esc(ex.title) + '" placeholder="' + (ex.kind === 'exam' ? 'مثلاً: امتحان شهر أكتوبر' : 'مثلاً: كويز التيار الكهربي') + '"></div>' +
      (isNew ? '<div class="field"><span class="lbl">النوع</span><div class="chips"><button type="button" class="chip' + (ex.kind === 'quiz' ? ' on' : '') + '" data-k="quiz">كويز</button><button type="button" class="chip' + (ex.kind === 'exam' ? ' on' : '') + '" data-k="exam">امتحان</button></div></div>' +
        '<div class="row2"><div class="field"><label for="e_g">لمين</label><select class="inp" id="e_g">' + g.groups.map(x => '<option value="' + x.id + '" data-grade="' + x.grade_id + '">' + esc(x.name) + ' · ' + esc(x.grade) + '</option>').join('') +
        grades.map(x => '<option value="grade:' + x.id + '">كل ' + esc(x.name) + '</option>').join('') + '</select></div>' : '<div class="row2">') +
      '<div class="field"><label for="e_m">الدرجة النهائية</label><input class="inp" id="e_m" type="number" min="1" inputmode="numeric" value="' + ex.max + '"></div></div>' +
      '<details class="key-box"' + (K.length ? ' open' : '') + '><summary><b>نموذج الإجابة</b> <span class="tag">اختياري</span>' +
      '<div class="tiny">من غيره بتسجّل الدرجة بس. معاه بتدوس على الأسئلة الغلط والطالب يعرف غلط في إيه والصح إيه.</div></summary>' +
      '<p class="tiny">اكتب عدد الأسئلة، ودوس على الإجابة الصح لكل سؤال (زي ورقة الإجابة بتاعة المستر). ولو عايز، دوس «الشرح» واكتب ليه دي الصح.</p>' +
      '<div class="inline-form"><label for="e_n" class="lbl" style="margin:0">عدد الأسئلة</label><input class="inp num" id="e_n" type="number" min="0" max="100" inputmode="numeric" value="' + (K.length || '') + '" placeholder="مثلاً 10" style="max-width:110px"></div>' +
      '<div id="key"></div></details>' +
      '<div class="field"><label for="e_u">لينك فيديو الحل (اختياري)</label><input class="inp" id="e_u" dir="ltr" value="' + esc(ex.solution_url || '') + '" placeholder="https://youtube.com/…"></div>' +
      '<p class="err" id="eerr"></p><div class="actions"><button class="btn btn-ink" type="submit">' + (isNew ? 'احفظ وابدأ التصحيح' : 'احفظ') + '</button></div></form>', box => {
      let kind = ex.kind;
      const draw = () => { $('#key', box).innerHTML = K.map(keyRow).join(''); };
      draw();
      $('#e_n', box).oninput = () => {
        const n = Math.min(100, Math.max(0, +$('#e_n', box).value || 0));
        while (K.length < n) K.push({ kind: 'mcq', answer: null, choices: [] });
        if (K.length > n) K.length = n;
        draw();
      };
      box.onclick = e => {
        const c = e.target.closest('[data-k]'); if (c) { kind = c.dataset.k; $$('[data-k]', box).forEach(x => x.classList.toggle('on', x === c)); return; }
        const row = e.target.closest('.krow'); if (!row) return;
        const q = K[+row.dataset.i];
        const a = e.target.closest('[data-ka]'); if (a) { q.answer = +a.dataset.ka; $$('[data-ka]', row).forEach(x => x.classList.toggle('on', x === a)); return; }
        if (e.target.closest('[data-kt]')) { q.kind = q.kind === 'essay' ? 'mcq' : 'essay'; q.answer = null; row.outerHTML = keyRow(q, +row.dataset.i); return; }
        if (e.target.closest('[data-km]')) { const m = $('.kmore', row); m.hidden = !m.hidden; if (!m.hidden) $('textarea', m).focus(); }
      };
      box.addEventListener('input', e => {
        const row = e.target.closest('.krow'); if (!row) return;
        const q = K[+row.dataset.i];
        if (e.target.dataset.kf) q[e.target.dataset.kf] = e.target.value;
        if (e.target.dataset.kc != null) { q.choices = (q.choices || []).concat(['', '', '', '']).slice(0, 4); q.choices[+e.target.dataset.kc] = e.target.value; }
      });
      $('#ef', box).onsubmit = e => {
        e.preventDefault();
        const questions = K.map(q => ({ text: (q.text || '').trim(), kind: q.kind === 'essay' ? 'essay' : 'mcq',
          choices: q.kind === 'essay' ? [] : (q.choices || []).concat(['', '', '', '']).slice(0, 4).map(x => (x || '').trim()),
          answer: q.kind === 'essay' ? (q.answer || '').trim() : q.answer, explain: (q.explain || '').trim(), part: (q.part || '').trim() }));
        const p = { id: ex.id || null, title: $('#e_t').value.trim(), kind: ex.kind || kind, max: +$('#e_m').value, solution_url: $('#e_u').value.trim(), questions, parts: [] };
        if (isNew) { const sel = $('#e_g').value, opt = $('#e_g').selectedOptions[0];
          p.group_id = sel.startsWith('grade:') ? null : +sel; p.grade_id = sel.startsWith('grade:') ? +sel.slice(6) : +opt.dataset.grade; p.kind = kind; }
        if (!p.title) return ($('#eerr').textContent = 'اكتب اسم ال' + KN(p.kind) + '.');
        const miss = questions.map((q, i) => q.kind === 'mcq' && q.answer == null ? i + 1 : 0).filter(Boolean);
        if (miss.length) return ($('#eerr').textContent = 'اختار الإجابة الصح لسؤال ' + miss.join('، ') + '.');
        if (p.solution_url && !/^https:\/\//.test(p.solution_url)) return ($('#eerr').textContent = 'لينك الحل لازم يبدأ بـ https://');
        busy($('#ef button[type=submit]'), async () => { const r = await API.saveExam(p); close(); E.open = r.exam.id; E.stats = false; examSheet(ctx, E.open); });
      };
    });
  }

  // التصحيح: لكل طالب «حدد الغلط» ⇒ أرقام الأسئلة ⇒ الدرجة بتتحسب لوحدها، وبيظهر الصح من النموذج (وتقدر تختار هو جاوب إيه)
  async function examSheet(ctx, id) {
    const d = await API.examSheet(id), ex = d.exam, editable = ctx.can('grades'), qs = ex.questions || [];
    const scored = d.rows.filter(r => r.score != null);
    const avg = scored.length ? (scored.reduce((s, r) => s + +r.score, 0) / scored.length).toFixed(1) : '—';
    const per = qs.length ? ex.max / qs.length : 0;
    const ansTxt = q => q.kind === 'mcq' ? (q.answer != null ? LET[+q.answer] + ((q.choices || [])[+q.answer] ? ') ' + q.choices[+q.answer] : '') : '—') : (q.answer || '—');
    const sumTxt = wq => !wq.length ? '<span class="ok-t">' + icon('check', 'sm') + 'مفيش أخطاء</span>' : 'غلط في: ' + wq.map(n => 'س' + n).join('، ');
    const wrongList = (wq, picks) => wq.map(n => { const q = qs.find(x => x.n === n); if (!q) return '';
      return '<div class="wl" data-pq="' + n + '"><b>س' + n + '</b> <span class="tiny">الصح:</span> <mark>' + esc(ansTxt(q)) + '</mark>' +
        (q.kind === 'mcq' ? ' <span class="tiny">هو جاوب:</span>' + LET.slice(0, 4).map((L, k) => k === +q.answer ? '' : '<button type="button" class="chip xs' + (picks[n] != null && +picks[n] === k ? ' on' : '') + '" data-pk="' + k + '">' + L + '</button>').join('') : '') +
        (q.explain ? '<div class="tiny why">' + esc(q.explain) + '</div>' : '') + '</div>'; }).join('');
    const rowHtml = r => { const wq = r.wrong_q || [];
      return '<li data-sid="' + r.id + '" data-name="' + esc(r.name) + '" class="' + (r.score != null ? 'done' : '') + '">' +
        '<div class="grow"><button class="plain-btn name-btn" data-act="studentOpen" data-id="' + r.id + '"><b>' + esc(r.name) + '</b></button><span class="tiny num"> · ' + r.code + '</span>' +
        (qs.length ? '<div class="tiny wsum">' + (r.score != null ? sumTxt(wq) : 'لسه ماتصححش') + '</div>' : '') + '</div>' +
        (qs.length && editable ? '<button type="button" class="btn btn-line btn-sm" data-mk="1">' + icon('pen', 'sm') + 'حدد الغلط</button>' : '') +
        '<input class="inp score" type="number" step="0.5" min="0" max="' + ex.max + '" inputmode="decimal" value="' + (r.score != null ? +r.score : '') + '"' + (editable ? '' : ' disabled') + ' aria-label="درجة ' + esc(r.name) + '" placeholder="الدرجة">' +
        '<span class="saved" aria-hidden="true">' + icon('check', 'sm') + '</span>' +
        (qs.length ? '<div class="mark" hidden><p class="tiny" style="margin:0">دوس على الأسئلة اللي <b>غلط</b> فيها (تبقى حمرا). لو كله صح دوس «كله صح».</p>' +
          '<div class="chips wrong-chips">' + qs.map(q => '<button type="button" class="chip sm qn' + (wq.includes(q.n) ? ' bad' : '') + '" data-qn="' + q.n + '" aria-label="سؤال ' + q.n + ' غلط">' + q.n + '</button>').join('') + '</div>' +
          '<div class="wlist">' + wrongList(wq, r.picks || {}) + '</div>' +
          '<div class="row-btns"><button type="button" class="btn btn-ghost btn-sm" data-allok="1">' + icon('check', 'sm') + 'كله صح</button><button type="button" class="btn btn-ink btn-sm" data-mkdone="1">تمام · الطالب اللي بعده</button></div></div>' : '') + '</li>'; };
    main().innerHTML = '<div class="head"><div><button class="linkish" data-sh="back">← كل الكويزات</button><h1>' + esc(ex.title) + '</h1>' +
      '<div class="tiny">' + num(scored.length) + ' من ' + num(d.rows.length) + ' اتصححوا · متوسط ' + avg + ' من ' + ex.max + (qs.length ? ' · ' + qs.length + ' سؤال' : '') + (ex.solution_url ? ' · <a href="' + esc(ex.solution_url) + '" target="_blank" rel="noopener">لينك الحل</a>' : '') + '</div></div>' +
      '<div class="head-btns"><button class="btn btn-line" data-sh="stats">' + icon('chart') + 'الإحصائية</button>' +
      (editable ? '<button class="btn btn-line" data-sh="paste">' + icon('sheet') + 'الدرجات من شيت</button>' : '') +
      (editable && scored.length ? '<button class="btn btn-ink" data-sh="publish">' + icon('send') + (ex.results_sent_at ? 'ابعت النتيجة تاني' : 'ابعت النتيجة والترتيب') + '</button>' : '') + (editable ? '<button class="btn btn-ghost" data-sh="edit">' + icon('pen') + 'عدّل النموذج</button>' : '') + '</div></div>' +
      (qs.length ? '<ol class="how-steps"><li>دوس <b>«حدد الغلط»</b> جنب الطالب.</li><li>دوس أرقام الأسئلة اللي غلط فيها ⇒ الدرجة بتتحسب لوحدها وبيظهر الصح من النموذج.</li><li>اختياري: اختار هو جاوب إيه. كل حاجة بتتحفظ لوحدها، والطالب بيشوفها في التطبيق على طول.</li></ol>'
        : '<div class="surface lock-hint">' + icon('pen') + '<div><b>مفيش نموذج إجابة للكويز ده.</b><div class="tiny">تقدر تكتب الدرجة بس. عشان تحدد الطالب غلط في أنهي سؤال ويوصله الصح، دوس «عدّل النموذج» وحط عدد الأسئلة والإجابات.</div></div></div>') +
      '<div class="search" style="margin:var(--s3) 0">' + icon('search') + '<input class="inp" id="shq" placeholder="دوّر على طالب" aria-label="دوّر على طالب"></div>' +
      '<ul class="list sheet-list" id="shl">' + d.rows.map(rowHtml).join('') + '</ul>' + credit();
    const picksOf = li => { const p = {}; $$('[data-pq]', li).forEach(pr => { const on = $('.on', pr); if (on) p[pr.dataset.pq] = +on.dataset.pk; }); return p; };
    const wqOf = li => $$('.qn.bad', li).map(c => +c.dataset.qn);
    const save = async li => {
      const v = $('.score', li).value; if (v === '') return;
      const p = { score: +v, wrong: [], wrong_q: wqOf(li), picks: picksOf(li) };
      try { await API.saveScore(ex.id, +li.dataset.sid, p); li.classList.add('done', 'flash'); setTimeout(() => li.classList.remove('flash'), 600);
        const s = $('.wsum', li); if (s) s.innerHTML = sumTxt(p.wrong_q); }
      catch (e) { toast(e.message, 'err'); }
    };
    // الدرجة = النهائية − (عدد الغلط × درجة السؤال)، وتقدر تغيّرها بإيدك
    const autoScore = li => { if (!per) return; const inp = $('.score', li);
      inp.value = Math.max(0, Math.round((ex.max - wqOf(li).length * per) * 2) / 2); };
    const openMark = li => { $$('#shl .mark').forEach(m => { if (m.closest('li') !== li) m.hidden = true; }); $('.mark', li).hidden = false; li.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
    $('#shq').oninput = () => { const q = $('#shq').value.trim(); $$('#shl > li').forEach(li => { li.hidden = q && !li.dataset.name.includes(q); }); };
    $('#shl').addEventListener('keydown', e => {
      if (e.key !== 'Enter' || !e.target.matches('.score')) return;
      e.preventDefault(); const li = e.target.closest('li'); save(li);
      let n = li.nextElementSibling; while (n && n.hidden) n = n.nextElementSibling; if (n) $('.score', n).focus();
    });
    $('#shl').addEventListener('change', e => { if (e.target.matches('.score')) save(e.target.closest('li')); });
    main().onclick = e => {
      if (e.target.closest('[data-sh=back]')) { E.open = null; return exams(ctx); }
      if (e.target.closest('[data-sh=stats]')) { E.stats = true; return examStats(ctx, id); }
      if (e.target.closest('[data-sh=edit]')) return examForm(ctx, ex);
      const pb = e.target.closest('[data-sh=publish]');
      if (pb) return sheet('<h2>ابعت النتيجة والترتيب</h2><p class="muted" style="margin-top:0">كل طالب من الـ ' + num(scored.length) + ' (وولي أمره) هيوصله: درجته، ترتيبه من كام، متوسط الكل' + (ex.solution_url ? '، ولينك الحل' : '') + '.</p>' +
        '<p class="tiny">الدرجة نفسها ظاهرة في تطبيق الطالب من ساعة ما اتسجلت. الزرار ده بيبعت النتيجة كاملة بالترتيب.</p>' +
        '<div class="actions"><button class="btn btn-line" data-pub="app">في التطبيق بس</button><button class="btn btn-green" data-pub="wa">' + icon('wa') + 'في التطبيق + واتساب</button></div>', box => {
        box.onclick = e2 => { const b = e2.target.closest('[data-pub]'); if (!b) return;
          busy(b, async () => { const r = await API.examPublish(ex.id, b.dataset.pub === 'wa'); close(); ex.results_sent_at = new Date().toISOString();
            toast('اتبعتت النتيجة لـ ' + num(r.sent) + ' طالب' + (b.dataset.pub === 'wa' ? ' — الواتساب في طابور الرسايل' : '')); }); };
      });
      if (e.target.closest('[data-sh=paste]')) return Importer.scores({ rows: d.rows, max: ex.max, onDone: () => examSheet(ctx, id),
        save: (r, score) => API.saveScore(ex.id, r.id, { score, wrong: r.wrong || [], wrong_q: r.wrong_q || [], picks: r.picks || {} }) });
      const li = e.target.closest('#shl > li'); if (!li) return;
      if (e.target.closest('[data-mk]')) return openMark(li);
      if (e.target.closest('[data-allok]')) { $$('.qn.bad', li).forEach(c => c.classList.remove('bad')); $('.wlist', li).innerHTML = ''; autoScore(li); save(li); return; }
      if (e.target.closest('[data-mkdone]')) {
        $('.mark', li).hidden = true; let n = li.nextElementSibling; while (n && n.hidden) n = n.nextElementSibling;
        if (n) openMark(n); return;
      }
      const qb = e.target.closest('.qn'); if (qb) {
        qb.classList.toggle('bad');
        $('.wlist', li).innerHTML = wrongList(wqOf(li), picksOf(li));
        autoScore(li); save(li); return;
      }
      const pk = e.target.closest('[data-pk]'); if (pk) { const on = !pk.classList.contains('on'); $$('[data-pk]', pk.parentNode).forEach(x => x.classList.remove('on')); if (on) pk.classList.add('on'); save(li); }
    };
  }

  // الإحصائية: كل سؤال اتغلط فيه كام % والطلاب اختاروا إيه + الأوائل + بوست جاهز
  async function examStats(ctx, id) {
    const [s, d] = await Promise.all([API.examStats(id), API.examSheet(id)]), ex = d.exam;
    const pct = n => s.scored ? Math.round(n / s.scored * 100) : 0;
    const post = '🏆 أوائل ' + ex.title + '\n' + s.top.slice(0, 5).map((t, i) => (i + 1) + '. ' + t.name.split(' ').slice(0, 3).join(' ') + ' — ' + (+t.score) + ' من ' + s.max).join('\n') +
      '\n\nبرافو عليكم 👏' + (ex.solution_url ? '\nفيديو الحل: ' + ex.solution_url : '') + '\n#' + String(ctx.me.config.system_name || '').replace(/\s+/g, '_');
    main().innerHTML = '<div class="head"><div><button class="linkish" data-st="back">← الدرجات</button><h1>إحصائية «' + esc(ex.title) + '»</h1></div></div>' +
      '<div class="stats"><div class="stat"><span class="muted">اتصحّح</span><b>' + num(s.scored) + '</b></div><div class="stat"><span class="muted">المتوسط</span><b>' + (s.avg ?? '—') + ' / ' + s.max + '</b></div>' +
      '<div class="stat"><span class="muted">الدرجة النهائية</span><b>' + num(s.full) + '</b><span class="tiny">طالب</span></div><div class="stat"><span class="muted">أقل من النص</span><b>' + num(s.below_half) + '</b><span class="tiny">طالب</span></div></div>' +
      (s.questions.length ? '<section class="sec"><h2>كل سؤال</h2><ul class="list qstats">' + s.questions.map(q => {
        const w = pct(q.wrong), picks = q.picks || {}, tot = Object.values(picks).reduce((a, b) => a + b, 0);
        return '<li class="col"><div class="row-top"><b>سؤال ' + q.n + '</b><span class="tiny grow">' + esc((q.text || '').slice(0, 80)) + '</span><b class="num ' + (w >= 50 ? 'bad-t' : '') + '">' + w + '% غلط</b></div>' +
          '<span class="bar ' + (w >= 50 ? 'r' : w >= 25 ? 'a' : 'g') + '" style="--w:' + w + '%"></span>' +
          (q.kind === 'mcq' && tot ? '<div class="tiny">اللي غلطوا اختاروا: ' + (q.choices || []).map((c, k) => picks[k] ? LET[k] + ' ' + Math.round(picks[k] / tot * 100) + '%' + (c ? ' (' + esc(c.slice(0, 20)) + ')' : '') : '').filter(Boolean).join(' · ') +
            (q.answer != null ? ' — الصح ' + LET[+q.answer] : '') + '</div>' : '') + '</li>'; }).join('') + '</ul></section>' : '<p class="muted">ضيف أسئلة للكويز (من «عدّل») عشان تشوف إحصائية كل سؤال.</p>') +
      (s.parts.length ? '<section class="sec"><h2>الأجزاء اللي اتغلط فيها</h2>' + s.parts.map(p => '<div class="bar-row"><span>' + esc(p.part) + '</span><span class="bar r" style="--w:' + pct(p.c) + '%"></span><b class="num">' + pct(p.c) + '%</b></div>').join('') + '</section>' : '') +
      '<section class="sec"><h2>الأوائل</h2><ol class="list top-list">' + s.top.map((t, i) => '<li><span class="rank">' + (i + 1) + '</span><div class="grow">' + esc(t.name) + '</div><b class="num">' + (+t.score) + ' / ' + s.max + '</b></li>').join('') + '</ol>' +
      (ctx.lvl('facebook') >= 2 ? '<h3 class="mini-h" style="margin-top:var(--s4)">بوست جاهز للفيسبوك</h3><textarea class="inp" id="pst" rows="8">' + esc(post) + '</textarea>' +
        '<div class="row-btns" style="justify-content:flex-start;margin-top:var(--s2)"><button class="btn btn-ink" data-st="copy">انسخ</button>' + (navigator.share ? '<button class="btn btn-line" data-st="share">' + icon('send') + 'شارك</button>' : '') + '</div>' +
        '<p class="tiny">اتأكد إن أولياء الأمور موافقين على نشر الأسامي.</p>' : '') + '</section>' + credit();
    main().onclick = async e => {
      const b = e.target.closest('[data-st]'); if (!b) return;
      if (b.dataset.st === 'back') { E.stats = false; return examSheet(ctx, id); }
      if (b.dataset.st === 'copy') { await navigator.clipboard.writeText($('#pst').value).catch(() => { }); toast('اتنسخ'); }
      if (b.dataset.st === 'share') navigator.share({ text: $('#pst').value }).catch(() => { });
    };
  }

  // ═════════ الرسايل وواتساب ═════════
  const W = { tab: 'queue', kind: null, to: '' };
  const waTargets = r => { const who = W.to || r.to_role;
    return who === 'both' ? [['parent', r.parent_phone], ['student', r.phone]] : [[who, who === 'parent' ? r.parent_phone : r.phone]]; };
  const SEGN = { '': 'كلهم', top: 'الأوائل بس', up: 'اللي مستواهم بيزيد', down: 'اللي مستواهم بيقل', low: 'اللي درجاتهم ضعيفة', absent: 'اللي غابوا آخر حصة', no_balance: 'اللي رصيدهم خلص' };

  // «ابعت الكل»: رسالة ورا رسالة — بيفتح واتساب، ولما المساعد يرجع للصفحة بيتعلّم «اتبعتت» ويفتح اللي بعدها
  function waRunner(ctx) {
    const jobs = []; W.rows.forEach(r => waTargets(r).forEach(([who, ph]) => jobs.push({ r, who, ph })));
    let i = 0, opened = false;
    const sent = new Set();
    sheet('<div id="wr"></div>', box => {
      const draw = () => {
        if (i >= jobs.length) { $('#wr', box).innerHTML = '<h2>' + icon('check') + ' خلصت ' + num(jobs.length) + ' رسالة</h2><div class="actions"><button class="btn btn-ink" data-wr="close">تمام</button></div>'; return; }
        const j = jobs[i];
        $('#wr', box).innerHTML = '<h2>رسالة ' + (i + 1) + ' من ' + jobs.length + '</h2><div class="prog"><span style="--w:' + Math.round(i / jobs.length * 100) + '%"></span></div>' +
          '<p><b>' + esc(j.r.name) + '</b> · ' + (j.who === 'parent' ? 'ولي الأمر' : 'الطالب') + ' <span class="num" dir="ltr">' + esc(j.ph) + '</span></p><div class="msg-prev">' + esc(j.r.body) + '</div>' +
          '<div class="actions"><button class="btn btn-ghost" data-wr="skip">فوّتها</button><a class="btn btn-green btn-lg" data-wr="go" target="_blank" rel="noopener" href="https://wa.me/' + waPhone(j.ph) + '?text=' + encodeURIComponent(j.r.body) + '">' + icon('wa') + 'افتح واتساب وابعت</a></div>' +
          '<p class="tiny">بعد ما تبعت في واتساب ارجع هنا، والرسالة اللي بعدها هتجهز لوحدها.</p>';
      };
      const next = async ok => {
        const j = jobs[i]; if (!j) return;
        if (ok) sent.add(j.r.id);
        i++; opened = false;
        // آخر رقم للرسالة دي ⇒ لو اتبعتت لحد فيهم تختفي من الطابور
        if ((!jobs[i] || jobs[i].r.id !== j.r.id) && sent.has(j.r.id)) API.waMark([j.r.id]).catch(() => { });
        draw();
      };
      const back = () => { if (opened && document.visibilityState === 'visible') setTimeout(() => next(true), 400); };
      document.addEventListener('visibilitychange', back); window.addEventListener('focus', back);
      box.onclick = e => {
        const b = e.target.closest('[data-wr]'); if (!b) return;
        if (b.dataset.wr === 'go') opened = true;
        if (b.dataset.wr === 'skip') next(false);
        if (b.dataset.wr === 'close') { close(); messages(ctx); }
      };
      const obs = new MutationObserver(() => { if (!document.body.contains(box)) { document.removeEventListener('visibilitychange', back); window.removeEventListener('focus', back); obs.disconnect(); } });
      obs.observe(document.body, { childList: true, subtree: true });
      draw();
    });
  }
  async function messages(ctx) {
    const ns = await API.notifySettings(), waLv = ns.wa_level, kinds = ns.kinds;
    const t = [['queue', 'واتساب'], ['new', 'رسالة جديدة'], ['posts', 'بوستات ثابتة']].concat(ns.can_edit ? [['auto', 'الإشعارات الأوتوماتيك']] : []);
    const pre = window.MSG_PRESET; window.MSG_PRESET = null;
    if (pre) W.tab = 'new';
    if (waLv < 2 && W.tab === 'queue') W.tab = 'new';
    let h = '<div class="head"><h1>الرسايل</h1></div>' + tabs(waLv < 2 ? t.filter(x => x[0] !== 'queue') : t, W.tab, 'wt');
    if (W.tab === 'queue') {
      const q = await API.waQueue(W.kind); W.rows = q.rows;
      h += '<p class="muted" style="margin-top:0">كل زرار بيفتح واتساب والرسالة مكتوبة جاهزة. بعد ما تبعت، السطر بيختفي.</p>' +
        '<div class="surface wa-bar"><div class="field" style="margin:0"><span class="lbl">ابعت لـ</span><div class="seg">' +
        [['', 'زي كل رسالة'], ['parent', 'ولي الأمر'], ['student', 'الطالب'], ['both', 'الاتنين']].map(([v, n]) => '<button type="button" data-wto="' + v + '" class="' + ((W.to || '') === v ? 'on' : '') + '">' + n + '</button>').join('') + '</div></div>' +
        (q.rows.length ? '<button class="btn btn-green" data-wall="1">' + icon('wa') + 'ابعت الكل (' + num(q.rows.length) + ') ورا بعض</button>' : '') +
        '<p class="tiny" style="margin:0">«ابعت الكل»: بيفتح واتساب لأول رسالة، ولما ترجع بيفتح اللي بعدها لوحده. واتساب مش بيسمح يتبعت كذا رسالة مرة واحدة من موبايل عادي. ' +
        (waLv >= 3 ? 'الإرسال الأوتوماتيك من غير ما تدوس خالص بيشتغل من «الإشعارات الأوتوماتيك» أول ما نربط رقم واتساب بيزنس.' : 'الإرسال الأوتوماتيك من غير ما تدوس خالص في باقة أعلى.') + '</p></div>' +
        '<div class="chips" style="margin-bottom:var(--s3)"><button class="chip' + (!W.kind ? ' on' : '') + '" data-wk="">الكل</button>' +
        Object.entries(q.counts).map(([k, n]) => '<button class="chip' + (W.kind === k ? ' on' : '') + '" data-wk="' + k + '">' + esc((kinds[k] || {}).label || k) + ' · ' + n + '</button>').join('') + '</div>' +
        (q.rows.length ? '<ul class="list">' + q.rows.map(r => {
          const tos = waTargets(r);
          return '<li class="col" data-nid="' + r.id + '"><div class="row-top"><div class="grow"><b>' + esc(r.name) + '</b> <span class="tiny">' + esc((kinds[r.kind] || {}).label || '') + (r.wa === 'queued' ? ' · أوتوماتيك' : '') + '</span></div><span class="tiny">' + ago(r.at) + '</span></div>' +
            '<div class="msg-prev">' + esc(r.body) + '</div><div class="row-btns">' + tos.map(([who, ph]) =>
              '<a class="btn btn-green btn-sm" target="_blank" rel="noopener" data-wa="' + r.id + '" href="https://wa.me/' + waPhone(ph) + '?text=' + encodeURIComponent(r.body) + '">' + icon('wa') + (who === 'parent' ? 'ولي الأمر' : 'الطالب') + '</a>').join('') + '</div></li>';
        }).join('') + '</ul>' : '<div class="surface empty">' + icon('check') + '<div>مفيش رسايل مستنية.</div></div>');
    }
    if (W.tab === 'new') {
      const g = await API.groups(), grades = await API.grades();
      const pv = pre && pre.id ? pre.target + ':' + pre.id : 'all:';
      h += '<form id="mf" class="surface" novalidate><div class="row2"><div class="field"><label for="m_t">من أنهي طلاب؟</label><select class="inp" id="m_t"><option value="all:">كل الطلاب</option>' +
        grades.map(x => '<option value="grade:' + x.id + '"' + ('grade:' + x.id === pv ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + g.groups.map(x => '<option value="group:' + x.id + '"' + ('group:' + x.id === pv ? ' selected' : '') + '>مجموعة ' + esc(x.name) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="m_s">مين بالظبط؟</label><select class="inp" id="m_s">' + Object.entries(SEGN).filter(([k]) => k !== 'no_balance' || ctx.lvl('pay') >= 2)
          .map(([k, n]) => '<option value="' + k + '"' + (pre && pre.seg === k ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div></div>' +
        '<div class="field"><span class="lbl">تتبعت لـ</span><div class="seg" id="m_w">' + [['both', 'الطالب وولي الأمر'], ['parent', 'ولي الأمر بس'], ['student', 'الطالب بس']]
          .map(([v, n], i) => '<button type="button" data-mw="' + v + '" class="' + (i === 0 ? 'on' : '') + '">' + n + '</button>').join('') + '</div></div>' +
        '<div class="field"><label for="m_b">الرسالة</label><textarea class="inp" id="m_b" rows="4" placeholder="مثلاً: برافو يا {الاسم}، مستواك في آخر كويز علي جداً 👏"></textarea>' +
        '<span class="hint">{الاسم} بيتبدل باسم كل طالب.</span></div>' +
        '<p class="tiny"><b id="m_n">…</b> · بتظهر في بوابة الطالب وولي الأمر' + (waLv >= 2 ? '، وبتنزل في طابور الواتساب (تتبعت بزرار أو كلها ورا بعض).' : '.') + '</p>' +
        '<div class="actions"><button class="btn btn-ink" type="submit">' + icon('send') + 'ابعت</button></div></form>';
    }
    // البوست الثابت: غير الرسايل — بيفضل فوق في صفحة الطالب أول ما يدخل لحد ما المستر يشيله أو ييجي تاريخ نهايته
    if (W.tab === 'posts') {
      const [ps, g, grades] = await Promise.all([API.posts(), API.groups(), API.grades()]);
      h += '<p class="muted" style="margin-top:0">البوست بيفضل ظاهر فوق في الصفحة الرئيسية للطالب وولي الأمر أول ما يدخلوا (مش بيضيع وسط الرسايل). مناسب للمواعيد والتنبيهات المهمة والتهنئة.</p>' +
        '<form id="pf" class="surface" novalidate><div class="row2"><div class="field"><label for="p_t">لمين؟</label><select class="inp" id="p_t"><option value="all:">كل الطلاب</option>' +
        grades.map(x => '<option value="grade:' + x.id + '">' + esc(x.name) + '</option>').join('') + g.groups.map(x => '<option value="group:' + x.id + '">مجموعة ' + esc(x.name) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="p_u">يختفي بعد (اختياري)</label><input class="inp" id="p_u" type="date"></div></div>' +
        '<div class="field"><label for="p_b">البوست</label><textarea class="inp" id="p_b" rows="4" maxlength="2000" placeholder="مثلاً: مراجعة ليلة الامتحان يوم الخميس الساعة 7 في القاعة الكبيرة 📚"></textarea></div>' +
        '<div class="actions"><button class="btn btn-ink" type="submit">' + icon('send') + 'انشر للطلاب</button></div></form>' +
        '<h2 class="grade-h">المنشور دلوقتي</h2>' + (ps.length ? '<ul class="list">' + ps.map(p => '<li class="col"><div class="row-top"><div class="grow"><b>' + esc(p.to) + '</b> <span class="tiny">' + esc(p.by || '') + ' · ' + ago(p.at) +
          (p.until ? ' · لحد ' + p.until : '') + '</span></div><button class="btn btn-ghost btn-sm" data-pdel="' + p.id + '" aria-label="شيل البوست">' + icon('archive') + 'شيله</button></div>' +
          '<div class="msg-prev">' + esc(p.body) + '</div></li>').join('') + '</ul>' : '<div class="surface empty">' + icon('send') + '<div>مفيش بوستات منشورة.</div></div>');
    }
    if (W.tab === 'auto') {
      h += '<p class="muted" style="margin-top:0">لكل نوع: أوتوماتيك (بيتبعت لوحده)، بزرار (بينزل في طابور الواتساب وانت تبعته)، أو مقفول. الإشعار بيظهر في البوابة في الحالتين الأولانيين.</p>' +
        Object.entries(kinds).map(([k, v]) => '<form class="feat notify-f" data-kind="' + k + '"><h3>' + esc(v.label) + '</h3>' +
          '<div class="row2"><div class="field"><label>الطريقة</label><select class="inp" name="mode">' + [['auto', 'أوتوماتيك'], ['button', 'بزرار'], ['off', 'مقفول']].map(([m, n]) => '<option value="' + m + '"' + (v.mode === m ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div>' +
          '<div class="field"><label>لمين</label><select class="inp" name="to">' + [['parent', 'ولي الأمر'], ['student', 'الطالب'], ['both', 'الاتنين']].map(([m, n]) => '<option value="' + m + '"' + (v.to === m ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div></div>' +
          '<div class="field"><label>نص الرسالة</label><textarea class="inp" name="tpl" rows="2">' + esc(v.tpl) + '</textarea><span class="hint">{الاسم} {الرصيد} {التفاصيل} بيتبدلوا لوحدهم.</span></div>' +
          '<button class="btn btn-line btn-sm" type="submit">احفظ</button></form>').join('');
    }
    main().innerHTML = h + credit();
    main().onclick = async e => {
      const tb = e.target.closest('[data-wt]'); if (tb) { W.tab = tb.dataset.wt; return messages(ctx); }
      const k = e.target.closest('[data-wk]'); if (k) { W.kind = k.dataset.wk || null; return messages(ctx); }
      const wto = e.target.closest('[data-wto]'); if (wto) { W.to = wto.dataset.wto; return messages(ctx); }
      if (e.target.closest('[data-wall]')) return waRunner(ctx);
      const pd = e.target.closest('[data-pdel]');
      if (pd) { if (!confirm('تشيل البوست ده من عند الطلاب؟')) return; return busy(pd, async () => { await API.savePost({ id: +pd.dataset.pdel, remove: true }); toast('اتشال'); messages(ctx); }); }
      const wa = e.target.closest('[data-wa]');
      if (wa) { const li = wa.closest('li'); setTimeout(async () => { await API.waMark([+wa.dataset.wa]).catch(() => { }); li.classList.add('gone'); setTimeout(() => li.remove(), 300); }, 400); }
    };
    if (W.tab === 'new') {
      let to = 'both';
      const scope = () => { const [target, id] = $('#m_t').value.split(':'); return { target, id: id ? +id : null, seg: $('#m_s').value }; };
      const count = async () => { $('#m_n').textContent = '…'; const n = await API.messageCount(scope()).catch(() => null); if ($('#m_n')) $('#m_n').textContent = n == null ? '' : 'هتوصل لـ ' + num(n) + ' طالب'; };
      $('#m_t').onchange = $('#m_s').onchange = count; count();
      $$('[data-mw]').forEach(b => { b.onclick = () => { to = b.dataset.mw; $$('[data-mw]').forEach(x => x.classList.toggle('on', x === b)); }; });
      $('#mf').onsubmit = e => {
        e.preventDefault();
        busy($('#mf button[type=submit]'), async () => { const r = await API.sendMessage({ ...scope(), to, body: $('#m_b').value }); toast('اتبعتت لـ ' + r.sent + ' طالب'); $('#m_b').value = ''; });
      };
    }
    if (W.tab === 'posts') $('#pf').onsubmit = e => {
      e.preventDefault();
      const [target, id] = $('#p_t').value.split(':');
      if (!$('#p_b').value.trim()) return toast('اكتب البوست الأول', 'err');
      busy($('#pf button'), async () => {
        await API.savePost({ body: $('#p_b').value, grade_id: target === 'grade' ? +id : null, group_id: target === 'group' ? +id : null, until: $('#p_u').value });
        toast('اتنشر — هيظهر فوق عند الطلاب'); messages(ctx);
      });
    };
    $$('.notify-f').forEach(f => f.onsubmit = e => {
      e.preventDefault();
      const fd = new FormData(f);
      busy($('button', f), async () => { await API.saveSettings({ notify: { ...(await API.settings()).notify, [f.dataset.kind]: { mode: fd.get('mode'), to: fd.get('to'), tpl: fd.get('tpl') } } }); toast('اتحفظ'); });
    });
  }

  // ═════════ التفاعل: بنك الأسئلة + المسابقات + الأوائل ═════════
  const B = { tab: 'bank', grade: null };
  async function engage(ctx) {
    const t = [['bank', 'بنك الأسئلة'], ['contests', 'المسابقات'], ['top', 'الأوائل']];
    let h = '<div class="head"><h1>التفاعل</h1></div>' + tabs(t, B.tab, 'bt');
    if (B.tab === 'bank') {
      if (ctx.lvl('engage') < 2) h += lockBox('بنك الأسئلة وسؤال اليوم والترتيب مش في باقتك.');
      else {
        const grades = await API.grades(); B.grade = B.grade || grades[grades.length - 1].id;
        const [data, gl] = await Promise.all([API.questions(B.grade), API.groups()]);
        B.groups = gl.groups.filter(g => g.grade_id === B.grade);
        if (B.bgrp && !B.groups.some(g => g.id === B.bgrp)) B.bgrp = null;
        const gname = id => (B.groups.find(g => g.id === id) || {}).name || '';
        const qs = data.rows.filter(q => !B.bgrp || !q.group_ids.length || q.group_ids.includes(B.bgrp));
        const units = [...new Set(qs.map(q => q.unit))], lessons = [...new Set(qs.map(q => q.lesson).filter(Boolean))];
        const today = iso(new Date()), upcoming = data.upcoming || [];
        h += '<div class="head-btns" style="margin-bottom:var(--s3)"><div class="chips">' + grades.map(g => '<button class="chip' + (g.id === B.grade ? ' on' : '') + '" data-bg="' + g.id + '">' + esc(g.name) + '</button>').join('') + '</div>' +
          '<button class="btn btn-ink" data-q="new">' + icon('plus') + 'سؤال جديد</button></div>' +
          (B.groups.length > 1 ? '<div class="chips grp-filter"><span class="tiny">اعرض أسئلة:</span><button class="chip' + (!B.bgrp ? ' on' : '') + '" data-bgrp="">كل المجموعات</button>' +
            B.groups.map(g => '<button class="chip' + (g.id === B.bgrp ? ' on' : '') + '" data-bgrp="' + g.id + '">' + esc(g.name) + '</button>').join('') + '</div>' : '') +
          '<div class="surface lesson-box"><div><b>الدرس الحالي</b><div class="tiny">الطالب بيشوف «حل على درس النهارده»، وسؤال اليوم بيتختار منه لو مش محدد.</div></div>' +
          '<div class="inline-form"><input class="inp" id="cur_l" list="lessons" value="' + esc(data.current || '') + '" placeholder="اسم الدرس"><datalist id="lessons">' + lessons.map(l => '<option value="' + esc(l) + '">').join('') + '</datalist>' +
          '<button class="btn btn-line" data-lesson="1">ثبّت</button></div></div>' +
          (upcoming.length ? '<p class="tiny">أسئلة اليوم المحددة: ' + upcoming.map(u => (u.day === today ? 'النهارده' : u.day) + ' ← «' + esc(((qs.find(q => q.id === u.id) || {}).body || '').slice(0, 40)) + '»').join(' · ') + '</p>' : '') +
          '<p class="muted">' + num(qs.length) + ' سؤال. الأسئلة والإجابات بتظهر بس للمستر واللي معاه صلاحية «بنك الأسئلة»، والطالب بيشوف السؤال من غير إجابته لحد ما يجاوب.</p>' +
          (units.length ? units.map(u => '<h2 class="grade-h">' + esc(u) + '</h2><ul class="list">' + qs.filter(q => q.unit === u).map(q =>
            '<li class="tap" data-q="edit" data-id="' + q.id + '"><div class="grow"><b>' + esc(q.body) + '</b><div class="tiny">' +
            (q.group_ids.length ? '<span class="tag">' + icon('groups') + q.group_ids.map(gname).filter(Boolean).map(esc).join('، ') + '</span> ' : '') +
            (q.lesson ? 'درس ' + esc(q.lesson) + ' · ' : '') + 'الصح: ' + esc(q.choices[q.answer]) +
            (q.solved ? ' · حلّه ' + q.solved + ' (' + Math.round(q.right / q.solved * 100) + '% صح)' : '') + (q.daily ? ' · سؤال يوم ' + (q.daily === today ? 'النهارده' : q.daily) : '') + '</div></div></li>').join('') + '</ul>').join('')
            : '<div class="surface empty">' + icon('book') + '<div>لسه مفيش أسئلة للصف ده.</div></div>');
        B.qs = qs;
      }
    }
    if (B.tab === 'contests') {
      if (ctx.lvl('engage') < 3) h += lockBox('المسابقات بين المجموعات والتحديات بين الطلاب مش في باقتك.');
      else {
        const cs = await API.contests();
        h += (ctx.isTeacher() ? '<button class="btn btn-ink" data-c="new" style="margin-bottom:var(--s3)">' + icon('plus') + 'مسابقة جديدة</button>' : '') +
          '<p class="muted" style="margin-top:0">المجموعة بتكسب بمتوسط نقط طلابها (بنك الأسئلة + سؤال اليوم) في فترة المسابقة. الطلاب بيشوفوا الترتيب في البوابة.</p>' +
          (cs.length ? cs.map(c => { const top = Math.max(1, ...c.standings.map(s => +s.avg)); return '<div class="feat"><h3>' + esc(c.title) + '</h3><div class="tiny" style="margin:-8px 0 var(--s3)">' + c.starts + ' ← ' + c.ends + '</div>' +
            c.standings.map((s, i) => '<div class="bar-row"><span>' + (i === 0 ? '🏆 ' : '') + esc(s.name) + '</span><span class="bar g" style="--w:' + Math.round(s.avg / top * 100) + '%"></span><b class="num">' + s.avg + '</b></div>').join('') + '</div>'; }).join('')
            : '<div class="surface empty">' + icon('trophy') + '<div>لسه مفيش مسابقات.</div></div>');
      }
    }
    if (B.tab === 'top') {
      const g = await API.groups();
      B.tg = B.tg || (g.groups[0] && g.groups[0].id); B.by = B.by || 'avg';
      const lb = await API.leaderboard(B.tg, B.by);
      h += '<div class="row2"><select class="inp" id="tg">' + g.groups.map(x => '<option value="' + x.id + '"' + (x.id === B.tg ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select>' +
        '<select class="inp" id="tb"><option value="avg"' + (B.by === 'avg' ? ' selected' : '') + '>بالدرجات</option><option value="xp"' + (B.by === 'xp' ? ' selected' : '') + '>بنقط التفاعل</option></select></div>' +
        '<ol class="list top-list">' + lb.map((s, i) => '<li><span class="rank">' + (i + 1) + '</span><div class="grow">' + (s.id ? '<button class="plain-btn name-btn" data-act="studentOpen" data-id="' + s.id + '"><b>' + esc(s.name) + '</b></button>' : '<b>' + esc(s.name) + '</b>') + '</div><b class="num">' + (B.by === 'avg' ? (s.avg != null ? s.avg + '%' : '—') : s.xp + ' نقطة') + '</b></li>').join('') + '</ol>' +
        (ctx.lvl('facebook') >= 2 ? '<div class="actions"><button class="btn btn-line" data-top="img">' + icon('image') + 'صورة الأوائل</button><button class="btn btn-line" data-top="week">' + icon('send') + 'بوست الأسبوع</button><button class="btn btn-ink" data-top="post">' + icon('send') + 'بوست الشهر</button></div><div id="topimg"></div>' : lockBox('بوست الأوائل للفيسبوك مش في باقتك.'));
      B.lb = lb; B.gname = (g.groups.find(x => x.id === B.tg) || {}).name;
    }
    main().innerHTML = h + credit();
    main().onclick = e => {
      const tb = e.target.closest('[data-bt]'); if (tb) { B.tab = tb.dataset.bt; return engage(ctx); }
      const bg = e.target.closest('[data-bg]'); if (bg) { B.grade = +bg.dataset.bg; B.bgrp = null; return engage(ctx); }
      const bgr = e.target.closest('[data-bgrp]'); if (bgr) { B.bgrp = bgr.dataset.bgrp ? +bgr.dataset.bgrp : null; return engage(ctx); }
      const q = e.target.closest('[data-q]'); if (q) return questionForm(ctx, q.dataset.q === 'edit' ? B.qs.find(x => x.id === +q.dataset.id) : null);
      const ls = e.target.closest('[data-lesson]'); if (ls) return busy(ls, async () => { await API.setLesson(B.grade, $('#cur_l').value); toast('اتثبت الدرس الحالي'); });
      if (e.target.closest('[data-c=new]')) return contestForm(ctx);
      if (e.target.closest('[data-top=img]')) return topImage(ctx);
      const mp = e.target.closest('[data-top=post]'); if (mp) return busy(mp, () => monthPost(ctx));
      const wp = e.target.closest('[data-top=week]'); if (wp) return busy(wp, () => monthPost(ctx, true));
      if (e.target.closest('[data-top=copy]')) { navigator.clipboard.writeText($('#mpost').value).catch(() => { }); toast('اتنسخ'); }
    };
    if (B.tab === 'top') { $('#tg').onchange = () => { B.tg = +$('#tg').value; engage(ctx); }; $('#tb').onchange = () => { B.by = $('#tb').value; engage(ctx); }; }
  }

  function questionForm(ctx, q) {
    q = q || { unit: '', skill: '', body: '', choices: ['', '', '', ''], answer: 0, group_ids: B.bgrp ? [B.bgrp] : [] };
    const ch = q.choices.concat(['', '', '', '']).slice(0, 4);
    let gsel = (q.group_ids || []).slice();
    const gchips = () => '<button type="button" class="chip' + (!gsel.length ? ' on' : '') + '" data-qg="">كل مجموعات الصف</button>' +
      B.groups.map(g => '<button type="button" class="chip' + (gsel.includes(g.id) ? ' on' : '') + '" data-qg="' + g.id + '">' + esc(g.name) + '</button>').join('');
    sheet('<h2>' + (q.id ? 'تعديل سؤال' : 'سؤال جديد') + '</h2><form id="qf" novalidate>' +
      '<div class="field"><label for="q_b">السؤال</label><textarea class="inp" id="q_b" rows="2">' + esc(q.body) + '</textarea></div>' +
      '<div class="field"><span class="lbl">الاختيارات (دوس على الدايرة جنب الصح)</span>' + ch.map((c, i) =>
        '<label class="choice-in"><input type="radio" name="ans" value="' + i + '"' + (i === q.answer ? ' checked' : '') + ' aria-label="الاختيار ' + (i + 1) + ' هو الصح"><input class="inp" data-ch="' + i + '" value="' + esc(c) + '" placeholder="اختيار ' + (i + 1) + '"></label>').join('') + '</div>' +
      '<div class="row2"><div class="field"><label for="q_u">الوحدة</label><input class="inp" id="q_u" value="' + esc(q.unit) + '" placeholder="مثلاً: الكهربية"></div>' +
      '<div class="field"><label for="q_l">الدرس</label><input class="inp" id="q_l" value="' + esc(q.lesson || '') + '" placeholder="مثلاً: التوصيل على التوازي"></div></div>' +
      '<div class="row2"><div class="field"><label for="q_s">الجزء (زي أجزاء الكويز — لـ «أخطائي»)</label><input class="inp" id="q_s" value="' + esc(q.skill || '') + '" placeholder="مثلاً: التوازي"></div>' +
      '<div class="field"><label for="q_d">خليه سؤال يوم (اختياري)</label><input class="inp" id="q_d" type="date" value=""><span class="hint">سؤال مميز لكل طلاب الصف في اليوم ده.</span></div></div>' +
      (B.groups.length ? '<div class="field"><span class="lbl">السؤال ده لمين؟</span><div class="chips" id="qgl">' + gchips() + '</div>' +
        '<span class="hint">لو اخترت مجموعات، السؤال بيظهر لطلابها بس. سؤال اليوم بيوصل لطلاب المجموعات دي بس.</span></div>' : '') +
      '<p class="err" id="qerr"></p><div class="actions">' + (q.id ? '<button type="button" class="btn btn-red" data-qdel="1">' + icon('archive') + 'شيل السؤال</button>' : '') +
      '<button class="btn btn-ink" type="submit">احفظ</button></div></form>', box => {
      box.onclick = e => {
        const gc = e.target.closest('[data-qg]');
        if (gc) { const id = +gc.dataset.qg; gsel = !id ? [] : gsel.includes(id) ? gsel.filter(x => x !== id) : gsel.concat(id); $('#qgl', box).innerHTML = gchips(); return; }
        const d = e.target.closest('[data-qdel]'); if (d) busy(d, async () => { await API.saveQuestion({ id: q.id, remove: true }); close(); engage(ctx); });
      };
      $('#qf', box).onsubmit = e => {
        e.preventDefault();
        const p = { id: q.id || null, grade_id: B.grade, group_ids: gsel, body: $('#q_b').value, unit: $('#q_u').value, lesson: $('#q_l').value, skill: $('#q_s').value, daily_day: $('#q_d').value,
          choices: $$('[data-ch]', box).map(i => i.value.trim()), answer: +(($('input[name=ans]:checked', box) || {}).value || 0) };
        const filled = p.choices.filter(Boolean);
        if (!p.body.trim() || filled.length < 2 || !p.choices[p.answer]) return ($('#qerr').textContent = 'اكتب السؤال واختيارين على الأقل، واختار الإجابة الصح من اختيار مكتوب.');
        p.answer = filled.indexOf(p.choices[p.answer]); p.choices = filled;
        busy($('#qf button[type=submit]'), async () => { await API.saveQuestion(p); close(); toast('اتحفظ السؤال'); engage(ctx); });
      };
    });
  }

  async function contestForm(ctx) {
    const g = await API.groups(), d = new Date(), e2 = new Date(); e2.setDate(e2.getDate() + 7);
    sheet('<h2>مسابقة جديدة</h2><form id="cf" novalidate><div class="field"><label for="c_t">الاسم</label><input class="inp" id="c_t" placeholder="مثلاً: تحدي الكهربية"></div>' +
      '<div class="field"><span class="lbl">المجموعات (2 أو أكتر)</span><div class="chips">' + g.groups.map(x => '<button type="button" class="chip" data-cg="' + x.id + '">' + esc(x.name) + '</button>').join('') + '</div></div>' +
      '<div class="row2"><div class="field"><label for="c_s">من</label><input class="inp" type="date" id="c_s" value="' + iso(d) + '"></div><div class="field"><label for="c_e">لحد</label><input class="inp" type="date" id="c_e" value="' + iso(e2) + '"></div></div>' +
      '<div class="actions"><button class="btn btn-ink" type="submit">ابدأ المسابقة</button></div></form>', box => {
      box.onclick = e => { const c = e.target.closest('[data-cg]'); if (c) c.classList.toggle('on'); };
      $('#cf', box).onsubmit = e => {
        e.preventDefault();
        busy($('#cf button[type=submit]'), async () => { await API.saveContest({ title: $('#c_t').value, group_ids: $$('[data-cg].on', box).map(c => +c.dataset.cg), starts: $('#c_s').value, ends: $('#c_e').value }); close(); toast('بدأت المسابقة'); engage(ctx); });
      };
    });
  }

  // بوست آخر الشهر: أوائل المجموعة بالدرجات وبالتفاعل — كلام جاهز، والمستر يحط صورته
  // week = true ⇒ بوست آخر الأسبوع (آخر 7 أيام) بنفس الشكل
  async function monthPost(ctx, week) {
    const d = week ? await API.weekPost(B.tg) : await API.monthPost(B.tg);
    const fd = s => new Date(s + 'T12:00').toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long' });
    const mn = week ? 'الأسبوع (' + fd(d.from) + ' — ' + fd(d.to) + ')' : 'شهر ' + new Date(d.month + 'T12:00').toLocaleDateString('ar-EG', { month: 'long' });
    const nm = n => n.split(' ').slice(0, 3).join(' '), medal = ['🥇', '🥈', '🥉', '🏅', '🏅'];
    const txt = '🏆 أوائل ' + mn + ' — ' + (d.group || '') + '\n\n' +
      (week && d.exams.length ? '📝 اللي اتعمل الأسبوع ده: ' + d.exams.join('، ') + '\n\n' : '') +
      (d.by_score.length ? '📚 في الدرجات:\n' + d.by_score.map((x, i) => medal[i] + ' ' + nm(x.name) + ' — ' + x.pct + '%').join('\n') + '\n\n' : '') +
      (d.by_xp.length ? '⚡ في التفاعل وحل الأسئلة:\n' + d.by_xp.map((x, i) => medal[i] + ' ' + nm(x.name) + ' — ' + x.xp + ' نقطة').join('\n') + '\n\n' : '') +
      'ألف مبروك يا أبطال، وكملوا كده 💪\n' + (week ? 'والأسبوع الجاي' : 'والشهر الجاي') + ' مستنيين أسامي جديدة 👀\n#' + String(ctx.me.config.system_name || '').replace(/\s+/g, '_');
    $('#topimg').innerHTML = '<h3 class="mini-h" style="margin-top:var(--s4)">بوست ' + mn + '</h3><textarea class="inp" id="mpost" rows="12">' + esc(txt) + '</textarea>' +
      '<div class="row-btns" style="justify-content:flex-start;margin-top:var(--s2)"><button class="btn btn-ink" data-top="copy">انسخ</button></div>' +
      '<p class="tiny">النشر الأوتوماتيك على صفحة المستر محتاج ربط الصفحة بفيسبوك (هنعمله لما نستلم الحساب). دلوقتي: انسخ وانشر بالصورة اللي المستر عايزها.</p>';
  }

  // صورة الأوائل (1080×1080) بالهوية — تتنزل أو تتشارك على فيسبوك من الموبايل
  async function topImage(ctx) {
    await document.fonts.ready;
    const c = document.createElement('canvas'); c.width = c.height = 1080; const x = c.getContext('2d');
    x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, 1080, 1080);
    x.fillStyle = '#14284B'; x.fillRect(0, 0, 1080, 210);
    x.direction = 'rtl'; x.textAlign = 'right';
    x.fillStyle = '#FFE45A'; x.font = '700 64px "Readex Pro"'; x.fillText('أوائل ' + (B.gname || ''), 1010, 115);
    x.fillStyle = '#FFFFFF'; x.font = '400 34px "Readex Pro"'; x.fillText(ctx.me.config.system_name + ' · ' + (B.by === 'avg' ? 'بالدرجات' : 'بالتفاعل'), 1010, 170);
    B.lb.slice(0, 10).forEach((s, i) => {
      const y = 290 + i * 74;
      if (i < 3) { x.fillStyle = '#FFE45A'; x.beginPath(); x.roundRect(70, y - 52, 940, 66, 14); x.fill(); }
      x.fillStyle = '#14284B'; x.font = '700 40px "Readex Pro"'; x.textAlign = 'right'; x.fillText((i + 1) + '. ' + s.name.split(' ').slice(0, 3).join(' '), 1000, y);
      x.textAlign = 'left'; x.font = '600 36px "Readex Pro"'; x.fillStyle = '#4B5D7A'; x.fillText(B.by === 'avg' ? (s.avg != null ? s.avg + '%' : '') : s.xp + ' نقطة', 90, y);
    });
    x.textAlign = 'center'; x.fillStyle = '#8795AC'; x.font = '400 24px "Readex Pro"'; x.fillText('POWERED BY HINDAWY', 540, 1050);
    const url = c.toDataURL('image/png');
    $('#topimg').innerHTML = '<img class="top-img" alt="صورة الأوائل" src="' + url + '"><div class="actions"><a class="btn btn-line" download="awael.png" href="' + url + '">' + icon('print') + 'نزّل الصورة</a>' +
      (navigator.canShare ? '<button class="btn btn-green" data-share="1">' + icon('send') + 'شارك</button>' : '') + '</div>' +
      '<p class="tiny">الأسامي اللي بتظهر: اتأكد إن أولياء الأمور موافقين على النشر.' + (ctx.lvl('facebook') >= 3 ? ' النشر الأوتوماتيك على صفحة المستر محتاج ربط الصفحة (Meta).' : '') + '</p>';
    const sh = $('[data-share]'); if (sh) sh.onclick = async () => {
      const blob = await new Promise(ok => c.toBlob(ok, 'image/png')), file = new File([blob], 'awael.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: 'أوائل ' + B.gname }).catch(() => { });
    };
  }

  return { money, expenses, reports, exams, messages, engage };
})();
