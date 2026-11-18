import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/routes";
import ToastStack from "@/components/ui/Toast";
import { Login } from "@/screens/Login";
import { Registro } from "@/screens/Registro";
import { Inicio } from "@/screens/Inicio";
import { MARKET_PUBLICAS } from "@/market";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/inicio" element={<Inicio />} />
        {MARKET_PUBLICAS.map((r) => <Route key={r.path} path={r.path} element={r.element} />)}
        <Route path="/*" element={<AppShell />} />
      </Routes>
      <ToastStack />
    </BrowserRouter>
  );
}
