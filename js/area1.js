// area1.js — Àrea 1 (oral + lectora)
// ✅ Oral: 2 blocs independents (5 + 5) amb correcció i feedback immediat
// ✅ Desa 2 intents separats (un per bloc) a RTDB (users/{uid}/attempts)
// ✅ Escrita (lectora): 1 intent per lectura (5 preguntes) amb correcció i desat
// ✅ "Finalitzar" només mostra resum (no desa), per evitar intents extra

import { AREA1_CONVOCATORIES } from "./convocatories/area1/index_area1.js";
import { AREA1_LECTURES_BY_CONVOCATORIA } from "./lectures/index_lectures_area1.js";

import { auth, rtdb } from "./firebase.js";
import { ref, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { showCenterToast } from "./centerToast.js";

/* ---------- Utils ---------- */
function pct(encerts, total) {
  if (!total) return 0;
  return Math.round((encerts / total) * 100);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getConv(convId) {
  return AREA1_CONVOCATORIES.find(x => x.convocatoria === convId || x.id === convId);
}

/* ---------- Render preguntes ---------- */
function renderQuestion(q) {
  const opts = q.opcions || {};
  const letters = Object.keys(opts);

  return `
    <div class="mb-3">
      <div class="font-medium mb-1">${q.numero}. ${escapeHtml(q.enunciat)}</div>
      ${letters.map(k => `
        <label class="block ml-4">
          <input type="radio" name="q${q.numero}" value="${escapeHtml(k)}" />
          ${escapeHtml(k)}) ${escapeHtml(opts[k])}
        </label>
      `).join("")}
    </div>
  `;
}

/* ---------- Correcció per un conjunt de preguntes ---------- */
function gradeQuestions(questions) {
  let encerts = 0;
  let blancs = 0;
  const errors = [];

  questions.forEach(q => {
    const chosen =
      document.querySelector(`input[name="q${q.numero}"]:checked`)?.value ?? null;

    if (chosen == null) {
      blancs++;
      return;
    }

    if (q.anulada || q.resposta === "*" || chosen === q.resposta) {
      encerts++;
    } else {
      errors.push({ numero: q.numero, triat: chosen, correcte: q.resposta });
    }
  });

  const total = questions.length;
  const percentatge = pct(encerts, total);
  return { encerts, total, blancs, percentatge, errors };
}

/* ---------- Guardar intent (RTDB) ---------- */
async function saveAttemptArea1(payload, mode = "practica") {
  const user = auth.currentUser;
  if (!user) throw new Error("No hi ha usuari autenticat");

  const attempt = {
    uid: user.uid,
    email: user.email,
    area: 1,
    mode, // "practica" per ús de classe
    ...payload,
    timestamp: Date.now(),
  };

  await push(ref(rtdb, `users/${user.uid}/attempts`), attempt);
}

/* ---------- Bloc d’àudio (5 preguntes) ---------- */
function mountAudioBlock({
  container,
  title,
  audioUrl,
  questions,
  convId,
  blocKey,        // "audio1" / "audio2"
  blocLabelShort, // "Àudio 1" / "Àudio 2"
  playsMax = 2
}) {
  let playsUsed = 0;
  let started = false;
  let isPlaying = false;
  let saved = false;

  container.innerHTML = `
    <h3 class="text-xl font-semibold mb-2">${escapeHtml(title)}</h3>

    <div class="mb-2">
      Reproduccions: <span class="plays">0</span> / ${playsMax}
      <span class="status ml-3 text-sm opacity-80"></span>
    </div>

    <div class="mb-3">
      <button class="startBtn px-3 py-1 bg-blue-600 text-white rounded">Començar àudio ▶️</button>
      <button class="playBtn px-3 py-1 bg-blue-600 text-white rounded hidden">Reproduir</button>
    </div>

    <audio class="audio hidden" src="${audioUrl || ""}"></audio>

    ${questions.map(renderQuestion).join("")}

    <div class="mt-4 flex items-center gap-3">
      <button class="gradeBtn px-3 py-1 bg-emerald-600 text-white rounded font-semibold">
        Corregir aquest bloc ✅
      </button>
      <div class="blockResult text-sm opacity-90"></div>
    </div>
  `;

  const playsEl = container.querySelector(".plays");
  const startBtn = container.querySelector(".startBtn");
  const playBtn = container.querySelector(".playBtn");
  const audioEl = container.querySelector(".audio");
  const statusEl = container.querySelector(".status");
  const gradeBtn = container.querySelector(".gradeBtn");
  const blockResultEl = container.querySelector(".blockResult");

  function updateStatus(msg = "") {
    statusEl.textContent = msg;
  }

  function updatePlaysUI() {
    playsEl.textContent = String(playsUsed);
    if (!started) return;

    if (playsUsed >= playsMax) {
      playBtn.disabled = true;
      updateStatus("Reproduccions esgotades.");
    } else {
      playBtn.disabled = false;
      updateStatus(`Et queden ${playsMax - playsUsed} escoltes.`);
    }
  }

  startBtn.onclick = () => {
    started = true;
    startBtn.classList.add("hidden");
    playBtn.classList.remove("hidden");
    audioEl.classList.remove("hidden");
    updatePlaysUI();
  };

  playBtn.onclick = async () => {
    if (!started || playsUsed >= playsMax || isPlaying) return;
    try {
      isPlaying = true;
      updateStatus("Reproduint...");
      await audioEl.play();
    } catch {
      updateStatus("Error de reproducció.");
      isPlaying = false;
    }
  };

  audioEl.addEventListener("ended", () => {
    isPlaying = false;
    playsUsed += 1;
    updatePlaysUI();
  });

  // ✅ Correcció + desat del bloc (1 intent per bloc)
  gradeBtn.onclick = async () => {
    if (saved) return; // evita doble desat (doble clic)
    saved = true;
    gradeBtn.disabled = true;

    const { encerts, total, blancs, percentatge, errors } = gradeQuestions(questions);
    blockResultEl.textContent = `Resultat bloc: ${encerts}/${total} (${percentatge}%)`;

    if (percentatge >= 60) {
      showCenterToast("✅ Bloc assolit (≥60%).", "ok", 2500);
    } else {
      showCenterToast("ℹ️ Objectiu del bloc: 60%.", "warn", 2500);
    }

    try {
      await saveAttemptArea1(
        {
          convocatoria: convId,
          tipus: "oral",               // ✅ distinció
          subtest: blocKey,
          subtestLabel: blocLabelShort, // "Àudio 1" / "Àudio 2"
          encerts,
          total,                        // ✅ 5
          blancs,
          percentatge,
          audioPlaysUsed: playsUsed,
          errors
        },
        "practica"
      );
      console.log("✅ Intent bloc oral desat:", blocKey);
    } catch (e) {
      console.warn("No s'ha pogut desar l'intent del bloc oral.", e);
    }
  };

  return { getPlaysUsed: () => playsUsed };
}

/* ---------- Lectura (5 preguntes) amb correcció + desat ---------- */
function mountLecturaCard({
  parentEl,
  lectura,
  convId,
  idx // 0..n-1
}) {
  // per evitar doble guardat per lectura
  let saved = false;

  const lecturaNum = idx + 1;
  const lecturaLabelShort = `Lectura ${lecturaNum}`;

  const wrapper = document.createElement("div");
  wrapper.className = "mb-6 p-4 rounded-xl bg-white/5 border border-white/10";

  // Contingut plegable (tal com dius: click i apareixen les preguntes abaix)
  wrapper.innerHTML = `
    <div class="flex justify-between items-center gap-4">
      <button class="toggleBtn text-left font-semibold underline-offset-4 hover:underline">
        ${escapeHtml(lecturaLabelShort)} · ${escapeHtml(lectura.titol)}
      </button>

      <a href="${lectura.pdf}" target="_blank" rel="noopener"
         class="text-blue-300 hover:text-blue-200 underline whitespace-nowrap">
        Obrir PDF
      </a>
    </div>

    <div class="questionsWrap hidden mt-4">
      ${lectura.preguntes.map(renderQuestion).join("")}

      <div class="mt-4 flex items-center gap-3">
        <button class="gradeLectBtn px-3 py-1 bg-emerald-600 text-white rounded font-semibold">
          Corregir aquesta lectura ✅
        </button>
        <div class="lectResult text-sm opacity-90"></div>
      </div>
    </div>
  `;

  const toggleBtn = wrapper.querySelector(".toggleBtn");
  const questionsWrap = wrapper.querySelector(".questionsWrap");
  const gradeBtn = wrapper.querySelector(".gradeLectBtn");
  const lectResultEl = wrapper.querySelector(".lectResult");

  toggleBtn.onclick = () => {
    questionsWrap.classList.toggle("hidden");
    // opcional: scroll suau a les preguntes quan obres
    if (!questionsWrap.classList.contains("hidden")) {
      questionsWrap.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  gradeBtn.onclick = async () => {
    if (saved) return;
    saved = true;
    gradeBtn.disabled = true;

    const { encerts, total, blancs, percentatge, errors } = gradeQuestions(lectura.preguntes);
    lectResultEl.textContent = `Resultat lectura: ${encerts}/${total} (${percentatge}%)`;

    if (percentatge >= 60) {
      showCenterToast("✅ Lectura assolida (≥60%).", "ok", 2500);
    } else {
      showCenterToast("ℹ️ Objectiu lectura: 60%.", "warn", 2500);
    }

    try {
      await saveAttemptArea1(
        {
          convocatoria: convId,
          tipus: "escrita",              // ✅ distinció clau
          subtest: `lectura${lecturaNum}`,
          subtestLabel: lecturaLabelShort, // "Lectura 1", "Lectura 2"...
          titol: lectura.titol,          // opcional (per si després ho vols mostrar)
          encerts,
          total,                          // ✅ 5
          blancs,
          percentatge,
          errors
        },
        "practica"
      );
      console.log("✅ Intent lectura desat:", lecturaLabelShort);
    } catch (e) {
      console.warn("No s'ha pogut desar l'intent de la lectura.", e);
    }
  };

  parentEl.appendChild(wrapper);
}

/* ---------- INIT ---------- */
export function initArea1(convId) {
  const data = getConv(convId);
  const lectoraBloc = AREA1_LECTURES_BY_CONVOCATORIA.find(b => b.convocatoria === convId);

  const titleEl = document.getElementById("a1Title");
  const block1 = document.getElementById("a1Block1");
  const block2 = document.getElementById("a1Block2");
  const lectoraEl = document.getElementById("a1Lectures");
  const finishBtn = document.getElementById("a1FinishBtn");
  const resultEl = document.getElementById("a1Result");

  if (!data) {
    if (titleEl) titleEl.textContent = "Àrea 1 · Convocatòria no trobada";
    return;
  }

  if (titleEl) {
    titleEl.textContent = `Àrea 1 · ${data.any} ${data.mes} (${data.convocatoria})`;
  }

  /* ---- ORAL: Àudios (2 blocs de 5) ---- */
  const audio1 = data.audios?.find(a => a.id === "audio1");
  const audio2 = data.audios?.find(a => a.id === "audio2");

  // ✅ 5 + 5 fixes (com a classe)
  const q1 = (data.preguntes || []).filter(q => q.audioId === "audio1").slice(0, 5);
  const q2 = (data.preguntes || []).filter(q => q.audioId === "audio2").slice(0, 5);

  mountAudioBlock({
    container: block1,
    title: "Àudio 1 · Bloc 1/2 (5 preguntes)",
    audioUrl: audio1?.url || "",
    questions: q1,
    convId: data.convocatoria,
    blocKey: "audio1",
    blocLabelShort: "Àudio 1",
    playsMax: audio1?.playsMax ?? 2
  });

  mountAudioBlock({
    container: block2,
    title: "Àudio 2 · Bloc 2/2 (5 preguntes)",
    audioUrl: audio2?.url || "",
    questions: q2,
    convId: data.convocatoria,
    blocKey: "audio2",
    blocLabelShort: "Àudio 2",
    playsMax: audio2?.playsMax ?? 2
  });

  /* ---- ESCRITA: Lectures (1 intent per lectura) ---- */
  if (lectoraEl && lectoraBloc) {
    lectoraEl.innerHTML = `
      <h3 class="mt-8 mb-4 text-xl font-semibold">📄 Comprensió lectora</h3>
      <div class="text-sm opacity-80 mb-4">
        Fes clic a una lectura per veure les 5 preguntes i corregir-la.
      </div>
    `;

    lectoraBloc.lectures.forEach((lectura, idx) => {
      mountLecturaCard({
        parentEl: lectoraEl,
        lectura,
        convId: data.convocatoria,
        idx
      });
    });
  }

  /* ---- Finalitzar (resum global) ----
     IMPORTANT: NO desa cap intent (evitam intents extra).
     Els intents útils de classe són els 2 blocs orals + les lectures corregides.
  */
  if (finishBtn && resultEl) {
    finishBtn.onclick = () => {
      const oralToGrade = [...q1, ...q2];
      const allLect = lectoraBloc ? lectoraBloc.lectures.flatMap(l => l.preguntes) : [];
      const all = [...oralToGrade, ...allLect];

      const { encerts, total, percentatge } = gradeQuestions(all);
      resultEl.textContent = `Resum: ${encerts}/${total} (${percentatge}%)`;

      if (percentatge >= 60) {
        showCenterToast("✅ Resum assolit (≥60%).", "ok", 3500);
      } else {
        showCenterToast("ℹ️ Resum: objectiu 60%.", "warn", 3500);
      }
    };
  }
}
``