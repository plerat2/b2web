import { auth } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const form = document.getElementById("login-form");
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");

// Crea un missatge d'error si no existeix
function ensureMsgEl() {
  let el = document.getElementById("loginMsg");
  if (el) return el;
  el = document.createElement("div");
  el.id = "loginMsg";
  el.className = "mt-5 text-sm text-red-100 bg-red-500/20 border border-red-300/30 rounded-xl p-3 hidden";
  el.textContent = "";
  form?.insertAdjacentElement("afterend", el);
  return el;
}

function showMsg(text) {
  const el = ensureMsgEl();
  el.textContent = text;
  el.classList.remove("hidden");
}

function hideMsg() {
  const el = document.getElementById("loginMsg");
  el?.classList.add("hidden");
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMsg();

  const email = (emailEl?.value || "").trim();
  const password = passEl?.value || "";

  if (!email || !password) {
    showMsg("Introdueix correu i contrasenya.");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // Redirigeix al home de la SPA
    window.location = "index.html#/home";
  } catch (err) {
    console.error(err);
    showMsg("No s'ha pogut iniciar sessió. Revisa correu i contrasenya.");
  }
});
