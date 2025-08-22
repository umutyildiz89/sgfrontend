// frontend/src/pages/RetMembers.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./RetMembers.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

function decodeJWT(token) {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64);
    try {
      return JSON.parse(decodeURIComponent(escape(json)));
    } catch {
      return JSON.parse(json);
    }
  } catch {
    return null;
  }
}

export default function RetMembers() {
  const token = localStorage.getItem("token");
  const role =
    token ? (decodeJWT(token)?.role || decodeJWT(token)?.claims?.role) : "";

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
  const [limit, setLimit] = useState(50);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    active: true,
  });

  const [editId, setEditId] = useState(null);

  async function fetchList() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      q.set("limit", String(limit));
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
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onFormChange(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  function resetForm() {
    setForm({ full_name: "", email: "", phone: "", active: true });
    setEditId(null);
  }

  async function createMember() {
    const body = {
      full_name: form.full_name?.trim(),
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      active: !!form.active,
    };
    if (!body.full_name) return alert("İsim zorunlu.");
    const res = await fetch(`${API_BASE}/api/ret-members`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return alert("Ekleme hatası: " + (err.message || res.status));
    }
    resetForm();
    fetchList();
  }

  function startEdit(m) {
    setEditId(m.id);
    setForm({
      full_name: m.full_name || "",
      email: m.email || "",
      phone: m.phone || "",
      active: !!m.active,
    });
  }

  async function saveEdit() {
    if (!editId) return;
    const body = {
      full_name: form.full_name?.trim(),
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      active: !!form.active,
    };
    if (!body.full_name) return alert("İsim zorunlu.");
    const res = await fetch(`${API_BASE}/api/ret-members/${editId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return alert("Güncelleme hatası: " + (err.message || res.status));
    }
    resetForm();
    fetchList();
  }

  async function toggleActive(m) {
    const res = await fetch(`${API_BASE}/api/ret-members/${m.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ active: !m.active }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return alert("Aktif/pasif hatası: " + (err.message || res.status));
    }
    fetchList();
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
    fetchList();
  }

  return (
    <div className="ret-members-page">
      <header className="retm-header">
        <h1>RET Grubu</h1>
        <div className="role-badge">
          Rol: <b>{role || "-"}</b>
        </div>
      </header>

      <section className="toolbar">
        <div className="left">
          <input
            className="search-input"
            placeholder="Üye adı / e-posta / telefon ara"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") fetchList(); }}
          />
          <button className="btn" onClick={fetchList} disabled={loading}>
            {loading ? "Yükleniyor..." : "Ara / Yenile"}
          </button>
        </div>
        <div className="right">
          <label className="lbl">Limit</label>
          <select
            className="select"
            value={String(limit)}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </section>

      <section className="form-card">
        <h3>{editId ? "RET Üyesi Düzenle" : "Yeni RET Üyesi Ekle"}</h3>
        <div className="form-grid">
          <div className="form-row">
            <label>Ad Soyad *</label>
            <input
              value={form.full_name}
              onChange={(e) => onFormChange("full_name", e.target.value)}
              placeholder="Örn: Ali Demir"
            />
          </div>
          <div className="form-row">
            <label>E-posta</label>
            <input
              value={form.email}
              onChange={(e) => onFormChange("email", e.target.value)}
              placeholder="opsiyonel"
            />
          </div>
          <div className="form-row">
            <label>Telefon</label>
            <input
              value={form.phone}
              onChange={(e) => onFormChange("phone", e.target.value)}
              placeholder="opsiyonel"
            />
          </div>
          <div className="form-row">
            <label>Aktif</label>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => onFormChange("active", e.target.checked)}
            />
          </div>
        </div>

        <div className="form-actions">
          {!editId ? (
            <button className="btn-primary" onClick={createMember}>
              Ekle
            </button>
          ) : (
            <>
              <button className="btn-primary" onClick={saveEdit}>
                Kaydet
              </button>
              <button className="btn" onClick={resetForm}>
                İptal
              </button>
            </>
          )}
        </div>
      </section>

      <section className="table-card">
        <table className="retm-table">
          <thead>
            <tr>
              <th style={{ width: 70 }}>ID</th>
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
                  <div className="cell-main">
                    <div className="title">{m.full_name}</div>
                    <div className="sub">RET Üyesi</div>
                  </div>
                </td>
                <td>
                  <div className="sub">{m.email || "-"}</div>
                  <div className="sub">{m.phone || "-"}</div>
                </td>
                <td>
                  {m.active ? (
                    <span className="badge badge-green">Aktif</span>
                  ) : (
                    <span className="badge">Pasif</span>
                  )}
                </td>
                <td>
                  <button className="btn" onClick={() => startEdit(m)}>
                    Düzenle
                  </button>
                  <button className="btn" onClick={() => toggleActive(m)}>
                    {m.active ? "Pasifleştir" : "Aktifleştir"}
                  </button>
                  <button className="btn-danger" onClick={() => remove(m)}>
                    Sil
                  </button>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 16 }}>
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
