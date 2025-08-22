// frontend/src/pages/Customers.jsx
import { useEffect, useMemo, useState } from "react";
import { apiGet, apiDelete } from "../utils/http";
import "./Customers.css";
import CustomerCreateModal from "../components/CustomerCreateModal.jsx";
import CustomerEditModal from "../components/CustomerEditModal.jsx";
import CustomerTransactionModal from "../components/CustomerTransactionModal.jsx";

/**
 * RET ataması yapılmış müşteri ID'lerini döndürür.
 * 1) /api/ret-assignments (tercih)
 * 2) /api/ret-assignments/summary (fallback)
 * 3) Olmazsa boş Set (UI çalışır, sadece filtre daha az sıkı olur)
 */
async function fetchRetAssignedCustomerIdsSafe() {
  try {
    const data = await apiGet("/ret-assignments", { cache: "no-store" });
    const ids = Array.isArray(data)
      ? data.map((x) => x?.customer_id).filter((v) => Number.isFinite(v))
      : [];
    return { ids: new Set(ids), denied: false };
  } catch (e) {
    // 403 ise not düşelim
    const denied = e?.response?.status === 403;
    try {
      const sum = await apiGet("/ret-assignments/summary", { cache: "no-store" });
      const arr = Array.isArray(sum) ? sum : Array.isArray(sum?.data) ? sum.data : [];
      const ids = arr
        .map((x) => x?.customer_id ?? x?.customerId ?? x?.id)
        .filter((v) => Number.isFinite(v));
      return { ids: new Set(ids), denied };
    } catch {
      return { ids: new Set(), denied };
    }
  }
}

/**
 * GM assignable (yatırım yapmış ama RET ataması bekleyen) müşteri ID'leri.
 * gm_assignable_customers view'unda "id" = customer_id gibi davranır.
 */
async function fetchAssignableCustomerIdsSafe() {
  try {
    const rows = await apiGet("/gm/assignable", { cache: "no-store" });
    const ids = Array.isArray(rows)
      ? rows.map((r) => r?.id).filter((v) => Number.isFinite(v))
      : [];
    return { ids: new Set(ids), denied: false };
  } catch (e) {
    return { ids: new Set(), denied: e?.response?.status === 403 };
  }
}

/**
 * Yatırım yapmış müşteri ID'lerini transactions üzerinden çıkarır (OPM erişebilir).
 * Sıra:
 * 1) /transactions/summary?groupBy=customer_id (varsa)
 * 2) /transactions (tüm liste → customer_id set)
 * 3) Son çare: müşteri başına 1 kayıt sorgulama (ilk 100 müşteriyle sınırla)
 */
async function fetchInvestedCustomerIdsSafe(customers) {
  // 1) summary
  try {
    const s = await apiGet("/transactions/summary?groupBy=customer_id", {
      cache: "no-store",
    });
    const arr = Array.isArray(s) ? s : Array.isArray(s?.data) ? s.data : [];
    const ids = arr
      .map((x) => x?.customer_id ?? x?.customerId ?? x?.id)
      .filter((v) => Number.isFinite(v));
    return new Set(ids);
  } catch {
    // 2) tüm transactions
    try {
      const t = await apiGet("/transactions?limit=2000", { cache: "no-store" });
      const arr = Array.isArray(t) ? t : Array.isArray(t?.data) ? t.data : [];
      const ids = arr
        .map((x) => x?.customer_id)
        .filter((v) => Number.isFinite(v));
      return new Set(ids);
    } catch {
      // 3) müşteri başına probe (limitli)
      const ids = new Set();
      const probe = (Array.isArray(customers) ? customers : []).slice(0, 100);
      for (const c of probe) {
        try {
          const r = await apiGet(`/transactions?customer_id=${c.id}&limit=1`, {
            cache: "no-store",
          });
          const arr = Array.isArray(r) ? r : Array.isArray(r?.data) ? r.data : [];
          if (arr.length > 0) ids.add(Number(c.id));
        } catch {
          // yoksay
        }
      }
      return ids;
    }
  }
}

