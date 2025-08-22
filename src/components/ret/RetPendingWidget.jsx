import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
// Stili ortak kullanıyoruz
import "./RetMembersWidget.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

/**
 * GENEL MÜDÜR widget'ı:
 * - Aktif RET üye sayısı: GET /api/ret-assignments/ret-members
 * - Atanabilir müşteri listesi: GET /api/gm/assignable  (VIEW: gm_assignable_customers)
 * - "RET Atama" sayfasına yönlendiren buton
 */
export default function RetPendingWidget() {
  const token = localStorage.getItem("token");

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`,
    }),
    [token]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [membersCount, setMembersCount] = useState(0);
  const [assignable, setAssignable] = useState([]); // gm_assignable_customers satırları

  async function load() {
    setLoading(true);
    setError("");
    try {
      // 1) Aktif RET üyeleri
      const mRes = await fetch(`${API_BASE}/api/ret-assignments/ret-members`, {
        headers,
        cache: "no-store",
      });
      if (!mRes.ok) {
        let msg = `HTTP ${mRes.status}`;
        try {
          const j = await mRes.json();
          msg = j?.error || j?.message || msg;
        } catch (_) {}
        throw new Error(msg);
      }
      const mData = await mRes.json();
      const mList = Array.isArray(mData) ? mData : [];
      setMembersCount(mList.length);

      // 2) Atanabilir müşteriler (VIEW’den gelir)
      const aRes = await fetch(`${API_BASE}/api/gm/assignable?limit=1000`, {
        headers,
        cache: "no-store",
      });
      if (!aRes.ok) {
        let msg = `HTTP ${aRes.status}`;
        try {
          const j = await aRes.json();
          msg = j?.error || j?.message || msg;
        } catch (_) {}
        throw new Error(msg);
      }
      const aJson = await aRes.json();
      const rows = Array.isArray(aJson) ? aJson : aJson?.data;
      const list = Array.isArray(rows) ? rows : [];

      // VIEW alanları: id, customer_code, name, phone, email, salesperson_name, salesperson_code, created_at
      // Güvenli map (gerekirse normalize)
      const normalized = list.map((r) => ({
        id: r.id,
        customer_code: r.customer_code,
        name: r.name,
        phone: r.phone,
        email: r.email,
        salesperson_name: r.salesperson_name,
        salesperson_code: r.salesperson_code,
        created_at: r.created_at,
      }));

      setAssignable(normalized);
    } catch (e) {
      setError(String(e.message || e));
      setAssignable([]);
      setMembersCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingCount = assignable.length;

  return (
    <div className="retmw-card" role="region" aria-label="RET bekleyenler">
      <div className="retmw-header">
        <div>
          <div className="retmw-title">RET Bekleyenler</div>
          <div className="retmw-sub">
            Aktif RET Üye: <b>{membersCount}</b> • Aday Müşteri: <b>{pendingCount}</b>
          </div>
        </div>
        <div className="retmw-actions">
          <button className="retmw-btn" onClick={load} disabled={loading}>
            {loading ? "Yükleniyor..." : "Yenile"}
          </button>
          <Link to="/ret-assignment" className="retmw-btn-primary">
            RET Atama &raquo;
          </Link>
        </div>
      </div>

      {error && (
        <div className="retmw-error" style={{ marginTop: 8 }}>
          Hata: {error}
        </div>
      )}

      <div className="retmw-tablewrap">
        <table className="retmw-table">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Müşteri ID</th>
              <th style={{ width: 120 }}>Müşteri Kodu</th>
              <th>Müşteri</th>
              <th style={{ width: 240 }}>Satışçı</th>
            </tr>
          </thead>
          <tbody>
            {assignable.slice(0, 5).map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.customer_code || "-"}</td>
                <td>
                  <div className="retmw-title2">{c.name}</div>
                  <div className="retmw-sub">{c.email || "-"}</div>
                  <div className="retmw-sub">{c.phone || "-"}</div>
                </td>
                <td>
                  <div className="retmw-title2">
                    {c.salesperson_name}
                    {c.salesperson_code ? ` (${c.salesperson_code})` : ""}
                  </div>
                </td>
              </tr>
            ))}
            {pendingCount === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: 12 }}>
                  Bekleyen aday müşteri yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {pendingCount > 5 && (
          <div className="retmw-footnote">
            İlk 5 kayıt gösterildi — detay için{" "}
            <Link to="/ret-assignment">RET Atama</Link> sayfasına gidin.
          </div>
        )}
      </div>
    </div>
  );
}
