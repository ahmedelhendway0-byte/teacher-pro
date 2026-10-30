// صفحة البداية: بنجمع اللي محتاجينه من المستر في رسالة واتساب جاهزة (مفيش حاجة بتتحفظ على السيرفر)
(() => {
  const WA = '201118606692';
  const KEY = 'tp_start_draft';
  const f = document.getElementById('f');
  const sel = {};
  // الاختيارات (واحد أو أكتر)
  document.querySelectorAll('[data-one],[data-multi]').forEach(g => {
    const name = g.dataset.one || g.dataset.multi, multi = !!g.dataset.multi;
    sel[name] = [];
    g.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      const v = b.textContent.trim();
      if (multi) { sel[name] = sel[name].includes(v) ? sel[name].filter(x => x !== v) : sel[name].concat(v); }
      else sel[name] = sel[name][0] === v ? [] : [v];
      g.querySelectorAll('button').forEach(x => x.classList.toggle('on', sel[name].includes(x.textContent.trim())));
      update();
    };
  });
  // المسودة بتتحفظ على الموبايل بس (لو قفل الصفحة يكمّل)
  try { const d = JSON.parse(localStorage.getItem(KEY) || '{}');
    Object.entries(d.f || {}).forEach(([k, v]) => { const i = f.elements[k]; if (i) i.value = v; });
    Object.entries(d.s || {}).forEach(([k, v]) => { if (!sel[k]) return; sel[k] = v;
      document.querySelectorAll('[data-one="' + k + '"] button,[data-multi="' + k + '"] button').forEach(x => x.classList.toggle('on', v.includes(x.textContent.trim()))); });
  } catch (e) { }
  const NEED = ['الاسم', 'المادة', 'موبايل المستر', 'المجموعات', 'فودافون كاش'];
  function update() {
    const vals = {}; [...f.elements].forEach(i => { if (i.name && i.value.trim()) vals[i.name] = i.value.trim(); });
    try { localStorage.setItem(KEY, JSON.stringify({ f: vals, s: sel })); } catch (e) { }
    const lines = ['أهلاً HINDAWY، عايز أبدأ سيستم المستر. البيانات:'];
    Object.entries(vals).forEach(([k, v]) => lines.push('• ' + k + ': ' + (v.includes('\n') ? '\n' + v : v)));
    Object.entries(sel).forEach(([k, v]) => { if (v.length) lines.push('• ' + k + ': ' + v.join('، ')); });
    const txt = lines.join('\n');
    document.getElementById('sum').textContent = txt;
    const miss = NEED.filter(k => !vals[k]);
    if (!(sel['الصفوف'] || []).length) miss.push('الصفوف');
    document.getElementById('miss').innerHTML = miss.length ? '<p class="miss">لسه ناقص: ' + miss.join('، ') + ' — تقدر تبعت دلوقتي وتكمّلها بعدين.</p>' : '<p class="ok">كده تمام 👌</p>';
    document.getElementById('wa').href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(txt);
    return txt;
  }
  f.addEventListener('input', update);
  document.getElementById('copy').onclick = e => { navigator.clipboard.writeText(update()).then(() => { e.target.textContent = 'اتنسخ'; }).catch(() => { }); };
  update();
})();