export default function Customers() {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState({ loading: true, error: null });

  // UI filtreleri
  const [query, setQuery] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [onlyNonInvestors, setOnlyNonInvestors] = useState(true); // ✅ default ON

  // Hariç tutulacak müşteri ID setleri
  const [assignableIds, setAssignableIds] = useState(new Set());
  const [retAssignedIds, setRetAssignedIds] = useState(new Set());
  const [investedIds, setInvestedIds] = useState(new Set());

  // Yetki notu (403 olursa kullanıcıya küçük not gösterelim)
  const [permNote, setPermNote] = useState("");

  // Sayfalama
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modallar
  const [showCreate, setShowCreate] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [txnCustomer, setTxnCustomer] = useState(null);

  async function loadCustomers() {
    try {
      setState((s) => ({ ...s, loading: true, error: null }));
      setPermNote("");

      // 1) Müşteriler
      const res = await apiGet("/customers", { cache: "no-store" });
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setRows(list);

      // 2) GM assignable + RET assigned (403 olabilir)
      const [{ ids: assignable, denied: gmDenied }, { ids: assigned, denied: retDenied }] =
        await Promise.all([fetchAssignableCustomerIdsSafe(), fetchRetAssignedCustomerIdsSafe()]);

      // 3) Yatırım yapmış müşteri ID'leri (OPM erişebilir)
      const invested = await fetchInvestedCustomerIdsSafe(list);

      setAssignableIds(assignable);
      setRetAssignedIds(assigned);
      setInvestedIds(invested);

      if (gmDenied || retDenied) {
        setPermNote(
          "Not: GM/RET verilerine izin yok (403). Yatırım yapmış müşteriler, işlemler üzerinden filtrelendi."
        );
      }

      setState({ loading: false, error: null });
      setPage(1);
    } catch (err) {
      console.error("Customers fetch error:", err);
      setState({
        loading: false,
        error:
          err?.response?.data?.message ||
          err?.message ||
          "Müşteri listesi alınamadı.",
      });
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  // Birleşik hariç tutma seti:
  // - Yatırım yapmış olanlar (investedIds)
  // - GM assignable'a düşmüş olanlar
  // - RET'e atanmış olanlar
  const excludeIds = useMemo(() => {
    const s = new Set();
    investedIds.forEach((v) => s.add(Number(v)));
    assignableIds.forEach((v) => s.add(Number(v)));
    retAssignedIds.forEach((v) => s.add(Number(v)));
    return s;
  }, [investedIds, assignableIds, retAssignedIds]);

  // Filtreli data
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const id = Number(r?.id ?? r?.customer_id);
      const isActive =
        r?.is_active === 1 || r?.status === "ACTIVE" || r?.active === 1;

      if (onlyActive && !isActive) return false;
      if (onlyNonInvestors && excludeIds.has(id)) return false;

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
  }, [rows, query, onlyActive, onlyNonInvestors, excludeIds]);

  // Sayfalama
  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pagedRows = filteredRows.slice(start, start + pageSize);

  function goPage(p) {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  }

  async function onSoftDelete(row) {
    if (!row?.id) return;
    const ok = confirm(
      `Bu müşteriyi pasif etmek istiyor musunuz?\nMüşteri: ${row.customer_code || "-"} - ${row.name || "-"}`
    );
    if (!ok) return;

    try {
      await apiDelete(`/customers/${row.id}`);
      await loadCustomers();
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Pasif etme başarısız.");
    }
  }

  const hasData = pagedRows.length > 0;

  function onRowClick(row) {
    setTxnCustomer(row);
  }

  return (
    <div className="cust-container">
      {/* Başlık */}
      <div className="cust-header">
        <div style={{ width: 120 }} aria-hidden />
        <div className="cust-header-title" style={{ flex: 1, textAlign: "center" }}>
          <h1 className="cust-title" style={{ margin: 0 }}>Müşteriler</h1>
        </div>
        <div className="cust-actions">
          <button className="btn pill ghost small" onClick={loadCustomers} title="Listeyi yenile">
            ⟲ Yenile
          </button>
          <button
            className="btn pill primary small"
            onClick={() => setShowCreate(true)}
            title="Yeni müşteri ekle"
          >
            + Yeni Müşteri
          </button>
        </div>
      </div>

      {/* arama/filtre toolbar */}
      <div className="cust-toolbar">
        <div className="search-wrap">
          <input
            className="search-input"
            type="text"
            placeholder="Kod, ad/unvan, telefon, e-posta, satışçı ara…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <label className="switch">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => {
              setOnlyActive(e.target.checked);
              setPage(1);
            }}
          />
          <span className="slider" />
          <span className="switch-label">Sadece aktif</span>
        </label>

        <label className="switch" style={{ marginLeft: 12 }}>
          <input
            type="checkbox"
            checked={onlyNonInvestors}
            onChange={(e) => {
              setOnlyNonInvestors(e.target.checked);
              setPage(1);
            }}
          />
          <span className="slider" />
          <span className="switch-label">Yalnız yatırım yapmamışları göster</span>
        </label>
      </div>

      {/* yetki notu */}
      {!!permNote && (
        <div className="cust-state info" style={{ marginTop: 8 }}>
          {permNote}
        </div>
      )}

      {state.loading && <div className="cust-state info">Yükleniyor…</div>}
      {!state.loading && state.error && <div className="cust-state error">{state.error}</div>}
      {!state.loading && !state.error && !hasData && (
        <div className="cust-state empty">
          {total === 0 ? "Henüz müşteri yok." : "Bu sayfada gösterilecek kayıt yok."}
        </div>
      )}

      {!state.loading && !state.error && hasData && (
        <>
          <div className="table-wrap">
            <table className="table customers-table">
              <thead>
                <tr>
                  <th className="left">Müşteri Kodu</th>
                  <th className="left">Ad/Unvan</th>
                  <th className="left">Telefon</th>
                  <th className="left">E-posta</th>
                  <th className="left">Satışçı</th>
                  <th className="left">Durum</th>
                  <th className="left">Oluşturulma</th>
                  <th className="num">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => {
                  const id = row?.id ?? row?.customer_id ?? Math.random();
                  const code = row?.customer_code ?? "-";
                  const name = row?.name ?? "-";
                  const phone = row?.phone ?? "-";
                  const email = row?.email ?? "-";
                  const salesperson = row?.salesperson_name ?? row?.salesperson ?? "-";
                  const isActive =
                    row?.is_active === 1 || row?.status === "ACTIVE" || row?.active === 1;
                  const created = row?.created_at ?? row?.createdAt ?? null;
                  const createdFormatted = created ? new Date(created).toLocaleString() : "-";

                  return (
                    <tr key={id} onClick={() => onRowClick(row)} style={{ cursor: "pointer" }}>
                      <td className="left">{code}</td>
                      <td className="left">{name}</td>
                      <td className="left">{phone}</td>
                      <td className="left">{email}</td>
                      <td className="left">{salesperson}</td>
                      <td className="left">
                        <span className={`badge ${isActive ? "success" : "muted"}`}>
                          {isActive ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td className="left">{createdFormatted}</td>
                      <td className="num" style={{ whiteSpace: "nowrap" }}>
                        <button
                          className="btn small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditRow(row);
                          }}
                          title="Düzenle"
                        >
                          Düzenle
                        </button>
                        {/* İstersen ayrı "İşlem" butonu da açabilirsin:
                        <button className="btn small" style={{ marginLeft: 6 }}
                          onClick={(e)=>{ e.stopPropagation(); setTxnCustomer(row); }}>
                          İşlem
                        </button> */}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sayfalama */}
          <div className="pager">
            <button className="page-btn" disabled={currentPage === 1} onClick={() => goPage(currentPage - 1)}>
              ‹ Önceki
            </button>

            <div className="page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`page-number ${p === currentPage ? "active" : ""}`}
                  onClick={() => goPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              className="page-btn"
              disabled={currentPage === totalPages}
              onClick={() => goPage(currentPage + 1)}
            >
              Sonraki ›
            </button>
          </div>
        </>
      )}

      {showCreate && (
        <CustomerCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            await loadCustomers();
            setShowCreate(false);
          }}
        />
      )}

      {editRow && (
        <CustomerEditModal
          row={editRow}
          onClose={() => setEditRow(null)}
          onUpdated={async () => {
            await loadCustomers();
            setEditRow(null);
          }}
        />
      )}

      {txnCustomer && (
        <CustomerTransactionModal
          customer={txnCustomer}
          onClose={() => setTxnCustomer(null)}
          onCreated={async () => {
            // İşlem sonrası: yatırım yapan müşteri listeden düşsün
            await loadCustomers();
          }}
        />
      )}
    </div>
  );
}
