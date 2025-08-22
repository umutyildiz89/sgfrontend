import { useEffect, useMemo, useState } from "react";
import { apiGet } from "../utils/http";
import "./Customers.css";  // mevcut tablo/btn stilleri
import "./Retention.css";  // küçük vurgu eklentisi
import CustomerTransactionModal from "../components/CustomerTransactionModal.jsx";

/** -------------------- Yardımcılar -------------------- **/

/**
 * YATIRIM yapmış müşteri ID'lerini çıkarır.
 * Öncelik:
 *  1) /transactions/summary?groupBy=customer_id&type=YATIRIM
 *  2) /transactions?type=YATIRIM&limit=2000
 *  3) Sondaj: ilk 100 müşteri için /transactions?customer_id=..&type=YATIRIM&limit=1
 */
async function fetchInvestedCustomerIdsSafe(customers) {
  // 1) summary
  try {
    const s = await apiGet("/transactions/summary?groupBy=customer_id&type=YATIRIM", {
      cache: "no-store",
    });
    const arr = Array.isArray(s) ? s : Array.isArray(s?.data) ? s.data : [];
    const ids = arr
      .map((x) => x?.customer_id ?? x?.customerId ?? x?.id)
      .filter((v) => Number.isFinite(v));
    return new Set(ids);
  } catch (_) {
    // 2) full list
    try {
      const t = await apiGet("/transactions?type=YATIRIM&limit=2000", { cache: "no-store" });
      const arr = Array.isArray(t) ? t : Array.isArray(t?.data) ? t.data : [];
      const ids = arr.map((x) => x?.customer_id).filter((v) => Number.isFinite(v));
      return new Set(ids);
    } catch {
      // 3) sondaj
      const ids = new Set();
      const probe = (Array.isArray(customers) ? customers : []).slice(0, 100);
      for (const c of probe) {
        try {
          const r = await apiGet(
            `/transactions?customer_id=${c.id}&type=YATIRIM&limit=1`,
            { cache: "no-store" }
          );
          const arr = Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : [];
          if (arr.length > 0) ids.add(Number(c.id));
        } catch { /* yoksay */ }
      }
      return ids;
    }
  }
}

/** ----------------------------------------------------- **/

export default function Retention() {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState({ loading: true, error: null });

  // Filtreler
  const [query, setQuery] = useState("");
  const [onlyActive, setOnlyActive] = useState(true); // default: aktifler

  // YATIRIM yapmış müşteri ID'leri
  const [investedIds, setInvestedIds] = useState(new Set());

  // Bilgi notu
  const [infoNote, setInfoNote] = useState("");

  // Modal
  const [txnCustomer, setTxnCustomer] = useState(null);

  async function load() {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      setInfoNote("");

      // 1) tüm müşteriler
      const res = await apiGet("/customers", { cache: "no-store" });
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setRows(list);

      // 2) YATIRIM yapmış müşteri ID'leri
      const invested = await fetchInvestedCustomerIdsSafe(list);
      setInvestedIds(invested);

      setInfoNote("Bu sayfa yalnızca en az bir YATIRIM işlemi olan müşterileri listeler. İşlem RET üzerinden yapılır (satışçı yok).");
      setState({ loading: false, error: null });
    } catch (e) {
      setState({
        loading: false,
        error:
          e?.response?.data?.message ||
          e?.message ||
          "Retention listesi alınamadı.",
      });
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Sadece YATIRIM yapmış müşteriler
  const investedRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const id = Number(r?.id ?? r?.customer_id);
      if (!investedIds.has(id)) return false; // yatırım yoksa dışarı

      const isActive = r?.is_active === 1 || r?.status === "ACTIVE" || r?.active === 1;
      if (onlyActive && !isActive) return false;

      if (!q) return true;
      const hay = [
        r?.customer_code,
        r?.name,
        r?.phone,
        r?.email,
        r?.salesperson_name || r?.salesperson,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, investedIds, query, onlyActive]);

  return (
    <div className="cust-container retention-page">
      {/* Başlık */}
      <div className="cust-header">
        <div style={{ width: 120 }} aria-hidden />
        <div className="cust-header-title" style={{ flex: 1, textAlign: "center" }}>
          <h1 className="cust-title" style={{ margin: 0 }}>Retention — Yatırım</h1>
        </div>
        <div className="cust-actions" style={{ display: "flex", gap: 8 }}>
          <button className="btn pill ghost small" onClick={load} title="Yenile">⟲ Yenile</button>
        </div>
      </div>

      {/* arama/filtre */}
      <div className="cust-toolbar">
        <div className="search-wrap">
          <input
            className="search-input"
            type="text"
            placeholder="Kod, ad/unvan, telefon, e-posta ara…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <label className="switch">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
          />
          <span className="slider" />
          <span className="switch-label">Sadece aktif</span>
        </label>
      </div>

      {!!infoNote && (
        <div className="cust-state info" style={{ marginTop: 8 }}>
          {infoNote}
        </div>
      )}

      {state.loading && <div className="cust-state info">Yükleniyor…</div>}
      {!state.loading && state.error && <div className="cust-state error">{state.error}</div>}

      {!state.loading && !state.error && (
        <div className="table-wrap">
          <table className="table customers-table">
            <thead>
              <tr>
                <th className="left">Müşteri Kodu</th>
                <th className="left">Ad/Unvan</th>
                <th className="left">Telefon</th>
                <th className="left">E-posta</th>
                <th className="left">Atandığı Satışçı</th>
                <th className="num">Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {investedRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted" style={{ textAlign: "center" }}>
                    Yatırım yapmış müşteri bulunamadı.
                  </td>
                </tr>
              ) : (
                investedRows.map((r) => {
                  const id = r?.id ?? r?.customer_id ?? Math.random();
                  const code = r?.customer_code ?? "-";
                  const name = r?.name ?? "-";
                  const phone = r?.phone ?? "-";
                  const email = r?.email ?? "-";
                  const salesperson = r?.salesperson_name ?? r?.salesperson ?? "-";

                  return (
                    <tr key={id}>
                      <td className="left">{code}</td>
                      <td className="left">{name}</td>
                      <td className="left">{phone}</td>
                      <td className="left">{email}</td>
                      <td className="left">{salesperson}</td>
                      <td className="num" style={{ whiteSpace: "nowrap" }}>
                        <button
                          className="btn small primary"
                          title="RET üzerinden yatırım yap"
                          onClick={() => setTxnCustomer(r)}
                        >
                          Yatırım (RET)
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Yatırım Modalı — RET modu */}
      {txnCustomer && (
        <CustomerTransactionModal
          customer={txnCustomer}
          onClose={() => setTxnCustomer(null)}
          onCreated={async () => { await load(); }} // işlem sonrası tazele
          retMode // 🔒 satışçı yok, RET işlemi
        />
      )}
    </div>
  );
}
