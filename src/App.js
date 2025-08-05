import React from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

// Giriş yapıldı mı kontrol
const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  return !!token;
};

function App() {
  return (
    <div>
      {!isAuthenticated() ? <Login /> : <Dashboard />}
    </div>
  );
}

export default App;
