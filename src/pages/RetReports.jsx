import { useEffect, useMemo, useState } from "react";
import "./RetReports.css";

// ⚠️ ENV adı http.js ile uyumlu: VITE_API_BASE_URL
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");

/** Güvenli fetch: { data, denied } döndürür (403→denied=true, data=[]) */
async function fetchSafe(url, headers, opts = {}) {
  const res = await fetch(url, { headers, cache: "no-store", ...opts });
  if (res.status === 403) return { data: [], denied: true };
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `HTTP ${res.status}`);
  }
  const data = await res.json().catch(() => ({}));
  const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : data;
  return { data: list || [], denied: false };
}

/** DATETIME/ISO → UTC timestamp(ms). Geçersizse -Infinity. */
function ts(v) {
  if (!v) return -Infinity;
  try {
    if (v instanceof Date) {
      const n = v.getTime();
      return Number.isFinite(n) ? n : -Infinity;
    }
    const s = String(v).replace(" ", "T");
    const d = new Date(s.endsWith("Z") ? s : s + "Z");
    const n = d.getTime();
    return Number.isFinite(n) ? n : -Infinity;
  } catch {
    return -Infinity;
  }
}

/** İnsan okunur tarih/saat */
function fmtDateTime(v) {
  const n = ts(v);
  if (!Number.isFinite(n)) return "-";
  const d = new Date(n);
  return d.toLocaleString();
}

/** Güvenli alan okuma */
function get(a, ...paths) {
  for (const p of paths) if (a && a[p] !== undefined && a[p] !== null) return a[p];
  return undefined;
}

/** RET işlemi mi? (salesperson_id yok/boş/0 ise RET kabul et) */
function isRetSide(spid) {
  if (spid === null || spid === undefined) return true;
  if (spid === "") return true;
  const n = Number(spid);
  return Number.isFinite(n) && n === 0;
}

/** type normalize */
function normType(t) {
  const raw = String(t || "").trim().toUpperCase();
  if (raw.includes("CEK") || raw.includes("ÇEK")) return "CEKIM";
  return raw;
}

