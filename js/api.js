// الكلام مع السيرفر: كل حاجة دالة RPC بالتوكن
const API = (() => {
  // الديمو والحقيقي على نفس الدومين ⇒ كل واحد ليه مفتاح · وكل تطبيق ديمو متثبّت (CFG.APP) ليه مفتاحه بيفتكر مين داخل
  const TK = 'token_' + (CFG.P || 'tp_') + (CFG.APP ? '_' + CFG.APP : '');
  const OUT = TK + '_out';   // التطبيق المتثبّت: بعد «خروج» مايدخلش الديمو لوحده تاني لحد ما حد يسجل دخول
  const flag = v => { try { v ? localStorage.setItem(OUT, '1') : localStorage.removeItem(OUT); } catch (e) { } };
  // CFG.MEM: التوكن في الذاكرة بس (العرض التفاعلي: كذا ديمو مفتوحين جوه نفس الصفحة من غير ما يلخبطوا بعض)
  let mem = null;
  const token = () => { if (CFG.MEM) return mem; try { return localStorage.getItem(TK); } catch (e) { return null; } };
  const setToken = t => { if (CFG.MEM) { mem = t; return; } if (t) flag(false); try { t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK); } catch (e) { } };

  // رسايل الأخطاء بلغة المستخدم
  const MSG = {
    AUTH: 'انتهت الجلسة، ادخل تاني.',
    FORBIDDEN: 'مش مسموح لك تعمل ده. اطلب الصلاحية من المستر.',
    BAD_LOGIN: 'رقم الموبايل أو الباسورد غلط.',
    LOCKED: 'محاولات غلط كتير. استنى ربع ساعة وجرب تاني.',
    ALREADY_SETUP: 'السيستم اتعمله إعداد قبل كده. ادخل بحسابك.',
    NO_PLAN: 'الباقة لسه ماتفعّلتش. كلّم HINDAWY.',
    NAME_REQUIRED: 'اكتب الاسم.',
    PHONE_INVALID: 'رقم الموبايل لازم 11 رقم.',
    PW_SHORT: 'الباسورد لازم 6 حروف أو أرقام على الأقل.',
    GRADES_REQUIRED: 'اختار صف واحد على الأقل.',
    GRADE_INVALID: 'اختار الصف.',
    PRICE_INVALID: 'اكتب سعر الحصة.',
    GROUPS_LIMIT: 'وصلت لأقصى عدد مجموعات في باقتك. كلّمنا عشان تزوّد.',
    NOT_FOUND: 'الحاجة دي مش موجودة أو اتقفلت.',
    GENDER_REQUIRED: 'اختار ولد ولا بنت.',
    PARENT_PHONE_INVALID: 'رقم ولي الأمر لازم 11 رقم.',
    GROUP_INVALID: 'المجموعة مش من نفس الصف.',
    GROUP_FULL: 'المجموعة دي اتملت. اختار مجموعة تانية أو زوّد العدد من المجموعات.',
    CLASS_CLOSED: 'الحصة دي مش النهارده. افتح حصة جديدة.',
    ALREADY: 'الطالب اتسجل حضوره قبل كده.',
    PLAN_LOCKED: 'الميزة دي مش في باقتك.',
    SESSIONS_INVALID: 'اختار عدد حصص من 1 لـ 100.',
    NO_GROUP: 'الطالب ده مالوش مجموعة. حطه في مجموعة الأول.',
    NOT_PENDING: 'الطلب ده اتراجع قبل كده.',
    BODY_REQUIRED: 'اكتب الرسالة.',
    MAX_INVALID: 'اكتب الدرجة النهائية.',
    SCORE_INVALID: 'الدرجة لازم تكون بين صفر والدرجة النهائية.',
    QUESTION_INVALID: 'اكتب السؤال واختيارين على الأقل وحدد الإجابة الصح.',
    CONTEST_INVALID: 'اكتب اسم المسابقة واختار مجموعتين على الأقل.',
    METHOD_INVALID: 'اختار طريقة التحويل.',
    SENDER_REQUIRED: 'اكتب الرقم أو الاسم اللي حوّلت منه.',
    TOO_MANY: 'عندك طلبات كتير مستنية. استنى لحد ما تتراجع.',
    NO_QUESTIONS: 'لسه مفيش أسئلة كفاية في البنك.',
    USE_TEACHER_LINK: 'ده حساب المستر — ادخل من لينك المستر.',
    USE_STAFF_LINK: 'ده حساب أسيستنت — ادخل من لينك الأسيستنت.',
    AMOUNT_NOT_SESSIONS: 'المبلغ مش عدد حصص بالظبط لمجموعة الطالب — راجعه يدوي.',
    SETUP_CODE: 'كود التفعيل غلط.',
    BAD_PIN: 'الكود أو الرقم السري غلط.',
    CARD_TAKEN: 'الكارت ده مربوط بطالب تاني.',
    PHONE_TAKEN: 'الرقم ده متسجل لحد تاني في الفريق.',
    IMPORT_INVALID: 'الشيت فاضي أو أكتر من 1000 صف. قسّمه كل مجموعة لوحدها.',
    GRADE_INVALID: 'اختار الصف.',
    NET: 'مفيش اتصال بالنت. اتأكد من النت وجرب تاني.'
  };

  async function rpc(fn, args = {}) {
    let res;
    try {
      // السيستم الحقيقي والديمو نفس الكود بجداول منفصلة: tp_ (الديمو) / tr_ (الحقيقي)
      res = await fetch(CFG.SUPABASE_URL + '/rest/v1/rpc/' + fn.replace(/^tp_/, CFG.P || 'tp_'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: CFG.SUPABASE_KEY, Authorization: 'Bearer ' + CFG.SUPABASE_KEY },
        body: JSON.stringify(args)
      });
    } catch (e) { throw new Error(MSG.NET); }
    const body = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) {
      const code = (body && body.message) || 'ERR';
      // أي رد مش متوقع (مش رسالة من رسايلنا المعروفة) بيتسجل عندنا عشان نصلّحه
      if (res.status >= 500 || !MSG[code] && code !== 'AUTH' && code !== 'FORBIDDEN') report('server', fn + ' ' + res.status + ' ' + code, body && (body.details || body.hint));
      if (code === 'AUTH') { if (window.onAuthFail) window.onAuthFail(); else setToken(null); setTimeout(() => location.reload(), 1200); }
      const err = new Error(MSG[code] || 'حصلت مشكلة. جرب تاني.');
      err.code = code; throw err;
    }
    if (body && body.error) { const err = new Error(MSG[body.error] || body.error); err.code = body.error; throw err; }
    return body;
  }

  // تسجيل الأخطاء: كل غلط بيتبعت مرة واحدة بس في الجلسة، ومن غير ما يعطّل الصفحة
  const sent = new Set();
  function report(kind, msg, stack) {
    try {
      const key = kind + msg; if (sent.has(key) || sent.size > 20 || !CFG.SUPABASE_URL) return; sent.add(key);
      fetch(CFG.SUPABASE_URL + '/rest/v1/rpc/tp_report_error', {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CFG.SUPABASE_KEY, Authorization: 'Bearer ' + CFG.SUPABASE_KEY },
        body: JSON.stringify({ p: { kind, msg: String(msg || ''), stack: String(stack || ''), page: location.pathname + location.hash + (CFG.P ? ' [' + CFG.P + ']' : ''), ua: navigator.userAgent, ver: CFG.VERSION } })
      }).catch(() => { });
    } catch (e) { }
  }
  window.addEventListener('error', e => report('js', e.message, e.error && e.error.stack || (e.filename + ':' + e.lineno)));
  window.addEventListener('unhandledrejection', e => { const r = e.reason || {}; if (r.code) return; report('js', r.message || String(r), r.stack); });

  const t = () => ({ p_token: token() });

  return {
    rpc, token, setToken,
    status: () => rpc('tp_status'),
    setup: async p => { const r = await rpc('tp_setup', { p }); setToken(r.token); return r; },
    login: async (phone, pw) => { const r = await rpc('tp_login', { p_phone: phone, p_pw: pw, p_role: CFG.ROLE || 'assistant' }); setToken(r.token); return r; },
    demoLogin: async role => { const r = await rpc('tp_demo_login', { p_role: role || 'teacher' }); setToken(r.token); return r; },
    saveBrand: p => rpc('tp_brand_save', { ...t(), p }),
    wasOut: () => { try { return !!localStorage.getItem(OUT); } catch (e) { return false; } },
    logout: async () => { const tk = token(); setToken(null); if (CFG.APP) flag(true); if (tk) await rpc('tp_logout', { p_token: tk }).catch(() => { }); },
    me: () => rpc('tp_me', t()),
    savePrefs: p => rpc('tp_prefs_save', { ...t(), p }),
    grades: () => rpc('tp_grades_list', t()),
    groups: () => rpc('tp_groups_list', t()),
    saveGroup: p => rpc('tp_group_save', { ...t(), p }),
    archiveGroup: id => rpc('tp_group_archive', { ...t(), p_id: id }),
    students: p => rpc('tp_students_page', { ...t(), p: p || {} }),
    student: id => rpc('tp_student_get', { ...t(), p_id: id }),
    saveStudent: p => rpc('tp_student_save', { ...t(), p }),
    importStudents: p => rpc('tp_students_import', { ...t(), p }),
    studentFull: id => rpc('tp_student_full', { ...t(), p_id: id }),
    examPublish: (id, wa) => rpc('tp_exam_publish', { ...t(), p_exam: id, p_wa: wa !== false }),
    posts: () => rpc('tp_posts_list', t()),
    savePost: p => rpc('tp_post_save', { ...t(), p }),
    weekPost: gid => rpc('tp_week_post', { ...t(), p_group: gid }),
    segments: p => rpc('tp_segments', { ...t(), p: p || {} }),
    segmentsBy: p => rpc('tp_segments_by', { ...t(), p: p || {} }),
    levelDetail: p => rpc('tp_level_detail', { ...t(), p }),
    reportDetail: (kind, from, to) => rpc('tp_report_detail', { ...t(), p_kind: kind, p_from: from, p_to: to }),
    moneySummary: () => rpc('tp_money_summary', t()),
    staffDay: day => rpc('tp_staff_day', { ...t(), p_day: day || null }),
    sendCards: p => rpc('tp_send_cards', { ...t(), p: { ...p, link: new URL((CFG.ROOT || './') + (CFG.DEMO ? 'demo/family/' : 'family/'), location.href).href } }),
    messageCount: p => rpc('tp_message_count', { ...t(), p }),
    studentByCode: code => rpc('tp_student_by_code', { ...t(), p_code: String(code) }),
    studentCard: (id, uid) => rpc('tp_student_card', { ...t(), p_id: id, p_uid: uid }),
    archiveStudent: id => rpc('tp_student_archive', { ...t(), p_id: id }),
    classesToday: () => rpc('tp_classes_today', t()),
    openClass: gid => rpc('tp_class_open', { ...t(), p_group: gid }),
    classState: cid => rpc('tp_class_state', { ...t(), p_class: cid }),
    scan: (cid, p) => rpc('tp_door_scan', { ...t(), p_class: cid, p }),
    doorCash: (cid, sid, method) => rpc('tp_door_cash', { ...t(), p_class: cid, p_student: sid, p_method: method || 'search' }),
    doorHw: (aid, done) => rpc('tp_door_hw', { ...t(), p_attendance: aid, p_done: done }),
    doorUndo: aid => rpc('tp_door_undo', { ...t(), p_attendance: aid }),
    doorHwOut: aid => rpc('tp_door_hw_out', { ...t(), p_attendance: aid }),
    buySessions: (sid, n) => rpc('tp_buy_sessions', { ...t(), p_student: sid, p_n: n }),
    ledger: sid => rpc('tp_student_ledger', { ...t(), p_student: sid }),
    closeClass: cid => rpc('tp_class_close', { ...t(), p_class: cid }),
    settings: () => rpc('tp_settings_get', t()),
    saveSettings: p => rpc('tp_settings_save', { ...t(), p }),
    saveProduct: p => rpc('tp_product_save', { ...t(), p }),
    smsSecret: () => rpc('tp_sms_secret', t()),
    topups: status => rpc('tp_topups_list', { ...t(), p_status: status || 'pending' }),
    receipt: id => rpc('tp_receipt', { ...t(), p_topup: id }),
    reviewTopup: (id, ok, note) => rpc('tp_topup_review', { ...t(), p_id: id, p_ok: ok, p_note: note || null }),
    report: (from, to) => rpc('tp_report_x', { ...t(), p_from: from, p_to: to }),
    exportRows: (kind, from, to) => rpc('tp_export', { ...t(), p_kind: kind, p_from: from, p_to: to }),
    expenses: (from, to) => rpc('tp_expenses_list', { ...t(), p_from: from, p_to: to }),
    saveExpense: p => rpc('tp_expense_save', { ...t(), p }),
    examStats: id => rpc('tp_exam_stats', { ...t(), p_exam: id }),
    setLesson: (gid, lesson) => rpc('tp_lesson_set', { ...t(), p_grade: gid, p_lesson: lesson }),
    smsUnmatched: () => rpc('tp_sms_unmatched', t()),
    smsApply: (sms, sid) => rpc('tp_sms_apply', { ...t(), p_sms: sms, p_student: sid }),
    smsTrust: sms => rpc('tp_sms_trust', { ...t(), p_sms: sms }),
    monthPost: (gid, month) => rpc('tp_month_post', { ...t(), p_group: gid, p_month: month || null }),
    notifySettings: () => rpc('tp_notify_settings', t()),
    waQueue: kind => rpc('tp_wa_queue', { ...t(), p_kind: kind || null }),
    waMark: ids => rpc('tp_wa_mark', { ...t(), p_ids: ids }),
    sendMessage: p => rpc('tp_message_send', { ...t(), p }),
    homework: gid => rpc('tp_homework_list', { ...t(), p_group: gid }),
    saveHomework: (gid, title) => rpc('tp_homework_save', { ...t(), p_group: gid, p_title: title }),
    exams: () => rpc('tp_exams_list', t()),
    saveExam: p => rpc('tp_exam_save', { ...t(), p }),
    examSheet: id => rpc('tp_exam_sheet', { ...t(), p_exam: id }),
    saveScore: (eid, sid, p) => rpc('tp_score_save', { ...t(), p_exam: eid, p_student: sid, p }),
    questions: gid => rpc('tp_questions_list', { ...t(), p_grade: gid }),
    saveQuestion: p => rpc('tp_question_save', { ...t(), p }),
    contests: () => rpc('tp_contests_list', t()),
    saveContest: p => rpc('tp_contest_save', { ...t(), p }),
    leaderboard: (gid, by) => rpc('tp_leaderboard', { ...t(), p_group: gid || null, p_by: by || 'xp' }),
    staff: () => rpc('tp_staff_list', t()),
    saveStaff: p => rpc('tp_staff_save', { ...t(), p }),
    log: (before, minImp, limit) => rpc('tp_log_list', { ...t(), p_before: before || null, p_min_imp: minImp || 1, p_limit: limit || 50 })
  };
})();
