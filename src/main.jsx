import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

/* Global CSS sırası: reset → theme → tailwind */
import "./styles/reset.css";
import "./styles/theme.css";
import "./styles/tw.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
