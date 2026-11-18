// recursos_page.js — renderitza la pàgina Recursos (6 espais)
// Nota: aquest fitxer s'executa des del router després de loadView('recursos')

import { RECURSOS } from './recursos.js';

export function initRecursosPage() {
  const grid = document.getElementById('recursosGrid');
  const backBtn = document.getElementById('btnBack');

  if (backBtn) backBtn.addEventListener('click', () => history.back());
  if (!grid) {
    console.warn('[recursos] No he trobat #recursosGrid a la vista.');
    return;
  }

  // Completa fins a 6 amb placeholders
  const filled = [...RECURSOS];
  while (filled.length < 4) {
    filled.push({ title: `Recurs ${filled.length+1}`, desc: 'Afegeix aquí un PDF.', file: '' });
  }
  // Volem 5 i 6 en construcció
  if (filled.length < 5) filled.push({ title: 'Recurs 5 (en construcció)', desc: 'Espai reservat per a un nou PDF. Afegeix-hi títol i enllaç quan el tenguis.', file: '' });
  if (filled.length < 6) filled.push({ title: 'Recurs 6 (en construcció)', desc: 'Espai reservat per a un nou PDF. Afegeix-hi títol i enllaç quan el tenguis.', file: '' });
  const RESOURCES = filled.slice(0, 6);

  function renderCard(r, idx) {
    const hasFile = r.file && String(r.file).trim().length > 0;
    const id = 'viewer_' + idx;

    return `
      <div class="p-7 rounded-2xl bg-white/10 border border-white/10">
        <div>
          <h3 class="text-2xl md:text-3xl font-bold mb-2">${r.title}</h3>
          <p class="text-lg md:text-xl text-gray-100/90">${r.desc}</p>
        </div>

        <div class="mt-5 flex gap-3 flex-wrap">
          ${hasFile
            ? `<a class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 text-lg rounded-xl font-bold" href="${r.file}" target="_blank" rel="noopener">Obrir</a>`
            : `<span class="px-6 py-3 text-lg rounded-xl bg-white/10 text-gray-200/80">Properament</span>`}

          ${hasFile
            ? `<button class="bg-white/15 hover:bg-white/25 text-white px-6 py-3 text-lg rounded-xl font-bold" data-open="${id}">Veure aquí</button>`
            : ``}
        </div>

        ${hasFile
          ? `
            <div class="mt-5 hidden" id="${id}">
              <div class="flex items-center justify-between mb-3 gap-3 flex-wrap">
                <span class="text-sm md:text-base text-gray-100/80">Visor</span>
                <button class="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-base" data-close="${id}">Tornar a recursos</button>
              </div>
              <iframe src="${r.file}" class="w-full" style="height: 72vh; border: 0; border-radius: 14px; background: rgba(255,255,255,0.06);"></iframe>
            </div>
          `
          : ``}
      </div>
    `;
  }

  grid.innerHTML = RESOURCES.map(renderCard).join('');

  grid.addEventListener('click', (e) => {
    const btnOpen = e.target.closest('button[data-open]');
    const btnClose = e.target.closest('button[data-close]');

    if (btnOpen) {
      const id = btnOpen.getAttribute('data-open');
      const panel = document.getElementById(id);
      if (!panel) return;
      const isHidden = panel.classList.contains('hidden');

      // Tanca tots els altres visors
      grid.querySelectorAll('div[id^="viewer_"]').forEach((el) => el.classList.add('hidden'));

      panel.classList.toggle('hidden', !isHidden);
      if (isHidden) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (btnClose) {
      const id = btnClose.getAttribute('data-close');
      const panel = document.getElementById(id);
      if (!panel) return;
      panel.classList.add('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  console.log('[recursos] Renderitzat:', RESOURCES.length, 'recursos');
}
