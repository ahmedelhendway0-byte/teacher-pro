// الكلام مع السيرفر: كل حاجة دالة RPC بالتوكن
const API = (() => {
  const TK = 'tp_token';
  const token = () => { try { return localStorage.getItem(TK); } catch (e) { return null; } };
  const setToken = t => { try { t ? localStorage.setItem(TK, t) : localStorage.removeItem(TK); } catch (e) { } };

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
    NET: 'مفيش اتصال بالنت. اتأكد من النت وجرب تاني.'
  };

  async function rpc(fn, args = {}) {
    let res;
    try {
      res = await fetch(CFG.SUPABASE_URL + '/rest/v1/rpc/' + fn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: CFG.SUPABASE_KEY, Authorization: 'Bearer ' + CFG.SUPABASE_KEY },
        body: JSON.stringify(args)
      });
    } catch (e) { throw new Error(MSG.NET); }
    const body = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) {
      const code = (body && body.message) || 'ERR';
      if (code === 'AUTH') { setToken(null); setTimeout(() => location.reload(), 1200); }
      const err = new Error(MSG[code] || 'حصلت مشكلة. جرب تاني.');
      err.code = code; throw err;
    }
    if (body && body.error) { const err = new Error(MSG[body.error] || body.error); err.code = body.error; throw err; }
    return body;
  }

  const t = () => ({ p_token: token() });

  return {
    token, setToken,
    status: () => rpc('tp_status'),
    setup: async p => { const r = await rpc('tp_setup', { p }); setToken(r.token); return r; },
    login: async (phone, pw) => { const r = await rpc('tp_login', { p_phone: phone, p_pw: pw }); setToken(r.token); return r; },
    demoLogin: async () => { const r = await rpc('tp_demo_login'); setToken(r.token); return r; },
    saveBrand: p => rpc('tp_brand_save', { ...t(), p }),
    logout: async () => { const tk = token(); setToken(null); if (tk) await rpc('tp_logout', { p_token: tk }).catch(() => { }); },
    me: () => rpc('tp_me', t()),
    savePrefs: p => rpc('tp_prefs_save', { ...t(), p }),
    grades: () => rpc('tp_grades_list', t()),
    groups: () => rpc('tp_groups_list', t()),
    saveGroup: p => rpc('tp_group_save', { ...t(), p }),
    archiveGroup: id => rpc('tp_group_archive', { ...t(), p_id: id }),
    log: (before, minImp, limit) => rpc('tp_log_list', { ...t(), p_before: before || null, p_min_imp: minImp || 1, p_limit: limit || 50 })
  };
})();
