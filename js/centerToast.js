// centerToast.js — Popup central motivador (sense dependre del toast inferior)
// Ús: showCenterToast("missatge", "ok"|"warn"|"err", 4500)

export function showCenterToast(message, type = "ok", duration = 4500) {
  // elimina qualsevol popup previ
  const existing = document.getElementById("centerToastOverlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "centerToastOverlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-live", "polite");

  const colors = {
    ok:   { bg: "rgba(34,197,94,0.18)",  border: "rgba(134,239,172,0.45)", title: "✅ Enhorabona!" },
    warn: { bg: "rgba(234,179,8,0.18)",   border: "rgba(253,224,71,0.45)",  title: "💪 Continua!" },
    err:  { bg: "rgba(239,68,68,0.18)",   border: "rgba(252,165,165,0.45)", title: "💪 Continua!" }
  };
  const c = colors[type] || colors.ok;

  overlay.style.cssText = [
    "position:fixed",
    "inset:0",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "padding:24px",
    "background:rgba(0,0,0,0.35)",
    "z-index:9999"
  ].join(";");

  const card = document.createElement("div");
  card.style.cssText = [
    "max-width:720px",
    "width:100%",
    "border-radius:18px",
    `background:${c.bg}`,
    `border:1px solid ${c.border}`,
    "backdrop-filter: blur(10px)",
    "padding:22px 22px",
    "color:white",
    "box-shadow: 0 18px 50px rgba(0,0,0,0.35)",
    "text-align:center"
  ].join(";");

  card.innerHTML = `
    <div style="font-size:28px;font-weight:800;letter-spacing:-0.02em;margin-bottom:8px;">${c.title}</div>
    <div style="font-size:18px;line-height:1.35;color:rgba(255,255,255,0.92);">${escapeHtml(message)}</div>
    <button id="centerToastClose" style="margin-top:14px;padding:10px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.22);background:rgba(255,255,255,0.10);color:white;font-weight:700;cursor:pointer;">D'acord</button>
  `;

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const close = () => {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  };

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  card.querySelector("#centerToastClose")?.addEventListener("click", close);

  // Auto-tancar
  window.setTimeout(close, duration);
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
