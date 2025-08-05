import React from "react";
import Header from "../components/Header";
import Upload from "../components/Upload";
import FileList from "../components/FileList";
import AdminPanel from "../components/AdminPanel";
import StatsSummary from "../components/StatsSummary";
import "./Dashboard.css"; // Yeni özel Dashboard CSS'i

function Dashboard() {
  const userRole = localStorage.getItem("userRole");

  return (
    <div className="dashboard-root">
      <Header />
      <div className="dashboard-main">
        <div className="dashboard-info-panel">
          {userRole === "admin" ? <AdminPanel /> : <StatsSummary />}
        </div>
        <div className="dashboard-content-grid">
          <div className="dashboard-upload-panel">
            <Upload />
          </div>
          <div className="dashboard-filelist-panel">
            <FileList />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
