// practica_area1_lectora.js (v3)
// ✅ Catàleg de lectures amb targetes de color (verd-teal) com l'oral
// ✅ Marca Pendent/Fet/Assolit amb data-status i llegenda coherent amb Àrea 2
// ✅ Enregistra intents a RTDB (ja ho feia la v2)

import { AREA1_LECTURES_BY_CONVOCATORIA as AREA1_CONVOCATORIES } from "./lectures/index_lectures_area1.js";
import { showCenterToast } from "./centerToast.js";

import { auth, rtdb } from "./firebase.js";
import { ref, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { loadRecentAttempts } from "./stats.js";

// Convocatòria → any / mes
function metaFromConvocatoria(key) {
  const m = String(key || "").match(/^B2_(GEN|MAIG)_(\d{2})$/i);
  if (!m) return { any: "", mes: "" };
  const mes = m[1].toUpperCase() === "GEN" ? "Gener" : "Maig";
  const any = 2000 + Number(m[2]);
  return { any: String(any), mes };
}

function pct(encerts, total) {
  if (!total) return 0;
  return Math.round((encerts / total) * 100);
}

async function savePracticaEscritaAttempt(report) {
  const user = auth.currentUser;
  if (!user) throw new Error("No hi ha usuari autenticat");

  const attempt = {
    uid: user.uid,
    email: user.email,
    area: 1,
    mode: "practica",
    tipus: "escrita",
    ...report,
    timestamp: Date.now(),
  };

  await push(ref(rtdb, `users/${user.uid}/attempts`), attempt);
}

function buildStatusByLectura(attempts) {
  const status = Object.create(null);

  const escrita = (attempts || []).filter(a =>
    a && Number(a.area ?? a.areaId) === 1 &&
    a.mode === 'practica' &&
    a.tipus === 'escrita' &&
    typeof a.convocatoria === 'string' &&
    typeof a.subtest === 'string'
  );

  for (const a of escrita) {
    const key = `${a.convocatoria}|${a.subtest}`;
    const encerts = Number(a.encerts || 0);
    const total = Number(a.total || 0);
    const p = (typeof a.percentatge === 'number') ? a.percentatge : pct(encerts, total);

    // Assolit té prioritat
    if (p >= 60) status[key] = 'assolit';
    else if (!status[key]) status[key] = 'fet';
  }

  return status;
}

export function initPracticaArea1Lectora() {
  const list = document.getElementById("a1List");
  const viewer = document.getElementById("lectPdfViewer");
  if (!list) return;

  list.innerHTML = "";
  if (viewer) viewer.innerHTML = "";

  // 1) Render catàleg
  AREA1_CONVOCATORIES.forEach((bloc) => {
    const { any, mes } = metaFromConvocatoria(bloc.convocatoria);

    const header = document.createElement("div");
    header.className = "l1-group";
    header.textContent = `${any} · ${mes} · ${bloc.convocatoria}`;
    list.appendChild(header);

    bloc.lectures.forEach((lectura, idx) => {
      const lecturaNum = (idx ?? 0) + 1;
      const subtest = `lectura${lecturaNum}`;

      const card = document.createElement("a");
      card.href = "#";
      card.className = "l1-card";
      card.dataset.key = `${bloc.convocatoria}|${subtest}`;

      card.innerHTML = `
        <div class="l1-card-title">${lectura.titol}</div>
        <div class="l1-card-sub">${subtest.toUpperCase()} · ${bloc.convocatoria}</div>
        <div class="l1-card-meta">📄 ${lectura.preguntes.length} preguntes</div>
        <div class="l1-card-cta">Obre i respon →</div>
      `;

      card.addEventListener("click", (e) => {
        e.preventDefault();
        openLectura({ lectura, convocatoria: bloc.convocatoria, any, mes, idx });
      });

      list.appendChild(card);
    });
  });

  // 2) Aplica estats fet/assolit
  (async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const attempts = await loadRecentAttempts(user.uid, 400);
      const statusByKey = buildStatusByLectura(attempts);

      list.querySelectorAll('a[data-key]').forEach(a => {
        const key = a.dataset.key;
        const st = statusByKey[key];
        if (st) a.setAttribute('data-status', st);
      });
    } catch (e) {
      console.warn('No he pogut marcar estats de pràctica lectora (Àrea 1):', e);
    }
  })();
}

