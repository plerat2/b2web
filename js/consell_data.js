// consell_data.js — Llista de diapositives del 'Consell del dia'
// IMPORTANT: deixa les imatges dins /img amb aquests noms: page-0003.jpg ... page-0028.jpg

export const CONSELLS = Array.from({ length: 28 - 3 + 1 }, (_, i) => {
  const n = i + 3;
  return `img/page-${String(n).padStart(4, '0')}.jpg`;
});
