import React, { useEffect, useState } from "react";
import "../styles/StatusUpdate.css";

const STATUS_OPTIONS = [
  { code: "islem_tamamlandi", name: "İşlem tamamlandı" },
  { code: "islemde", name: "İşlemde" },
  { code: "islem_baslamadi", name: "İşlem başlamadı" }
];

function StatusUpdate({ fileId, currentStatus, onUpdated }) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const handleChange = (e) => {
    setStatus(e.target.value);
    setMsg("");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const response = await fetch("http://localhost:5000/api/status/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ fileId, status })
      });
      const data = await response.json();
      if (response.ok) {
        setMsg("Statü güncellendi.");
        if (onUpdated) onUpdated();
      } else {
        setMsg(data.message || "Güncelleme başarısız.");
      }
    } catch {
      setMsg("Sunucuya ulaşılamadı.");
    }
    setLoading(false);
  };

  return (
    <form className="statusupdate-form" onSubmit={handleUpdate}>
      <select value={status} onChange={handleChange} disabled={loading}>
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.name}
          </option>
        ))}
      </select>
      <button type="submit" disabled={loading || status === currentStatus}>
        {loading ? "Kaydediliyor..." : "Kaydet"}
      </button>
      {msg && <span className="statusupdate-msg">{msg}</span>}
    </form>
  );
}

export default StatusUpdate;
