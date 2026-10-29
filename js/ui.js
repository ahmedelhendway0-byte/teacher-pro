// أدوات الواجهة: أيقونات، تأمين النصوص، رسايل، نوافذ
const U = (() => {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n, cls = '') => '<svg class="ic ' + cls + '" aria-hidden="true"><use href="#i-' + n + '"/></svg>';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const num = n => Number(n || 0).toLocaleString('en-US');   // أرقام إنجليزي زي الموك أب

  function toast(msg, kind = 'ok') {
    let box = $('#toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = icon(kind === 'ok' ? 'check' : 'x') + '<span>' + esc(msg) + '</span>';
    box.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }

  // نافذة من تحت (موبايل) أو في النص (كمبيوتر)
  function sheet(html, onReady) {
    close();
    const w = document.createElement('div');
    w.className = 'sheet-wrap';
    w.innerHTML = '<div class="sheet-bg" data-close></div><div class="sheet-box" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(w);
    w.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', escClose);
    const f = w.querySelector('input,select,textarea,button:not([data-close])');
    if (f) f.focus();
    if (onReady) onReady(w.querySelector('.sheet-box'));
  }
  function escClose(e) { if (e.key === 'Escape') close(); }
  function close() { const w = $('.sheet-wrap'); if (w) w.remove(); document.removeEventListener('keydown', escClose); }

  // زرار بيستنى السيرفر: يتقفل ويظهر إنه شغال
  async function busy(btn, fn) {
    if (btn.disabled) return;
    const old = btn.innerHTML; btn.disabled = true; btn.classList.add('busy');
    try { return await fn(); }
    catch (e) { toast(e.message, 'err'); }
    finally { btn.disabled = false; btn.classList.remove('busy'); btn.innerHTML = old; }
  }

  const credit = () =>
    '<footer class="credit">POWERED BY <a href="' + CFG.PORTFOLIO + '" target="_blank" rel="noopener">HINDAWY</a>' +
    '<div class="credit-btns"><a class="btn btn-line btn-sm" href="' + CFG.PORTFOLIO + '" target="_blank" rel="noopener">اعرف أكتر</a>' +
    '<a class="btn btn-line btn-sm" href="' + CFG.PORTFOLIO + '#team" target="_blank" rel="noopener">اعرف أكتر عن المؤسسين</a></div></footer>';

  const ago = iso => {
    const s = Math.max(0, (Date.now() - new Date(iso)) / 1000);
    if (s < 60) return 'دلوقتي';
    if (s < 3600) return 'من ' + Math.floor(s / 60) + ' دقيقة';
    if (s < 86400) return 'من ' + Math.floor(s / 3600) + ' ساعة';
    return new Date(iso).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'short' });
  };

  return { esc, icon, $, $$, num, toast, sheet, close, busy, credit, ago };
})();
