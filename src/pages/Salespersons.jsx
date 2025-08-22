// frontend/src/pages/Salespersons.jsx
import { useEffect, useMemo, useState } from "react";
// Link kaldırıldı çünkü üstteki pill butonlar silindi
import "./Salespersons.css";
import { apiGet, apiPost, apiPut } from "../utils/http";

export default function Salespersons() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");

  const emptyForm = { id: null, name: "", code: "", is_active: 1 };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState("create");

  async function loadData() {
    try {
      setLoading(true);
      setErr("");
      const data = await apiGet("/salespersons");
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setErr(e?.message || "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      String(r.name || "").toLowerCase().includes(q) ||
      String(r.code || "").toLowerCase().includes(q) ||
      String(r.id || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  function onEdit(row) {
    setMode("edit");
    setForm({
      id: row.id,
      name: row.name || "",
      code: row.code || "",
      is_active: Number(row.is_active ?? 1),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onNew() {
    setMode("create");
    setForm(emptyForm);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");

    try {
      const payload = {
        name: form.name?.trim(),
        code: form.code?.trim() || "",
        is_active: Number(form.is_active ?? 1),
      };
      if (!payload.name) throw new Error("Ad gerekli");

      if (mode === "create") {
        await apiPost("/salespersons", payload);
      } else {
        await apiPut(`/salespersons/${form.id}`, payload);
      }

      await loadData();
      onNew();
    } catch (e2) {
      setErr(e2?.message || "Kaydetme hatası");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="sp-page container">
      {/* ÜST BAR TAMAMEN KALDIRILDI */}

      {/* FORM KARTI */}
      <section className="sp-form-card">
        <div className="sp-form-header">
          <h2>Satışçı Yönetimi</h2>
          <div className="sp-actions">
            <button className="btn secondary pill small" onClick={onNew} disabled={saving}>
              Yeni Kayıt
            </button>
          </div>
        </div>

        {err && <div className="sp-error">{err}</div>}

        <form className="sp-form" onSubmit={onSubmit}>
          <div className="row">
            <div className="col">
              <label htmlFor="sp-name">Ad</label>
              <input
                id="sp-name"
                type="text"
                placeholder="Örn: Ali Veli"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                disabled={saving}
                required
              />
            </div>

            <div className="col">
              <label htmlFor="sp-code">Kod (opsiyonel)</label>
              <input
                id="sp-code"
                type="text"
                placeholder="Örn: AV01"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                disabled={saving}
              />
            </div>

            <div className="col">
              <label htmlFor="sp-active">Aktiflik</label>
              <select
                id="sp-active"
                value={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: Number(e.target.value) }))}
                disabled={saving}
              >
                <option value={1}>Aktif</option>
                <option value={0}>Pasif</option>
              </select>
            </div>
          </div>

          <div className="sp-form-footer">
            <button className="btn primary pill" type="submit" disabled={saving}>
              {saving ? "Kaydediliyor..." : mode === "create" ? "Ekle" : "Güncelle"}
            </button>
            {/* KIRMIZI PASİF ET butonu daha önce kaldırıldı */}
          </div>
        </form>
      </section>

      {/* LİSTE KARTI */}
      <section className="sp-list-card">
        <div className="sp-list-header">
          <h3>Satışçı Listesi</h3>
          <input
            className="search"
            type="text"
            placeholder="Ara: ad, kod, id"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Ad</th>
                <th>Kod</th>
                <th>Aktif</th>
                <th>Oluşturan</th>
                <th>Oluşturulma</th>
                <th>Güncellenme</th>
                <th>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="muted" style={{ textAlign: "center" }}>
                    Yükleniyor...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted" style={{ textAlign: "center" }}>
                    Kayıt bulunamadı
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="row-hover">
                    <td>{r.id}</td>
                    <td>{r.name}</td>
                    <td>{r.code || "-"}</td>
                    <td>{Number(r.is_active) ? "Evet" : "Hayır"}</td>
                    <td>{r.created_by_user_id || "-"}</td>
                    <td>{r.created_at?.replace?.("T"," ").slice(0,19) || "-"}</td>
                    <td>{r.updated_at?.replace?.("T"," ").slice(0,19) || "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn small" onClick={() => onEdit(r)}>Düzenle</button>
                      {/* 'Pasif' butonu listeden de kaldırıldı */}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
