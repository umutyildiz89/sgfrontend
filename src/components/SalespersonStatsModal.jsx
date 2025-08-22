import { useEffect, useState, useMemo } from "react";
import { apiGet } from "../utils/http";
import "./SalespersonStatsModal.css"; // küçük stil ekleri (aşağıda)

export default function SalespersonStatsModal({
  salespersonId,
  salespersonName,
  onClose,
  // opsiyonel: tarih aralığı verirsen backend'e geçer
  from = "",
  to = "",
}) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        setLoading(true);
        setErr("");
        const params = new URLSearchParams();
        params.append("salesperson_id", String(salespersonId));
        if (from) params.append("from", from);
        if (to) params.append("to", to);

        const res = await apiGet(`/reports/salesperson-stats?${params.toString()}`);
        if (!ignore) setData(res);
      } catch (e) {
        if (!ignore) setErr(e?.response?.data?.message || e?.message || "Veri alınamadı");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    if (salespersonId) load();
    return () => { ignore = true; };
  }, [salespersonId, from, to]);

  const target = useMemo(() => Number(data?.target ?? 20), [data]);
  const current = useMemo(() => Number(data?.current_invest_count ?? 0), [data]);
  const prev = useMemo(() => Number(data?.prev_invest_count ?? 0), [data]);

  // Eğer backend withdraw_count döndürmeye başlarsa otomatik gösterelim (yoksa 0)
  const currentWithdraw = useMemo(() => Number(data?.this_month?.withdraw_count ?? 0), [data]);
  const prevWithdraw = useMemo(() => Number(data?.last_month?.withdraw_count ?? 0), [data]);

  const pct = useMemo(() => {
    if (!target || target <= 0) return 0;
    const p = (current / target) * 100;
    return Math.max(0, Math.min(100, p));
  }, [current, target]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal stats-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Kapat">×</button>

        <h3 className="stats-title">{salespersonName || `Satışçı #${salespersonId}`}</h3>

        {loading && <div className="stats-state info">Yükleniyor…</div>}
        {err && !loading && <div className="stats-state error">{err}</div>}

        {!loading && !err && (
          <>
            {/* Hedef progress */}
            <div className="progress-card">
              <div className="progress-head">
                <div>
                  <div className="progress-label">Aylık Yatırım Hedefi</div>
                  <div className="progress-meta">
                    <strong>{current}</strong> / {target} adet
                  </div>
                </div>
                <div className="progress-pct">{pct.toFixed(0)}%</div>
              </div>
              <div className="progress">
                <div className="progress-bar" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* Sayısal kartlar */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Bu Ay Yatırım (adet)</div>
                <div className="stat-value">{current}</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Geçen Ay Yatırım (adet)</div>
                <div className="stat-value">{prev}</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Bu Ay Çekim (adet)</div>
                <div className="stat-value">{currentWithdraw}</div>
              </div>

              <div className="stat-card">
                <div className="stat-label">Geçen Ay Çekim (adet)</div>
                <div className="stat-value">{prevWithdraw}</div>
              </div>
            </div>

            {/* İpucu */}
            <div className="tip-line">
              Hedef varsayılan <strong>20 adet yatırım</strong>. Satışçıya özel hedef tanımlıysa otomatik uygulanır.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
