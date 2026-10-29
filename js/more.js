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
    const t = [['pending', 'طلبات الشحن'], ['approved', 'اتأكدت'], ['rejected', 'اترفضت']].concat(ctx.isTeacher() ? [['setup', 'الإعدادات']] : []);
    let h = '<div class="head"><h1>الفلوس</h1></div>' + tabs(t, M.tab, 'mtab');
    if (M.tab === 'setup') h += await moneySetup(ctx);
    else {
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
        '<p class="tiny">' + (s.sms_ready ? 'فيه مفتاح شغال. لو عملت جديد، القديم بيقف.' : 'لسه مفيش مفتاح.') + ' الرسايل من أرقام عادية بتترفض (حماية من الرسايل المزيفة).</p>' +
        '<button class="btn btn-ink" data-m="secret">' + icon('lock') + (s.sms_ready ? 'اعمل مفتاح جديد' : 'اعمل المفتاح') + '</button>') + '</section>';
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
      '<div class="stat"><span class="muted">دخل الخزنة كاش</span><b>' + num(m.cash_in) + ' ج</b><span class="tiny">باب ' + num(m.door_cash) + ' · اشتراكات ' + num(m.subs_cash) + '</span></div>' +
      '<div class="stat"><span class="muted">تحويلات</span><b>' + num(m.transfer_in) + ' ج</b><span class="tiny">' + num(r.topups.approved) + ' طلب (' + num(r.topups.auto) + ' أوتوماتيك)</span></div>' +
      '<div class="stat"><span class="muted">أمانات الطلاب دلوقتي</span><b>' + num(r.held) + ' ج</b><span class="tiny">' + num(r.held_sessions) + ' حصة لسه ماتخصمتش</span></div></div>' +
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
    };
  }

  // ═════════ الدرجات: كويز/امتحان + الأجزاء الغلط ═════════
  const E = { open: null };
  async function exams(ctx) {
    if (E.open) return examSheet(ctx, E.open);
    const list = await API.exams();
    main().innerHTML = '<div class="head"><h1>الدرجات</h1>' + (ctx.can('students') ? '<button class="btn btn-ink" data-ex="new">' + icon('plus') + 'كويز جديد</button>' : '') + '</div>' +
      (list.length ? '<ul class="list">' + list.map(x => '<li class="tap" data-ex="open" data-id="' + x.id + '"><span class="av">' + icon('pen') + '</span><div class="grow"><b>' + esc(x.title) + '</b>' +
        '<div class="tiny">' + (x.kind === 'exam' ? 'امتحان' : 'كويز') + ' · ' + esc(x.group_name || x.grade) + ' · من ' + x.max_score + (x.parts.length ? ' · ' + x.parts.map(esc).join('، ') : '') + '</div></div>' +
        '<div class="tiny" style="text-align:left">' + num(x.scored) + ' درجة' + (x.avg != null ? '<br>متوسط ' + x.avg : '') + '</div></li>').join('') + '</ul>'
        : '<div class="surface empty">' + icon('pen') + '<div>لسه مفيش كويزات.</div></div>') + credit();
    main().onclick = e => {
      const b = e.target.closest('[data-ex]'); if (!b) return;
      if (b.dataset.ex === 'open') { E.open = +b.dataset.id; return examSheet(ctx, E.open); }
      if (b.dataset.ex === 'new') return examForm(ctx);
    };
  }

  async function examForm(ctx) {
    const [grades, g] = await Promise.all([API.grades(), API.groups()]);
    sheet('<h2>كويز جديد</h2><form id="ef" novalidate>' +
      '<div class="field"><label for="e_t">العنوان</label><input class="inp" id="e_t" placeholder="مثلاً: كويز التيار الكهربي"></div>' +
      '<div class="field"><span class="lbl">النوع</span><div class="chips"><button type="button" class="chip on" data-k="quiz">كويز</button><button type="button" class="chip" data-k="exam">امتحان</button></div></div>' +
      '<div class="row2"><div class="field"><label for="e_g">المجموعة</label><select class="inp" id="e_g">' + g.groups.map(x => '<option value="' + x.id + '" data-grade="' + x.grade_id + '">' + esc(x.name) + ' · ' + esc(x.grade) + '</option>').join('') +
      grades.map(x => '<option value="grade:' + x.id + '">كل ' + esc(x.name) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="e_m">الدرجة النهائية</label><input class="inp" id="e_m" type="number" min="1" inputmode="numeric" value="20"></div></div>' +
      '<div class="field"><label for="e_p">أجزاء الكويز (بيتختار منها الغلط)</label><input class="inp" id="e_p" placeholder="قانون أوم، التوازي، التوالي">' +
      '<span class="hint">افصل بينهم بفاصلة. نفس الأسماء اللي في بنك الأسئلة عشان «أخطائي» يجيب أسئلة على الغلط.</span></div>' +
      '<p class="err" id="eerr"></p><div class="actions"><button class="btn btn-ink" type="submit">اعمل الكويز وابدأ الدرجات</button></div></form>', box => {
      let kind = 'quiz';
      box.onclick = e => { const c = e.target.closest('[data-k]'); if (c) { kind = c.dataset.k; $$('[data-k]', box).forEach(x => x.classList.toggle('on', x === c)); } };
      $('#ef', box).onsubmit = e => {
        e.preventDefault();
        const sel = $('#e_g').value, opt = $('#e_g').selectedOptions[0];
        const p = { title: $('#e_t').value.trim(), kind, max: +$('#e_m').value, parts: $('#e_p').value.split(/[,،]/).map(x => x.trim()).filter(Boolean),
          group_id: sel.startsWith('grade:') ? null : +sel, grade_id: sel.startsWith('grade:') ? +sel.slice(6) : +opt.dataset.grade };
        if (!p.title) return ($('#eerr').textContent = 'اكتب عنوان الكويز.');
        busy($('#ef button[type=submit]'), async () => { const r = await API.saveExam(p); close(); E.open = r.exam.id; examSheet(ctx, E.open); });
      };
    });
  }

  async function examSheet(ctx, id) {
    const d = await API.examSheet(id), ex = d.exam, editable = ctx.can('students');
    const scored = d.rows.filter(r => r.score != null);
    const avg = scored.length ? (scored.reduce((s, r) => s + +r.score, 0) / scored.length).toFixed(1) : '—';
    main().innerHTML = '<div class="head"><div><button class="linkish" data-sh="back">← كل الكويزات</button><h1>' + esc(ex.title) + '</h1></div>' +
      '<div class="tiny">' + num(scored.length) + ' من ' + num(d.rows.length) + ' · متوسط ' + avg + ' من ' + ex.max + '</div></div>' +
      '<div class="search" style="margin-bottom:var(--s3)">' + icon('search') + '<input class="inp" id="shq" placeholder="دوّر على طالب" aria-label="دوّر على طالب"></div>' +
      '<p class="tiny">اكتب الدرجة واضغط Enter (بتتحفظ لوحدها)، واختار الأجزاء اللي غلط فيها. الطالب وولي الأمر بيوصلهم إشعار بالدرجة.</p>' +
      '<ul class="list sheet-list" id="shl">' + d.rows.map(r => '<li data-sid="' + r.id + '" data-name="' + esc(r.name) + '" class="' + (r.score != null ? 'done' : '') + '">' +
        '<div class="grow"><b>' + esc(r.name) + '</b><div class="tiny">' + r.code + '</div>' +
        (ex.parts.length ? '<div class="chips wrong-chips">' + ex.parts.map(p => '<button type="button" class="chip sm' + ((r.wrong || []).includes(p) ? ' bad' : '') + '"' + (editable ? '' : ' disabled') + ' data-part="' + esc(p) + '">' + esc(p) + '</button>').join('') + '</div>' : '') + '</div>' +
        '<input class="inp score" type="number" step="0.5" min="0" max="' + ex.max + '" inputmode="decimal" value="' + (r.score != null ? +r.score : '') + '"' + (editable ? '' : ' disabled') + ' aria-label="درجة ' + esc(r.name) + '">' +
        '<span class="saved" aria-hidden="true">' + icon('check', 'sm') + '</span></li>').join('') + '</ul>' + credit();
    const save = async li => {
      const v = $('.score', li).value; if (v === '') return;
      const wrong = $$('.chip.bad', li).map(c => c.dataset.part);
      try { await API.saveScore(ex.id, +li.dataset.sid, +v, wrong, null); li.classList.add('done', 'flash'); setTimeout(() => li.classList.remove('flash'), 600); }
      catch (e) { toast(e.message, 'err'); }
    };
    $('#shq').oninput = () => { const q = $('#shq').value.trim(); $$('#shl li').forEach(li => { li.hidden = q && !li.dataset.name.includes(q); }); };
    $('#shl').addEventListener('keydown', e => {
      if (e.key !== 'Enter' || !e.target.matches('.score')) return;
      e.preventDefault(); const li = e.target.closest('li'); save(li);
      let n = li.nextElementSibling; while (n && n.hidden) n = n.nextElementSibling; if (n) $('.score', n).focus();
    });
    $('#shl').addEventListener('change', e => { if (e.target.matches('.score')) save(e.target.closest('li')); });
    main().onclick = e => {
      if (e.target.closest('[data-sh=back]')) { E.open = null; return exams(ctx); }
      const c = e.target.closest('[data-part]'); if (c && !c.disabled) { c.classList.toggle('bad'); const li = c.closest('li'); if ($('.score', li).value !== '') save(li); }
    };
  }

  // ═════════ الرسايل وواتساب ═════════
  const W = { tab: 'queue', kind: null };
  async function messages(ctx) {
    const ns = await API.notifySettings(), waLv = ns.wa_level, kinds = ns.kinds;
    const t = [['queue', 'واتساب'], ['new', 'رسالة جديدة']].concat(ns.can_edit ? [['auto', 'الإشعارات الأوتوماتيك']] : []);
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
      const wa = e.target.closest('[data-wa]');
      if (wa) { const li = wa.closest('li'); setTimeout(async () => { await API.waMark([+wa.dataset.wa]).catch(() => { }); li.classList.add('gone'); setTimeout(() => li.remove(), 300); }, 400); }
    };
    if (W.tab === 'new') $('#mf').onsubmit = e => {
      e.preventDefault();
      const [target, id] = $('#m_t').value.split(':');
      busy($('#mf button'), async () => { const r = await API.sendMessage({ target, id: id ? +id : null, to: $('#m_w').value, body: $('#m_b').value }); toast('اتبعتت لـ ' + r.sent + ' طالب'); $('#m_b').value = ''; });
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
        const qs = await API.questions(B.grade);
        const units = [...new Set(qs.map(q => q.unit))];
        h += '<div class="head-btns" style="margin-bottom:var(--s3)"><div class="chips">' + grades.map(g => '<button class="chip' + (g.id === B.grade ? ' on' : '') + '" data-bg="' + g.id + '">' + esc(g.name) + '</button>').join('') + '</div>' +
          (ctx.can('students') ? '<button class="btn btn-ink" data-q="new">' + icon('plus') + 'سؤال جديد</button>' : '') + '</div>' +
          '<p class="muted" style="margin-top:0">' + num(qs.length) + ' سؤال. سؤال اليوم بيتختار من هنا لوحده كل يوم، والطالب بياخد نقط على كل إجابة صح.</p>' +
          (units.length ? units.map(u => '<h2 class="grade-h">' + esc(u) + '</h2><ul class="list">' + qs.filter(q => q.unit === u).map(q =>
            '<li class="tap" data-q="edit" data-id="' + q.id + '"><div class="grow"><b>' + esc(q.body) + '</b><div class="tiny">' + (q.skill ? esc(q.skill) + ' · ' : '') + 'الصح: ' + esc(q.choices[q.answer]) +
            (q.solved ? ' · حلّه ' + q.solved + ' (' + Math.round(q.right / q.solved * 100) + '% صح)' : '') + '</div></div></li>').join('') + '</ul>').join('')
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
        '<ol class="list top-list">' + lb.map((s, i) => '<li><span class="rank">' + (i + 1) + '</span><div class="grow"><b>' + esc(s.name) + '</b></div><b class="num">' + (B.by === 'avg' ? (s.avg != null ? s.avg + '%' : '—') : s.xp + ' نقطة') + '</b></li>').join('') + '</ol>' +
        (ctx.lvl('facebook') >= 2 ? '<div class="actions"><button class="btn btn-ink" data-top="img">' + icon('image') + 'اعمل صورة الأوائل للفيسبوك</button></div><div id="topimg"></div>' : lockBox('صورة الأوائل للفيسبوك مش في باقتك.'));
      B.lb = lb; B.gname = (g.groups.find(x => x.id === B.tg) || {}).name;
    }
    main().innerHTML = h + credit();
    main().onclick = e => {
      const tb = e.target.closest('[data-bt]'); if (tb) { B.tab = tb.dataset.bt; return engage(ctx); }
      const bg = e.target.closest('[data-bg]'); if (bg) { B.grade = +bg.dataset.bg; return engage(ctx); }
      const q = e.target.closest('[data-q]'); if (q && ctx.can('students')) return questionForm(ctx, q.dataset.q === 'edit' ? B.qs.find(x => x.id === +q.dataset.id) : null);
      if (e.target.closest('[data-c=new]')) return contestForm(ctx);
      if (e.target.closest('[data-top=img]')) return topImage(ctx);
    };
    if (B.tab === 'top') { $('#tg').onchange = () => { B.tg = +$('#tg').value; engage(ctx); }; $('#tb').onchange = () => { B.by = $('#tb').value; engage(ctx); }; }
  }

  function questionForm(ctx, q) {
    q = q || { unit: '', skill: '', body: '', choices: ['', '', '', ''], answer: 0 };
    const ch = q.choices.concat(['', '', '', '']).slice(0, 4);
    sheet('<h2>' + (q.id ? 'تعديل سؤال' : 'سؤال جديد') + '</h2><form id="qf" novalidate>' +
      '<div class="field"><label for="q_b">السؤال</label><textarea class="inp" id="q_b" rows="2">' + esc(q.body) + '</textarea></div>' +
      '<div class="field"><span class="lbl">الاختيارات (دوس على الدايرة جنب الصح)</span>' + ch.map((c, i) =>
        '<label class="choice-in"><input type="radio" name="ans" value="' + i + '"' + (i === q.answer ? ' checked' : '') + ' aria-label="الاختيار ' + (i + 1) + ' هو الصح"><input class="inp" data-ch="' + i + '" value="' + esc(c) + '" placeholder="اختيار ' + (i + 1) + '"></label>').join('') + '</div>' +
      '<div class="row2"><div class="field"><label for="q_u">الوحدة</label><input class="inp" id="q_u" value="' + esc(q.unit) + '" placeholder="مثلاً: التوصيل"></div>' +
      '<div class="field"><label for="q_s">الجزء (زي أجزاء الكويز)</label><input class="inp" id="q_s" value="' + esc(q.skill || '') + '" placeholder="مثلاً: التوازي"></div></div>' +
      '<p class="err" id="qerr"></p><div class="actions">' + (q.id ? '<button type="button" class="btn btn-red" data-qdel="1">' + icon('archive') + 'شيل السؤال</button>' : '') +
      '<button class="btn btn-ink" type="submit">احفظ</button></div></form>', box => {
      box.onclick = e => { const d = e.target.closest('[data-qdel]'); if (d) busy(d, async () => { await API.saveQuestion({ id: q.id, remove: true }); close(); engage(ctx); }); };
      $('#qf', box).onsubmit = e => {
        e.preventDefault();
        const p = { id: q.id || null, grade_id: B.grade, body: $('#q_b').value, unit: $('#q_u').value, skill: $('#q_s').value,
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

  return { money, reports, exams, messages, engage };
})();