function openLectura({ lectura, convocatoria, any, mes, idx }) {
  const viewer = document.getElementById("lectPdfViewer");
  if (!viewer || !lectura?.pdf) return;

  viewer.innerHTML = "";

  const lecturaNum = (idx ?? 0) + 1;
  const subtest = `lectura${lecturaNum}`;
  const subtestLabel = `Lectura ${lecturaNum}`;

  // Títol
  const title = document.createElement("h3");
  title.className = "text-xl font-semibold mb-2";
  title.style.marginTop = "1.2rem";
  title.textContent = `${subtestLabel} · ${lectura.titol}`;

  const meta = document.createElement("div");
  meta.className = "text-sm";
  meta.style.opacity = "0.75";
  meta.textContent = `${any} · ${mes} · ${convocatoria}`;

  // PDF
  const iframe = document.createElement("iframe");
  iframe.src = lectura.pdf;
  iframe.width = "100%";
  iframe.height = "650";
  iframe.loading = "lazy";
  iframe.style.border = "1px solid rgba(255,255,255,0.18)";
  iframe.style.borderRadius = "14px";
  iframe.style.background = "white";

  const download = document.createElement("a");
  download.href = lectura.pdf;
  download.target = "_blank";
  download.rel = "noopener";
  download.textContent = "⬇️ Descarregar PDF";
  download.style.display = "inline-block";
  download.style.marginTop = "10px";
  download.style.color = "#93c5fd";
  download.style.textDecoration = "underline";

  viewer.appendChild(title);
  viewer.appendChild(meta);
  viewer.appendChild(iframe);
  viewer.appendChild(download);

  // Preguntes
  lectura.preguntes.forEach((q) => {
    const block = document.createElement("div");
    block.className = "mt-8";

    const optsHtml = Object.entries(q.opcions)
      .map(([k, v]) => `
        <label class="block ml-4" style="margin-top:6px;">
          <input type="radio" name="q${q.numero}" value="${k}" />
          ${k}) ${v}
        </label>
      `)
      .join("");

    block.innerHTML = `
      <div class="font-semibold">${q.numero}. ${q.enunciat}</div>
      <div class="mt-2">${optsHtml}</div>
    `;

    viewer.appendChild(block);
  });

  // Resultat
  const result = document.createElement("div");
  result.className = "mt-8 text-sm opacity-90";
  viewer.appendChild(result);

  // Botó corregir + desar (color coherent amb lectora)
  const btn = document.createElement("button");
  btn.textContent = "✅ Corregir i enregistrar lectura";
  btn.style.marginTop = "16px";
  btn.style.padding = "12px 18px";
  btn.style.borderRadius = "14px";
  btn.style.background = "linear-gradient(145deg,#0f766e,#22c55e)";
  btn.style.color = "white";
  btn.style.fontWeight = "900";
  btn.style.border = "1px solid rgba(255,255,255,.18)";
  btn.style.cursor = "pointer";

  let saved = false;
  btn.addEventListener("click", async () => {
    if (saved) return;
    saved = true;
    btn.disabled = true;

    const { encerts, total, blancs, percentatge } = corregirLectura(lectura);
    result.textContent = `Resultat: ${encerts}/${total} (${percentatge}%) · Blancs: ${blancs}`;

    const aprovada = percentatge >= 60;
    showCenterToast(
      aprovada
        ? `✅ Enhorabona! Lectura superada (${encerts}/${total})`
        : `❌ Lectura no superada (${encerts}/${total}). Torna-ho a provar.`,
      aprovada ? "ok" : "warn",
      4500
    );

    try {
      await savePracticaEscritaAttempt({
        convocatoria,
        subtest,
        subtestLabel,
        titol: lectura.titol,
        encerts,
        total,
        blancs,
        percentatge,
      });
      console.log("✅ Intent lectura desat", { convocatoria, subtest, encerts, total });

      // Actualitza estat de la targeta immediatament
      const key = `${convocatoria}|${subtest}`;
      const card = document.querySelector(`a.l1-card[data-key="${key}"]`);
      if (card) card.setAttribute('data-status', (percentatge >= 60) ? 'assolit' : 'fet');

    } catch (e) {
      console.warn("No s'ha pogut desar l'intent de la lectura.", e);
      saved = false;
      btn.disabled = false;
    }
  });

  viewer.appendChild(btn);
  viewer.scrollIntoView({ behavior: "smooth" });
}

function corregirLectura(lectura) {
  let encerts = 0;
  let blancs = 0;

  lectura.preguntes.forEach((q) => {
    const marcada = document.querySelector(`input[name="q${q.numero}"]:checked`)?.value;
    if (marcada == null) {
      blancs++;
      return;
    }
    if (marcada === q.resposta) encerts++;
  });

  const total = lectura.preguntes.length;
  const percentatge = pct(encerts, total);
  return { encerts, total, blancs, percentatge };
}
