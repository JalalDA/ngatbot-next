import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { clientSecurity } from "./lib/security-client";

// Initialize client-side security protection
clientSecurity.initialize();

createRoot(document.getElementById("root")!).render(<App />);
