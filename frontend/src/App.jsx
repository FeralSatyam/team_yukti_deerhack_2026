import { Navigate, Route, Routes } from "react-router-dom";

import { AnalyzerApp } from "@/components/AnalyzerApp";
import { RedirectIfAuthed, RequireAuth } from "@/components/RouteGuards";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";

export default function App() {
  return (
    <Routes>
      {/* Auth screens — only reachable when signed out. */}
      <Route element={<RedirectIfAuthed />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected app. */}
      <Route element={<RequireAuth />}>
        <Route path="/" element={<AnalyzerApp />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
