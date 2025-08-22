import { useState, useMemo } from "react";
import "./TransactionList.css";

const fmt1 = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(1) : "0.0";
};

export default function TransactionList({ rows = [] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const totalPages = Math.ceil(rows.length / rowsPerPage);

  const currentRows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return rows.slice(startIndex, startIndex + rowsPerPage);
  }, [currentPage, rows]);

  return (
    <div className="table-wrap">
      <table className="table txn-table">
        <thead>
          <tr>
            <th className="num">ID</th>
            <th className="left">Tip</th>
            <th className="num">Tutar</th>
            <th className="left">Para Birimi</th>
            <th className="num">Kur</th>
            <th className="num">USD Tutar</th>
            <th className="left">Satışçı</th>
            <th className="left">Müşteri</th>
            <th className="left">Not</th>
            <th className="left">Oluşturulma</th>
          </tr>
        </thead>
        <tbody>
          {currentRows.map((r) => {
            const type = String(r.type || "").toUpperCase();
            const badgeCls =
              type === "YATIRIM" ? "badge-type invest" :
              type === "CEKIM"   ? "badge-type withdraw" : "badge-type";
            return (
              <tr key={r.id}>
                <td className="num">{r.id}</td>
                <td className="left">
                  <span className={badgeCls}>{type || "-"}</span>
                </td>
                <td className="num">{fmt1(r.original_amount)}</td>
                <td className="left">{r.currency}</td>
                <td className="num">
                  {r.manual_rate_to_usd == null ? "-" : fmt1(r.manual_rate_to_usd)}
                </td>
                <td className="num"><strong>{fmt1(r.amount_usd)}</strong></td>
                <td className="left">{r.salesperson_name || r.salesperson_id}</td>
                <td className="left">{r.customer_name || r.customer_id}</td>
                <td className="left note-cell" title={r.note || ""}>
                  {r.note || "-"}
                </td>
                <td className="left">
                  {r.created_at ? new Date(r.created_at).toLocaleString() : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
          >
            «
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`page-btn ${currentPage === i + 1 ? "active" : ""}`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="page-btn"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}
