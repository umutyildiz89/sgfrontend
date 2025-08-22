import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPut } from "../utils/http";
import "./CustomerEditModal.css";

/**
 * Müşteri Düzenleme Modalı (PUT /customers/:id)
 * - Edit için id ZORUNLU.
 */
export default function CustomerEditModal({ row, onClose, onUpdated }) {
  const [salespersons, setSalespersons] = useState([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    id: null,
    customer_code: "",
    name: "",
    phone: "",
    email: "",
    salesperson_id: "",
    is_active: 1,
  });

  // Row'dan formu doldur (id zorunlu)
  useEffect(() => {
    if (row && row.id) {
      setForm({
        id: row.id,
        customer_code: String(row.customer_code || "").replace(/\D/g, "").padStart(6, "0"),
        name: row.name || "",
        phone: row.phone || "",
        email: row.email || "",
        salesperson_id: row.salesperson_id || "",
        is_active:
          row.is_active === 1 || row.is_active === true ? 1 : Number(row.is_active ?? 0),
      });
    } else {
      setForm((f) => ({ ...f, id: null }));
    }
  }, [row]);

  // Aktif satışçı listesi
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingSales(true);
        const res = await apiGet("/salespersons");
        const list = Array.isArray(res?.data) ? res.data : [];
        const onlyActive = list.filter((s) => Number(s?.is_active ?? 1) === 1);
        if (mounted) setSalespersons(onlyActive);
      } catch (e) {
        console.error("Salespersons fetch error:", e);
      } finally {
        if (mounted) setLoadingSales(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  const canSubmit = useMemo(() => {
    const idOk = Number.isFinite(Number(form.id)) && Number(form.id) > 0;
    const codeOk = /^\d{6}$/.test((form.customer_code || "").trim());
    const nameOk = (form.name || "").trim().length > 0;
    const spOk = String(form.salesperson_id || "").length > 0;
    return idOk && codeOk && nameOk && spOk && !saving;
  }, [form, saving]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    const idNum = Number(form.id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      setErr("Bu modal yalnızca mevcut müşteri güncellemek içindir (geçersiz id).");
      return;
    }
    if (!/^\d{6}$/.test((form.customer_code || "").trim())) {
      setErr("Müşteri kodu 6 haneli rakamlardan oluşmalı (örn: 000123).");
      return;
    }
    if (!(form.name || "").trim()) {
      setErr("Ad/Unvan zorunludur.");
      return;
    }
    if (!String(form.salesperson_id)) {
      setErr("Lütfen bir satışçı seçiniz.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        customer_code: form.customer_code.trim(),
        name: form.name.trim(),
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
        salesperson_id: Number(form.salesperson_id),
        is_active: Number(form.is_active ?? 1),
      };

      await apiPut(`/customers/${idNum}`, payload);

      onUpdated && onUpdated();
      onClose && onClose();
    } catch (e) {
      setErr(e?.data?.message || e?.message || "Güncelleme sırasında bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Müşteri Düzenle</h2>
          <button className="icon-btn" onClick={onClose} title="Kapat" aria-label="Kapat">
            ✕
          </button>
        </div>

        {!form.id && (
          <div className="modal-error">
            Bu modal sadece mevcut kaydı düzenlemek içindir. Lütfen listeden bir kayıt seçin.
          </div>
        )}

        {err && <div className="modal-error">{err}</div>}

        <form className="modal-form" onSubmit={onSubmit}>
          <div className="row">
            <div className="col">
              <label htmlFor="ccode">Müşteri Kodu (6 hane)</label>
              <input
                id="ccode"
                type="text"
                inputMode="numeric"
                placeholder="Örn: 000123"
                value={form.customer_code}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    customer_code: e.target.value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
                required
              />
            </div>

            <div className="col">
              <label htmlFor="cname">Ad/Unvan</label>
              <input
                id="cname"
                type="text"
                placeholder="Örn: ABC Ltd."
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="row">
            <div className="col">
              <label htmlFor="cphone">Telefon</label>
              <input
                id="cphone"
                type="tel"
                placeholder="Örn: +90 5xx xxx xx xx"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>

            <div className="col">
              <label htmlFor="cemail">E‑posta</label>
              <input
                id="cemail"
                type="email"
                placeholder="mail@ornek.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="row">
            <div className="col">
              <label htmlFor="csales">Satışçı</label>
              <select
                id="csales"
                value={form.salesperson_id}
                onChange={(e) => setForm((f) => ({ ...f, salesperson_id: e.target.value }))}
                disabled={loadingSales}
                required
              >
                <option value="">Seçiniz</option>
                {salespersons.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name} {sp.code ? `(${sp.code})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="col">
              <label htmlFor="cactive">Durum</label>
              <select
                id="cactive"
                value={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: Number(e.target.value) }))}
              >
                <option value={1}>Aktif</option>
                <option value={0}>Pasif</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn" onClick={onClose} disabled={saving}>
              Vazgeç
            </button>
            <button type="submit" className="btn primary" disabled={!canSubmit}>
              {saving ? "Güncelleniyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