/** USD normalizasyonu → sayıya çevir */
function getAmountUSD(obj) {
  let v =
    obj?.amount_usd ??
    obj?.amountUsd ??
    obj?.amountUSD ??
    obj?.amount ??
    obj?.original_amount ??
    0;
  if (typeof v === "string") {
    const cleaned = v.replace(/\s/g, "").replace(/,/g, ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return Number.isFinite(v) ? v : 0;
}

/** Para formatı — tüm USD yazıları yerine $ */
function fmtUsd(n) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "-";
  return `$${v.toFixed(2)}`;
}

export default function RetReports() {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    "";

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Kaynak state'leri
  const [rows, setRows] = useState([]);               // ret-assignments (tam liste)
  const [summaryRows, setSummaryRows] = useState([]); // ret-assignments/summary (fallback)
  const [retMembers, setRetMembers] = useState([]);   // aktif RET üyeleri
  const [customers, setCustomers] = useState([]);     // tüm müşteriler
  const [salespersons, setSalespersons] = useState([]); // satışçılar
  const [transactions, setTransactions] = useState([]); // işlemler

  // İzin bayrakları
  const [denied, setDenied] = useState({
    retAssignments: false,
    retMembers: false,
    customers: false,
    salespersons: false,
    transactions: false,
  });

  // UI state
  const [query, setQuery] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null); // { memberName, customers:[{...}] , totals }

  async function load() {
    setLoading(true);
    setError("");
    try {
      // 1) Önce ret-assignments (kritik)
      const ra = await fetchSafe(`${API_BASE}/api/ret-assignments`, headers);
      let deniedMap = {
        retAssignments: ra.denied,
        retMembers: false,
        customers: false,
        salespersons: false,
        transactions: false,
      };

      if (ra.denied) {
        const sum = await fetchSafe(`${API_BASE}/api/ret-assignments/summary`, headers);
        setSummaryRows(Array.isArray(sum.data) ? sum.data : []);
        setRows([]);
      } else {
        setRows(Array.isArray(ra.data) ? ra.data : []);
        setSummaryRows([]);
      }

      // 2) Diğer kaynaklar
      const [rm, cust, sp, tx] = await Promise.all([
        fetchSafe(`${API_BASE}/api/ret-members?active=1`, headers).catch(() => ({ data: [], denied: true })),
        fetchSafe(`${API_BASE}/api/customers`, headers).catch(() => ({ data: [], denied: true })),
        fetchSafe(`${API_BASE}/api/salespersons?active=1`, headers).catch(() => ({ data: [], denied: true })),
        fetchSafe(`${API_BASE}/api/transactions?limit=20000`, headers).catch(() => ({ data: [], denied: true })),
      ]);

      setRetMembers(Array.isArray(rm.data) ? rm.data : []);
      setCustomers(Array.isArray(cust.data) ? cust.data : []);
      setSalespersons(Array.isArray(sp.data) ? sp.data : []);
      setTransactions(Array.isArray(tx.data) ? tx.data : []);

      deniedMap.retMembers   = !!rm.denied;
      deniedMap.customers    = !!cust.denied;
      deniedMap.salespersons = !!sp.denied;
      deniedMap.transactions = !!tx.denied;

      setDenied(deniedMap);
    } catch (e) {
      setError(e.message || "Veri alınamadı");
      setRows([]);
      setSummaryRows([]);
      setRetMembers([]);
      setCustomers([]);
      setSalespersons([]);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Modlar
  const isSummaryOnly = useMemo(
    () => denied.retAssignments && summaryRows.length > 0,
    [denied.retAssignments, summaryRows]
  );

  // Lookup map'leri
  const memberById = useMemo(
    () => new Map(retMembers.map((r) => [Number(get(r, "id")), r])),
    [retMembers]
  );
  const spById = useMemo(
    () => new Map(salespersons.map((s) => [Number(get(s, "id")), s])),
    [salespersons]
  );
  const custById = useMemo(
    () => new Map(customers.map((c) => [Number(get(c, "id")), c])),
    [customers]
  );

  // Tx'i müşteri bazında grupla (YATIRIM + ÇEKİM ikisi de)
  const txByCustomer = useMemo(() => {
    const m = new Map();
    for (const t of transactions) {
      const tType = normType(get(t, "type")); // YATIRIM/CEKIM
      if (!tType) continue;
      const cid = Number(get(t, "customer_id", "customerId"));
      if (!Number.isFinite(cid)) continue;
      const list = m.get(cid) || [];
      list.push(t);
      m.set(cid, list);
    }
    // Müşteri bazında tarihe göre sırala (ASC)
    for (const [, list] of m.entries()) {
      list.sort(
        (a, b) =>
          ts(get(a, "created_at", "createdAt")) -
          ts(get(b, "created_at", "createdAt"))
      );
    }
    return m;
  }, [transactions]);

  // Ana agregasyon (dalga sütunları kaldırıldı)
  const aggregates = useMemo(() => {
    if (isSummaryOnly) return [];

    const byMember = new Map(); // mid -> { totalAssigned, bySalesperson(Map), totalUsdAfterRA }

    for (const a of rows) {
      const mid = Number(get(a, "ret_member_id", "retMemberId", "ret_id"));
      const cid = Number(get(a, "customer_id", "customerId"));
      if (!Number.isFinite(mid) || !Number.isFinite(cid)) continue;

      if (!byMember.has(mid)) {
        byMember.set(mid, {
          totalAssigned: 0,
          bySalesperson: new Map(), // sid -> { countAssigned, totalUsd }
          totalUsdAfterRA: 0,
        });
      }
      const bucket = byMember.get(mid);
      bucket.totalAssigned += 1;

      // Müşterinin ilk satışçısı
      const c = custById.get(cid);
      const sid = Number(get(c, "salesperson_id", "salespersonId"));
      const sidKey = Number.isFinite(sid) ? sid : null;

      // Satışçı kırılımında "atanan müşteri sayısı"
      if (!bucket.bySalesperson.has(sidKey)) {
        bucket.bySalesperson.set(sidKey, { countAssigned: 0, totalUsd: 0 });
      }
      bucket.bySalesperson.get(sidKey).countAssigned += 1;

      // RA sonrası RET yatırımlarının USD toplamı (özet kolonu için)
      const assignAt = ts(get(a, "created_at", "createdAt"));
      const allTx = txByCustomer.get(cid) || [];
      const afterRA = allTx.filter((t) => ts(get(t, "created_at", "createdAt")) >= assignAt);

      const retOnly = afterRA.filter(
        (t) => isRetSide(get(t, "salesperson_id", "salespersonId")) && normType(get(t, "type")) === "YATIRIM"
      );
      const totalForThisCustomer = retOnly.reduce((s, t) => s + getAmountUSD(t), 0);

      bucket.bySalesperson.get(sidKey).totalUsd += totalForThisCustomer;
      bucket.totalUsdAfterRA += totalForThisCustomer;
    }

    // tablo dostu dizi
    const list = [];
    for (const [mid, val] of byMember.entries()) {
      const mInfo = memberById.get(mid);
      const name = get(mInfo, "full_name", "name") || `RET #${mid}`;

      // satışçı kırılımını diziye çevir + adlandır
      const spArr = [];
      for (const [sid, obj] of val.bySalesperson.entries()) {
        if (sid === null) {
          spArr.push({
            salesperson_id: null,
            salesperson_name: "-",
            countAssigned: obj.countAssigned,
            totalUsd: obj.totalUsd,
          });
        } else {
          const sInfo = spById.get(Number(sid));
          const sName = sInfo
            ? `${get(sInfo, "name")}${get(sInfo, "code") ? ` (${get(sInfo, "code")})` : ""}`
            : `Satışçı #${sid}`;
          spArr.push({
            salesperson_id: Number(sid),
            salesperson_name: sName,
            countAssigned: obj.countAssigned,
            totalUsd: obj.totalUsd,
          });
        }
      }
      spArr.sort((a, b) => b.countAssigned - a.countAssigned || b.totalUsd - a.totalUsd);

      list.push({
        ret_member_id: mid,
        ret_member_name: name,
        totalAssigned: val.totalAssigned,
        totalUsdAfterRA: val.totalUsdAfterRA,
        bySalesperson: spArr,
      });
    }

    // arama
    const q = (query || "").trim().toLowerCase();
    const filtered = q
      ? list.filter((r) => {
          const inMember = r.ret_member_name.toLowerCase().includes(q);
          const inSales = r.bySalesperson.some((s) =>
            s.salesperson_name.toLowerCase().includes(q)
          );
          return inMember || inSales;
        })
      : list;

    filtered.sort((a, b) => b.totalAssigned - a.totalAssigned);
    return filtered;
  }, [isSummaryOnly, rows, memberById, spById, custById, txByCustomer, query]);

  // Kısıtlı mod (RA=403) için özet veriler
  const summaryAggregates = useMemo(() => {
    if (!isSummaryOnly) return [];
    return (summaryRows || [])
      .map((r) => {
        const mid = Number(get(r, "ret_member_id", "retMemberId", "ret_id"));
        const fallbackName =
          get(memberById.get(mid) || {}, "full_name", "name") ||
          get(r, "ret_member_name") ||
          `RET #${mid}`;
        return {
          ret_member_id: mid,
          ret_member_name: fallbackName,
          totalAssigned: Number(get(r, "assigned_count")) || 0,
        };
      })
      .sort((a, b) => b.totalAssigned - a.totalAssigned);
  }, [isSummaryOnly, summaryRows, memberById]);

  // Üst istatistik kartları
  const totalAssignedAll = useMemo(
    () =>
      isSummaryOnly
        ? summaryAggregates.reduce((acc, r) => acc + r.totalAssigned, 0)
        : aggregates.reduce((acc, r) => acc + r.totalAssigned, 0),
    [isSummaryOnly, summaryAggregates, aggregates]
  );

  const activeMemberCount = useMemo(
    () => (isSummaryOnly ? summaryAggregates.length : aggregates.length),
    [isSummaryOnly, summaryAggregates, aggregates]
  );

  function openModalForMember(mid) {
    const mInfo = memberById.get(Number(mid));
    const memberName = get(mInfo, "full_name", "name") || `RET #${mid}`;

    // bu üyeye atanmış müşteriler
    const assigned = rows.filter(
      (a) => Number(get(a, "ret_member_id", "retMemberId", "ret_id")) === Number(mid)
    );

    // müşteri bazlı detaylar
    const customersDetail = assigned
      .map((a) => {
        const cid = Number(get(a, "customer_id", "customerId"));
        const assignAt = ts(get(a, "created_at", "createdAt"));
        const c = custById.get(cid);
        const spId = Number(get(c, "salesperson_id", "salespersonId"));
        const sp = spById.get(spId);
        const spName = sp ? get(sp, "name") || `Satışçı #${spId}` : `Satışçı #${spId}`;

        // RA sonrası tüm hareketler (yatırım + çekim)
        const allTx = (txByCustomer.get(cid) || []).filter(
          (t) => ts(get(t, "created_at", "createdAt")) >= assignAt
        );

        const txRows = allTx
          .map((t) => {
            const typeN = normType(get(t, "type"));
            const isRet = isRetSide(get(t, "salesperson_id", "salespersonId"));
            const side = isRet
              ? "RET"
              : spById.get(Number(get(t, "salesperson_id", "salespersonId")))?.name ||
                `Satışçı #${get(t, "salesperson_id", "salespersonId")}`;
            const amount = getAmountUSD(t);
            return {
              when: get(t, "created_at", "createdAt"),
              type: typeN === "CEKIM" ? "ÇEKİM" : "YATIRIM",
              side,
              amount_usd: amount,
            };
          })
          .sort((a, b) => ts(a.when) - ts(b.when)); // ASC

        const dep = txRows
          .filter((x) => x.type === "YATIRIM")
          .reduce((s, x) => s + x.amount_usd, 0);
        const wdr = txRows
          .filter((x) => x.type === "ÇEKİM")
          .reduce((s, x) => s + x.amount_usd, 0);

        return {
          customer_id: cid,
          customer_code: get(c, "customer_code", "code") || `C#${cid}`,
          customer_name: get(c, "name") || "-",
          salesperson_name: spName,
          assigned_at: get(a, "created_at", "createdAt"),
          tx: txRows, // ASC
          totals: { depositUsd: dep, withdrawUsd: wdr, netUsd: dep - wdr },
        };
      })
      .sort((a, b) => a.customer_code.localeCompare(b.customer_code));

    const totals = customersDetail.reduce(
      (acc, c) => {
        acc.depositUsd += c.totals.depositUsd;
        acc.withdrawUsd += c.totals.withdrawUsd;
        return acc;
      },
      { depositUsd: 0, withdrawUsd: 0 }
    );
    totals.netUsd = totals.depositUsd - totals.withdrawUsd;

    setModalData({
      ret_member_id: Number(mid),
      memberName,
      totalAssigned: assigned.length,
      customers: customersDetail,
      totals,
    });
    setModalOpen(true);
  }

  return (
    <div className="rr-container">
      {/* Başlık & aksiyonlar */}
      <div className="rr-header">
        <div style={{ width: 120 }} aria-hidden />
        <h1 className="rr-title">RET Raporları</h1>
        <div className="rr-actions">
          <button className="btn secondary" onClick={load} disabled={loading}>
            {loading ? "Yükleniyor…" : "⟲ Yenile"}
          </button>
        </div>
      </div>

      {/* İzin uyarı bandı */}
      {(denied.retAssignments ||
        denied.retMembers ||
        denied.customers ||
        denied.salespersons ||
        denied.transactions) && (
        <div className="rr-banner">
          <b>Kısıtlı erişim:</b>{" "}
          {denied.retAssignments && <span className="tag">ret-assignments</span>}
          {denied.retMembers && <span className="tag">ret-members</span>}
          {denied.customers && <span className="tag">customers</span>}
          {denied.salespersons && <span className="tag">salespersons</span>}
          {denied.transactions && <span className="tag">transactions</span>}
          <span className="sep">|</span>
          {isSummaryOnly
            ? "Özet modda görüntüleniyor."
            : "Tam modda eksik alanlar '-' olarak gösterilir."}
        </div>
      )}

      {/* Arama */}
      <div className="rr-toolbar">
        <input
          className="search-input"
          placeholder="RET üyesi veya satışçı ara…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="rr-help">Kaynak: GM atamaları + RA sonrası işlemler</div>
      </div>

      {/* Üst istatistik kartları */}
      <div className="rr-stats">
        <div className="stat-card">
          <div className="stat-label">Toplam Atama</div>
          <div className="stat-value">{totalAssignedAll}</div>
          <div className="stat-help">Listelenen kapsamda</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">RET Üyesi Sayısı</div>
          <div className="stat-value">{activeMemberCount}</div>
          <div className="stat-help">{isSummaryOnly ? "Özet mod" : "Tam mod"}</div>
        </div>
      </div>

      {/* Ana tablo */}
      <div className="table-wrap">
        <table className="table rr-table">
          <thead>
            {isSummaryOnly ? (
              <tr>
                <th className="left">RET Üyesi</th>
                <th className="num">Toplam Atama</th>
              </tr>
            ) : (
              <tr>
                <th className="left">RET Üyesi</th>
                <th className="num">Toplam Atama</th>
                <th className="num">RET Toplam $ (RA sonrası)</th>
                <th className="left">Satışçı Kırılımı (adet / $)</th>
              </tr>
            )}
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isSummaryOnly ? 2 : 4} className="center muted">
                  Yükleniyor…
                </td>
              </tr>
            ) : isSummaryOnly ? (
              summaryAggregates.length === 0 ? (
                <tr>
                  <td colSpan={2} className="center muted">
                    Kayıt yok.
                  </td>
                </tr>
              ) : (
                summaryAggregates.map((r) => (
                  <tr key={r.ret_member_id}>
                    <td className="left">
                      <button
                        className="linklike"
                        onClick={() => openModalForMember(r.ret_member_id)}
                      >
                        {r.ret_member_name}
                      </button>
                    </td>
                    <td className="num strong">{r.totalAssigned}</td>
                  </tr>
                ))
              )
            ) : aggregates.length === 0 ? (
              <tr>
                <td colSpan={4} className="center muted">
                  Kayıt yok.
                </td>
              </tr>
            ) : (
              aggregates.map((r) => {
                const topSales = r.bySalesperson.slice(0, 2);
                return (
                  <tr key={r.ret_member_id}>
                    <td className="left">
                      <button
                        className="linklike"
                        onClick={() => openModalForMember(r.ret_member_id)}
                      >
                        {r.ret_member_name}
                      </button>
                    </td>
                    <td className="num strong">{r.totalAssigned}</td>
                    <td className="num">{fmtUsd(r.totalUsdAfterRA)}</td>
                    <td className="left">
                      {r.bySalesperson.length === 0 ? (
                        <span className="muted">-</span>
                      ) : (
                        <>
                          {topSales.map((s, i) => (
                            <span key={i} className="pill">
                              {s.salesperson_name}: <b>{s.countAssigned}</b> /{" "}
                              <b>{fmtUsd(s.totalUsd)}</b>
                            </span>
                          ))}
                          {r.bySalesperson.length > topSales.length && (
                            <span className="muted" style={{ marginLeft: 6 }}>
                              +{r.bySalesperson.length - topSales.length} daha
                            </span>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Ayrıntı Modal */}
      {modalOpen && modalData && (
        <DetailModal data={modalData} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}

/** Detay Modal — tıklanan RET üyesine ait müşteriler ve hareketleri */
function DetailModal({ data, onClose }) {
  const { memberName, totalAssigned, customers, totals } = data;

  // Tarih sırası: asc (geçmişten bugüne) / desc (bugünden geçmişe)
  const [dateOrder, setDateOrder] = useState("asc");

  // ESC ile kapatma
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal" role="dialog" aria-modal="true">
        {/* close butonu */}
        <button className="modal-close abs" onClick={onClose} aria-label="Kapat">✕</button>

        {/* Başlık + üst özet */}
        <div className="modal-header centered">
          <div className="modal-headline">
            <div className="modal-title centered">RET Üyesi: {memberName}</div>

            <div className="summary-box">
              <span>Atanan müşteri: <b>{totalAssigned}</b></span>
              <span>Toplam Yatırım: <b>{fmtUsd(totals.depositUsd)}</b></span>
              <span>Toplam Çekim: <b>{fmtUsd(totals.withdrawUsd)}</b></span>
              <span>Net: <b>{fmtUsd(totals.netUsd)}</b></span>
            </div>

            {/* Tarih sıralama seçici */}
            <div className="modal-controls">
              <div className="segmented">
                <button
                  className={dateOrder === "asc" ? "on" : ""}
                  onClick={() => setDateOrder("asc")}
                  title="Geçmişten bugüne sırala"
                >
                  Geçmişten Bugüne
                </button>
                <button
                  className={dateOrder === "desc" ? "on" : ""}
                  onClick={() => setDateOrder("desc")}
                  title="Bugünden geçmişe sırala"
                >
                  Bugünden Geçmişe
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Gövde */}
        <div className="modal-body">
          {customers.length === 0 ? (
            <div className="muted">Bu üyeye ait veri bulunamadı.</div>
          ) : (
            customers.map((c) => {
              const txRows = dateOrder === "asc" ? c.tx : [...c.tx].slice().reverse();

              return (
                <div className="cust-block" key={c.customer_id}>
                  <div className="cust-head">
                    <div>
                      <div className="cust-title">
                        <span className="mono">{c.customer_code}</span> — {c.customer_name}
                      </div>
                      <div className="cust-sub">
                        İlk satışçı: <b>{c.salesperson_name}</b> · Atama zamanı:{" "}
                        <b>{fmtDateTime(c.assigned_at)}</b>
                      </div>
                    </div>

                    {/* dikdörtgen metrikler */}
                    <div className="metric-group">
                      <div className="metric-card">
                        <div className="metric-label">Yatırım</div>
                        <div className="metric-value">{fmtUsd(c.totals.depositUsd)}</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-label">Çekim</div>
                        <div className="metric-value">{fmtUsd(c.totals.withdrawUsd)}</div>
                      </div>
                      <div className="metric-card strong">
                        <div className="metric-label">Net</div>
                        <div className="metric-value">{fmtUsd(c.totals.netUsd)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="table-wrap thin">
                    <table className="table modal-table">
                      <thead>
                        <tr>
                          <th className="left">Tarih</th>
                          <th className="left">Tür</th>
                          <th className="left">Kaynak</th>
                          <th className="num">Tutar ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txRows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="center muted">Kayıt yok.</td>
                          </tr>
                        ) : (
                          txRows.map((t, idx) => (
                            <tr key={idx}>
                              <td className="left">{fmtDateTime(t.when)}</td>
                              <td className={`left ${t.type === "ÇEKİM" ? "bad" : "good"}`}>{t.type}</td>
                              <td className="left">{t.side}</td>
                              <td className={`num mono ${t.type === "ÇEKİM" ? "bad" : "good"}`}>
                                {t.type === "ÇEKİM" ? "-" : ""}{fmtUsd(t.amount_usd)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="tfoot-total">
                          <td className="left" colSpan={3}>
                            Toplam: Yatırım <b>{fmtUsd(c.totals.depositUsd)}</b> · Çekim{" "}
                            <b>{fmtUsd(c.totals.withdrawUsd)}</b>
                          </td>
                          <td className={`num mono ${c.totals.netUsd < 0 ? "bad" : "good"}`}>
                            {fmtUsd(c.totals.netUsd)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* alt genel toplamlar — kutu şeklinde */}
        <div className="modal-sticky-footer">
          <div className="summary-box tight">
            <span>Toplam Yatırım: <b>{fmtUsd(totals.depositUsd)}</b></span>
            <span>Toplam Çekim: <b>{fmtUsd(totals.withdrawUsd)}</b></span>
            <span>Net: <b>{fmtUsd(totals.netUsd)}</b></span>
          </div>
        </div>
      </div>
    </>
  );
}
