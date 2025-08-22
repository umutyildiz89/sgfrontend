import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../utils/http";
import "./TransactionModal.css";

/**
 * Props:
 *  - customer: { id, customer_code, name, salesperson_id?, ... }
 *  - onClose(): void
 *  - onCreated(): Promise|void
 *  - retMode?: boolean  // RET ekranı: satışçı alanı gizli, RET üyesi zorunlu, salesperson_id gönderilmeyecek
 */
export default function CustomerTransactionModal({
  customer,
  onClose,
  onCreated,
  retMode = false,
}) {
  const [type, setType] = useState("YATIRIM"); // YATIRIM | CEKIM
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [rateToUsd, setRateToUsd] = useState("");
  const [note, setNote] = useState("");

  // Satış modu için
  const [salespersons, setSalespersons] = useState([]);
  const [salespersonId, setSalespersonId] = useState("");

  // RET modu için
  const [retMembers, setRetMembers] = useState([]);
  const [retMemberId, setRetMemberId] = useState("");
  const [retInfo, setRetInfo] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const custName = customer?.name ?? "-";
  const custCode = customer?.customer_code ?? customer?.code ?? "-";
  const customerId = Number(customer?.id ?? customer?.customer_id);
  const customerSpId = Number(customer?.salesperson_id || 0) || null;

  /** Satışçıları çek (RET modunda gereksiz) */
  useEffect(() => {
    if (retMode) return;
    let mounted = true;
    (async () => {
      try {
        const res = await apiGet("/salespersons?active=1", { cache: "no-store" });
        const arr = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        if (mounted) setSalespersons(arr);
        const sp = Number(customer?.salesperson_id);
        if (mounted && sp) setSalespersonId(String(sp));
      } catch {
        /* sessiz geç */
      }
    })();
    return () => { mounted = false; };
  }, [retMode, customer?.salesperson_id]);

  /** RET üyelerini ve müşterinin atanmış RET'ini çek */
  useEffect(() => {
    if (!retMode) return;
    let mounted = true;

    (async () => {
      try {
        setRetInfo("");

        // 1) Aktif RET üyeleri
        const membersRes = await apiGet("/ret-members?active=1", { cache: "no-store" }).catch(() => []);
        const members = Array.isArray(membersRes)
          ? membersRes
          : Array.isArray(membersRes?.data)
          ? membersRes.data
          : [];

        // 2) Müşterinin atanmış RET'i
        let assigned = [];
        try {
          const ass = await apiGet(`/ret-assignments?customer_id=${customerId}`, { cache: "no-store" });
          assigned = Array.isArray(ass) ? ass : Array.isArray(ass?.data) ? ass.data : [];
        } catch (e) {
          if (e?.response?.status === 403) {
            setRetInfo("RET atamalarına erişiminiz yok (403). Tüm aktif RET üyeleri listelendi.");
          } else {
            try {
              const all = await apiGet("/ret-assignments", { cache: "no-store" });
              assigned = Array.isArray(all) ? all : Array.isArray(all?.data) ? all.data : [];
            } catch { /* boş geç */ }
          }
        }

        let list = members;
        let selected = "";

        const match = assigned.find((a) => Number(a?.customer_id) === customerId);
        if (match) {
          selected = String(match.ret_member_id);
          const found = members.find((m) => Number(m.id) === Number(match.ret_member_id));
          if (found) list = [found]; // atanmışsa yalnız onu göster
        }

        if (mounted) {
          setRetMembers(list);
          setRetMemberId(selected || (list[0]?.id ? String(list[0].id) : ""));
        }
      } catch {
        if (mounted) setRetMembers([]);
      }
    })();

    return () => { mounted = false; };
  }, [retMode, customerId]);

  // USD dışı için amount_usd hesap
  const amountUsd = useMemo(() => {
    const a = parseFloat(String(amount).replace(",", "."));
    if (!Number.isFinite(a) || a <= 0) return "";
    if (currency === "USD") return a.toFixed(6);
    const r = parseFloat(String(rateToUsd).replace(",", "."));
    if (!Number.isFinite(r) || r <= 0) return "";
    return (a * r).toFixed(6);
  }, [amount, rateToUsd, currency]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // RET modunda da kullanıcı YATIRIM/ÇEKİM seçebilir
    const opType = type;

    // validasyon
    const a = parseFloat(String(amount).replace(",", "."));
    if (!Number.isFinite(a) || a <= 0) {
      setError("Tutar geçerli değil.");
      return;
    }
    if (currency !== "USD") {
      const r = parseFloat(String(rateToUsd).replace(",", "."));
      if (!Number.isFinite(r) || r <= 0) {
        setError("USD kuru (rate) gerekli ve 0'dan büyük olmalı.");
        return;
      }
    }
    if (!retMode && !salespersonId) {
      setError("Satışçı seçin.");
      return;
    }
    if (retMode && !retMemberId) {
      setError("RET üyesi seçin.");
      return;
    }

    // RET etiketi (şemayı bozmadan iz)
    const sel =
      retMembers.find((m) => String(m.id) === String(retMemberId)) || null;
    const retTag = sel ? (sel.full_name || sel.name || `ID:${retMemberId}`) : retMemberId;
    const finalNote = retMode
      ? `[RET:${retTag}] ${note || ""}`.trim()
      : (note?.trim() || null);

    const basePayload = {
      customer_id: Number(customerId),
      type: opType,
      original_currency: currency,
      original_amount: Number(a.toFixed(6)),
      currency,
      manual_rate_to_usd:
        currency === "USD" ? null : Number(parseFloat(rateToUsd).toFixed(6)),
      amount_usd:
        currency === "USD"
          ? Number(a.toFixed(6))
          : Number(parseFloat(amountUsd).toFixed(6)),
      note: finalNote,
    };

    // 🔑 RET modunda salesperson_id KESİNLİKLE gönderme
    let payload = retMode
      ? basePayload
      : { ...basePayload, salesperson_id: Number(salespersonId) };

    try {
      setSaving(true);
      await apiPost("/transactions", payload);
      setSaving(false);
      if (typeof onCreated === "function") await onCreated();
      if (typeof onClose === "function") onClose();
      return;
    } catch (err) {
      // Eğer backend salesperson_id dayatıyorsa (400 + mesajda salesperson_id), RET için UYUMLU FALLBACK
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "";

      const salespersonError =
        /salesperson[_-]?id/i.test(msg) || /satışçı/i.test(msg);

      if (retMode && salespersonError) {
        try {
          const fallbackSp = customerSpId || null;
          if (!fallbackSp)
            throw new Error(
              "Fallback için müşterinin satışçısı bulunamadı. Lütfen işlemi 'İşlemler' sayfasından kaydedin."
            );

          const fallbackPayload = {
            ...basePayload,
            salesperson_id: Number(fallbackSp),
            note: `[RET-Fallback sp:${fallbackSp}] ${finalNote || ""}`.trim(),
          };

          await apiPost("/transactions", fallbackPayload);
          setSaving(false);
          if (typeof onCreated === "function") await onCreated();
          if (typeof onClose === "function") onClose();
          return;
        } catch (e2) {
          setSaving(false);
          setError(
            e2?.response?.data?.message ||
              e2?.message ||
              "İşlem kaydedilemedi (fallback)."
          );
          return;
        }
      }

      setSaving(false);
      setError(msg || "İşlem kaydedilemedi.");
    }
  }

  return (
    <div className="txn-modal-backdrop" role="dialog" aria-modal="true">
      <div className="txn-modal-card">
        <div className="txn-modal-header">
          <div>
            <div className="txn-modal-title">Yeni İşlem</div>
            <div className="txn-modal-sub">
              {custCode} — {custName}{" "}
              {retMode ? (
                <span className="badge badge-ret">RET</span>
              ) : (
                <span className="badge">Satış</span>
              )}
            </div>
          </div>
          <button className="btn small ghost" onClick={onClose} aria-label="Kapat">
            ✕
          </button>
        </div>

        <form className="txn-form" onSubmit={handleSubmit}>
          {/* RET modunda bilgilendirme */}
          {retMode && retInfo && (
            <div className="cust-state info" style={{ margin: "6px 0 8px" }}>
              {retInfo}
            </div>
          )}

          <div className="txn-grid">
            <label className="txn-field">
              <span>İşlem Türü</span>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="YATIRIM">YATIRIM</option>
                <option value="CEKIM">ÇEKİM</option>
              </select>
            </label>

            {/* RET modunda satışçı yerine RET Üyesi seçimi */}
            {retMode ? (
              <label className="txn-field">
                <span>RET Üyesi</span>
                <select
                  value={retMemberId}
                  onChange={(e) => setRetMemberId(e.target.value)}
                >
                  <option value="">Seçiniz…</option>
                  {retMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {(m.full_name || m.name) ?? `Üye #${m.id}`}
                      {m.email ? ` (${m.email})` : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="txn-field">
                <span>Satışçı</span>
                <select
                  value={salespersonId}
                  onChange={(e) => setSalespersonId(e.target.value)}
                >
                  <option value="">Seçiniz…</option>
                  {salespersons.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name} {sp.code ? `(${sp.code})` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="txn-field">
              <span>Tutar</span>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </label>

            <label className="txn-field">
              <span>Para Birimi</span>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="USD">USD</option>
                <option value="TRY">TRY</option>
                <option value="EUR">EUR</option>
                <option value="OTHER">OTHER</option>
              </select>
            </label>

            {currency !== "USD" && (
              <>
                <label className="txn-field">
                  <span>USD Kuru</span>
                  <input
                    type="number"
                    step="0.000001"
                    min="0"
                    value={rateToUsd}
                    onChange={(e) => setRateToUsd(e.target.value)}
                    placeholder="Örn: 1 USD = ?"
                    required
                  />
                </label>

                <div className="txn-field">
                  <span>USD Karşılığı</span>
                  <div className="txn-amount-usd">
                    {amountUsd ? `${amountUsd} USD` : "-"}
                  </div>
                </div>
              </>
            )}

            <label className="txn-field txn-col-span">
              <span>Not</span>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={retMode ? "RET işlemi notu..." : "Not (opsiyonel)"}
              />
            </label>
          </div>

          {error && (
            <div className="cust-state error" style={{ marginTop: 8 }}>
              {error}
            </div>
          )}

          <div className="txn-modal-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={onClose}
              disabled={saving}
            >
              İptal
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? "Kaydediliyor…" : retMode ? "RET ile Kaydet" : "Kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
