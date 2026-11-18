// practica_area1_lectora.js (v2)
// Catàleg de lectures + PDF + preguntes + correcció + ✅ enregistrament a RTDB
// Tot dins la mateixa vista (sense router ni lectures.js)
//
// Canvis clau (respecte la versió anterior):
// - Afegeix enregistrament a Firebase RTDB: users/{uid}/attempts
// - Desa com a: area=1, mode='practica', tipus='escrita'
// - Afegeix subtest/subtestLabel per distingir Lectura 1, Lectura 2...
// - Corregeix el render de ràdios: ara duen value (A/B/C/D)
// - Comptabilitza blancs i percentatge i evita doble desat

import { AREA1_LECTURES_BY_CONVOCATORIA as AREA1_CONVOCATORIES } from "./lectures/index_lectures_area1.js";
import { showCenterToast } from "./centerToast.js";

import { auth, rtdb } from "./firebase.js";
import { ref, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ===================== Utils ===================== */
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

/* ===================== INIT ===================== */
export function initPracticaArea1Lectora() {
  const list = document.getElementById("a1List");
  const viewer = document.getElementById("lectPdfViewer");
  if (!list) return;

  list.innerHTML = "";
  if (viewer) viewer.innerHTML = "";

  AREA1_CONVOCATORIES.forEach((bloc) => {
    const { any, mes } = metaFromConvocatoria(bloc.convocatoria);

    // Capçalera de convocatòria
    const header = document.createElement("div");
    header.className = "col-span-full mt-6 mb-2 text-lg font-semibold opacity-90";
    header.textContent = `${any} · ${mes}`;
    list.appendChild(header);

    // Títols de lectures
    bloc.lectures.forEach((lectura, idx) => {
      const card = document.createElement("a");
      card.href = "#";
      card.className =
        "block p-5 mb-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition";

      card.innerHTML = `
        <div class="text-lg font-semibold">${lectura.titol}</div>
        <div class="text-sm opacity-80">${lectura.preguntes.length} preguntes de comprensió lectora</div>
        <div class="text-sm opacity-70 mt-2">📄 Obre el PDF i respon</div>
      `;

      card.addEventListener("click", (e) => {
        e.preventDefault();
        openLectura({ lectura, convocatoria: bloc.convocatoria, any, mes, idx });
      });

      list.appendChild(card);
    });
  });
}

/* ===================== Obrir lectura ===================== */
function openLectura({ lectura, convocatoria, any, mes, idx }) {
  const viewer = document.getElementById("lectPdfViewer");
  if (!viewer || !lectura?.pdf) return;

  viewer.innerHTML = "";

  const lecturaNum = (idx ?? 0) + 1;
  const subtest = `lectura${lecturaNum}`;
  const subtestLabel = `Lectura ${lecturaNum}`;

  /* ---- Títol ---- */
  const title = document.createElement("h3");
  title.className = "text-xl font-semibold mb-2";
  title.textContent = `${subtestLabel} · ${lectura.titol}`;

  const meta = document.createElement("div");
  meta.className = "text-sm opacity-70 mb-4";
  meta.textContent = `${any} · ${mes} · ${convocatoria}`;

  /* ---- PDF ---- */
  const iframe = document.createElement("iframe");
  iframe.src = lectura.pdf;
  iframe.width = "100%";
  iframe.height = "650";
  iframe.loading = "lazy";
  iframe.style.border = "1px solid rgba(0,0,0,0.2)";
  iframe.style.background = "white";

  const download = document.createElement("a");
  download.href = lectura.pdf;
  download.target = "_blank";
  download.rel = "noopener";
  download.textContent = "⬇️ Descarregar PDF";
  download.className = "inline-block mt-3 text-blue-600 underline";

  viewer.appendChild(title);
  viewer.appendChild(meta);
  viewer.appendChild(iframe);
  viewer.appendChild(download);

  /* ---- Preguntes ---- */
  lectura.preguntes.forEach((q) => {
    const block = document.createElement("div");
    block.className = "mt-8";

    const optsHtml = Object.entries(q.opcions)
      .map(
        ([k, v]) => `
        <label class="block ml-4">
          <input type="radio" name="q${q.numero}" value="${k}" />
          ${k}) ${v}
        </label>
      `
      )
      .join("");

    block.innerHTML = `
      <div class="font-semibold">${q.numero}. ${q.enunciat}</div>
      <div class="mt-2">${optsHtml}</div>
    `;

    viewer.appendChild(block);
  });

  /* ---- Resultat ---- */
  const result = document.createElement("div");
  result.className = "mt-8 text-sm opacity-90";
  viewer.appendChild(result);

  /* ---- Botó corregir + desar ---- */
  const btn = document.createElement("button");
  btn.textContent = "✅ Corregir i enregistrar lectura";
  btn.className =
    "mt-6 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold";

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
    } catch (e) {
      console.warn("No s'ha pogut desar l'intent de la lectura.", e);
      // permet reintentar
      saved = false;
      btn.disabled = false;
    }
  });

  viewer.appendChild(btn);
  viewer.scrollIntoView({ behavior: "smooth" });
}

/* ===================== Correcció ===================== */
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
