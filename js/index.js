import { AREA2_CONVOCATORIES } from "./area2/index_area2.js";

function prettyConv(conv) {
  const m = String(conv || '').match(/B2_(GEN|MAIG|SET)_(\d{2})/i);
  const map = { GEN: "Gener", MAIG: "Maig", SET: "Setembre" };
  if (!m) return { mes: "", any: "" };
  return { mes: map[m[1].toUpperCase()] || m[1], any: "20" + m[2] };
}

export const CONVOCATORIES_B2 = AREA2_CONVOCATORIES.map(o => {
  const conv = o.convocatoria || o.id;
  const { mes, any } = prettyConv(conv);
  return {
    id: o.id,
    mes,
    any,
    preguntes: o.preguntes
  };
});