const $ = (id) => document.getElementById(id);
const chat = $("chat"), input = $("input");
let history = [];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const md = (s) => esc(s)
  .replace(/^#{1,4} (.+)$/gm, "<strong>$1</strong>")
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/^[-*] (.+)$/gm, "• $1")
  .replace(/\n/g, "<br>");

function addMsg(role, html, extra = "") {
  const d = document.createElement("div");
  d.className = "msg " + role + (extra ? " " + extra : "");
  d.innerHTML = html;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
  return d;
}

function getKey() {
  let k = localStorage.getItem(CONFIG.STORAGE_KEY);
  if (!k) {
    k = (prompt("Pega tu API key de Gemini (créala gratis en aistudio.google.com/apikey). Se guarda solo en este navegador:") || "").trim();
    if (k) localStorage.setItem(CONFIG.STORAGE_KEY, k);
  }
  return k;
}

function sourcesHtml(chunks) {
  const seen = new Set();
  const items = chunks.filter((c) => c && c.uri && !seen.has(c.uri) && seen.add(c.uri))
    .filter((c) => c.uri.startsWith("https://"))
    .map((c) => `<li><a href="${esc(c.uri)}" target="_blank" rel="noopener noreferrer">${esc(c.title || c.uri)}</a></li>`);
  return items.length ? `<div class="src"><strong>Fuentes consultadas:</strong><ol>${items.join("")}</ol></div>`
    : `<div class="src">⚠️ Esta respuesta no trae fuentes de búsqueda. Verifica los datos antes de usarlos.</div>`;
}

async function ask(text) {
  const key = getKey();
  if (!key) return;
  addMsg("user", esc(text).replace(/\n/g, "<br>"));
  history.push({ role: "user", parts: [{ text }] });
  const wait = addMsg("bot", "Pensando...");
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: history,
    generationConfig: { temperature: CONFIG.TEMPERATURE }
  };
  if (CONFIG.USE_SEARCH) body.tools = [{ google_search: {} }];
  try {
    const r = await fetch(CONFIG.ENDPOINT + CONFIG.MODEL + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || "Error " + r.status);
    const cand = data.candidates?.[0];
    const out = (cand?.content?.parts || []).map((p) => p.text || "").join("");
    if (!out) throw new Error("Respuesta vacía (posible bloqueo de seguridad). Reformula la pregunta.");
    history.push({ role: "model", parts: [{ text: out }] });
    const chunks = (cand.groundingMetadata?.groundingChunks || []).map((c) => c.web);
    wait.innerHTML = md(out) + (CONFIG.USE_SEARCH ? sourcesHtml(chunks) : "");
  } catch (e) {
    history.pop();
    wait.className = "msg bot err";
    wait.innerHTML = "No pude responder: " + esc(e.message) +
      "<br><small>Si dice 429, llegaste al límite gratuito: espera un rato. Si dice API key, usa el botón «API key».</small>";
  }
  chat.scrollTop = chat.scrollHeight;
}

function send() {
  const t = input.value.trim();
  if (!t) return;
  input.value = "";
  ask(t);
}

const QUICK = [
  "Revisa mi hoja de vida: dime qué mejorar, corregir, añadir y eliminar para roles junior de mercadeo digital.",
  "Hazme un simulacro de entrevista para un cargo junior de marketing digital, una pregunta a la vez.",
  "Dame la sugerencia semanal para mi búsqueda de empleo de la próxima semana."
];
["Hoja de vida", "Simulacro de entrevista", "Plan semanal"].forEach((label, i) => {
  const b = document.createElement("button");
  b.textContent = label;
  b.onclick = () => { input.value = QUICK[i]; input.focus(); };
  $("chips").appendChild(b);
});

$("btnSend").onclick = send;
input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
$("btnKey").onclick = () => { localStorage.removeItem(CONFIG.STORAGE_KEY); getKey(); };
$("btnClear").onclick = () => { history = []; chat.innerHTML = ""; hello(); };
$("btnPdf").onclick = () => window.print();
$("btnHtml").onclick = () => {
  const css = [...document.styleSheets].map((s) => { try { return [...s.cssRules].map((r) => r.cssText).join("\n"); } catch (e) { return ""; } }).join("\n");
  const doc = `<!DOCTYPE html><html lang="es"><meta charset="UTF-8"><title>Informe</title><style>${css}body{height:auto}main{overflow:visible}</style><body><main>${chat.innerHTML}</main></body></html>`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([doc], { type: "text/html" }));
  a.download = "informe-" + new Date().toISOString().slice(0, 10) + ".html";
  a.click();
};

function hello() {
  addMsg("bot", "Hola Nicolas 👋 Soy tu agente de Mercadeo y Ventas. Cuéntame qué quieres trabajar hoy o usa un atajo de abajo. Cito fuentes y te aviso cuando no estoy seguro.");
}
hello();
