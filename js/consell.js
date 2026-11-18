// consell.js — Mostra consells en mode 'baralla' (sense repetició fins al final)
import { CONSELLS } from './consell_data.js';

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]] = [arr[j],arr[i]];
  }
  return arr;
}

function getDeck(){
  const raw = sessionStorage.getItem('consells_deck');
  const rawIdx = sessionStorage.getItem('consells_idx');
  let deck = raw ? JSON.parse(raw) : null;
  let idx = rawIdx ? Number(rawIdx) : 0;

  if(!Array.isArray(deck) || deck.length !== CONSELLS.length){
    deck = shuffle([...CONSELLS]);
    idx = 0;
  }

  return { deck, idx };
}

function saveDeck(deck, idx){
  sessionStorage.setItem('consells_deck', JSON.stringify(deck));
  sessionStorage.setItem('consells_idx', String(idx));
}

function safeSetImage(imgEl, src){
  return new Promise((resolve) => {
    imgEl.onload = () => resolve(true);
    imgEl.onerror = () => resolve(false);
    imgEl.src = src;
  });
}

export async function initConsell(){
  const imgEl = document.getElementById('consellImg');
  const counterEl = document.getElementById('consellCounter');
  const nextBtn = document.getElementById('btnNextConsell');
  const reshuffleBtn = document.getElementById('btnReshuffle');

  if(!imgEl || !counterEl || !nextBtn) return;

  async function render(){
    let { deck, idx } = getDeck();

    // Si hem arribat al final, tornam a barrejar
    if(idx >= deck.length){
      deck = shuffle([...CONSELLS]);
      idx = 0;
    }

    // Carregam la imatge; si falla, provam la següent
    let attempts = 0;
    while(attempts < deck.length){
      const ok = await safeSetImage(imgEl, './' + deck[idx]);
      if(ok) break;
      idx += 1;
      if(idx >= deck.length){
        deck = shuffle([...CONSELLS]);
        idx = 0;
      }
      attempts += 1;
    }

    saveDeck(deck, idx);
    counterEl.textContent = `Consell ${idx+1} / ${deck.length}`;
  }

  function next(){
    const { deck, idx } = getDeck();
    saveDeck(deck, idx + 1);
    render();
  }

  function reshuffle(){
    const deck = shuffle([...CONSELLS]);
    saveDeck(deck, 0);
    render();
  }

  nextBtn.addEventListener('click', next);
  imgEl.addEventListener('click', next);
  reshuffleBtn?.addEventListener('click', reshuffle);

  await render();
}
