// Configuración editable. NO pongas tu API key aquí (se guarda solo en tu navegador).
const CONFIG = {
  // Con search grounding y capa gratuita, gemini-2.5-flash es la opción documentada por Google.
  // Si Google cambia los modelos, solo edita esta línea.
  MODEL: "gemini-2.5-flash",
  ENDPOINT: "https://generativelanguage.googleapis.com/v1beta/models/",
  USE_SEARCH: true,           // búsqueda web con fuentes (Grounding with Google Search)
  TEMPERATURE: 0.4,           // bajo = menos creatividad, menos riesgo de inventar
  STORAGE_KEY: "agente_mercadeo_gemini_key"
};
