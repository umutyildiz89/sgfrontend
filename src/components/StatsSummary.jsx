import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid
} from "recharts";

import "../styles/StatsSummary.css";

const STATUS_LABELS = {
  aranmadi: "Aranmadı",
  tekrar_aranacak: "Tekrar Aranacak",
  yakin_takip: "Yakın Takip",
  takip: "Takip",
  uzak_takip: "Uzak Takip",
  numara_hatalı: "Numara Hatalı",
  ilgisiz: "İlgisiz",
  gercek_hesap: "Gerçek Hesap",
  erisim_yok: "Erişim Yok",
  mesgul: "Meşgul",
};

function StatsSummary() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); // Hata mesajı için ek state
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("http://localhost:5000/api/files/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        setError("Yetkisiz erişim veya oturum süresi doldu. Lütfen tekrar giriş yapın.");
        setStats(null);
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (!data || !data.stats) {
        setError("İstatistik verisi alınamadı.");
        setStats(null);
      } else {
        setStats(data.stats);
      }

      // Konsol çıktısı Türkçeleştirildi
      console.log("API'den gelen istatistik verisi:", data);
    } catch (err) {
      console.error("İstatistikler alınırken hata oluştu:", err);
      setError("İstatistikler alınırken hata oluştu.");
      setStats(null);
    }
    setLoading(false);
  };

  if (loading) return <div className="stats-summary">Yükleniyor...</div>;
  if (error) return <div className="stats-summary">{error}</div>;
  if (!stats) return <div className="stats-summary">Veri alınamadı.</div>;

  const statKeys = Object.keys(STATUS_LABELS);

  const getCount = (timeKey, statKey) => {
    // Eksik veya nullsa sıfır döndür
    return stats[timeKey]?.[statKey] || 0;
  };

  const getTotal = (timeKey) => stats[timeKey]?.total || 0;

  // Grafik için veri hazırla
  const chartData = [
    { name: "Son Gün", total: getTotal("lastDay") },
    { name: "Son Hafta", total: getTotal("lastWeek") },
    { name: "Son Ay", total: getTotal("lastMonth") },
    { name: "Son Yıl", total: getTotal("lastYear") },
  ];

  return (
    <div className="stats-summary">
      <h3 style={{textAlign: "center"}}>Son Yükleme İstatistikleri</h3>
      <div className="stats-cards-container">
        {/* 4 kutu grid */}
        {["lastDay", "lastWeek", "lastMonth", "lastYear"].map((timeKey) => {
          let title = "";
          if (timeKey === "lastDay") title = "Son Gün";
          else if (timeKey === "lastWeek") title = "Son Hafta";
          else if (timeKey === "lastMonth") title = "Son Ay";
          else if (timeKey === "lastYear") title = "Son Yıl";

          return (
            <div className="stats-card" key={timeKey}>
              <h4>{title}</h4>
              <table tabIndex={0}>
                <thead>
                  <tr>
                    <th>Statü</th>
                    <th>Adet</th>
                  </tr>
                </thead>
                <tbody>
                  {statKeys.map((statKey) => (
                    <tr key={statKey}>
                      <td>{STATUS_LABELS[statKey]}</td>
                      <td>{getCount(timeKey, statKey)}</td>
                    </tr>
                  ))}
                  <tr className="stats-total-row">
                    <td><b>Toplam</b></td>
                    <td><b>{getTotal(timeKey)}</b></td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}

        {/* 5. kutu: performans grafiği */}
        <div className="stats-summary-graph">
          <h4>Performans Grafiği</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ left: -10, right: 10, top: 16 }}>
              <CartesianGrid strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="name" axisLine={false} tick={{ fontSize: 13.5 }} />
              <YAxis axisLine={false} tick={{ fontSize: 13.5 }} />
              <Tooltip 
                contentStyle={{
                  background: "#fff", 
                  border: "1.5px solid #a28fff", 
                  borderRadius: "10px",
                  fontWeight: 700,
                  fontSize: "14px"
                }}
                formatter={(v) => [`${v} adet`, "Toplam"]}
              />
              <ReferenceLine y={200} stroke="#ff4e95" strokeDasharray="4 6" label={{
                position: 'right',
                value: '200',
                fill: '#ff4e95',
                fontSize: 13,
                fontWeight: 'bold',
              }} />
              <Bar dataKey="total" fill="#7b60f6" radius={[8,8,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{textAlign:'center', marginTop:4, color:"#b371e1", fontWeight:700, fontSize:"14px"}}>Toplam 200 ve üstü kırmızı çizgiyi geçer!</div>
        </div>
      </div>
    </div>
  );
}

export default StatsSummary;
