// report.js — Genera l'informe d'un intent (per desar a RTDB)

export const CATEGORIES = [
  'Fonètica',
  'Ortografia',
  'Gramàtica',
  'Vocabulari',
  'Literatura',
  'Dialectologia',
  'Sociolingüística'
];

function emptyBreakdown(){
  const o = {};
  for(const c of CATEGORIES){
    o[c] = { encerts: 0, total: 0 };
  }
  return o;
}

export function buildReport({ user, mode, convocatoria=null, preguntes, respostesUsuari, startTs, endTs }){
  const timestamp = Date.now();
  const total = Array.isArray(preguntes) ? preguntes.length : 0;

  let encerts = 0;
  let blancs = 0;
  const breakdown = emptyBreakdown();
  const errors = [];

  (preguntes || []).forEach((q, i) => {
    const cat = q.categoria || 'Altres';
    if(!breakdown[cat]) breakdown[cat] = { encerts: 0, total: 0 };
    breakdown[cat].total += 1;

    const u = respostesUsuari[i];
    if(u === null || u === undefined) blancs += 1;

    const ok = u === q.resposta;
    if(ok){
      encerts += 1;
      breakdown[cat].encerts += 1;
    }else{
      errors.push({
        pregunta: i+1,
        id: q.id
          ? String(q.id)
          : (q.numero != null
              ? ((convocatoria || q.convocatoria) ? `${convocatoria || q.convocatoria}-${q.numero}` : String(q.numero))
              : ''),
        categoria: String(cat),
        respostaUsuari: (u === null || u === undefined) ? null : String(u),
        respostaCorrecta: String(q.resposta)
      });
    }
  });

  const percentatge = total ? Math.round((encerts/total)*100) : 0;
  const tempsSegons = (startTs && endTs) ? Math.max(0, Math.round((endTs - startTs)/1000)) : null;

  return {
    uid: user?.uid || null,
    email: user?.email || null,
    timestamp,
    mode,                 // 'practica' o 'convocatoria'
    convocatoria: convocatoria ? String(convocatoria) : null,
    total,
    encerts,
    percentatge,
    blancs,
    tempsSegons,
    breakdown,
    errors
  };
}
