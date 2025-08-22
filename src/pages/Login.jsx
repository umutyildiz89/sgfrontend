import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../utils/http";
import "./Login.css";
import bgVideo from "../assets/1.mp4";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErr("");

    try {
      setLoading(true);
      const res = await apiPost("/auth/login", { username, password });

      if (res?.token) {
        localStorage.setItem("token", res.token);

        // Sunucu role alanını yolluyor; yoksa token'dan çöz (fallback)
        let role = res.role || "";
        if (!role) {
          try {
            const payload = JSON.parse(atob(res.token.split(".")[1] || ""));
            role = payload?.role || "";
          } catch {}
        }
        localStorage.setItem("role", role);

        window.dispatchEvent(new Event("auth-changed"));
        navigate("/");
      } else {
        setErr("Token alınamadı, giriş başarısız.");
      }
    } catch (e2) {
      // http.js fetch-wrapper'ı Error fırlatır; axios tarzı .response yok
      const msg = e2?.data?.message || e2?.message || "Kullanıcı adı veya şifre hatalı!";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <video className="bg-video" src={bgVideo} autoPlay muted loop playsInline />
      <div className="bg-overlay" />

      <div className="login-card-frame">
        <div className="login-card login-card--tint">
          <h2 className="login-title">Giriş Yap</h2>
          {err && <div className="login-error">{err}</div>}

          <form onSubmit={onSubmit} className="login-form">
            <div className="form-field">
              <label>Kullanıcı Adı</label>
              <input
                type="text"
                placeholder="kullanici"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-field">
              <label>Şifre</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? "Giriş yapılıyor…" : "Giriş"}
            </button>
          </form>

          <p className="login-hint">Yetkili giriş sayfası</p>
        </div>
      </div>
    </div>
  );
}
