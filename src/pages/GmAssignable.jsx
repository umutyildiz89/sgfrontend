import React, { useEffect, useMemo, useState } from "react";

/** API tabanı: .env'de VITE_API_BASE_URL varsa onu kullan, yoksa localhost */
const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE_URL) ||
  "http://localhost:5000";

/** Token: localStorage("token") yoksa localStorage("gm_token") */
function getToken() {
  return (
    (typeof window !== "undefined" && window.localStorage.getItem("token")) ||
    (typeof window !== "undefined" && window.localStorage.getItem("gm_token")) ||
    ""
  );
}

/** Küçük yardımcılar */
const fmtDate = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
};
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  return res;
}

export default function GmAssignable() {
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [assignable, setAssignable] = useState([]); // {id, customer_code, name, ...}
  const [retMembers, setRetMembers] = useState([]); // {id, full_name}
  const [selections, setSelections] = useState({}); // { [customerId]: ret_member_id }
  const [rowBusy, setRowBusy] = useState({}); // { [customerId]: boolean }
  const [toast, setToast] = useState(null); // { type: 'success'|'error'|'info', msg: string }

  const hasToken = !!getToken();

  /** İlk yükleme: GM aday listesi + RET üyeleri */
  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      setLoading(true);
      setMembersLoading(true);
      try {
        const [r1, r2] = await Promise.all([
          apiFetch("/api/gm/assignable", { method: "GET" }),
          apiFetch("/api/ret-assignments/ret-members", { method: "GET" }),
        ]);

        if (r1.status === 401 || r2.status === 401) {
          throw new Error("401: Kimlik doğrulanmadı (token eksik/expired).");
        }
        if (r1.status === 403 || r2.status === 403) {
          throw new Error("403: Yalnızca GENEL_MUDUR erişebilir.");
        }
        if (!r1.ok) throw new Error(`GM listesi hatası: ${r1.status}`);
        if (!r2.ok) throw new Error(`RET üyeleri hatası: ${r2.status}`);

        const data1 = await r1.json(); // { data: [...] }
        const data2 = await r2.json(); // [ {id, full_name}, ... ]
        if (!mounted) return;

        setAssignable(Array.isArray(data1?.data) ? data1.data : []);
        setRetMembers(Array.isArray(data2) ? data2 : []);
        setToast({ type: "info", msg: "Liste yüklendi." });
      } catch (err) {
        console.error("loadAll error:", err);
        if (mounted) setToast({ type: "error", msg: String(err?.message || err) });
      } finally {
        if (mounted) {
          setLoading(false);
          setMembersLoading(false);
        }
      }
    }

    if (hasToken) loadAll();
    else {
      setLoading(false);
      setMembersLoading(false);
      setToast({ type: "error", msg: "Token bulunamadı. Lütfen GM olarak giriş yapın." });
    }

    return () => {
      mounted = false;
    };
  }, [hasToken]);

  /** Basit toast */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const onChangeSelect = (customerId, retMemberId) => {
    setSelections((prev) => ({ ...prev, [customerId]: Number(retMemberId) || "" }));
  };

  const onAssign = async (row) => {
    const cid = row.id;
    const rid = selections[cid];
    if (!rid) {
      setToast({ type: "error", msg: "Önce RET üyesi seçin." });
      return;
    }
    // Optimistic update: satırı geçici olarak listeden çıkar
    setRowBusy((p) => ({ ...p, [cid]: true }));
    const prev = assignable;
    setAssignable((p) => p.filter((x) => x.id !== cid));

    try {
      const res = await apiFetch("/api/ret-assignments", {
        method: "POST",
        body: JSON.stringify({
          customer_id: cid,
          ret_member_id: rid,
          note: "GM atama",
        }),
      });

      if (res.status === 401) throw new Error("401: Kimlik doğrulanmadı.");
      if (res.status === 403) throw new Error("403: Yetki yok (GENEL_MUDUR lazım).");

      const payload = await res.json();
      if (res.status === 201) {
        setToast({ type: "success", msg: `Atandı (#${cid})` });
      } else if (res.status === 200 && payload?.idempotent === true) {
        setToast({ type: "info", msg: `Zaten atanmış (#${cid})` });
      } else if (!res.ok) {
        throw new Error(payload?.error || payload?.message || `Hata: ${res.status}`);
      }
      // başarılıysa listeden kalıcı olarak çıktı; selections temizleyelim
      setSelections((prev) => ({ ...prev, [cid]: "" }));
    } catch (err) {
      console.error("assign error:", err);
      // Hata: satırı geri koy
      setAssignable(prev);
      setToast({ type: "error", msg: String(err?.message || err) });
    } finally {
      setRowBusy((p) => ({ ...p, [cid]: false }));
    }
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await apiFetch("/api/gm/assignable");
      if (!r.ok) throw new Error(`GM listesi hatası: ${r.status}`);
      const data = await r.json();
      setAssignable(Array.isArray(data?.data) ? data.data : []);
      setToast({ type: "info", msg: "Liste yenilendi." });
    } catch (err) {
      console.error("refresh error:", err);
      setToast({ type: "error", msg: String(err?.message || err) });
    } finally {
      setLoading(false);
    }
  };

  const empty = !loading && assignable.length === 0;

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>GM – Atanabilir Müşteriler</h2>
        <button
          onClick={refresh}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #ddd",
            cursor: "pointer",
          }}
          disabled={loading}
          title="Yenile"
        >
          Yenile
        </button>
        <div style={{ marginLeft: "auto", opacity: 0.8 }}>
          API: <code>{API_BASE}</code>
        </div>
      </header>

      {!hasToken && (
        <div style={{ padding: 12, background: "#fff3cd", border: "1px solid #ffe69c", borderRadius: 8, marginBottom: 12 }}>
          GM token’ı bulunamadı. Lütfen giriş yapın.
        </div>
      )}

      {toast && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 8,
            color:
              toast.type === "success"
                ? "#0a3622"
                : toast.type === "error"
                ? "#58151c"
                : "#0c5460",
            background:
              toast.type === "success"
                ? "#d1e7dd"
                : toast.type === "error"
                ? "#f8d7da"
                : "#cff4fc",
            border:
              toast.type === "success"
                ? "1px solid #badbcc"
                : toast.type === "error"
                ? "1px solid #f5c2c7"
                : "1px solid #b6effb",
          }}
        >
          {toast.msg}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          {loading ? "Yükleniyor..." : `Toplam: ${assignable.length}`}
        </div>
        <div style={{ fontSize: 13, opacity: 0.8 }}>
          {membersLoading ? "RET üyeleri yükleniyor..." : `RET üyeleri: ${retMembers.length}`}
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 8,
          }}
        >
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={th}>Kod</th>
              <th style={th}>Müşteri</th>
              <th style={th}>Satışçı</th>
              <th style={th}>İletişim</th>
              <th style={th}>Oluşturulma</th>
              <th style={th}>RET Üyesi</th>
              <th style={th}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={tdCenter}>
                  Yükleniyor...
                </td>
              </tr>
            ) : empty ? (
              <tr>
                <td colSpan={7} style={tdCenter}>
                  Gösterilecek kayıt yok.
                </td>
              </tr>
            ) : (
              assignable.map((row) => (
                <tr key={row.id}>
                  <td style={tdMono}>{row.customer_code || "-"}</td>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{row.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{`#${row.id}`}</div>
                  </td>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{row.salesperson_name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{row.salesperson_code}</div>
                  </td>
                  <td style={td}>
                    <div>{row.phone || "-"}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{row.email || "-"}</div>
                  </td>
                  <td style={td}>{fmtDate(row.created_at)}</td>
                  <td style={td}>
                    <select
                      value={selections[row.id] ?? ""}
                      onChange={(e) => onChangeSelect(row.id, e.target.value)}
                      disabled={membersLoading || rowBusy[row.id]}
                      style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd", minWidth: 160 }}
                    >
                      <option value="">Seçiniz…</option>
                      {retMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={td}>
                    <button
                      onClick={() => onAssign(row)}
                      disabled={rowBusy[row.id] || !selections[row.id]}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1px solid #2563eb",
                        background: rowBusy[row.id] ? "#bfdbfe" : "#3b82f6",
                        color: "#fff",
                        cursor: rowBusy[row.id] ? "not-allowed" : "pointer",
                      }}
                    >
                      {rowBusy[row.id] ? "Atanıyor…" : "Ata"}
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

/** Basit hücre stilleri */
const th = {
  textAlign: "left",
  padding: "10px 12px",
  fontWeight: 600,
  fontSize: 13,
  borderBottom: "1px solid #e5e7eb",
};
const td = {
  padding: "10px 12px",
  verticalAlign: "top",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 14,
};
const tdMono = { ...td, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" };
const tdCenter = { ...td, textAlign: "center" };
