// طباعة كروت الطلاب: طالب واحد (?student=) أو مجموعة كاملة (?group=) — مقاس كارت البنك 8.6 × 5.4 سم، 10 في الورقة A4
(async () => {
  const { esc, $ } = U;
  const q = new URLSearchParams(location.search);
  document.getElementById('pgo').onclick = () => window.print();
  try {
    const me = await API.me();
    let rows = [], title = 'كروت الطلاب';
    if (q.get('student')) { rows = [await API.student(+q.get('student'))]; title = 'كارت ' + rows[0].name; }
    else if (q.get('group')) {
      const gid = +q.get('group');
      for (let off = 0; ; off += 100) {
        const r = await API.students({ group_id: gid, offset: off, limit: 100 });
        rows = rows.concat(r.rows);
        if (rows.length >= r.total || !r.rows.length) break;
      }
      title = 'كروت ' + (rows[0] ? rows[0].group : 'المجموعة');
    }
    document.title = title;
    $('#ptitle').textContent = title;
    $('#pcount').textContent = rows.length + ' كارت';
    $('#cards').innerHTML = rows.map(s =>
      '<div class="id-card print"><div class="id-top"><b>' + esc(me.config.system_name) + '</b><span>' + esc(s.grade) + '</span></div>' +
      '<div class="id-body"><div class="id-qr">' + Scanner.qrSvg(s.code, 4) + '</div><div><div class="id-name">' + esc(s.name) + '</div>' +
      '<div class="id-code num">' + s.code + '</div><div class="tiny">' + esc(s.group || '') + '</div></div></div>' +
      '<div class="id-foot">POWERED BY HINDAWY</div></div>').join('') || '<div class="empty">مفيش طلاب.</div>';
  } catch (e) {
    $('#cards').innerHTML = '<div class="empty">' + esc(e.message) + ' — افتح الصفحة دي من جوه السيستم وانت داخل.</div>';
  }
})();
