// admin.js — Panell professorat: filtres + export CSV per categories (sense regex)

import { rtdb } from './firebase.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { isAdmin } from './auth_common.js';
import { CATEGORIES } from './report.js';

function pct(encerts, total) {
  if (!total) return 0;
  return Math.round((encerts / total) * 100);
}

function toISO(ts) {
  try { return new Date(ts).toISOString(); } catch { return String(ts); }
}

function toLocal(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return String(ts); }
}

function downloadCSV(filename, rows) {
  const esc = (v) => {
    const s = String(v ?? '');

    // ✅ Sense regex: robust i impossible de “rompre” per enganxat
    const needsQuotes =
      s.includes('\n') ||
      s.includes('\r') ||
      s.includes('\t') ||
      s.includes(',') ||
      s.includes('"');

    if (needsQuotes) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };

  const csv = rows.map(r => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function getMode() {
  return document.querySelector('input[name="admMode"]:checked')?.value || 'practica';
}
function getRangeDays() {
  const v = document.getElementById('admRange')?.value || 'all';
  if (v === 'all') return null;
  return Number(v);
}
function getSelectedYear() {
  return document.getElementById('admYear')?.value || 'all';
}
function getSearch() {
  return (document.getElementById('admSearch')?.value || '').toLowerCase().trim();
}
function withinRange(ts, days) {
  if (!days) return true;
  const cutoff = Date.now() - days * 24 * 3600 * 1000;
  return (ts || 0) >= cutoff;
}
function attemptMatches(a, mode, year, days) {
  if (mode && a.mode !== mode) return false;

  if (mode === 'convocatoria') {
    if (year && year !== 'all' && String(a.convocatoria || '') !== String(year)) return false;
  }

  if (!withinRange(a.timestamp, days)) return false;
  return true;
}

function aggregateByCategory(attempts) {
  const agg = {};
  for (const c of CATEGORIES) agg[c] = { encerts: 0, total: 0, errors: 0 };

  for (const a of attempts) {
    const bd = a.breakdown || {};
    for (const [cat, val] of Object.entries(bd)) {
      if (!agg[cat]) agg[cat] = { encerts: 0, total: 0, errors: 0 };
      agg[cat].encerts += Number(val?.encerts || 0);
      agg[cat].total += Number(val?.total || 0);
    }

    const errs = Array.isArray(a.errors) ? a.errors : [];
    for (const e of errs) {
      const c = e.categoria || 'Altres';
      if (!agg[c]) agg[c] = { encerts: 0, total: 0, errors: 0 };
      agg[c].errors += 1;
    }
  }

  return Object.entries(agg)
    .filter(([_, v]) => v.total > 0 || v.errors > 0)
    .map(([cat, v]) => ({
      cat,
      encerts: v.encerts,
      total: v.total,
      pct: pct(v.encerts, v.total),
      errors: v.errors
    }))
    .sort((a, b) => b.pct - a.pct);
}

function lastAttempt(attempts) {
  return [...attempts].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0] || null;
}

function buildStudentIndex(usersObj) {
  const list = [];
  for (const [uid, udata] of Object.entries(usersObj || {})) {
    const attsObj = udata?.attempts || {};
    const attempts = Object.entries(attsObj).map(([id, a]) => ({ id, ...a }));
    const email = attempts.find(a => a.email)?.email || udata?.email || '';
    list.push({ uid, email, attempts });
  }
  return list;
}

function applyFilters(students) {
  const mode = getMode();
  const year = getSelectedYear();
  const days = getRangeDays();
  const q = getSearch();

  const filtered = students
    .filter(s => !q || (s.email || '').toLowerCase().includes(q))
    .map(s => ({
      ...s,
      filteredAttempts: s.attempts.filter(a => attemptMatches(a, mode, year, days))
    }));

  return { mode, year, days, q, filtered };
}

function renderStudents(el, students, onSelect) {
  if (!students.length) {
    el.innerHTML = '<p class="text-gray-200">No hi ha alumnes amb aquestes condicions.</p>';
    return;
  }

  el.innerHTML = students.map(s => {
    const la = lastAttempt(s.filteredAttempts);
    const pctLast = la ? (la.percentatge ?? pct(la.encerts, la.total)) : null;
    const when = la ? toLocal(la.timestamp) : '—';

    return `
      <button data-uid="${s.uid}" class="w-full text-left px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10">
        <div class="flex items-center justify-between">
          <div class="font-bold text-lg">${s.email || s.uid}</div>
          <div class="font-bold text-lg">${pctLast == null ? '—' : pctLast + '%'}</div>
        </div>
        <div class="text-sm text-gray-200">Darrer: ${when} · intents: ${s.filteredAttempts.length}</div>
      </button>`;
  }).join('');

  el.querySelectorAll('button[data-uid]').forEach(btn => {
    btn.addEventListener('click', () => onSelect(btn.getAttribute('data-uid')));
  });
}

function renderGroupSummary(el, students) {
  const all = students.flatMap(s => s.filteredAttempts);
  const catRows = aggregateByCategory(all);

  if (!catRows.length) {
    el.innerHTML = '<p class="text-gray-200">Encara no hi ha dades per aquest filtre.</p>';
    return { allAttempts: all, catRows };
  }

  el.innerHTML = catRows.map(r => `
    <div>
      <div class="flex justify-between text-lg"><span>${r.cat}</span><strong>${r.pct}%</strong></div>
      <div class="bg-white/10 rounded-xl overflow-hidden">
        <div class="h-5 bg-green-500/60" style="width:${r.pct}%;"></div>
      </div>
      <div class="text-sm text-gray-200 mt-1">${r.encerts}/${r.total} · errades: <strong>${r.errors}</strong></div>
    </div>
  `).join('');

  return { allAttempts: all, catRows };
}

function renderStudentDetail(el, student) {
  if (!student) {
    el.innerHTML = 'Selecciona un alumne.';
    return;
  }

  const la = lastAttempt(student.filteredAttempts);
  const pctLast = la ? (la.percentatge ?? pct(la.encerts, la.total)) : null;
  const when = la ? toLocal(la.timestamp) : '—';

  const catRows = aggregateByCategory(student.filteredAttempts);
  const rowsHtml = catRows.length
    ? catRows.map(r => `
        <div>
          <div class="flex justify-between text-lg"><span>${r.cat}</span><strong>${r.pct}%</strong></div>
          <div class="bg-white/10 rounded-xl overflow-hidden">
            <div class="h-5 bg-emerald-500/60" style="width:${r.pct}%;"></div>
          </div>
          <div class="text-sm text-gray-200 mt-1">${r.encerts}/${r.total} · errades: <strong>${r.errors}</strong></div>
        </div>
      `).join('')
    : '<p class="text-gray-200">—</p>';

  el.innerHTML = `
    <div class="mb-3">
      <div class="text-xl font-bold">${student.email || student.uid}</div>
      <div class="text-gray-200">Darrer intent: ${when} · ${pctLast == null ? '—' : pctLast + '%'} · intents (filtrats): ${student.filteredAttempts.length}</div>
    </div>
    <div class="space-y-3">${rowsHtml}</div>
  `;
}

function computeYearsForConvocatoria(students) {
  const years = new Set();
  for (const s of students) {
    for (const a of s.attempts) {
      if (a.mode === 'convocatoria' && a.convocatoria) years.add(String(a.convocatoria));
    }
  }
  return Array.from(years).sort((a, b) => Number(b) - Number(a));
}

function setYearUI(mode, years) {
  const wrap = document.getElementById('yearWrap');
  const sel = document.getElementById('admYear');
  if (!wrap || !sel) return;

  if (mode !== 'convocatoria') {
    wrap.classList.add('hidden');
    return;
  }
  wrap.classList.remove('hidden');

  sel.innerHTML = ['all', ...years].map(y => {
    const label = (y === 'all') ? 'Tots' : y;
    return `<option value="${y}">${label}</option>`;
  }).join('');
}

function exportStudentByCategory(students, mode, year) {
  const header = ['email','mode','any','categoria','encerts','total','percentatge','intents','errades','darrerTimestampISO'];
  const rows = [header];

  for (const s of students) {
    const atts = s.filteredAttempts;
    const byCat = aggregateByCategory(atts);
    const la = lastAttempt(atts);
    const lastIso = la ? toISO(la.timestamp) : '';

    for (const c of byCat) {
      rows.push([
        s.email || s.uid,
        mode,
        mode === 'convocatoria' ? (year === 'all' ? (la?.convocatoria || '') : year) : '',
        c.cat,
        c.encerts,
        c.total,
        c.pct,
        atts.length,
        c.errors,
        lastIso
      ]);
    }
  }

  const fname = (mode === 'convocatoria')
    ? `CEPA_convocatories_${year}.alumne_categoria.csv`
    : `CEPA_practica.alumne_categoria.csv`;

  downloadCSV(fname, rows);
}

function exportGroupByCategory(students, mode, year) {
  const header = ['mode','any','categoria','encerts','total','percentatge','errades','intents','alumnesAmbDades'];
  const rows = [header];

  const all = students.flatMap(s => s.filteredAttempts);
  const catRows = aggregateByCategory(all);
  const alumnesAmbDades = students.filter(s => s.filteredAttempts.length > 0).length;

  for (const c of catRows) {
    rows.push([
      mode,
      mode === 'convocatoria' ? year : '',
      c.cat,
      c.encerts,
      c.total,
      c.pct,
      c.errors,
      all.length,
      alumnesAmbDades
    ]);
  }

  const fname = (mode === 'convocatoria')
    ? `CEPA_convocatories_${year}.grup_categoria.csv`
    : `CEPA_practica.grup_categoria.csv`;

  downloadCSV(fname, rows);
}

function exportErrorsDetail(students, mode, year) {
  const header = ['email','mode','any','timestampISO','categoria','preguntaId','respostaUsuari','respostaCorrecta'];
  const rows = [header];

  for (const s of students) {
    for (const a of s.filteredAttempts) {
      const errs = Array.isArray(a.errors) ? a.errors : [];
      for (const e of errs) {
        rows.push([
          s.email || s.uid,
          a.mode,
          a.mode === 'convocatoria' ? (a.convocatoria || '') : '',
          toISO(a.timestamp),
          e.categoria || '',
          e.id || '',
          e.respostaUsuari ?? '',
          e.respostaCorrecta ?? ''
        ]);
      }
    }
  }

  const fname = (mode === 'convocatoria')
    ? `CEPA_convocatories_${year}.errades_detall.csv`
    : `CEPA_practica.errades_detall.csv`;

  downloadCSV(fname, rows);
}

export async function initAdmin(currentUser) {
  if (!currentUser || !isAdmin(currentUser.email)) {
    alert('Accés només per al professor/admin');
    location.hash = '#/home';
    return;
  }

  const status = document.getElementById('admStatus');
  const studentsEl = document.getElementById('students');
  const groupEl = document.getElementById('groupSummary');
  const detailEl = document.getElementById('studentDetail');

  if (status) status.textContent = 'Carregant dades…';

  async function loadAll() {
    const snap = await get(ref(rtdb, 'users'));
    return snap.exists() ? snap.val() : {};
  }

  let rawUsers = await loadAll();
  let students = buildStudentIndex(rawUsers);

  function refreshYears() {
    const mode = getMode();
    const years = computeYearsForConvocatoria(students);
    setYearUI(mode, years);
  }

  function renderAll() {
    const { mode, year, filtered } = applyFilters(students);

    if (status) {
      const nStudents = filtered.filter(s => s.filteredAttempts.length > 0).length;
      const nAttempts = filtered.reduce((acc, s) => acc + s.filteredAttempts.length, 0);
      status.textContent = `Alumnes amb dades: ${nStudents} · Intents: ${nAttempts}`;
    }

    const selectedUid = sessionStorage.getItem('admin_selected_uid');

    renderStudents(studentsEl, filtered, (uid) => {
      sessionStorage.setItem('admin_selected_uid', uid);
      const s = filtered.find(x => x.uid === uid);
      renderStudentDetail(detailEl, s);
    });

    renderGroupSummary(groupEl, filtered);

    if (selectedUid) {
      const s = filtered.find(x => x.uid === selectedUid);
      if (s) renderStudentDetail(detailEl, s);
    }

    // Exports (cada click torna a exportar)
    document.getElementById('btnExportStudentCat').onclick = () => exportStudentByCategory(filtered, mode, year);
    document.getElementById('btnExportGroupCat').onclick = () => exportGroupByCategory(filtered, mode, year);
    document.getElementById('btnExportErrors').onclick = () => exportErrorsDetail(filtered, mode, year);
  }

  // listeners
  document.querySelectorAll('input[name="admMode"]').forEach(r => r.addEventListener('change', () => {
    refreshYears();
    renderAll();
  }));
  document.getElementById('admYear')?.addEventListener('change', renderAll);
  document.getElementById('admRange')?.addEventListener('change', renderAll);
  document.getElementById('admSearch')?.addEventListener('input', renderAll);
  document.getElementById('btnReload')?.addEventListener('click', async () => {
    if (status) status.textContent = 'Recarregant…';
    rawUsers = await loadAll();
    students = buildStudentIndex(rawUsers);
    refreshYears();
    renderAll();
  });

  refreshYears();
  renderAll();

  if (status) status.textContent = 'Llest.';
}


