// feedbacks.js — Frases de feedback (piscines) per reutilitzar a l'app

export const FEEDBACKS = {
  // Frases de motivació (se'n tria 1 aleatòriament)
  motivacio: [
    "El fracàs és part de la vida; si no fracasses, no aprens i si no aprens, no canvies. — Paulo Coelho",
    "L'èxit és aprendre a anar de fracàs en fracàs sense perdre l'entusiasme. — Winston Churchill",
    "Un aplaudiment per qui camina descalç. Per qui riu sense raons. Per qui mira amb la vista cansada. Per qui sana amb el seu dolor. Per qui estima sense condicions. Un aplaudiment per qui viu, malgrat tot!",
    "El que és impossible només triga una mica més.",
    "Ho vas intentar i vas fracassar. No importa. Intenta-ho de nou i fracassa un altre cop però aquesta vegada, fracassa millor. — Samuel Beckett",
    "Els millors començaments venen dels pitjors fracassos.",
    "No t'estic dient que sigui fàcil. T'estic dient que valdrà la pena.",
    "Si el pla A no funciona, passa al pla B; i si no, recorda que l'alfabet té més lletres!"
  ],

  // Frases per nivell de resultat
  perNivell: {
    excel_lent: [
      "Excel·lent! Mantén el ritme!",
      "Resultat magnífic. Estàs molt a prop de dominar-ho."
    ],
    satisfactoria: [
      "Prova satisfactòria, enhorabona!!",
      "Vas pel bon camí. Un parell de pràctiques més i ho clavaràs."
    ],
    bona: [
      "Bona prova! Ara toca polir una categoria concreta.",
      "Bon nivell: centra’t en una debilitat concreta i pujaràs ràpid."
    ],
    anims: [
      "Ànims! El progrés és acumulatiu.",
      "Cada pràctica suma. Fes una tanda curta i veuràs millora."
    ]
  },

  // Frases segons evolució (comparació amb l'anterior)
  evolucio: {
    puja: [
      "🔥 Has millorat respecte de l’anterior.",
      "📈 Evolució positiva: continua així!"
    ],
    baixa: [
      "💪 Avui ha estat més difícil; és normal. Continua!",
      "Un dia fluix no defineix el teu nivell. Endavant!"
    ],
    igual: [
      "🎯 Mantens el nivell. El següent pas és fer el salt!",
      "Estabilitat: perfecte per pujar amb pràctica dirigida."
    ]
  },

  // Frases específiques per categoria (quan hi ha nota alta)
  perCategoria: {
    Literatura: {
      threshold: 80,
      bones: [
        "Ramon Llull estaria orgullós de tu.",
        "Mercè Rodoreda creà La plaça del Diamant, però tu ja ho saps..."
      ]
    }
  }
};