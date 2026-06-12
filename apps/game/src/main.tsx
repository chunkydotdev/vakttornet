import { createRoot } from "react-dom/client";
import { App } from "./App";
import { LangProvider } from "./i18n";
import "./styles/global.css";
import "./styles/screens.css";
import "./styles/run.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element");

createRoot(rootEl).render(
  <LangProvider>
    <App />
  </LangProvider>,
);
