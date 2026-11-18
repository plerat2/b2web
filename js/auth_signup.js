import { auth } from './firebase.js';
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const form = document.getElementById('signup-form');
const err = document.getElementById('signup-error');

function showError(msg) {
  if (!err) return;
  err.textContent = msg;
  err.classList.remove('hidden');
}

function hideError() {
  err?.classList.add('hidden');
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const email = document.getElementById('email')?.value?.trim() || '';
  const password = document.getElementById('password')?.value || '';
  const password2 = document.getElementById('password2')?.value || '';
  const displayName = document.getElementById('displayName')?.value?.trim() || '';

  if (!email || !password || !password2) {
    showError('Omple tots els camps obligatoris.');
    return;
  }

  if (password !== password2) {
    showError('Les contrasenyes no coincideixen.');
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      // Guardam el nom a Firebase Auth (displayName). Opcional però útil.
      await updateProfile(cred.user, { displayName });
    }
    window.location = 'index.html#/home';
  } catch (e) {
    console.error(e);
    // Missatges una mica més específics
    const code = e?.code || '';
    if (code.includes('email-already-in-use')) showError('Aquest correu ja està registrat.');
    else if (code.includes('invalid-email')) showError('El correu electrònic no és vàlid.');
    else if (code.includes('weak-password')) showError('Contrasenya massa dèbil (mínim 6 caràcters).');
    else showError("No s'ha pogut crear el compte.");
  }
});
