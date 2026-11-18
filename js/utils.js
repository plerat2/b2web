// utils.js — helpers

export async function loadView(name) {
  const url = `./views/${name}.html`;
  const res = await fetch(url);

  // Millor diagnòstic quan una vista no existeix o no es pot carregar
  if (!res.ok) {
    const msg = `No s'ha pogut carregar la vista: ${url} (HTTP ${res.status})`;
    console.error(msg);
    throw new Error(msg);
  }

  document.getElementById('app').innerHTML = await res.text();
}

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {   // ✅ '>' real, no '&gt;'
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}