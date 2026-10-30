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
    const t = [['pending', 'طلبات الشحن'], ['sms', 'تحويلات وصلت'], ['approved', 'اتأكدت'], ['rejected', 'اترفضت']].concat(ctx.isTeacher() ? [['setup', 'الإعدادات']] : []);
    let h = '<div class="head"><h1>الفلوس</h1></div>' + tabs(t, M.tab, 'mtab');
    if (M.tab === 'setup') h += await moneySetup(ctx);
    else if (M.tab === 'sms') {
      // رسايل المحفظة اللي وصلت ومااتربطتش أوتوماتيك (الطالب حوّل من غير ما يبعت طلب، أو الرسالة محتاجة مراجعة)
      const rows = await API.smsUnmatched();
      h += '<p class="muted" style="margin-top:0">تحويلات وصلت لموبايل الاستلام وماتشحنتش لوحدها. اربطها بالطالب بضغطة (لو المبلغ عدد حصص بالظبط).</p>' +
        (!rows.length ? '<div class="surface empty">' + icon('check') + '<div>مفيش تحويلات مستنية.</div></div>' :
        '<ul class="list">' + rows.map(r => '<li class="col"><div class="row-top"><div class="grow"><b class="num">' + num(r.amount) + ' ج</b> <span class="tiny">' + esc(r.sender) + (r.from_phone ? ' · من <span dir="ltr">' + esc(r.from_phone) + '</span>' : '') + ' · ' + dt(r.at) + '</span></div></div>' +
          (r.suspicious ? '<div class="tag warn-tag">' + esc(r.suspicious) + '</div>' : '') + '<div class="msg-prev">' + esc(r.body) + '</div>' +
          '<div class="row-btns">' + (r.students || []).map(s => '<button class="btn btn-green btn-sm" data-m="smsapply" data-sms="' + r.id + '" data-id="' + s.id + '">' + icon('check') + 'اشحن لـ ' + esc(s.name.split(' ').slice(0, 2).join(' ')) + '</button>').join('') +
          '<button class="btn btn-line btn-sm" data-m="smspick" data-sms="' + r.id + '">طالب تاني بالكود</button>' +
          (ctx.isTeacher() && r.suspicious && r.suspicious.startsWith('أول رسالة') ? '<button class="btn btn-ghost btn-sm" data-m="smstrust" data-sms="' + r.id + '">الرسالة سليمة · ثبّت الرصيد</button>' : '') + '</div></li>').join('') + '</ul>');
    } else {
      const rows = await API.topups(M.tab);
      h += !rows.length ? '<div class="surface empty">' + icon('check') + '<div>' + (M.tab === 'pending' ? 'مفيش طلبات مستنية.' : 'مفيش حاجة هنا.') + '</div></div>'
        : '<ul class="list">' + rows.map(r => '<li class="col"><div class="row-top"><button class="plain-btn grow" data-m="student" data-id="' + r.student_id + '"><div><b>' + esc(r.name) + '</b>' +
          '<div class="tiny">' + r.code + ' · ' + esc(r.group_name || '') + ' · من ' + (r.by_role === 'parent' ? 'ولي الأمر' : 'الطالب') + '</div></div></button>' +
          '<div class="amount">' + num(r.amount) + ' ج</div></div>' +
          '<div class="tiny">' + (r.sessions ? r.sessions + ' حصص' : '') + (r.products.length ? (r.sessions ? ' + ' : '') + r.products.map(p => esc(p.name)).join('، ') : '') +
          ' · ' + (r.method === 'vodafone' ? 'فودافون كاش' : 'انستاباي') + ' من <span class="num" dir="ltr">' + esc(r.sender) + '</span> · ' + dt(r.sent_at) + '</div>' +
          (M.tab === 'pending' ? '<div class="row-btns">' + (r.has_receipt ? '<button class="btn btn-line btn-sm" data-m="receipt" data-id="' + r.id + '">' + icon('receipt') + 'الإيصال</button>' : '<span class="tiny">من غير إيصال</span>') +
            '<button class="btn btn-red btn-sm" data-m="reject" data-id="' + r.id + '">رفض</button><button class="btn btn-green btn-sm" data-m="approve" data-id="' + r.id + '">' + icon('check') + 'وصل · اشحن</button></div>'
            : '<div class="tiny">' + (r.auto ? '<span class="tag ok">اتأكد أوتوماتيك</span> ' : '') + (r.reviewed_name ? esc(r.reviewed_name) + ' · ' : '') + (r.reviewed_at ? dt(r.reviewed_at) : '') + (r.note ? ' · ' + esc(r.note) : '') + '</div>') +
          '</li>').join('') + '</ul>';
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
  async function expenses(ctx) {
    const now = new Date(); X.month = X.month || iso(now).slice(0, 7);
    const [y, m] = X.month.split('-').map(Number), from = X.month + '-01', to = iso(new Date(y, m, 0, 12));
    const d = await API.expenses(from, to);
    main().innerHTML = '<div class="head"><h1>المصروفات</h1><input class="inp" type="month" id="xm" value="' + X.month + '" style="max-width:180px" aria-label="الشهر"></div>' +
      '<form id="xf" class="surface" novalidate><div class="row2"><div class="field"><label for="x_c">البند</label><input class="inp" id="x_c" list="xcats" placeholder="مثلاً: إيجار القاعة، طباعة، مرتبات"><datalist id="xcats">' +
      d.cats.map(c => '<option value="' + esc(c) + '">').join('') + '</datalist></div>' +
      '<div class="field"><label for="x_a">المبلغ (ج)</label><input class="inp num" id="x_a" type="number" min="1" inputmode="numeric"></div></div>' +
      '<div class="row2"><div class="field"><label for="x_d">اليوم</label><input class="inp" id="x_d" type="date" value="' + iso(now) + '"></div>' +
      '<div class="field"><label for="x_n">ملاحظة (اختياري)</label><input class="inp" id="x_n"></div></div>' +
      '<button class="btn btn-ink" type="submit">' + icon('plus') + 'سجّل المصروف</button></form>' +
      '<div class="stats" style="margin-top:var(--s4)"><div class="stat"><span class="muted">مصروفات الشهر</span><b>' + num(d.total) + ' ج</b></div>' +
      d.by_cat.slice(0, 3).map(c => '<div class="stat"><span class="muted">' + esc(c.category) + '</span><b>' + num(c.total) + ' ج</b></div>').join('') + '</div>' +
      (d.rows.length ? '<ul class="list" style="margin-top:var(--s4)">' + d.rows.map(r => '<li><div class="grow"><b>' + esc(r.category) + '</b><div class="tiny">' + r.day + (r.note ? ' · ' + esc(r.note) : '') + ' · ' + esc(r.by_name || '') + '</div></div>' +
        '<b class="num">' + num(r.amount) + ' ج</b>' + (ctx.isTeacher() ? '<button class="btn btn-ghost btn-sm" data-xdel="' + r.id + '" aria-label="امسح">' + icon('x') + '</button>' : '') + '</li>').join('') + '</ul>'
        : '<div class="surface empty" style="margin-top:var(--s4)">مفيش مصروفات في الشهر ده.</div>') + credit();
    $('#xm').onchange = () => { X.month = $('#xm').value; expenses(ctx); };
    $('#xf').onsubmit = e => {
      e.preventDefault();
      const p = { category: $('#x_c').value.trim(), amount: +$('#x_a').value, day: $('#x_d').value, note: $('#x_n').value };
      if (!p.category || !p.amount) return toast('اكتب البند والمبلغ', 'err');
      busy($('#xf button'), async () => { await API.saveExpense(p); toast('اتسجل'); expenses(ctx); });
    };
    main().onclick = e => { const b = e.target.closest('[data-xdel]'); if (b && confirm('تمسح المصروف ده؟')) busy(b, async () => { await API.saveExpense({ id: +b.dataset.xdel, remove: true }); expenses(ctx); }); };
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
      '<div class="stats"><div class="stat"><span class="muted">الإيراد</span><b>' + num(m.revenue) + ' ج</b><span class="tiny">حصص اتخصمت + كاش + منتجات</span></div>' +
      '<div class="stat"><span class="muted">دخل الخزنة كاش</span><b>' + num(m.cash_in) + ' ج</b><span class="tiny">حصص ' + num(m.door_cash) + ' · اشتراكات ' + num(m.subs_cash) + '</span></div>' +
      '<div class="stat"><span class="muted">تحويلات</span><b>' + num(m.transfer_in) + ' ج</b><span class="tiny">' + num(r.topups.approved) + ' طلب (' + num(r.topups.auto) + ' أوتوماتيك)</span></div>' +
      '<div class="stat"><span class="muted">المصروفات</span><b>' + num(r.expenses) + ' ج</b><span class="tiny">' + (r.expenses_by_cat[0] ? 'أكبر بند: ' + esc(r.expenses_by_cat[0].category) : 'مفيش') + '</span></div>' +
      '<div class="stat net"><span class="muted">الصافي</span><b>' + num(r.net) + ' ج</b><span class="tiny">الإيراد − المصروفات</span></div>' +
      '<div class="stat"><span class="muted">أمانات الطلاب دلوقتي</span><b>' + num(r.held) + ' ج</b><span class="tiny">' + num(r.held_sessions) + ' حصة لسه ماتخصمتش</span></div></div>' +
      '<section class="sec"><h2>نزّل إكسل للفترة دي</h2><div class="row-btns" style="justify-content:flex-start">' +
      [['students', 'الطلاب كلهم'], ['attendance', 'الحضور'], ['scores', 'الدرجات'], ['money', 'الحسابات'], ['expenses', 'المصروفات']].map(([k, n]) =>
        '<button class="btn btn-line btn-sm" data-xp="' + k + '">' + icon('print') + n + '</button>').join('') + '</div>' +
      '<p class="tiny">بيتفتح في Excel أو Google Sheets، وفيه كل بيانات الطالب بالكود. ' + 'ملف «الطلاب» بيبقى كامل مش للفترة بس.</p></section>' +
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

  // سؤال واحد في فورم الكويز: نص (اختياري)، اختياري أو مقالي، الإجابة الصح، الشرح (ليه ده الصح)، الجزء
  const qCard = (q, i) => {
    const mcq = q.kind !== 'essay', ch = (q.choices || []).concat(['', '', '', '']).slice(0, 4);
    return '<details class="qcard"' + (i < 1 ? ' open' : '') + ' data-q><summary><b>سؤال ' + (i + 1) + '</b> <span class="tiny">' + esc((q.text || '').slice(0, 50) || 'من غير نص') + '</span>' +
      '<button type="button" class="btn btn-ghost btn-sm q-del" aria-label="شيل السؤال">' + icon('x') + '</button></summary>' +
      '<textarea class="inp" data-f="text" rows="2" placeholder="نص السؤال (اختياري — ممكن تكتب رقمه بس)">' + esc(q.text || '') + '</textarea>' +
      '<div class="seg small"><button type="button" data-kind="mcq" class="' + (mcq ? 'on' : '') + '">اختياري</button><button type="button" data-kind="essay" class="' + (mcq ? '' : 'on') + '">مقالي</button></div>' +
      '<div class="q-mcq"' + (mcq ? '' : ' hidden') + '>' + ch.map((c, k) => '<label class="choice-in"><input type="radio" name="ans' + i + '" value="' + k + '"' + (mcq && +q.answer === k ? ' checked' : '') + ' aria-label="' + LET[k] + ' هو الصح"><span class="let">' + LET[k] + '</span>' +
        '<input class="inp" data-ch="' + k + '" value="' + esc(c) + '" placeholder="اختيار ' + LET[k] + '"></label>').join('') + '</div>' +
      '<div class="q-essay"' + (mcq ? ' hidden' : '') + '><textarea class="inp" data-f="essay" rows="2" placeholder="الإجابة الصح">' + esc(mcq ? '' : (q.answer || '')) + '</textarea></div>' +
      '<textarea class="inp" data-f="explain" rows="2" placeholder="الشرح: ليه دي الإجابة الصح (بيظهر للطالب اللي غلط)">' + esc(q.explain || '') + '</textarea>' +
      '<input class="inp" data-f="part" value="' + esc(q.part || '') + '" placeholder="الجزء/الدرس (اختياري — زي بنك الأسئلة عشان «أخطائي»)"></details>';
  };

  async function examForm(ctx, ex, kind0) {
    const [grades, g] = await Promise.all([API.grades(), API.groups()]);
    const isNew = !ex; ex = ex || { title: '', kind: kind0 || 'quiz', max: kind0 === 'exam' ? 50 : 20, questions: [], solution_url: '' };
    const KN = k => k === 'exam' ? 'امتحان' : 'كويز';
    sheet('<h2>' + (isNew ? KN(ex.kind) + ' جديد' : 'تعديل «' + esc(ex.title) + '»') + '</h2><form id="ef" novalidate>' +
      '<div class="field"><label for="e_t">اسم ال' + KN(ex.kind) + '</label><input class="inp" id="e_t" value="' + esc(ex.title) + '" placeholder="' + (ex.kind === 'exam' ? 'مثلاً: امتحان شهر أكتوبر' : 'مثلاً: كويز التيار الكهربي') + '"></div>' +
      (isNew ? '<div class="field"><span class="lbl">النوع</span><div class="chips"><button type="button" class="chip' + (ex.kind === 'quiz' ? ' on' : '') + '" data-k="quiz">كويز</button><button type="button" class="chip' + (ex.kind === 'exam' ? ' on' : '') + '" data-k="exam">امتحان</button></div></div>' +
        '<div class="row2"><div class="field"><label for="e_g">لمين</label><select class="inp" id="e_g">' + g.groups.map(x => '<option value="' + x.id + '" data-grade="' + x.grade_id + '">' + esc(x.name) + ' · ' + esc(x.grade) + '</option>').join('') +
        grades.map(x => '<option value="grade:' + x.id + '">كل ' + esc(x.name) + '</option>').join('') + '</select></div>' : '<div class="row2">') +
      '<div class="field"><label for="e_m">الدرجة النهائية</label><input class="inp" id="e_m" type="number" min="1" inputmode="numeric" value="' + ex.max + '"></div></div>' +
      '<div class="field"><label for="e_u">لينك الحل (اختياري)</label><input class="inp" id="e_u" dir="ltr" value="' + esc(ex.solution_url || '') + '" placeholder="https://youtube.com/…">' +
      '<span class="hint">فيديو حل الكويز — بيوصل لكل الطلاب مع الدرجة.</span></div>' +
      '<div class="head" style="margin:var(--s4) 0 var(--s2)"><h3 style="margin:0">الأسئلة <span class="tiny">(اختياري — عشان الطالب يعرف غلط في إيه والصح إيه، ولإحصائية كل سؤال)</span></h3></div>' +
      '<div id="qs">' + ex.questions.map(qCard).join('') + '</div>' +
      '<div class="inline-form"><button type="button" class="btn btn-line" data-add="1">' + icon('plus') + 'ضيف سؤال</button>' +
      '<input class="inp num" id="e_n" type="number" min="1" max="60" inputmode="numeric" placeholder="أو عدد" style="max-width:100px"><button type="button" class="btn btn-ghost" data-addn="1">ضيف الكل</button></div>' +
      '<p class="err" id="eerr"></p><div class="actions"><button class="btn btn-ink" type="submit">' + (isNew ? 'اعمله وابدأ الدرجات' : 'احفظ') + '</button></div></form>', box => {
      let kind = ex.kind;
      const add = () => { const n = $$('[data-q]', box).length; $('#qs', box).insertAdjacentHTML('beforeend', qCard({ kind: 'mcq' }, n)); $$('[data-q]', box).forEach((d, i) => { d.open = i === n; }); };
      box.onclick = e => {
        const c = e.target.closest('[data-k]'); if (c) { kind = c.dataset.k; $$('[data-k]', box).forEach(x => x.classList.toggle('on', x === c)); }
        if (e.target.closest('[data-add]')) add();
        if (e.target.closest('[data-addn]')) { const n = Math.min(60, +$('#e_n').value || 0); for (let i = 0; i < n; i++) add(); }
        const del = e.target.closest('.q-del'); if (del) { e.preventDefault(); del.closest('[data-q]').remove(); }
        const kb = e.target.closest('[data-kind]'); if (kb) {
          const d = kb.closest('[data-q]'); $$('[data-kind]', d).forEach(x => x.classList.toggle('on', x === kb));
          $('.q-mcq', d).hidden = kb.dataset.kind !== 'mcq'; $('.q-essay', d).hidden = kb.dataset.kind === 'mcq';
        }
      };
      $('#ef', box).onsubmit = e => {
        e.preventDefault();
        const questions = $$('[data-q]', box).map(d => {
          const mcq = $('[data-kind=mcq]', d).classList.contains('on'), r = $('input[type=radio]:checked', d);
          return { text: $('[data-f=text]', d).value.trim(), kind: mcq ? 'mcq' : 'essay', choices: mcq ? $$('[data-ch]', d).map(i => i.value.trim()) : [],
            answer: mcq ? (r ? +r.value : null) : $('[data-f=essay]', d).value.trim(), explain: $('[data-f=explain]', d).value.trim(), part: $('[data-f=part]', d).value.trim() };
        });
        const p = { id: ex.id || null, title: $('#e_t').value.trim(), kind: ex.kind || kind, max: +$('#e_m').value, solution_url: $('#e_u').value.trim(), questions, parts: [] };
        if (isNew) { const sel = $('#e_g').value, opt = $('#e_g').selectedOptions[0];
          p.group_id = sel.startsWith('grade:') ? null : +sel; p.grade_id = sel.startsWith('grade:') ? +sel.slice(6) : +opt.dataset.grade; p.kind = kind; }
        if (!p.title) return ($('#eerr').textContent = 'اكتب اسم ال' + KN(p.kind) + '.');
        if (p.solution_url && !/^https:\/\//.test(p.solution_url)) return ($('#eerr').textContent = 'لينك الحل لازم يبدأ بـ https://');
        busy($('#ef button[type=submit]'), async () => { const r = await API.saveExam(p); close(); E.open = r.exam.id; E.stats = false; examSheet(ctx, E.open); });
      };
    });
  }

  async function examSheet(ctx, id) {
    const d = await API.examSheet(id), ex = d.exam, editable = ctx.can('grades'), qs = ex.questions || [];
    const scored = d.rows.filter(r => r.score != null);
    const avg = scored.length ? (scored.reduce((s, r) => s + +r.score, 0) / scored.length).toFixed(1) : '—';
    const per = qs.length ? ex.max / qs.length : 0;   // درجة السؤال لو الأسئلة متساوية (اقتراح بس)
    main().innerHTML = '<div class="head"><div><button class="linkish" data-sh="back">← كل الكويزات</button><h1>' + esc(ex.title) + '</h1>' +
      '<div class="tiny">' + num(scored.length) + ' من ' + num(d.rows.length) + ' · متوسط ' + avg + ' من ' + ex.max + (ex.solution_url ? ' · <a href="' + esc(ex.solution_url) + '" target="_blank" rel="noopener">لينك الحل</a>' : '') + '</div></div>' +
      '<div class="head-btns"><button class="btn btn-line" data-sh="stats">' + icon('chart') + 'الإحصائية</button>' +
      (editable ? '<button class="btn btn-line" data-sh="paste">' + icon('sheet') + 'الدرجات من شيت</button>' : '') +
      (editable && scored.length ? '<button class="btn btn-ink" data-sh="publish">' + icon('send') + (ex.results_sent_at ? 'ابعت النتيجة تاني' : 'ابعت النتيجة والترتيب') + '</button>' : '') + (editable ? '<button class="btn btn-ghost" data-sh="edit">' + icon('pen') + 'عدّل</button>' : '') + '</div></div>' +
      '<div class="search" style="margin-bottom:var(--s3)">' + icon('search') + '<input class="inp" id="shq" placeholder="دوّر على طالب" aria-label="دوّر على طالب"></div>' +
      '<p class="tiny">' + (qs.length ? 'دوس على رقم السؤال اللي الطالب غلط فيه (بيبقى أحمر)، ولو اختياري اختار هو جاوب إيه. الدرجة بتتحسب لوحدها لو الأسئلة متساوية، وتقدر تغيّرها. ' : 'اكتب الدرجة واضغط Enter. ') +
      'بتتحفظ لوحدها، والطالب وولي الأمر بيوصلهم إشعار بالدرجة' + (qs.length ? ' والأسئلة الغلط بالحل الصح والشرح' : '') + '.</p>' +
      '<ul class="list sheet-list" id="shl">' + d.rows.map(r => '<li data-sid="' + r.id + '" data-name="' + esc(r.name) + '" class="' + (r.score != null ? 'done' : '') + '">' +
        '<div class="grow"><button class="plain-btn name-btn" data-act="studentOpen" data-id="' + r.id + '"><b>' + esc(r.name) + '</b></button><div class="tiny">' + r.code + '</div>' +
        (qs.length ? '<div class="chips wrong-chips">' + qs.map(q => '<button type="button" class="chip sm qn' + ((r.wrong_q || []).includes(q.n) ? ' bad' : '') + '"' + (editable ? '' : ' disabled') + ' data-qn="' + q.n + '" aria-label="سؤال ' + q.n + ' غلط">' + q.n + '</button>').join('') + '</div>' +
          '<div class="picks">' + qs.filter(q => q.kind === 'mcq' && (r.wrong_q || []).includes(q.n)).map(q => pickRow(q, (r.picks || {})[q.n])).join('') + '</div>'
          : ex.parts.length ? '<div class="chips wrong-chips">' + ex.parts.map(p => '<button type="button" class="chip sm' + ((r.wrong || []).includes(p) ? ' bad' : '') + '"' + (editable ? '' : ' disabled') + ' data-part="' + esc(p) + '">' + esc(p) + '</button>').join('') + '</div>' : '') + '</div>' +
        '<input class="inp score" type="number" step="0.5" min="0" max="' + ex.max + '" inputmode="decimal" value="' + (r.score != null ? +r.score : '') + '"' + (editable ? '' : ' disabled') + ' aria-label="درجة ' + esc(r.name) + '">' +
        '<span class="saved" aria-hidden="true">' + icon('check', 'sm') + '</span></li>').join('') + '</ul>' + credit();
    function pickRow(q, cur) {
      return '<div class="pick" data-pq="' + q.n + '"><span class="tiny">سؤال ' + q.n + ' جاوب:</span>' + (q.choices || []).map((c, k) => c ? '<button type="button" class="chip xs' + (+cur === k && cur != null ? ' on' : '') + '" data-pk="' + k + '">' + LET[k] + '</button>' : '').join('') + '</div>';
    }
    const save = async li => {
      const v = $('.score', li).value; if (v === '') return;
      const p = { score: +v, wrong: $$('[data-part].bad', li).map(c => c.dataset.part), wrong_q: $$('.qn.bad', li).map(c => +c.dataset.qn), picks: {} };
      $$('[data-pq]', li).forEach(pr => { const on = $('.on', pr); if (on) p.picks[pr.dataset.pq] = +on.dataset.pk; });
      try { await API.saveScore(ex.id, +li.dataset.sid, p); li.classList.add('done', 'flash'); setTimeout(() => li.classList.remove('flash'), 600); }
      catch (e) { toast(e.message, 'err'); }
    };
    const autoScore = li => { if (!per) return; const inp = $('.score', li); if (inp.value !== '' && !inp.dataset.auto) return;
      inp.value = Math.max(0, Math.round((ex.max - $$('.qn.bad', li).length * per) * 2) / 2); inp.dataset.auto = 1; };
    $('#shq').oninput = () => { const q = $('#shq').value.trim(); $$('#shl > li').forEach(li => { li.hidden = q && !li.dataset.name.includes(q); }); };
    $('#shl').addEventListener('keydown', e => {
      if (e.key !== 'Enter' || !e.target.matches('.score')) return;
      e.preventDefault(); const li = e.target.closest('li'); save(li);
      let n = li.nextElementSibling; while (n && n.hidden) n = n.nextElementSibling; if (n) $('.score', n).focus();
    });
    $('#shl').addEventListener('input', e => { if (e.target.matches('.score')) delete e.target.dataset.auto; });
    $('#shl').addEventListener('change', e => { if (e.target.matches('.score')) save(e.target.closest('li')); });
    main().onclick = e => {
      if (e.target.closest('[data-sh=back]')) { E.open = null; return exams(ctx); }
      if (e.target.closest('[data-sh=stats]')) { E.stats = true; return examStats(ctx, id); }
      if (e.target.closest('[data-sh=edit]')) return examForm(ctx, ex);
      const pb = e.target.closest('[data-sh=publish]');
      if (pb) {
        if (!confirm('هيوصل لكل طالب من الـ ' + scored.length + ' (وولي أمره) درجته وترتيبه ومتوسط الكل' + (ex.solution_url ? ' ولينك الحل' : '') + '. نبعت؟')) return;
        return busy(pb, async () => { const r = await API.examPublish(ex.id); toast('اتبعتت النتيجة لـ ' + num(r.sent) + ' طالب'); ex.results_sent_at = new Date().toISOString(); });
      }
      // الأسئلة الغلط اللي متسجلة قبل كده بتفضل زي ما هي
      if (e.target.closest('[data-sh=paste]')) return Importer.scores({ rows: d.rows, max: ex.max, onDone: () => examSheet(ctx, id),
        save: (r, score) => API.saveScore(ex.id, r.id, { score, wrong: r.wrong || [], wrong_q: r.wrong_q || [], picks: r.picks || {} }) });
      const c = e.target.closest('[data-part]'); if (c && !c.disabled) { c.classList.toggle('bad'); const li = c.closest('li'); if ($('.score', li).value !== '') save(li); return; }
      const qb = e.target.closest('.qn'); if (qb && !qb.disabled) {
        qb.classList.toggle('bad'); const li = qb.closest('li'), q = qs.find(x => x.n === +qb.dataset.qn);
        const box = $('.picks', li), ex2 = $('[data-pq="' + q.n + '"]', box);
        if (qb.classList.contains('bad') && q.kind === 'mcq' && !ex2) box.insertAdjacentHTML('beforeend', pickRow(q));
        if (!qb.classList.contains('bad') && ex2) ex2.remove();
        autoScore(li); save(li); return;
      }
      const pk = e.target.closest('[data-pk]'); if (pk) { $$('[data-pk]', pk.parentNode).forEach(x => x.classList.toggle('on', x === pk)); save(pk.closest('li[data-sid]')); }
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
  const W = { tab: 'queue', kind: null };
  async function messages(ctx) {
    const ns = await API.notifySettings(), waLv = ns.wa_level, kinds = ns.kinds;
    const t = [['queue', 'واتساب'], ['new', 'رسالة جديدة'], ['posts', 'بوستات ثابتة']].concat(ns.can_edit ? [['auto', 'الإشعارات الأوتوماتيك']] : []);
    if (waLv < 2 && W.tab === 'queue') W.tab = 'new';
    let h = '<div class="head"><h1>الرسايل</h1></div>' + tabs(waLv < 2 ? t.filter(x => x[0] !== 'queue') : t, W.tab, 'wt');
    if (W.tab === 'queue') {
      const q = await API.waQueue(W.kind);
      h += '<p class="muted" style="margin-top:0">كل زرار بيفتح واتساب والرسالة مكتوبة جاهزة. بعد ما تبعت، السطر بيختفي.' + (waLv >= 3 ? ' الأنواع اللي على «أوتوماتيك» بتتبعت لوحدها أول ما رقم الواتساب يتربط (WhatsApp Cloud API).' : '') + '</p>' +
        '<div class="chips" style="margin-bottom:var(--s3)"><button class="chip' + (!W.kind ? ' on' : '') + '" data-wk="">الكل</button>' +
        Object.entries(q.counts).map(([k, n]) => '<button class="chip' + (W.kind === k ? ' on' : '') + '" data-wk="' + k + '">' + esc((kinds[k] || {}).label || k) + ' · ' + n + '</button>').join('') + '</div>' +
        (q.rows.length ? '<ul class="list">' + q.rows.map(r => {
          const tos = r.to_role === 'both' ? [['parent', r.parent_phone], ['student', r.phone]] : [[r.to_role, r.to_role === 'parent' ? r.parent_phone : r.phone]];
          return '<li class="col" data-nid="' + r.id + '"><div class="row-top"><div class="grow"><b>' + esc(r.name) + '</b> <span class="tiny">' + esc((kinds[r.kind] || {}).label || '') + (r.wa === 'queued' ? ' · أوتوماتيك' : '') + '</span></div><span class="tiny">' + ago(r.at) + '</span></div>' +
            '<div class="msg-prev">' + esc(r.body) + '</div><div class="row-btns">' + tos.map(([who, ph]) =>
              '<a class="btn btn-green btn-sm" target="_blank" rel="noopener" data-wa="' + r.id + '" href="https://wa.me/' + waPhone(ph) + '?text=' + encodeURIComponent(r.body) + '">' + icon('wa') + (who === 'parent' ? 'ولي الأمر' : 'الطالب') + '</a>').join('') + '</div></li>';
        }).join('') + '</ul>' : '<div class="surface empty">' + icon('check') + '<div>مفيش رسايل مستنية.</div></div>');
    }
    if (W.tab === 'new') {
      const g = await API.groups(), grades = await API.grades();
      h += '<form id="mf" class="surface" novalidate><div class="row2"><div class="field"><label for="m_t">لمين؟</label><select class="inp" id="m_t"><option value="all:">كل الطلاب</option>' +
        grades.map(x => '<option value="grade:' + x.id + '">' + esc(x.name) + '</option>').join('') + g.groups.map(x => '<option value="group:' + x.id + '">مجموعة ' + esc(x.name) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="m_w">تتبعت لـ</label><select class="inp" id="m_w"><option value="both">الطالب وولي الأمر</option><option value="parent">ولي الأمر بس</option><option value="student">الطالب بس</option></select></div></div>' +
        '<div class="field"><label for="m_b">الرسالة</label><textarea class="inp" id="m_b" rows="4" placeholder="مثلاً: حصة السبت الجاية هتبقى الساعة 5 بدل 4."></textarea></div>' +
        '<p class="tiny">بتظهر في بوابة الطالب وولي الأمر' + (waLv >= 2 ? '، وبتنزل في طابور الواتساب.' : '.') + '</p>' +
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
      const pd = e.target.closest('[data-pdel]');
      if (pd) { if (!confirm('تشيل البوست ده من عند الطلاب؟')) return; return busy(pd, async () => { await API.savePost({ id: +pd.dataset.pdel, remove: true }); toast('اتشال'); messages(ctx); }); }
      const wa = e.target.closest('[data-wa]');
      if (wa) { const li = wa.closest('li'); setTimeout(async () => { await API.waMark([+wa.dataset.wa]).catch(() => { }); li.classList.add('gone'); setTimeout(() => li.remove(), 300); }, 400); }
    };
    if (W.tab === 'new') $('#mf').onsubmit = e => {
      e.preventDefault();
      const [target, id] = $('#m_t').value.split(':');
      busy($('#mf button'), async () => { const r = await API.sendMessage({ target, id: id ? +id : null, to: $('#m_w').value, body: $('#m_b').value }); toast('اتبعتت لـ ' + r.sent + ' طالب'); $('#m_b').value = ''; });
    };
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
