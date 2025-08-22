import React, { useEffect, useMemo, useRef, useState } from "react";
import SalespersonStatsModal from "../components/SalespersonStatsModal.jsx";
import { Link, useNavigate } from "react-router-dom";
import "./Reports.css";
import { apiGet } from "../utils/http";
import logo from "../assets/Logo.png"; // logoyu src/assets/Logo.png'a koy

// güvenli sayı + format
const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const fmt1 = (v) => (Number.isFinite(Number(v)) ? Number(v).toFixed(1) : "0.0");

// count-up animasyonu
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  const startRef = useRef(null);
  const fromRef = useRef(0);
  const toRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const to = toNum(target);
    const from = value;
    fromRef.current = from;
    toRef.current = to;
    startRef.current = null;

    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(fromRef.current + (toRef.current - fromRef.current) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => rafRef.current && cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return fmt1(value);
}

export default function Reports() {
  const nav = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [summary, setSummary] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [filterText, setFilterText] = useState("");

  // modal
  const [showModal, setShowModal] = useState(false);
  const [selectedSalesperson, setSelectedSalesperson] = useState(null);

  const loadData = async () => {
    try {
      const s = await apiGet(`/reports/summary?from=${from}&to=${to}`);
      setSummary(s || {});
      const rows = await apiGet(`/reports/by-salesperson?from=${from}&to=${to}`);
      const list = (rows && rows.rows) || [];
      setSalesData(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Rapor yüklenemedi:", e);
      alert("Rapor yüklenemedi!");
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredSales = useMemo(() => {
    const q = (filterText || "").toLowerCase();
    return salesData.filter((r) => (r?.salesperson_name || "").toLowerCase().includes(q));
  }, [salesData, filterText]);

  const totals = useMemo(() => {
    return filteredSales.reduce(
      (acc, r) => {
        acc.invest += toNum(r?.invest_usd);
        acc.withdraw += toNum(r?.withdraw_usd);
        acc.net += toNum(r?.net_usd);
        return acc;
      },
      { invest: 0, withdraw: 0, net: 0 }
    );
  }, [filteredSales]);

  const investAnim = useCountUp(summary?.total_invest_usd ?? 0);
  const withdrawAnim = useCountUp(summary?.total_withdraw_usd ?? 0);
  const netAnim = useCountUp(summary?.net_flow_usd ?? 0);

  const handleRowClick = (row) => {
    setSelectedSalesperson(row);
    setShowModal(true);
  };

  return (
    <div className="reports-container">
      {/* Logo */}


      {/* Hızlı nav */}
      <div className="quick-nav">
        <button className="btn ghost" onClick={() => nav(-1)}>← Geri</button>
        <div className="nav-links">
          <Link to="/customers" className="link-pill">Müşteriler</Link>
          <Link to="/sales" className="link-pill">Satışçılar</Link>
          <Link to="/transactions" className="link-pill">İşlemler</Link>
        </div>
      </div>

      {/* Tarih + Getir */}
      <div className="toolbar">
        <div className="date-chip">
          <span className="chip-label">Başlangıç</span>
          <input className="chip-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="chip-caret" aria-hidden>▾</span>
        </div>
        <div className="date-chip">
          <span className="chip-label">Bitiş</span>
          <input className="chip-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <span className="chip-caret" aria-hidden>▾</span>
        </div>
        <button className="btn primary" onClick={loadData}>Getir</button>
      </div>

      {/* Özet kartlar */}
      {summary && (
        <div className="summary-cards">
          <div className="summary-card invest">
            <div className="icon-wrap">
              <img
                className="icon-img"
                src="https://cdn.jsdelivr.net/npm/lucide-static/icons/wallet.svg"
                alt=""
              />
            </div>
            <div className="info">
              <h3>Toplam Yatırım</h3>
              <p className="number">${investAnim}</p>
            </div>
          </div>

          <div className="summary-card withdraw">
            <div className="icon-wrap">
              <img
                className="icon-img"
                src="https://cdn.jsdelivr.net/npm/lucide-static/icons/banknote.svg"
                alt=""
              />
            </div>
            <div className="info">
              <h3>Toplam Çekim</h3>
              <p className="number">${withdrawAnim}</p>
            </div>
          </div>

          <div className={`summary-card net ${toNum(summary?.net_flow_usd) >= 0 ? "positive" : "negative"}`}>
            <div className="icon-wrap">
              <img
                className="icon-img"
                src="https://cdn.jsdelivr.net/npm/lucide-static/icons/scale.svg"
                alt=""
              />
            </div>
            <div className="info">
              <h3>Net Akış</h3>
              <p className="number">${netAnim}</p>
            </div>
          </div>
        </div>
      )}

      {/* Arama */}
      <div className="center-search">
        <input
          className="search-input"
          type="text"
          placeholder="Satışçı ara..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>

      {/* Liste */}
      <div className="list-section">
        <div className="table-card">
          <div className="table-wrap">
            <table className="sales-table">
              <thead>
                <tr>
                  <th className="left">Satışçı</th>
                  <th className="num">Yatırım (USD)</th>
                  <th className="num">Çekim (USD)</th>
                  <th className="num">Net (USD)</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((row) => (
                  <tr
                    key={row?.salesperson_id ?? row?.salesperson_name}
                    onClick={() => handleRowClick(row)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="left">{row?.salesperson_name || "-"}</td>
                    <td className="num">${fmt1(row?.invest_usd)}</td>
                    <td className="num">${fmt1(row?.withdraw_usd)}</td>
                    <td className={`num ${toNum(row?.net_usd) >= 0 ? "positive" : "negative"}`}>
                      ${fmt1(row?.net_usd)}
                    </td>
                  </tr>
                ))}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan="4" className="empty-cell">Veri yok</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* toplam chip’ler */}
          {filteredSales.length > 0 && (
            <div className="totals-row">
              <div className="total-chip"><span>Toplam Yatırım</span><strong>${fmt1(totals.invest)}</strong></div>
              <div className="total-chip"><span>Toplam Çekim</span><strong>${fmt1(totals.withdraw)}</strong></div>
              <div className={`total-chip ${totals.net >= 0 ? "pos" : "neg"}`}>
                <span>Net Toplam</span><strong>${fmt1(totals.net)}</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* en altta genel toplam */}
      <div className="grand-totals">
        <div className="grand-line">
          <span>Toplam Yatırım <strong>${fmt1(totals.invest)}</strong></span>
          <span className="dot">•</span>
          <span>Toplam Çekim <strong>${fmt1(totals.withdraw)}</strong></span>
          <span className="dot">•</span>
          <span className={totals.net >= 0 ? "pos" : "neg"}>
            Net Toplam <strong>${fmt1(totals.net)}</strong>
          </span>
        </div>
      </div>

      {/* modal */}
      {showModal && (
        <SalespersonStatsModal
          salespersonId={selectedSalesperson?.salesperson_id}
          salespersonName={selectedSalesperson?.salesperson_name}
          onClose={() => setShowModal(false)}
          from={from}
          to={to}
        />
      )}
    </div>
  );
}
