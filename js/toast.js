// toast.js — Missatges breus (toast) a la part inferior

export function showToast(message, type = 'ok', ms = 2600) {
  const existing = document.getElementById('toast-uib');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.id = 'toast-uib';
  div.setAttribute('role', 'status');
  div.style.position = 'fixed';
  div.style.left = '50%';
  div.style.bottom = '18px';
  div.style.transform = 'translateX(-50%)';
  div.style.zIndex = '9999';
  div.style.maxWidth = '92vw';
  div.style.padding = '12px 16px';
  div.style.borderRadius = '14px';
  div.style.backdropFilter = 'blur(10px)';
  div.style.boxShadow = '0 10px 28px rgba(0,0,0,.25)';
  div.style.fontSize = '16px';
  div.style.fontWeight = '700';
  div.style.color = '#fff';

  if (type === 'err') {
    div.style.background = 'rgba(220, 38, 38, 0.75)';
    div.textContent = message || "No s'han pogut desar les dades. Torna-ho a provar.";
  } else {
    div.style.background = 'rgba(16, 185, 129, 0.70)';
    div.textContent = message || "Les vostres dades s’han enregistrat correctament.";
  }

  document.body.appendChild(div);

  setTimeout(() => {
    div.style.transition = 'opacity .25s ease';
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 260);
  }, ms);
}
