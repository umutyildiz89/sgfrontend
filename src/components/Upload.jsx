import React, { useState } from "react";
import "../styles/Upload.css";

function Upload({ onUpload }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!file) {
      setMessage("Lütfen bir dosya seçin.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("token");

    try {
      const response = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Dosya başarıyla yüklendi!");
        setFile(null);
        if (onUpload) onUpload();
      } else {
        setMessage(data.message || "Yükleme başarısız.");
      }
    } catch (err) {
      setMessage("Sunucuya ulaşılamadı.");
    }
    setLoading(false);
  };

  return (
    <div className="upload-container">
      <h3>Excel Dosyası Yükle (.xls, .xlsx)</h3>
      <form onSubmit={handleUpload}>
        <input
          type="file"
          accept=".xls,.xlsx"
          onChange={handleFileChange}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Yükleniyor..." : "Yükle"}
        </button>
        {message && <div className="upload-message">{message}</div>}
      </form>
    </div>
  );
}

export default Upload;
