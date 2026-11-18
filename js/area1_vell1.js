// area1.js — Àrea 1 (oral + lectora)
// ✅ Oral: 2 blocs independents (5 + 5) amb correcció i feedback immediat
// ✅ Desa 2 intents separats (un per bloc) a RTDB (users/{uid}/attempts)
// ✅ Afegeix etiquetes: tipus="oral" + subtest/subtestLabel
// ✅ Lectora es manté renderitzada; "Finalitzar" només mostra resum (no desa)

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
  blocKey,          // "audio1" o "audio2"
  blocLabelShort,   // "Àudio 1" / "Àudio 2"
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
          tipus: "oral",                 // ✅ DISTINCIÓ IMPORTANT
          subtest: blocKey,              // "audio1" / "audio2"
          subtestLabel: blocLabelShort,  // "Àudio 1" / "Àudio 2" (net per estadístiques)
          encerts,
          total,                         // ✅ 5
          blancs,
          percentatge,
          audioPlaysUsed: playsUsed,
          errors
        },
        "practica"
      );

      console.log("✅ Intent bloc Àrea 1 desat:", blocKey);
    } catch (e) {
      console.warn("No s'ha pogut desar l'intent del bloc.", e);
    }
  };

  return { getPlaysUsed: () => playsUsed };
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

  /* ---- Àudios (2 blocs de 5) ---- */
  const audio1 = data.audios?.find(a => a.id === "audio1");
  const audio2 = data.audios?.find(a => a.id === "audio2");

  // ✅ IMPORTANT: 5 + 5 fixes (com a classe)
  const q1 = (data.preguntes || []).filter(q => q.audioId === "audio1").slice(0, 5);
  const q2 = (data.preguntes || []).filter(q => q.audioId === "audio2").slice(0, 5);

  const a1 = mountAudioBlock({
    container: block1,
    title: "Àudio 1 · Bloc 1/2 (5 preguntes)",
    audioUrl: audio1?.url || "",
    questions: q1,
    convId: data.convocatoria,
    blocKey: "audio1",
    blocLabelShort: "Àudio 1",
    playsMax: audio1?.playsMax ?? 2
  });

  const a2 = mountAudioBlock({
    container: block2,
    title: "Àudio 2 · Bloc 2/2 (5 preguntes)",
    audioUrl: audio2?.url || "",
    questions: q2,
    convId: data.convocatoria,
    blocKey: "audio2",
    blocLabelShort: "Àudio 2",
    playsMax: audio2?.playsMax ?? 2
  });

  /* ---- Lectures (es manté) ---- */
  if (lectoraEl && lectoraBloc) {
    lectoraEl.innerHTML = `
      <h3 class="mt-8 mb-4 text-xl font-semibold">📄 Comprensió lectora</h3>
    `;

    lectoraBloc.lectures.forEach(lectura => {
      const div = document.createElement("div");
      div.className = "mb-6 p-4 rounded-xl bg-white/5 border border-white/10";
      div.innerHTML = `
        <div class="flex justify-between items-center mb-3">
          <strong>${escapeHtml(lectura.titol)}</strong>
          <a href="${lectura.pdf}" target="_blank" rel="noopener" class="text-blue-400 underline">
            Obrir PDF
          </a>
        </div>
        ${lectura.preguntes.map(renderQuestion).join("")}
      `;
      lectoraEl.appendChild(div);
    });
  }

  /* ---- Finalitzar (resum global) ----
     IMPORTANT: NO desa cap intent (per evitar un 3r registre).
     Els intents útils de classe són els 2 blocs (àudio1 i àudio2).
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

  // Per si en algun lloc uses les reproduccions:
  void a1; void a2;
}