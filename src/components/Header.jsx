import React from "react";
import "../styles/Header.css";
import logo from "../assets/logo.png"; // Logo dosyasını import et

function Header() {
  const userEmail = localStorage.getItem("userEmail");
  const userRole = localStorage.getItem("userRole");

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <header className="header">
      <div className="header-logo">
        <img src={logo} alt="Dosya Takip Sistemi" className="logo-image" />
      </div>
      <div className="header-user">
        <span>
          {userEmail} {userRole === "admin" && <b>(Admin)</b>}
        </span>
        <button onClick={handleLogout} className="header-logout-btn">
          Çıkış Yap
        </button>
      </div>
    </header>
  );
}

export default Header;
