import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./style.css";

// Apply theme ASAP (prevents "white flash" and broken theme on non-home pages)
try {
  const saved = localStorage.getItem("theme") || "dark";
  document.documentElement.dataset.theme = saved;
} catch (_) {
  // ignore
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
