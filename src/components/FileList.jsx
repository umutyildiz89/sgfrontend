import React, { useEffect, useState } from "react";
import StatusUpdate from "./StatusUpdate";
import ExcelDetailsPanel from "./ExcelDetailsPanel";
import "../styles/FileList.css";

function FileList() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("userRole");

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line
  }, []);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://sgbackend-production-8ed6.up.railway.app/api/files", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setFiles(data.files || []);
    } catch {
      setFiles([]);
    }
    setLoading(false);
  };

  const handleDownload = (filename) => {
    window.open(`https://sgbackend-production-8ed6.up.railway.app/api/files/download/${filename}`, "_blank");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu dosya silinsin mi?")) return;
    try {
      setLoading(true);
      const response = await fetch(`https://sgbackend-production-8ed6.up.railway.app/api/files/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        alert("Dosya başarıyla silindi.");
        fetchFiles();
      } else {
        alert("Dosya silinemedi.");
      }
    } catch {
      alert("Sunucu hatası.");
    }
    setLoading(false);
  };

  return (
    <div className="filelist-container">
      <h3>{userRole === "admin" ? "Tüm Yüklemeler" : "Yüklediğin Dosyalar"}</h3>
      {loading ? (
        <div className="filelist-loading">Yükleniyor...</div>
      ) : files.length === 0 ? (
        <div className="filelist-empty">Henüz dosya yok.</div>
      ) : (
        <div className="filelist-grid">
          {files.map((file, i) => (
            <div className="file-card" key={file.id}>
              <div className="file-card-header">
                <div className="file-card-filename" title={file.filename}>
                  <span>{file.filename}</span>
                </div>
                <button
                  className="filelist-download-btn"
                  onClick={() => handleDownload(file.filename)}
                  title="İndir"
                >
                  ⬇️
                </button>
                {userRole === "admin" && (
                  <button
                    className="filelist-delete-btn"
                    onClick={() => handleDelete(file.id)}
                    disabled={loading}
                    title="Sil"
                  >
                    🗑️
                  </button>
                )}
              </div>
              <div className="file-card-details">
                <span>
                  <b>Yükleme Tarihi:</b>{" "}
                  {new Date(file.upload_date).toLocaleString("tr-TR")}
                </span>
                <span>
                  <b>Sıra:</b> {i + 1}
                </span>
                <span>
                  <b>Statü:</b>{" "}
                  {userRole === "admin" ? (
                    <StatusUpdate
                      fileId={file.id}
                      currentStatus={file.status}
                      onUpdated={fetchFiles}
                    />
                  ) : (
                    <span className={`filelist-status filelist-status-${file.status}`}>
                      {file.status}
                    </span>
                  )}
                </span>
              </div>
              {file.details && (
                <div className="file-card-statuses">
                  {Object.entries(file.details)
                    .filter(([k]) => k !== "total")
                    .map(([k, v]) => (
                      <span key={k} className="file-status-item">
                        <span className="file-status-key">{k}:</span>
                        <span className="file-status-value">{v}</span>
                      </span>
                    ))}
                  <span className="file-status-total">
                    Toplam: <b>{file.details.total}</b>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Admin ise detay panelini göster */}
      {userRole === "admin" && files.length > 0 && (
        <div className="details-panel">
          <ExcelDetailsPanel files={files} onUpdate={fetchFiles} />
        </div>
      )}
      {/* Normal kullanıcı için detay paneli (readOnly) */}
      {userRole !== "admin" && files.length > 0 && (
        <div className="details-panel">
          <ExcelDetailsPanel files={files} readOnly />
        </div>
      )}
    </div>
  );
}

export default FileList;
