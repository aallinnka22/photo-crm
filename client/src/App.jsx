import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import ClientPage from "./pages/ClientPage.jsx";
import Booking from "./pages/Booking.jsx";
import AdminPage from "./pages/AdminPage.jsx";

export default function App() {
  useEffect(() => {
    const applyTheme = () => {
      const t = localStorage.getItem("theme") || "dark";
      document.documentElement.classList.toggle("light", t === "light");
    };

   
    applyTheme();

   
    window.addEventListener("storage", applyTheme);

  
    const origSetItem = localStorage.setItem;
    localStorage.setItem = function (key, value) {
      origSetItem.apply(this, [key, value]);
      if (key === "theme") applyTheme();
    };

    return () => {
      window.removeEventListener("storage", applyTheme);
      localStorage.setItem = origSetItem;
    };
  }, []);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/booking" element={<Booking />} />
      <Route path="/client" element={<ClientPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
