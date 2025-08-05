import React, { useState } from "react";
import "../styles/ExcelDetailsPanel.css";

const DETAIL_FIELDS = [
  { key: "aranmadi", label: "aranmadi" },
  { key: "tekrar_aranacak", label: "Tekrar Aranacak" },
  { key: "yakin_takip", label: "Yakın Takip" },
  { key: "takip", label: "Takip" },
  { key: "uzak_takip", label: "Uzak Takip" },
  { key: "numara_hatali", label: "Numara Hatalı" },
  { key: "ilgisiz", label: "İlgisiz" },
  { key: "gercek_hesap", label: "Gerçek Hesap" },
  { key: "erisim_yok", label: "Erişim Yok" },
  { key: "mesgul", label: "Meşgul" },
  { key: "toplam", label: "Toplam" }
];

function ExcelDetailsPanel({ files, onUpdate, readOnly }) {
  const [detailsState, setDetailsState] = useState({});

  const handleInputChange = (fileId, field, value) => {
    setDetailsState(prev => ({
      ...prev,
      [fileId]: { ...prev[fileId], [field]: value }
    }));
  };

  const handleSave = async (fileId) => {
    const details = detailsState[fileId] || {};
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/files/${fileId}/details`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ details })
        }
      );
      if (response.ok) {
        if (onUpdate) onUpdate();
      } else {
        alert("Kaydetme sırasında hata oluştu!");
      }
    } catch {
      alert("Sunucu hatası!");
    }
  };

  return (
    <div className="details-panel">
      <h4>Excel Detayları</h4>
      <div className="cards-container">
        {files.map(file => {
          const details = detailsState[file.id] || file.details || {};
          return (
            <div className="details-card" key={file.id}>
              <div className="details-card-filename">{file.filename}</div>
              <div className="details-card-fields">
                {DETAIL_FIELDS.map(field => (
                  <div className="details-card-field" key={field.key}>
                    <div className="field-label">{field.label}</div>
                    {readOnly ? (
                      <div className="field-value">{details[field.key] ?? "-"}</div>
                    ) : (
                      <input
                        type="text"
                        value={detailsState[file.id]?.[field.key] ?? details[field.key] ?? ""}
                        onChange={e => handleInputChange(file.id, field.key, e.target.value)}
                        className="field-input"
                        placeholder={field.label}
                      />
                    )}
                  </div>
                ))}
              </div>
              {!readOnly && (
                <button
                  className="details-save-btn"
                  onClick={() => handleSave(file.id)}
                >
                  Kaydet
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ExcelDetailsPanel;
