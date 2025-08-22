import React from "react";

export default function TransactionFilters({
  salespersons = [],
  customers = [],
  value,
  onChange,
  onSearch,
}) {
  const v = value || {};

  function set(field, val) {
    onChange({ ...v, [field]: val });
  }

  return (
    <div className="filters-card">
      {/* ✔ tek satır kompakt grid */}
      <div className="tfm-row tfm-row-compact">
        <div className="tfm-col">
          <label>Başlangıç</label>
          <input
            type="date"
            value={v.from || ""}
            onChange={(e) => set("from", e.target.value)}
          />
        </div>

        <div className="tfm-col">
          <label>Bitiş</label>
          <input
            type="date"
            value={v.to || ""}
            onChange={(e) => set("to", e.target.value)}
          />
        </div>

        <div className="tfm-col">
          <label>Tip</label>
          <select
            value={v.type || ""}
            onChange={(e) => set("type", e.target.value)}
          >
            <option value="">Tümü</option>
            <option value="YATIRIM">YATIRIM</option>
            <option value="CEKIM">ÇEKİM</option>
          </select>
        </div>

        <div className="tfm-col">
          <label>Satışçı</label>
          <select
            value={v.salesperson_id || ""}
            onChange={(e) => set("salesperson_id", e.target.value)}
          >
            <option value="">Tümü</option>
            {salespersons.map((sp) => (
              <option key={sp.id} value={sp.id}>
                {sp.name} {sp.code ? `(${sp.code})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="tfm-col">
          <label>Müşteri</label>
          <select
            value={v.customer_id || ""}
            onChange={(e) => set("customer_id", e.target.value)}
          >
            <option value="">Tümü</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customer_code} - {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* küçük Uygula */}
        <div className="tfm-col tfm-col-actions">
          <button
            type="button"
            className="btn primary small"
            onClick={onSearch}
            title="Filtreyi uygula"
          >
            Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
