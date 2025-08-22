import React, { useEffect, useMemo, useState } from "react";
import "./RetAssignment.css";

/** API base: .env'de VITE_API_BASE_URL varsa onu, yoksa localhost */
const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL) ||
  "http://localhost:5000";

/** Token: localStorage("token") yoksa localStorage("gm_token") */
function getToken() {
  if (typeof window === "undefined") return "";
  return (
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("gm_token") ||
    ""
  );
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, cache: "no-store" });
  return res;
}

const fmtDate = (iso) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

export default function RetAssignment() {
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [rows, setRows] = useState([]);      // gm_assignable_customers
  const [members, setMembers] = useState([]); // ret-members
  const [sel, setSel] = useState({});        // { [customerId]: ret_member_id }
  const [busy, setBusy] = useState({});      // { [customerId]: true }
  const [toast, setToast] = useState(null);  // {type,msg}
  const [query, setQuery] = useState("");    // UI arama

  const hasToken = !!getToken();

  // İlk yükleme
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setMembersLoading(true);
      try {
        const [rList, rMembers] = await Promise.all([
          apiFetch("/api/gm/assignable"), // VIEW
          apiFetch("/api/ret-assignments/ret-members"),
        ]);

        if (rList.status === 401 || rMembers.status === 401) {
          throw new Error("401: Giriş gerekli (token).");
        }
        if (rList.status === 403 || rMembers.status === 403) {
          throw new Error("403: Yalnızca GENEL_MUDUR erişebilir.");
        }
        if (!rList.ok) throw new Error(`GM listesi hata: ${rList.status}`);
        if (!rMembers.ok) throw new Error(`RET üyeleri hata: ${rMembers.status}`);

        const dataList = await rList.json();     // { data: [...] }
        const dataMembers = await rMembers.json(); // [ {id, full_name}, ... ]

        if (!mounted) return;
        setRows(Array.isArray(dataList?.data) ? dataList.data : []);
        setMembers(Array.isArray(dataMembers) ? dataMembers : []);
        setToast({ type: "info", msg: "Liste yüklendi." });
      } catch (e) {
        console.error("load error:", e);
        if (mounted) setToast({ type: "error", msg: String(e?.message || e) });
      } finally {
        if (mounted) {
          setLoading(false);
          setMembersLoading(false);
        }
      }
    }
    if (hasToken) load();
    else {
      setLoading(false);
      setMembersLoading(false);
      setToast({ type: "error", msg: "Token bulunamadı. Lütfen giriş yapın." });
    }
    return () => {
      mounted = false;
    };
  }, [hasToken]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  /** Header'daki Yenile */
  const refresh = async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/api/gm/assignable");
      if (!r.ok) throw new Error(`GM listesi hata: ${r.status}`);
      const data = await r.json();
      setRows(Array.isArray(data?.data) ? data.data : []);
      setToast({ type: "info", msg: "Liste yenilendi." });
    } catch (e) {
      console.error("refresh error:", e);
      setToast({ type: "error", msg: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  };

  /** UI: arama (FE tarafı filtre) */
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r?.customer_code,
        r?.name,
        r?.phone,
        r?.email,
        r?.salesperson_name,
        r?.salesperson_code,
        r?.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  const onChange = (cid, val) =>
    setSel((p) => ({ ...p, [cid]: Number(val) || "" }));

  /** Ata */
  const assign = async (row) => {
    const cid = row.id;
    const rid = sel[cid];
    if (!rid) {
      setToast({ type: "error", msg: "RET üyesi seçin." });
      return;
    }

    // optimistic: satırı kaldır
    setBusy((p) => ({ ...p, [cid]: true }));
    const prev = rows;
    setRows((p) => p.filter((x) => x.id !== cid));

    try {
      const res = await apiFetch("/api/ret-assignments", {
        method: "POST",
        body: JSON.stringify({
          customer_id: cid,
          ret_member_id: rid,
          note: "GM atama",
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (res.status === 201) {
        setToast({ type: "success", msg: `Atandı (#${cid})` });
      } else if (res.status === 200 && body?.idempotent) {
        setToast({ type: "info", msg: `Zaten atanmış (#${cid})` });
      } else if (!res.ok) {
        throw new Error(body?.error || body?.message || `Hata: ${res.status}`);
      }
      setSel((p) => ({ ...p, [cid]: "" }));
    } catch (e) {
      console.error("assign error:", e);
      setRows(prev); // geri al
      setToast({ type: "error", msg: String(e?.message || e) });
    } finally {
      setBusy((p) => ({ ...p, [cid]: false }));
    }
  };

  const empty = !loading && filteredRows.length === 0;

  return (
    <div className="ret-assign-container">
      {/* Başlık */}
      <div className="ret-assign-header">
        <div style={{ width: 120 }} aria-hidden />
        <div className="ret-assign-header-title">
          <h1 className="title">RET Atama</h1>
          <p className="subtitle">
            Yatırım işlemi olup henüz RET ataması yapılmamış müşterileri uygun
            RET üyelerine ata.
          </p>
        </div>
        <div className="ret-assign-actions">
          <button className="btn secondary" onClick={refresh} disabled={loading}>
            {loading ? "Yükleniyor…" : "⟲ Yenile"}
          </button>
        </div>
      </div>

      {/* Toolbar: arama + (bilgilendirici) toggle */}
      <div className="ret-toolbar">
        <div className="search-wrap">
          <input
            className="search-input"
            placeholder="Müşteri adı / e-posta / telefon / kod ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <label
          className="switch"
          title="Liste sadece ataması olmayanları gösterir"
        >
          <input type="checkbox" checked readOnly />
          <span className="slider" />
          <span className="switch-label">Sadece ataması olmayanlar</span>
        </label>
      </div>

      {/* Info kutusu + toast */}
      {toast && (
        <div
          className={`info-box toast ${toast.type}`}
          role="status"
          aria-live="polite"
        >
          {toast.msg}
        </div>
      )}
      <div className="info-box">
        <strong>Toplam:</strong> {filteredRows.length} &nbsp;•&nbsp;{" "}
        <strong>RET üyeleri:</strong> {membersLoading ? "Yükleniyor…" : members.length}
      </div>

      {/* Tablo */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th className="left">Kod</th>
              <th className="left">Müşteri</th>
              <th className="left">Satışçı</th>
              <th className="left">İletişim</th>
              <th className="left">Oluşturulma</th>
              <th className="left">RET Üyesi</th>
              <th className="left">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="left" colSpan={7}>
                  Yükleniyor…
                </td>
              </tr>
            ) : empty ? (
              <tr>
                <td className="left" colSpan={7}>
                  Gösterilecek kayıt yok.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr key={row.id}>
                  <td className="left mono">{row.customer_code || "-"}</td>
                  <td className="left">
                    <div className="cell-main">
                      <div className="title">{row.name}</div>
                      <div className="sub">#{row.id}</div>
                    </div>
                  </td>
                  <td className="left">
                    <div className="cell-main">
                      <div className="title">{row.salesperson_name}</div>
                      <div className="sub">{row.salesperson_code || "-"}</div>
                    </div>
                  </td>
                  <td className="left">
                    <div>{row.phone || "-"}</div>
                    <div className="sub">{row.email || "-"}</div>
                  </td>
                  <td className="left">{fmtDate(row.created_at)}</td>
                  <td className="left">
                    <select
                      className="select"
                      value={sel[row.id] ?? ""}
                      onChange={(e) => onChange(row.id, e.target.value)}
                      disabled={membersLoading || busy[row.id]}
                    >
                      <option value="">Seçiniz…</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="left">
                    <button
                      className="btn primary"
                      onClick={() => assign(row)}
                      disabled={busy[row.id] || !sel[row.id]}
                      aria-disabled={busy[row.id] || !sel[row.id]}
                      style={
                        busy[row.id] ? { pointerEvents: "none", opacity: 0.7 } : undefined
                      }
                    >
                      {busy[row.id] ? "Atanıyor…" : "Ata"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
