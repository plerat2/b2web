// db.js — Desa intents a Realtime Database
// - sempre: users/{uid}/attempts/{pushId}
// - només convocatòries B2: resultats_b2/{convocatoria}/{pushId}

import { rtdb } from './firebase.js';
import {
  ref,
  push,
  set
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

export async function saveAttempt(report) {
  if (!report || !report.uid) {
    throw new Error('Report incomplet');
  }

  const uid = report.uid;

  // 1) Cream un intent nou dins l'usuari (genera pushId)
  const userAttemptRef = push(ref(rtdb, `users/${uid}/attempts`));
  const pushId = userAttemptRef.key;

  // 2) Guardam l'informe complet per usuari
  await set(userAttemptRef, report);

  // 3) Si és convocatòria, guardam resum B2 a resultats_b2
  const isConv = report.mode === 'convocatoria';
  const conv = report.convocatoria; // ex: "B2_MAIG_25"

  if (isConv && typeof conv === 'string' && conv.trim() !== '') {
    const resum = {
      uid: report.uid,
      email: report.email,
      timestamp: report.timestamp,
      mode: report.mode,
      total: report.total,
      encerts: report.encerts,
      convocatoria: conv,
      nivell: 'B2',
      area: 2
    };

    if (typeof report.percentatge === 'number') resum.percentatge = report.percentatge;
    if (typeof report.tempsSegons === 'number') resum.tempsSegons = report.tempsSegons;
    if (typeof report.blancs === 'number') resum.blancs = report.blancs;

    await set(ref(rtdb, `resultats_b2/${conv}/${pushId}`), resum);
  }

  return pushId;
}