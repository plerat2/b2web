// admin_b2.js — Admin · Seguiment per alumne (B2)
// Vista principal per email, amb detall plegable
// Reutilitza users/{uid}/attempts

import { rtdb } from './firebase.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

/* ===================== Utils ===================== */

function pct(encerts, total) {
  if (!total) return 0;
  return Math.round((encerts / total) * 100);
}

function fmt(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

/* ===================== Render ===================== */

function renderStudents(container, students) {
  container.innerHTML = students.map((s, i) => {
    const statusOk = s.avgPct >= 60;

    return `
      <div class="student-card">
        <div class="student-header">
          <div>
            <div class="student-email">${s.email}</div>
            <div class="student-meta">
              ${s.count} intents · darrer: ${fmt(s.lastTs)}
            </div>
          </div>

          <span class="badge-status ${statusOk ? 'badge-ok' : 'badge-no'}">
            ${statusOk ? '✅ Assolit' : '⚠️ A reforçar'}
          </span>
        </div>

        <div class="mt-3">
          <div class="progress ${statusOk ? 'ok' : 'no'}">
            <span style="width:${s.avgPct}%"></span>
          </div>
          <div class="text-sm mt-1 opacity-80">
            Mitjana global: ${s.avgPct}%
          </div>
        </div>

        <button class="toggle-btn mt-3" data-idx="${i}">
          ▾ Veure detall
        </button>

        <div class="student-detail hidden">
          ${s.attempts.map(a => {
            const p = pct(a.encerts, a.total);
            const ok = p >= 60;
            return `
              <div class="attempt-row">
                <div>
                  ${fmt(a.timestamp)} ·
                  ${a.mode === 'convocatoria' ? 'Convocatòria' : 'Pràctica'}
                  ${a.convocatoria ? `· ${a.convocatoria}` : ''}
                </div>
                <div class="${ok ? 'attempt-ok' : 'attempt-no'}">
                  ${a.encerts}/${a.total} (${p}%)
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  // Activar plegables
  container.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = btn.dataset.idx;
      const detail = container.querySelectorAll('.student-detail')[idx];
      detail.classList.toggle('hidden');
      btn.textContent = detail.classList.contains('hidden')
        ? '▾ Veure detall'
        : '▴ Amaga detall';
    });
  });
};

/* ===================== INIT ===================== */

export async function initAdminB2() {
  const outEl = document.getElementById('b2Out');
  if (!outEl) return;

  outEl.innerHTML = 'Carregant alumnes…';

  const snap = await get(ref(rtdb, 'users'));
  if (!snap.exists()) {
    outEl.innerHTML = 'No hi ha dades d’usuaris.';
    return;
  }

  const usersObj = snap.val();
  const students = [];

  for (const uid of Object.keys(usersObj)) {
    const user = usersObj[uid];
    const attemptsObj = user.attempts || {};
    const attempts = Object.values(attemptsObj);

    if (!attempts.length) continue;

    attempts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const sumEnc = attempts.reduce((acc, a) => acc + Number(a.encerts || 0), 0);
    const sumTot = attempts.reduce((acc, a) => acc + Number(a.total || 0), 0);

    students.push({
      email: attempts[0].email || '(sense email)',
      count: attempts.length,
      lastTs: attempts[0].timestamp,
      avgPct: sumTot ? Math.round((sumEnc / sumTot) * 100) : 0,
      attempts
    });
  }

  // Ordenar per activitat recent
  students.sort((a, b) => b.lastTs - a.lastTs);

  renderStudents(outEl, students);
}