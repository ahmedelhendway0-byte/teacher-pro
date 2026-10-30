// الديمو الحي جوه العرض: الإطار مابيتحمّلش غير لما تدوس (عشان العرض يفضل خفيف على الموبايل)
document.addEventListener('click', e => {
  const f = e.target.closest('.frame'); if (!f || f.classList.contains('live')) return;
  const src = f.dataset.src;
  f.classList.add('live');
  f.innerHTML = '<iframe src="' + src + '" title="' + f.dataset.title + '" loading="lazy"></iframe>' +
    '<a class="frame-open" href="' + src.replace(/\?as=[a-z]+/, '') + '" target="_blank" rel="noopener">افتحه في صفحة لوحده</a>';
});
