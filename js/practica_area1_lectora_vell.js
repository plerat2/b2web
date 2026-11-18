// practica_area1_lectora.js
// Catàleg de lectures + PDF + preguntes + validació
// Tot dins la mateixa vista (sense router ni lectures.js)

import {
  AREA1_LECTURES_BY_CONVOCATORIA as AREA1_CONVOCATORIES
} from "./lectures/index_lectures_area1.js";
import { showCenterToast } from "./centerToast.js";

/* =====================
   Utils
===================== */

// Convocatòria → any / mes
function metaFromConvocatoria(key) {
  const m = String(key || "").match(/^B2_(GEN|MAIG)_(\d{2})$/i);
  if (!m) return { any: "", mes: "" };

  const mes = m[1] === "GEN" ? "Gener" : "Maig";
  const any = 2000 + Number(m[2]);
  return { any: String(any), mes };
}

/* =====================
   INIT
===================== */

export function initPracticaArea1Lectora() {
  const list = document.getElementById("a1List");
  const viewer = document.getElementById("lectPdfViewer");

  if (!list) return;
  list.innerHTML = "";
  if (viewer) viewer.innerHTML = "";

  AREA1_CONVOCATORIES.forEach(bloc => {
    const { any, mes } = metaFromConvocatoria(bloc.convocatoria);

    // Capçalera de convocatòria
    const header = document.createElement("div");
    header.className = "col-span-full mt-6 mb-2 text-lg font-semibold opacity-90";
    header.textContent = `${any} · ${mes}`;
    list.appendChild(header);

    // Títols de lectures
    bloc.lectures.forEach(lectura => {
      const card = document.createElement("a");
      card.href = "#";

      card.className =
        "block p-5 mb-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 transition";

      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div>
            <div class="text-lg font-semibold mb-1">${lectura.titol}</div>
            <div class="text-sm opacity-80">
              ${lectura.preguntes.length} preguntes de comprensió lectora
            </div>
          </div>
          <div class="text-2xl opacity-70">📄</div>
        </div>
      `;

      card.addEventListener("click", e => {
        e.preventDefault();
        openLectura(lectura);
      });

      list.appendChild(card);
    });
  });
}

/* =====================
   Obrir lectura
===================== */

function openLectura(lectura) {
  const viewer = document.getElementById("lectPdfViewer");
  if (!viewer || !lectura?.pdf) return;

  viewer.innerHTML = "";

  /* ---- Títol ---- */
  const title = document.createElement("h3");
  title.className = "text-xl font-semibold mb-4";
  title.textContent = lectura.titol;

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
  download.textContent = "⬇️ Descarregar PDF";
  download.className = "inline-block mt-3 text-blue-600 underline";

  viewer.appendChild(title);
  viewer.appendChild(iframe);
  viewer.appendChild(download);

  /* ---- Preguntes ---- */
  lectura.preguntes.forEach(q => {
    const block = document.createElement("div");
    block.className = "mt-8";

    block.innerHTML = `
      <div class="font-medium mb-2">
        ${q.numero}. ${q.enunciat}
      </div>
      ${Object.entries(q.opcions).map(([k, v]) => `
        <label class="block ml-5 mb-1">
          <input type="radio" name="q${q.numero}" value="${k}">
          ${k}) ${v}
        </label>
      `).join("")}
    `;

    viewer.appendChild(block);
  });

  /* ---- Botó corregir ---- */
  const btn = document.createElement("button");
  btn.textContent = "✅ Corregir lectura";
  btn.className =
    "mt-10 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold";

  btn.addEventListener("click", () => corregirLectura(lectura));

  viewer.appendChild(btn);

  viewer.scrollIntoView({ behavior: "smooth" });
}

/* =====================
   Correcció
===================== */

function corregirLectura(lectura) {
  let encerts = 0;

  lectura.preguntes.forEach(q => {
    const marcada = document.querySelector(
      `input[name="q${q.numero}"]:checked`
    )?.value;

    if (marcada === q.resposta) encerts++;
  });

  const total = lectura.preguntes.length;
  const aprovada = encerts >= Math.ceil(total * 0.6);

  if (typeof showCenterToast === "function") {
    showCenterToast(
      aprovada
        ? `✅ Enhorabona! Lectura superada (${encerts}/${total})`
        : `❌ Lectura no superada (${encerts}/${total}). Torna-ho a provar.`,
      aprovada ? "ok" : "warn",
      4500
    );
  } else {
    alert(
      aprovada
        ? `✅ Enhorabona! Lectura superada (${encerts}/${total})`
        : `❌ Lectura no superada (${encerts}/${total}). Torna-ho a provar.`
    );
  }
}