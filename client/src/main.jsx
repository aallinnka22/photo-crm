import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom"; // Змінили імпорт тут
import App from "./App.jsx";
import "./style.css";

try {
  const saved = localStorage.getItem("theme") || "dark";
  if (saved === "light") {
    document.documentElement.classList.add("light");
  } else {
    document.documentElement.classList.remove("light");
  }
} catch (_) {

}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter> {}
      <App />
    </HashRouter> {}
  </React.StrictMode>,
);