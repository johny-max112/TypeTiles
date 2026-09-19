import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { PlayerAuthProvider } from "./lib/PlayerAuthContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("app") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <PlayerAuthProvider>
        <App />
      </PlayerAuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);