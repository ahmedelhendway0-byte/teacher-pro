// استيراد من شيت: ملف Excel / CSV أو نسخ ولصق من Excel أو Google Sheets
// Importer.students({ grades, groups, grade_id, group_id, onDone }) · Importer.scores({ rows, max, save, onDone })
const Importer = (() => {
  const { esc, icon, $, $$, num, toast, sheet, close, busy } = U;
  const AR = '٠١٢٣٤٥٦٧٨٩';
  const latin = v => String(v == null ? '' : v).replace(/[٠-٩]/g, d => AR.indexOf(d)).trim();
  const phone11 = v => {
    const d = latin(v).replace(/\D/g, '');
    if (d.length === 10 && d[0] === '1') return '0' + d;        // Excel بيشيل الصفر اللي على الشمال
    if (d.length === 12 && d.startsWith('20')) return '0' + d.slice(2);
    return d;
  };
  const gender = v => {
    const t = latin(v).toLowerCase();
    if (/^(ولد|ذكر|م|m|male|boy|طالب)$/.test(t)) return 'm';
    if (/^(بنت|انثى|أنثى|انثي|ف|ث|f|female|girl|طالبة)$/.test(t)) return 'f';
    return '';
  };

  function loadXLSX() {
    if (window.XLSX) return Promise.resolve();
    return new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = (CFG.ROOT || '') + 'js/vendor/xlsx.js?v=0.18.5'; s.onload = ok; s.onerror = no;
      document.head.appendChild(s);
    });
  }
  // كل الشيت ⇒ صفوف خانات نصية، من غير الصفوف الفاضية
  async function readFile(file) {
    await loadXLSX();
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', codepage: 65001 });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return clean(XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }));
  }
  function readPaste(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const sep = lines.some(l => l.includes('\t')) ? '\t' : ',';
    return clean(lines.map(l => l.split(sep)));
  }
  const clean = rows => rows.map(r => r.map(c => String(c == null ? '' : c).trim())).filter(r => r.some(Boolean));

  // ───── الطلاب ─────
  const FIELDS = [
    ['name', 'الاسم', /اسم|name/i],
    ['gender', 'النوع (ولد/بنت)', /نوع|جنس|gender|sex/i],
    ['parent_phone', 'موبايل ولي الأمر', /ولي|أمر|امر|الأب|الاب|الأم|الام|parent|father|mother/i],
    ['phone', 'موبايل الطالب', /موبايل|تليفون|هاتف|محمول|واتس|phone|mobile|tel/i],
    ['code', 'الكود القديم', /كود|code|رقم الطالب|^id$|^م$/i],
    ['notes', 'ملاحظات', /ملاحظ|notes?|مدرسة/i]
  ];

  function guessMap(rows) {
    const head = rows[0] || [], map = {};
    const isHead = head.some(c => FIELDS.some(f => f[2].test(c)));
    if (isHead) {
      FIELDS.forEach(([k, , re]) => {
        const i = head.findIndex((c, j) => re.test(c) && !Object.values(map).includes(j));
        if (i >= 0) map[k] = i;
      });
    } else {
      // من غير عناوين: أول عمود فيه كلام = الاسم، وأول عمودين أرقام موبايل = الطالب ثم ولي الأمر
      const body = rows.slice(0, 20), cols = Math.max(...rows.map(r => r.length));
      const share = (j, fn) => body.filter(r => fn(r[j] || '')).length / Math.max(1, body.length);
      const phones = [];
      for (let j = 0; j < cols; j++) {
        if (share(j, v => phone11(v).length === 11) > .6) phones.push(j);
        else if (map.gender == null && share(j, v => gender(v)) > .6) map.gender = j;
        else if (map.name == null && share(j, v => /[؀-ۿa-z]{2,}/i.test(v)) > .6) map.name = j;
        else if (map.code == null && share(j, v => /^\d{1,7}$/.test(latin(v))) > .6) map.code = j;
      }
      if (phones[0] != null) map.phone = phones[0];
      if (phones[1] != null) map.parent_phone = phones[1];
    }
    return { map, isHead };
  }

  function students(o) {
    const st = { step: 1, rows: [], map: {}, isHead: false, grade_id: o.grade_id || o.grades[0].id, group_id: o.group_id || null, gender: '' };
    const groupsOf = gid => o.groups.filter(g => g.grade_id === gid);

    sheet('<div id="imp"></div>', box => {
      const root = $('#imp', box);
      const draw = () => { root.innerHTML = st.step === 1 ? step1() : st.step === 2 ? step2() : ''; bind(); };

      function step1() {
        return '<h2>' + icon('sheet') + ' استيراد طلاب من شيت</h2>' +
          '<p class="muted" style="margin-top:0">لو المستر عنده شيت لكل مجموعة (Excel أو Google Sheets) بنحطه هنا مرة واحدة بدل ما نكتب الطلاب واحد واحد.</p>' +
          '<div class="row2"><div class="field"><label for="i_grade">الصف</label><select class="inp" id="i_grade">' +
          o.grades.map(g => '<option value="' + g.id + '"' + (g.id === st.grade_id ? ' selected' : '') + '>' + esc(g.name) + '</option>').join('') + '</select></div>' +
          '<div class="field"><label for="i_group">المجموعة</label><select class="inp" id="i_group"><option value="">من غير مجموعة</option>' +
          groupsOf(st.grade_id).map(g => '<option value="' + g.id + '"' + (g.id === st.group_id ? ' selected' : '') + '>' + esc(g.name) + ' (' + g.students + (g.capacity ? '/' + g.capacity : '') + ')</option>').join('') + '</select></div></div>' +
          '<div class="drop"><label class="btn btn-ink" for="i_file">' + icon('upload') + 'اختار ملف Excel أو CSV</label><input id="i_file" type="file" accept=".xlsx,.xls,.csv,.ods" hidden>' +
          '<span class="tiny">من Google Sheets: ملف ← تنزيل ← Microsoft Excel، أو انسخ الخانات والصقها تحت.</span></div>' +
          '<div class="field"><label for="i_paste">أو انسخ الخانات من الشيت والصقها هنا</label><textarea class="inp" id="i_paste" rows="4" dir="auto" placeholder="الاسم ⇥ موبايل الطالب ⇥ موبايل ولي الأمر …"></textarea></div>' +
          '<p class="err" id="ierr"></p><div class="actions"><button class="btn btn-line" type="button" data-i="tpl">' + icon('sheet') + 'نزّل نموذج فاضي</button>' +
          '<button class="btn btn-ink" type="button" data-i="paste">كمّل</button></div>';
      }

      function rowsOut() {
        const body = st.isHead ? st.rows.slice(1) : st.rows;
        return body.map((r, i) => {
          const g = k => st.map[k] != null ? r[st.map[k]] || '' : '';
          const gc = gender(g('gender'));
          const x = { n: i + 1, gc, name: g('name').replace(/\s+/g, ' '), gender: gc || st.gender, phone: phone11(g('phone')), parent_phone: phone11(g('parent_phone')),
            code: latin(g('code')).replace(/\D/g, ''), notes: g('notes') };
          x.why = !x.name ? 'مفيش اسم' : !x.gender ? 'ولد ولا بنت؟' : x.phone.length !== 11 ? 'موبايل الطالب' : x.parent_phone.length !== 11 ? 'موبايل ولي الأمر' : '';
          return x;
        });
      }

      function step2() {
        const out = rowsOut(), ok = out.filter(x => !x.why), bad = out.filter(x => x.why);
        const cols = Math.max(...st.rows.map(r => r.length)), head = st.isHead ? st.rows[0] : [];
        const colName = j => (head[j] ? '«' + esc(head[j]) + '»' : 'عمود ' + (j + 1));
        const g = groupsOf(st.grade_id).find(x => x.id === st.group_id);
        return '<h2>راجع قبل ما نسجّل</h2>' +
          '<p class="muted" style="margin-top:0">' + esc((o.grades.find(x => x.id === st.grade_id) || {}).name) + ' · ' + (g ? esc(g.name) : 'من غير مجموعة') + ' · ' + num(out.length) + ' صف في الشيت.</p>' +
          '<div class="map-grid">' + FIELDS.map(([k, label]) => '<div class="field"><label for="m_' + k + '">' + label + '</label><select class="inp" id="m_' + k + '" data-map="' + k + '">' +
            '<option value="">' + (k === 'code' || k === 'notes' || k === 'gender' ? 'مش موجود' : '— اختار العمود —') + '</option>' +
            Array.from({ length: cols }, (_, j) => '<option value="' + j + '"' + (st.map[k] === j ? ' selected' : '') + '>' + colName(j) + '</option>').join('') + '</select></div>').join('') + '</div>' +
          (out.some(x => !x.gc) ?
            '<div class="field"><span class="lbl">النوع للي مش مكتوب له</span><div class="seg" id="i_gen">' +
            [['', 'مش محدد'], ['m', 'كلهم ولاد'], ['f', 'كلهم بنات']].map(([v, t]) => '<button type="button" data-gen="' + v + '" class="' + (st.gender === v ? 'on' : '') + '">' + t + '</button>').join('') + '</div></div>' : '') +
          '<label class="chip" style="margin-bottom:var(--s3)"><input type="checkbox" id="i_head"' + (st.isHead ? ' checked' : '') + '> أول صف عناوين</label>' +
          '<div class="table-wrap"><table class="tbl"><thead><tr><th>#</th><th>الاسم</th><th>النوع</th><th>الطالب</th><th>ولي الأمر</th><th>الكود</th></tr></thead><tbody>' +
          out.slice(0, 8).map(x => '<tr class="' + (x.why ? 'bad' : '') + '"><td>' + x.n + '</td><td>' + esc(x.name) + '</td><td>' + (x.gender === 'm' ? 'ولد' : x.gender === 'f' ? 'بنت' : '؟') + '</td>' +
            '<td class="num" dir="ltr">' + esc(x.phone) + '</td><td class="num" dir="ltr">' + esc(x.parent_phone) + '</td><td class="num">' + esc(x.code) + '</td></tr>').join('') +
          '</tbody></table></div>' + (out.length > 8 ? '<p class="tiny">وكمان ' + num(out.length - 8) + ' صف…</p>' : '') +
          '<div class="imp-sum"><span class="tag ok">' + num(ok.length) + ' جاهز</span>' + (bad.length ? ' <span class="tag bad">' + num(bad.length) + ' فيه مشكلة</span>' : '') + '</div>' +
          (bad.length ? '<p class="tiny">' + bad.slice(0, 6).map(x => 'صف ' + x.n + (x.name ? ' «' + esc(x.name) + '»' : '') + ': ' + x.why).join(' · ') + (bad.length > 6 ? ' …' : '') +
            '<br>الصفوف دي هتتساب، وتقدر تسجلهم بعدين واحد واحد.</p>' : '') +
          (out.some(x => x.code) ? '<p class="tiny">الأكواد القديمة هتفضل زي ما هي، عشان الكروت والشيتات القديمة تفضل شغالة.</p>' : '') +
          '<p class="err" id="ierr"></p><div class="actions"><button class="btn btn-ghost" type="button" data-i="back">رجوع</button>' +
          '<button class="btn btn-ink" type="button" data-i="go"' + (ok.length ? '' : ' disabled') + '>' + icon('check') + 'سجّل ' + num(ok.length) + ' طالب</button></div>';
      }

      // بعد التسجيل: شيت بالأكواد والأرقام السرية + كروت الـ QR للطباعة + ابعت لكل طالب بياناته والكارت على موبايله
      function result(r) {
        const scope = st.group_id ? { group_id: st.group_id } : { grade_id: st.grade_id, no_group: true };
        const gname = st.group_id ? ((o.groups.find(g => g.id === st.group_id) || {}).name || 'المجموعة') : 'من غير مجموعة';
        root.innerHTML = '<h2>' + icon('check') + ' اتسجل ' + num(r.added) + ' طالب</h2>' +
          '<p class="muted" style="margin-top:0">كل طالب أخد كود ورقم سري للبوابة. نزّل الملفات واحتفظ بيها عند الفريق، وابعت لكل طالب بياناته.</p>' +
          '<div class="files">' +
          '<button class="file-b" type="button" data-i="sheet">' + icon('sheet') + '<div><b>شيت الطلاب بالأكواد</b><span class="tiny">الكود والرقم السري والموبايلات — Excel</span></div></button>' +
          (st.group_id ? '<a class="file-b" href="' + CFG.PRINT + '?group=' + st.group_id + '" target="_blank" rel="noopener">' + icon('qr') + '<div><b>كروت الـ QR</b><span class="tiny">جاهزة للطباعة (10 في الورقة)</span></div></a>' : '') +
          (st.group_id ? '<button class="file-b" type="button" data-i="send">' + icon('send') + '<div><b>ابعت لكل طالب بياناته</b><span class="tiny">الكود والرقم السري ولينك البوابة والكارت على موبايله</span></div></button>' : '') + '</div>' +
          (r.skipped.length ? '<p class="muted">اتساب ' + num(r.skipped.length) + ':</p><ul class="feed">' + r.skipped.slice(0, 50).map(s => '<li><div class="grow"><b>صف ' + s.row + (s.name ? ' · ' + esc(s.name) : '') + '</b><div class="tiny">' + esc(s.why) + '</div></div></li>').join('') + '</ul>' : '') +
          '<div class="actions"><button class="btn btn-ink" type="button" data-i="done">تمام</button></div>';
        $('[data-i=done]', root).onclick = () => { close(); o.onDone && o.onDone(st.group_id); };
        $('[data-i=sheet]', root).onclick = e => busy(e.currentTarget, () => groupSheet(scope, gname));
        const sb = $('[data-i=send]', root);
        if (sb) sb.onclick = () => busy(sb, async () => { const x = await API.sendCards({ target: 'group', id: st.group_id, to: 'both' });
          sb.innerHTML = icon('check') + '<div><b>اتبعت لـ ' + num(x.sent) + ' طالب</b><span class="tiny">في تطبيقهم وفي طابور الواتساب</span></div>'; sb.disabled = true; });
      }

      async function start(rows) {
        if (rows.length < 1) return ($('#ierr').textContent = 'الشيت فاضي.');
        if (rows.length > 1001) return ($('#ierr').textContent = 'أكتر من 1000 صف. قسّم الشيت (كل مجموعة لوحدها).');
        const g = guessMap(rows); st.rows = rows; st.map = g.map; st.isHead = g.isHead; st.step = 2; draw();
      }

      function bind() {
        if (st.step === 1) {
          $('#i_grade', root).onchange = () => { st.grade_id = +$('#i_grade', root).value; st.group_id = null; draw(); };
          $('#i_group', root).onchange = () => { st.group_id = $('#i_group', root).value ? +$('#i_group', root).value : null; };
          $('#i_file', root).onchange = async e => {
            const f = e.target.files[0]; if (!f) return;
            try { await start(await readFile(f)); } catch (x) { $('#ierr').textContent = 'الملف ده ماتقراش. جرّب تحفظه Excel (.xlsx) أو انسخ الخانات والصقها.'; }
          };
          $('[data-i=paste]', root).onclick = () => {
            const t = $('#i_paste', root).value;
            if (!t.trim()) return ($('#ierr').textContent = 'اختار ملف أو الصق الخانات الأول.');
            start(readPaste(t));
          };
          $('[data-i=tpl]', root).onclick = () => {
            const csv = '﻿' + ['الاسم,النوع,موبايل الطالب,موبايل ولي الأمر,الكود القديم (اختياري),ملاحظات', 'أحمد محمد علي,ولد,01012345678,01112345678,,'].join('\r\n');
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
            a.download = 'نموذج-الطلاب.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
          };
        } else if (st.step === 2) {
          $$('[data-map]', root).forEach(s => { s.onchange = () => { const v = s.value === '' ? null : +s.value; Object.keys(st.map).forEach(k => { if (st.map[k] === v) delete st.map[k]; }); if (v == null) delete st.map[s.dataset.map]; else st.map[s.dataset.map] = v; draw(); }; });
          $('#i_head', root).onchange = e => { st.isHead = e.target.checked; draw(); };
          $$('[data-gen]', root).forEach(b => { b.onclick = () => { st.gender = b.dataset.gen; draw(); }; });
          $('[data-i=back]', root).onclick = () => { st.step = 1; draw(); };
          const goBtn = $('[data-i=go]', root);
          goBtn.onclick = () => {
            if (st.map.name == null || st.map.phone == null || st.map.parent_phone == null) return ($('#ierr').textContent = 'حدد عمود الاسم وموبايل الطالب وموبايل ولي الأمر.');
            const rows = rowsOut().filter(x => !x.why).map(({ name, gender, phone, parent_phone, code, notes }) => ({ name, gender, phone, parent_phone, code, notes }));
            busy(goBtn, async () => {
              const r = await API.importStudents({ grade_id: st.grade_id, group_id: st.group_id, gender: st.gender || null, rows });
              const pre = rowsOut().filter(x => x.why).map(x => ({ row: x.n, name: x.name, why: x.why === 'مفيش اسم' || x.why === 'ولد ولا بنت؟' ? x.why : x.why + ' مش 11 رقم' }));
              // أرقام الصفوف اللي رجعت من السيرفر بتعد الصفوف السليمة بس ⇒ نرجعها لرقمها في الشيت
              const okRows = rowsOut().filter(x => !x.why);
              r.skipped = pre.concat(r.skipped.map(s => ({ ...s, row: (okRows[s.row - 1] || {}).n || s.row }))).sort((a, b) => a.row - b.row);
              result(r);
            });
          };
        }
      }
      draw();
    });
  }

  // ───── الدرجات: «الكود أو الاسم + الدرجة» من شيت الكويز ─────
  function scores(o) {
    sheet('<h2>' + icon('sheet') + ' الصق الدرجات من شيت</h2>' +
      '<p class="muted" style="margin-top:0">انسخ عمودين من Excel أو Google Sheets: <b>الكود</b> (أو الاسم) و<b>الدرجة</b>، والصقهم هنا. أو اختار الملف.</p>' +
      '<div class="drop"><label class="btn btn-line" for="sc_file">' + icon('upload') + 'اختار ملف</label><input id="sc_file" type="file" accept=".xlsx,.xls,.csv,.ods" hidden></div>' +
      '<div class="field"><textarea class="inp" id="sc_paste" rows="6" dir="auto" placeholder="1001 ⇥ 18&#10;1002 ⇥ 20"></textarea></div><div id="sc_prev"></div>' +
      '<p class="err" id="scerr"></p><div class="actions"><button class="btn btn-ink" type="button" id="sc_go" disabled>سجّل الدرجات</button></div>', box => {
      let found = [];
      const byCode = new Map(o.rows.map(r => [String(r.code), r])), norm = s => String(s).replace(/\s+/g, ' ').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();
      const byName = new Map(o.rows.map(r => [norm(r.name), r]));
      const parse = rows => {
        found = []; const miss = [];
        rows.forEach((r, i) => {
          const cells = r.map(latin), sc = cells.map(c => c.replace(',', '.')).reverse().find(c => /^\d+(\.\d+)?$/.test(c) && +c <= o.max && !byCode.has(c));
          const who = cells.map(c => byCode.get(c)).find(Boolean) || byName.get(norm(r.find(c => /[؀-ۿ]/.test(c)) || ''));
          if (who && sc != null) found.push({ r: who, score: +sc }); else if (i > 0 || cells.some(c => /\d/.test(c))) miss.push(i + 1);
        });
        $('#sc_prev', box).innerHTML = '<div class="imp-sum"><span class="tag ok">' + num(found.length) + ' طالب اتعرف</span>' + (miss.length ? ' <span class="tag bad">' + num(miss.length) + ' صف مااتعرفش</span>' : '') + '</div>' +
          (miss.length ? '<p class="tiny">صفوف: ' + miss.slice(0, 15).join('، ') + (miss.length > 15 ? '…' : '') + ' (الكود مش في الكويز ده أو الدرجة أكبر من ' + o.max + ').</p>' : '');
        $('#sc_go', box).disabled = !found.length; $('#sc_go', box).textContent = 'سجّل ' + num(found.length) + ' درجة';
      };
      $('#sc_paste', box).oninput = e => parse(readPaste(e.target.value));
      $('#sc_file', box).onchange = async e => { const f = e.target.files[0]; if (!f) return; try { parse(await readFile(f)); } catch (x) { $('#scerr').textContent = 'الملف ده ماتقراش.'; } };
      const go = $('#sc_go', box);
      go.onclick = () => busy(go, async () => {
        let done = 0;
        for (let i = 0; i < found.length; i += 8) {            // 8 في المرة عشان مانضغطش على السيرفر
          await Promise.all(found.slice(i, i + 8).map(f => o.save(f.r, f.score).then(() => done++)));
          go.textContent = 'اتسجل ' + done + ' من ' + found.length;
        }
        close(); toast('اتسجلت ' + num(done) + ' درجة'); o.onDone && o.onDone();
      });
    });
  }

  // شيت طلاب (مجموعة أو صف) بالكود والرقم السري — بيتنزل CSV ويتفتح في Excel بالعربي
  async function groupSheet(scope, name) {
    let rows = [];
    for (let off = 0; ; off += 100) {
      const r = await API.students({ ...scope, offset: off, limit: 100 });
      rows = rows.concat(r.rows); if (rows.length >= r.total || !r.rows.length) break;
    }
    if (!rows.length) return toast('مفيش طلاب', 'err');
    const cell = v => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const head = ['الكود', 'الاسم', 'الرقم السري للبوابة', 'موبايل الطالب', 'موبايل ولي الأمر', 'الصف', 'المجموعة'];
    const csv = '﻿' + [head.join(',')].concat(rows.map(s => [s.code, s.name, s.pin, s.phone, s.parent_phone, s.grade, s.group || ''].map(cell).join(','))).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'طلاب-' + String(name).replace(/\s+/g, '-') + '.csv'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('اتنزل شيت ' + rows.length + ' طالب');
  }

  return { students, scores, groupSheet, phone11, gender, readPaste };
})();
