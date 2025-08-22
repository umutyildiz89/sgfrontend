import { useEffect, useMemo, useState } from "react";
import "./Transactions.css";
import { apiGet } from "../utils/http";

// BİLEŞENLER (css'lerini kendi içlerinden import ederler)
import TransactionFilters from "../components/TransactionFilters.jsx";
import TransactionList from "../components/TransactionList.jsx";
import TransactionForm from "../components/TransactionForm.jsx";

function todayLocalISO() {
  return new Date().toLocaleDateString("en-CA");
}

export default function Transactions() {
  const [salespersons, setSalespersons] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [filters, setFilters] = useState({
    from: todayLocalISO(),
    to: todayLocalISO(),
    type: "",
    salesperson_id: "",
    customer_id: "",
  });

  async function loadLookups() {
    try {
      const [spRes, cRes] = await Promise.all([
        apiGet("/salespersons"),
        apiGet("/customers"),
      ]);
      const spData = Array.isArray(spRes) ? spRes : spRes?.data;
      const cData = Array.isArray(cRes) ? cRes : cRes?.data;

      setSalespersons(
        (Array.isArray(spData) ? spData : []).filter(
          (s) => Number(s.is_active ?? 1) === 1
        )
      );
      setCustomers(
        (Array.isArray(cData) ? cData : []).filter(
          (c) => Number(c.is_active ?? 1) === 1
        )
      );
    } catch (e) {
      console.error("Lookup fetch error:", e);
    }
  }

  async function loadList() {
    try {
      setLoading(true);
      setErr("");

      const params = new URLSearchParams();
      if (filters.from) params.append("from", filters.from);
      if (filters.to) params.append("to", filters.to);
      if (filters.type) params.append("type", filters.type);
      if (filters.salesperson_id)
        params.append("salesperson_id", filters.salesperson_id);
      if (filters.customer_id)
        params.append("customer_id", filters.customer_id);

      const res = await apiGet(`/transactions?${params.toString()}`);
      const data = Array.isArray(res)
        ? res
        : Array.isArray(res?.rows)
        ? res.rows
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setRows(data);
    } catch (e) {
      setErr(
        e?.response?.data?.message || e?.message || "İşlem listesi alınamadı"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLookups();
    loadList();
  }, []);

  const hasData = useMemo(() => rows && rows.length > 0, [rows]);

  async function handleCreated() {
    await loadList();
  }

  return (
    <div className="txn-container">
      {/* Üst barı kaldırdık; doğrudan form + liste */}
      <div className="txn-grid">
        <div className="txn-left">
          <h1 className="txn-title">İşlem Ekle</h1>
          <TransactionForm
            salespersons={salespersons}
            customers={customers}
            onCreated={handleCreated}
          />
        </div>

        <div className="txn-right">
          <div className="txn-header">
            <h2>İşlemler</h2>
            <TransactionFilters
              salespersons={salespersons}
              customers={customers}
              value={filters}
              onChange={setFilters}
              onSearch={loadList}
            />
          </div>

          {loading && <div className="txn-state info">Yükleniyor…</div>}
          {err && !loading && <div className="txn-state error">{err}</div>}
          {!loading && !err && !hasData && (
            <div className="txn-state empty">Kayıt bulunamadı</div>
          )}
          {!loading && !err && hasData && <TransactionList rows={rows} />}
        </div>
      </div>
    </div>
  );
}
