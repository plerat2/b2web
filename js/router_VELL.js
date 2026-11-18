// router.js — rutes principals (CATALÀ B2)
// Basat en hash routing (#/...) i vistes carregades amb loadView()

import { loadView } from './utils.js';
import { requireAuth, doLogout, isAdmin } from './auth_common.js';

import { initPracticaArea1 } from "./practica_area1.js";
import { initPracticaArea1Lectora } from "./practica_area1_lectora.js";

import { initArea1 } from "./area1.js";
import { initLectures } from "./lectures.js";

import { CONVOCATORIES_B2 } from "./convocatories/index.js";

import { iniciarProva, anterior, seguent, acabar } from './app.js';
import { loadLastAttempt, loadRecentAttempts, setupEstadistica } from './stats.js';

// Ruta anterior (botó tornar)
let prevRoute = '#/home';
window.goBack = () => {
  location.hash = prevRoute || '#/home';
};

// Router manual
window.addEventListener('hashchange', routerFn);
window.addEventListener('load', routerFn);

async function routerFn() {
  const user = await requireAuth();
  const h = location.hash || '#/home';

  // Guarda ruta anterior (no la sobreescriguis quan ets a entrenament)
  if (h !== '#/entrenament') prevRoute = h;

  // ─────────────────────────────────────────────
  // 🏠 HOME
  // ─────────────────────────────────────────────
  if (h === '#/home') {
    await loadView('home');

    const who = document.getElementById('who');
    if (who) who.textContent = `Sessió: ${user.email}`;

    document.getElementById('adminLinkWrap')
      ?.classList.toggle('hidden', !isAdmin(user.email));

    document.getElementById('logoutBtn')
      ?.addEventListener('click', doLogout);

    return;
  }

  // ─────────────────────────────────────────────
  // 📝 ÀREA 3 (ENTRENAMENT) — entrenament.html
  // ─────────────────────────────────────────────
  if (h === '#/entrenament') {
    await loadView('entrenament');
    // Si més endavant tens JS específic:
    // const m = await import('./entrenament.js');
    // await m.initEntrenament?.(user);
    return;
  }

  // ─────────────────────────────────────────────
  // 🧪 PRÀCTICA
  // ─────────────────────────────────────────────
  if (h === '#/practica') {
    await loadView('practica');
    return;
  }

  if (h === '#/practica/area1') {
    await loadView('practica_area1');
    initPracticaArea1();
    return;
  }

  if (h === '#/practica/area1-lectora') {
    await loadView('practica_area1_lectora');
    initPracticaArea1Lectora();
    return;
  }

  // ─────────────────────────────────────────────
  // 📖 LECTURES · ÀREA 1 (FLUX ESCRIT)
  // ─────────────────────────────────────────────
  if (h === '#/lectures' || h === '#/lectures/') {
    await loadView('lectures');
    initLectures();
    return;
  }

  if (h.startsWith('#/lectures/')) {
    const [, , convId, lecturaId] = h.split('/');
    await loadView('lectures');
    initLectures(convId, lecturaId || null);
    return;
  }

  // ─────────────────────────────────────────────
  // 🎧 ÀREA 1 ORAL (PROVA COMPLETA)
  // ─────────────────────────────────────────────
  if (h.startsWith('#/area1/')) {
    const convId = h.split('/')[2]; // ex: B2_GEN_26
    await loadView('area1');
    initArea1(convId);
    return;
  }

  // ─────────────────────────────────────────────
  // 📚 CONVOCATÒRIES B2 · ÀREA 2
  // ─────────────────────────────────────────────
  if (h === '#/convocatories') {
  await loadView('convocatories');
  const wrap = document.getElementById('convocatories');
  if (!wrap) return;

  // 1) Estat per convocatòria: fet / assolit (≥60%)
  const statusByConv = Object.create(null);

  try {
    // Llegeix intents recents (el mateix node que usa stats.js)
    const attempts = await loadRecentAttempts(user.uid, 250); // [1](blob:https://m365.cloud.microsoft/1c7031a7-4fa0-411b-ba81-e30d31bdad2b)

    // Només intents de convocatòria d'Àrea 2
    const a2 = (attempts || []).filter(a =>
      a && a.mode === 'convocatoria' &&
      Number(a.area) === 2 &&
      typeof a.convocatoria === 'string'
    );

    for (const a of a2) {
      const convId = a.convocatoria;
      const encerts = Number(a.encerts || 0);
      const total = Number(a.total || 0);

      const percentatge = (typeof a.percentatge === 'number')
        ? a.percentatge
        : (total ? Math.round((encerts / total) * 100) : 0);

      // “Assolit” té prioritat sobre “Fet”
      if (percentatge >= 60) statusByConv[convId] = 'assolit';
      else if (!statusByConv[convId]) statusByConv[convId] = 'fet';
    }
  } catch (e) {
    console.warn('No he pogut calcular estats de convocatòries:', e);
  }

  // 2) Render (afegint data-status perquè el CSS de la vista ho pinti)
  wrap.innerHTML = (CONVOCATORIES_B2 || []).map(c => {
    const status = statusByConv[c.id]; // 'fet' | 'assolit' | undefined
    const statusAttr = status ? `data-status="${status}"` : '';

    // Badge opcional (si el vols): no canvia el color de la targeta
    const badge = status
      ? `<div class="conv-badge">✓ ${status === 'assolit' ? 'Assolit' : 'Fet'}</div>`
      : '';

    return `
      <a href="#/prova/${c.id}" class="conv-card" ${statusAttr}>
        ${badge}
        <div class="conv-label">B2 · ${c.mes} ${c.any}</div>
        <div class="conv-name">Convocatòria B2 · ${c.mes} ${c.any}</div>
        <div class="conv-meta">30 preguntes · Àrea 2</div>
        <div class="conv-link">Accedeix →</div>
      </a>
    `;
  }).join('');

  return;
}
  // ─────────────────────────────────────────────
  // 📝 PROVA ÀREA 2
  // ─────────────────────────────────────────────
  if (h.startsWith('#/prova/')) {
    const id = h.split('/')[2];
    const convocatoria = (CONVOCATORIES_B2 || []).find(c => c.id === id);

    if (!convocatoria) {
      location.hash = '#/convocatories';
      return;
    }

    await loadView('prova');
    iniciarProva(convocatoria.preguntes, {
      mode: 'convocatoria',
      user,
      convocatoria: convocatoria.id
    });

    wire();
    return;
  }

  // ─────────────────────────────────────────────
  // 📊 ESTADÍSTIQUES + DARRERA
  // ─────────────────────────────────────────────
  if (h === '#/darrera') {
    await loadView('darrera');
    const last = await loadLastAttempt(user.uid);
    const m = await import('./stats.js');
    m.renderLastAttempt(document.getElementById('lastWrap'), last);
    return;
  }

  if (h === '#/estadistica') {
    await loadView('estadistica');
    const attempts = await loadRecentAttempts(user.uid, 50);
    setupEstadistica(attempts);
    return;
  }

  // ─────────────────────────────────────────────
  // 📋 RECURSOS (CONEIX LA PROVA)
  // ─────────────────────────────────────────────
  if (h === '#/recursos') {
    await loadView('recursos');
    return;
  }

  // ─────────────────────────────────────────────
  // 💡 CONSELL DEL DIA
  // ─────────────────────────────────────────────
  if (h === '#/consell') {
    await loadView('consell');
    const m = await import('./consell.js');
    await m.initConsell();
    return;
  }

  // ─────────────────────────────────────────────
  // 🔐 ADMIN
  // ─────────────────────────────────────────────
  if (h === '#/admin') {
    location.hash = '#/admin/b2';
    return;
  }

  if (h === '#/admin/b2') {
    if (!isAdmin(user.email)) {
      alert('Accés només per al professor/admin');
      location.hash = '#/home';
      return;
    }

    await loadView('admin_b2');
    const m = await import('./admin_b2.js');
    await m.initAdminB2(user);
    return;
  }
// ─────────────────────────────────────────────
  // 🔁 FALLBACK
  // ─────────────────────────────────────────────
  location.hash = '#/home';
} // ✅ TANCA routerFn()

// ─────────────────────────────────────────────
// Botons dins la prova (FORA de routerFn)
// ─────────────────────────────────────────────
function wire() {
  document.getElementById('btnAnterior')?.addEventListener('click', anterior);
  document.getElementById('btnSeguent')?.addEventListener('click', seguent);
  document.getElementById('btnAcabar')?.addEventListener('click', acabar);
}
