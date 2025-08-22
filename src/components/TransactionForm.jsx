import { useEffect, useMemo, useRef, useState } from "react";
import "./TransactionForm.css";           // ← CSS burada
import { apiPost } from "../utils/http";

const initialForm = {
  type: "YATIRIM",
  original_amount: "",
  currency: "USD",
  manual_rate_to_usd: "",
  salesperson_id: "",
  customer_id: "",
  note: "",
};

export default function TransactionForm({ salespersons = [], customers = [], onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const submittingRef = useRef(false);

  const isUSD = useMemo(
    () => String(form.currency || "").toUpperCase() === "USD",
    [form.currency]
  );

  const amountUSDPreview = useMemo(() => {
    const amt = Number(form.original_amount);
    if (!amt || amt <= 0) return "";
    if (isUSD) return amt.toFixed(6);
    const rate = Number(form.manual_rate_to_usd);
    if (!rate || rate <= 0) return "";
    return (amt * rate).toFixed(6);
  }, [form.original_amount, form.manual_rate_to_usd, isUSD]);

  useEffect(() => {
    if (isUSD) setForm((f) => ({ ...f, manual_rate_to_usd: "" }));
  }, [isUSD]);

  function setField(field, v) {
    setErr("");
    setForm((f) => ({ ...f, [field]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (saving || submittingRef.current) return;
    submittingRef.current = true;
    setErr("");

    const payload = {
      type: String(form.type).toUpperCase(),
      original_amount: Number(form.original_amount),
      currency: String(form.currency || "").toUpperCase(),
      salesperson_id: Number(form.salesperson_id),
      customer_id: Number(form.customer_id),
      note: form.note?.trim() || null,
    };

    if (!payload.original_amount || payload.original_amount <= 0) {
      setErr("Tutar > 0 olmalı.");
      submittingRef.current = false;
      return;
    }
    if (!payload.currency) {
      setErr("Para birimi zorunlu.");
      submittingRef.current = false;
      return;
    }
    if (!payload.salesperson_id) {
      setErr("Satışçı seçiniz.");
      submittingRef.current = false;
      return;
    }
    if (!payload.customer_id) {
      setErr("Müşteri seçiniz.");
      submittingRef.current = false;
      return;
    }
    if (payload.currency !== "USD") {
      const rate = Number(form.manual_rate_to_usd);
      if (!rate || rate <= 0) {
        setErr("USD dışı için kur (manual_rate_to_usd) > 0 olmalı.");
        submittingRef.current = false;
        return;
      }
      payload.manual_rate_to_usd = rate;
    } else {
      payload.manual_rate_to_usd = null;
    }

    try {
      setSaving(true);
      const idemKey = [
        payload.type,
        payload.original_amount,
        payload.currency,
        payload.manual_rate_to_usd ?? "null",
        payload.salesperson_id,
        payload.customer_id,
        payload.note ?? "",
        Date.now(),
      ].join("|");

      await apiPost("/transactions", payload, {
        headers: { "x-idempotency-key": idemKey },
      });

      setForm(initialForm);
      onCreated && onCreated();
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.message || "Kayıt başarısız");
    } finally {
      setSaving(false);
      submittingRef.current = false;
    }
  }

  return (
    <form className="tfm-card" onSubmit={onSubmit}>
      {err && <div className="tfm-error">{err}</div>}

      <div className="tfm-row tfm-row-compact">
        <div className="tfm-col">
          <label>Tip</label>
          <select value={form.type} onChange={(e) => setField("type", e.target.value)}>
            <option value="YATIRIM">YATIRIM</option>
            <option value="CEKIM">ÇEKİM</option>
          </select>
        </div>
        <div className="tfm-col">
          <label>Tutar</label>
          <input
            type="number" step="0.000001" min="0" placeholder="0.00"
            value={form.original_amount}
            onChange={(e) => setField("original_amount", e.target.value)}
          />
        </div>
        <div className="tfm-col">
          <label>Para Birimi</label>
          <select value={form.currency} onChange={(e) => setField("currency", e.target.value)}>
            <option value="USD">USD</option>
            <option value="TRY">TRY</option>
            <option value="EUR">EUR</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>
        {!isUSD && (
          <div className="tfm-col">
            <label>USD Kur (manuel)</label>
            <input
              type="number" step="0.000001" min="0" placeholder="Örn: 32.350000"
              value={form.manual_rate_to_usd}
              onChange={(e) => setField("manual_rate_to_usd", e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="tfm-row tfm-row-compact">
        <div className="tfm-col">
          <label>Satışçı</label>
          <select
            value={form.salesperson_id}
            onChange={(e) => setField("salesperson_id", e.target.value)}
          >
            <option value="">Seçiniz</option>
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
            value={form.customer_id}
            onChange={(e) => setField("customer_id", e.target.value)}
          >
            <option value="">Seçiniz</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customer_code} - {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="tfm-col wide">
          <label>Not</label>
          <input
            type="text" maxLength={500} placeholder="İsteğe bağlı"
            value={form.note}
            onChange={(e) => setField("note", e.target.value)}
          />
        </div>

        <div className="tfm-col tfm-col-actions">
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Kaydediliyor..." : "Ekle"}
          </button>
        </div>
      </div>

      <div className="tfm-footer">
        <div className="tfm-preview">
          {amountUSDPreview && (
            <span className="badge success">
              ≈ USD: <strong>{amountUSDPreview}</strong>
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
