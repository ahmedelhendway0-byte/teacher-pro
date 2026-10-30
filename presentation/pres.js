// العرض: كل موبايل فيه خطوات (.st) بتتعرض ورا بعض لوحدها — أنيميشن خفيف من غير ما نحمّل السيستم
// بيشتغل بس لما الموبايل يبان على الشاشة، والنقط تحت بتنقّل بين الخطوات بإيدك
(() => {
  const STEP = 3400;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.ph').forEach(ph => {
    const steps = [...ph.querySelectorAll('.st')]; if (!steps.length) return;
    const fig = ph.closest('.show'), cap = fig && fig.querySelector('.cap');
    let i = 0, timer = null;
    let dots = null;
    if (fig && steps.length > 1) {
      dots = document.createElement('div'); dots.className = 'dots';
      dots.innerHTML = steps.map((_, k) => '<button type="button" aria-label="خطوة ' + (k + 1) + '"></button>').join('');
      fig.insertBefore(dots, cap);
      dots.onclick = e => { const b = e.target.closest('button'); if (!b) return; show([...dots.children].indexOf(b)); restart(); };
    }
    if (ph.dataset.who) { const w = document.createElement('div'); w.className = 'who'; w.textContent = ph.dataset.who; ph.appendChild(w); }
    function show(k) {
      i = (k + steps.length) % steps.length;
      steps.forEach((s, n) => s.classList.toggle('on', n === i));
      if (cap) cap.innerHTML = '<b>' + (i + 1) + '/' + steps.length + '</b> ' + (steps[i].dataset.cap || '');
      if (dots) [...dots.children].forEach((d, n) => d.classList.toggle('on', n === i));
    }
    const restart = () => { clearInterval(timer); timer = setInterval(() => show(i + 1), reduce ? STEP * 1.6 : STEP); };
    show(0);
    if (steps.length < 2) return;
    new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) restart(); else clearInterval(timer); }), { threshold: .35 }).observe(ph);
  });
})();
