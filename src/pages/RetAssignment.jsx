import React, { useEffect, useMemo, useState } from "react";
import "./RetAssignment.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

export default function RetAssignment() {
  const token = localStorage.getItem("token");

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    }),
    [token]
  );

  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");

  // UI: zaten view ataması olmayanları döndürüyor; checkbox görsel amaçlı
  const [unassigned, setUnassigned] = useState(true);

  // customer_id -> ret_member_id
  const [selectedMember, setSelectedMember] = useState({});
  // customer_id -> note
  const [noteByCustomer, setNoteByCustomer] = useState({});

  // --- RET Üyeleri ---
  async function fetchMembers() {
    setLoadingMembers(true);
    try {
      const res = await fetch(`${API_BASE}/api/ret-assignments/ret-members`, {
        headers,
        cache: "no-store",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (e) {
      alert("RET üye listesi alınamadı: " + e.message);
    } finally {
      setLoadingMembers(false);
    }
  }

  // --- GM Atanabilir Müşteriler ---
  async function fetchCandidates() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set("limit", "200");
      if (search) q.set("search", search.trim());

      const url = `${API_BASE}/api/gm/assignable${q.toString() ? `?${q.toString()}` : ""}`;
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || `HTTP ${res.status}`);
      }
      const json = await res.json();
      const rows = Array.isArray(json) ? json : json.data;
      const safeRows = Array.isArray(rows) ? rows : [];

      const normalized = safeRows.map((r) => ({
        id: r.id,
        customer_code: r.customer_code,
        name: r.name,
        phone: r.phone,
        email: r.email,
        salesperson_name: r.salesperson_name,
        salesperson_code: r.salesperson_code,
        created_at: r.created_at,
      }));

      setCandidates(normalized);
    } catch (e) {
      alert("Aday müşteriler alınamadı: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // unassigned sadece UI; API zaten atamasızları getiriyor
    fetchCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unassigned]);

  function onChangeSelect(customerId, retMemberId) {
    setSelectedMember((prev) => ({ ...prev, [customerId]: Number(retMemberId) }));
  }

  function onChangeNote(customerId, value) {
    setNoteByCustomer((prev) => ({ ...prev, [customerId]: value }));
  }

  async function assignCustomer(customerId) {
    const ret_member_id = selectedMember[customerId];
    if (!ret_member_id) {
      alert("Lütfen bir RET üyesi seçin.");
      return;
    }
    const body = {
      customer_id: customerId,
      ret_member_id,
      note: (noteByCustomer[customerId] || "").trim() || null,
    };
    try {
      const res = await fetch(`${API_BASE}/api/ret-assignments`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || `HTTP ${res.status}`);
      }
      // Başarılı: listeden düş
      setCandidates((prev) => prev.filter((x) => x.id !== customerId));
      setSelectedMember((prev) => {
        const p = { ...prev };
        delete p[customerId];
        return p;
      });
      setNoteByCustomer((prev) => {
        const p = { ...prev };
        delete p[customerId];
        return p;
      });
    } catch (e) {
      alert("Atama hatası: " + e.message);
    }
  }

  return (
    <div className="ret-assign-container">
      {/* Başlık */}
      <div className="ret-assign-header">
        <div style={{ width: 120 }} aria-hidden />
        <div className="ret-assign-header-title">
          <h1 className="title">RET Atama</h1>
          <p className="subtitle">
            Yatırım işlemi bulunan ve henüz RET ataması yapılmamış müşterileri aktif üyelere atayın.
          </p>
        </div>
        <div className="ret-assign-actions">
          <button className="btn secondary" onClick={fetchCandidates} disabled={loading}>
            {loading ? "Yükleniyor…" : "Yenile"}
          </button>
        </div>
      </div>

      {/* Araç çubuğu */}
      <div className="ret-toolbar">
        <div className="search-wrap">
          <input
            className="search-input"
            placeholder="Müşteri adı / e-posta / telefon / kod ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchCandidates();
            }}
          />
        </div>

        <label className="switch">
          <input
            type="checkbox"
            checked={unassigned}
            onChange={(e) => setUnassigned(e.target.checked)}
          />
          <span className="slider" />
          <span className="switch-label">Sadece ataması olmayanlar</span>
        </label>
      </div>

      {/* Üye bilgi kutusu */}
      <div className="info-box">
        {loadingMembers ? (
          <span>RET üye listesi yükleniyor…</span>
        ) : members.length === 0 ? (
          <span>
            Aktif RET üyesi yok. Önce <b>Operasyon Müdürü</b> tarafından en az bir üye
            eklenmeli.
          </span>
        ) : (
          <span>{members.length} aktif RET üyesi bulundu.</span>
        )}
      </div>

      {/* Tablo */}
      <div className="table-wrap">
        <table className="table ret-assign-table">
          <thead>
            <tr>
              <th className="left smw">Müşteri ID</th>
              <th className="left smw">Müşteri Kodu</th>
              <th className="left">Müşteri</th>
              <th className="left mdw">Satışçı</th>
              <th className="left mdw">RET Üyesi</th>
              <th className="left mdw">Not</th>
              <th className="num smw">Aksiyon</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id}>
                <td className="left">{c.id}</td>
                <td className="left">{c.customer_code || "-"}</td>
                <td className="left">
                  <div className="cell-main">
                    <div className="title">{c.name}</div>
                    <div className="sub">{c.email || "-"}</div>
                    <div className="sub">{c.phone || "-"}</div>
                  </div>
                </td>
                <td className="left mdw">
                  {c.salesperson_name}
                  {c.salesperson_code ? ` (${c.salesperson_code})` : ""}
                </td>
                <td className="left mdw">
                  <select
                    className="select"
                    value={String(selectedMember[c.id] || "")}
                    onChange={(e) => onChangeSelect(c.id, e.target.value)}
                  >
                    <option value="">Seçiniz</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="left mdw">
                  <input
                    className="note-input"
                    placeholder="Opsiyonel not"
                    value={noteByCustomer[c.id] || ""}
                    onChange={(e) => onChangeNote(c.id, e.target.value)}
                  />
                </td>
                <td className="num smw">
                  <button className="btn primary" onClick={() => assignCustomer(c.id)}>
                    Ata
                  </button>
                </td>
              </tr>
            ))}
            {candidates.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 16 }}>
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
