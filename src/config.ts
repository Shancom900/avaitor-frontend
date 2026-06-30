const API_URL = 
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://avaitor-bcend.onrender.com";

export const config = {
  development: false,
  debug: true,
  appKey: "crash-0.1.0",
  api: `${API_URL}/api`,
  wss: API_URL,
};
