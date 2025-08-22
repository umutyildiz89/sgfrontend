// C:/Users/umut/OneDrive/Desktop/BUTCE/frontend/src/components/ret/RetMembersWidget.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./RetMembersWidget.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function RetMembersWidget() {
  const token = localStorage.getItem("token");

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    active: true,
  });

  const activeCount = list.filter((x) => !!x.active).length;

  async function load() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      q.set("limit", "100");
      const res = await fetch(`${API_BASE}/api/ret-members?${q.toString()}`, {
        headers,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("RET üyeleri alınamadı:", e);
      alert("RET üyeleri alınamadı: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onChange(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function addMember() {
    const body = {
      full_name: form.full_name?.trim(),
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      active: !!form.active,
    };
    if (!body.full_name) return alert("Ad Soyad zorunlu.");
    const res = await fetch(`${API_BASE}/api/ret-members`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return alert("Ekleme hatası: " + (err.message || res.status));
    }
    setForm({ full_name: "", email: "", phone: "", active: true });
    load();
  }

  async function toggleActive(m) {
    const res = await fetch(`${API_BASE}/api/ret-members/${m.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ active: !m.active }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return alert("Aktif/Pasif hatası: " + (err.message || res.status));
    }
    load();
  }

  async function remove(m) {
    if (!confirm(`Silinsin mi? ${m.full_name}`)) return;
    const res = await fetch(`${API_BASE}/api/ret-members/${m.id}`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return alert("Silme hatası: " + (err.message || res.status));
    }
    load();
  }

  return (
    <div className="retmw-card">
      <div className="retmw-header">
        <div>
          <div className="retmw-title">RET Üye Yönetimi (Hızlı)</div>
          <div className="retmw-sub">
            Aktif: <b>{activeCount}</b> / Toplam: <b>{list.length}</b>
          </div>
        </div>
        <Link to="/ret-members" className="retmw-link">
          Tam sayfa &raquo;
        </Link>
      </div>

      <div className="retmw-toolbar">
        <input
          className="retmw-input"
          placeholder="Üye adı / e-posta / telefon ara"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") load();
          }}
        />
        <button className="retmw-btn" onClick={load} disabled={loading}>
          {loading ? "Yükleniyor..." : "Ara / Yenile"}
        </button>
      </div>

      <div className="retmw-form">
        <input
          className="retmw-input"
          placeholder="Ad Soyad *"
          value={form.full_name}
          onChange={(e) => onChange("full_name", e.target.value)}
        />
        <input
          className="retmw-input"
          placeholder="E-posta (ops.)"
          value={form.email}
          onChange={(e) => onChange("email", e.target.value)}
        />
        <input
          className="retmw-input"
          placeholder="Telefon (ops.)"
          value={form.phone}
          onChange={(e) => onChange("phone", e.target.value)}
        />
        <label className="retmw-check">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => onChange("active", e.target.checked)}
          />
          Aktif
        </label>
        <button className="retmw-btn-primary" onClick={addMember}>
          Ekle
        </button>
      </div>

      <div className="retmw-tablewrap">
        <table className="retmw-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>ID</th>
              <th>Üye</th>
              <th style={{ width: 220 }}>İletişim</th>
              <th style={{ width: 100 }}>Durum</th>
              <th style={{ width: 220 }}>Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td>{m.id}</td>
                <td>
                  <div className="retmw-title2">{m.full_name}</div>
                </td>
                <td>
                  <div className="retmw-sub">{m.email || "-"}</div>
                  <div className="retmw-sub">{m.phone || "-"}</div>
                </td>
                <td>
                  {m.active ? (
                    <span className="retmw-badge retmw-badge--green">Aktif</span>
                  ) : (
                    <span className="retmw-badge">Pasif</span>
                  )}
                </td>
                <td>
                  <button className="retmw-btn" onClick={() => toggleActive(m)}>
                    {m.active ? "Pasifleştir" : "Aktifleştir"}
                  </button>
                  <button className="retmw-btn-danger" onClick={() => remove(m)}>
                    Sil
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 12 }}>
                  Kayıt yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
