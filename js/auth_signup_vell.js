import { auth } from './firebase.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const form = document.getElementById('signup-form');
const err = document.getElementById('signup-error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  err.classList.add('hidden');
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const password2 = document.getElementById('password2').value;
  if(password !== password2){
    err.textContent = 'Les contrasenyes no coincideixen.';
    err.classList.remove('hidden');
    return;
  }
  try{
    await createUserWithEmailAndPassword(auth, email, password);
    window.location = 'index.html#/home';
  }catch{
    err.textContent = "No s'ha pogut crear el compte.";
    err.classList.remove('hidden');
  }
});
