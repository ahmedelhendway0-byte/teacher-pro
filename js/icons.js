// الأيقونات (خطية موحّدة 24×24) — بتتحط مرة واحدة في كل صفحة
(() => {
  const S = (id, d, extra) => '<symbol id="i-' + id + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + d + '</symbol>';
  const icons = [
    S('check', '<path d="M4 12.5l5 5L20 6.5"/>'),
    S('x', '<path d="M6 6l12 12M18 6L6 18"/>'),
    S('home', '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-5h4v5"/>'),
    S('groups', '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14a6 6 0 013.5 6"/>'),
    S('settings', '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'),
    S('plus', '<path d="M12 5v14M5 12h14"/>'),
    S('lock', '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
    S('out', '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>'),
    S('eye', '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    S('pen', '<path d="M15 4l5 5L9 20H4v-5z"/><path d="M13 6l5 5"/>'),
    S('archive', '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v11h14V9M10 13h4"/>'),
    S('student', '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v5"/>'),
    S('team', '<circle cx="12" cy="7" r="3.5"/><path d="M5 21a7 7 0 0114 0"/>'),
    S('search', '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'),
    S('door', '<path d="M5 21V4a1 1 0 011-1h9l4 2v16"/><path d="M3 21h18M15 3v18M11.5 12h.01"/>'),
    S('chev', '<path d="M15 6l-6 6 6 6"/>'),
    S('qr', '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M17 21h4v-4M14 21v-3"/>'),
    S('nfc', '<rect x="3" y="5" width="12" height="16" rx="2"/><path d="M18 8a6 6 0 010 8M20.5 5.5a10 10 0 010 13"/>'),
    S('cash', '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>'),
    S('ticket', '<path d="M3 8a2 2 0 002-2h14a2 2 0 002 2v2a2 2 0 000 4v2a2 2 0 00-2 2H5a2 2 0 00-2-2v-2a2 2 0 000-4z"/><path d="M14 6v12" stroke-dasharray="2 2.5"/>'),
    S('undo', '<path d="M15 7l5 5-5 5"/><path d="M20 12H9a5 5 0 000 10h2"/>'),
    S('print', '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>'),
    S('receipt', '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>'),
    S('wa', '<path d="M4 20l1.3-3.9A8 8 0 1112 20a8 8 0 01-4.1-1.1z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-1.5-1-2-2l1-1-1-2z"/>'),
    S('send', '<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/>'),
    S('book', '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21V5M8 7h7"/>'),
    S('trophy', '<path d="M7 4h10v5a5 5 0 01-10 0z"/><path d="M7 6H4a3 3 0 003 4M17 6h3a3 3 0 01-3 4M12 14v4M8 21h8"/>'),
    S('image', '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'),
    S('more', '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'),
    S('chart', '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    S('bell', '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 21h4"/>'),
    S('bolt', '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>'),
    S('fire', '<path d="M12 21c-4 0-7-3-7-7 0-4 4-6 4-10 3 2 5 5 5 8 1-1 2-2 2-4 2 2 3 4 3 6 0 4-3 7-7 7z"/>'),
    S('user', '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'),
    S('star', '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>')
  ];
  const svg = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' + icons.join('') + '</defs></svg>';
  document.body.insertAdjacentHTML('afterbegin', svg);
})();
