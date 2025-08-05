import React, { useEffect, useState } from "react";
import StatsSummary from "./StatsSummary";
import "../styles/AdminPanel.css";

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email: "", password: "", role: "user" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setMsg("");
    try {
      const response = await fetch("https://sgbackend-production-8ed6.up.railway.app/api/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setUsers(data.users || []);
    } catch {
      setMsg("Kullanıcılar alınamadı.");
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const response = await fetch("https://sgbackend-production-8ed6.up.railway.app/api/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (response.ok) {
        setMsg("Kullanıcı eklendi.");
        setForm({ email: "", password: "", role: "user" });
        fetchUsers();
      } else {
        setMsg(data.message || "Ekleme başarısız.");
      }
    } catch {
      setMsg("Sunucu hatası.");
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu kullanıcı silinsin mi?")) return;
    setLoading(true);
    setMsg("");
    try {
      const response = await fetch(`https://sgbackend-production-8ed6.up.railway.app/api/users/delete/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setMsg("Kullanıcı silindi.");
        fetchUsers();
      } else {
        setMsg(data.message || "Silinemedi.");
      }
    } catch {
      setMsg("Sunucu hatası.");
    }
    setLoading(false);
  };

  return (
    <div className="adminpanel-root">
      <div className="adminpanel-container">
        <h3>Kullanıcı Yönetimi</h3>
        <form className="adminpanel-form" onSubmit={handleAddUser}>
          <input
            type="email"
            name="email"
            placeholder="E-posta"
            value={form.email}
            onChange={handleInputChange}
            required
            autoFocus
          />
          <input
            type="password"
            name="password"
            placeholder="Şifre"
            value={form.password}
            onChange={handleInputChange}
            required
          />
          <select
            name="role"
            value={form.role}
            onChange={handleInputChange}
          >
            <option value="user">Normal Kullanıcı</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={loading}>
            {loading ? "Ekleniyor..." : "Ekle"}
          </button>
        </form>
        {msg && <div className="adminpanel-msg">{msg}</div>}
        <div className="adminpanel-table-wrapper">
          <table className="adminpanel-table">
            <thead>
              <tr>
                <th>#</th>
                <th>E-posta</th>
                <th>Rol</th>
                <th>Sil</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id}>
                  <td>{i + 1}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`adminpanel-role-badge adminpanel-role-${u.role}`}>
                      {u.role === "admin" ? "Admin" : "Kullanıcı"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="adminpanel-delete-btn"
                      onClick={() => handleDelete(u.id)}
                      disabled={loading}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* İstatistik özeti kutusu */}
      <div className="adminpanel-stats-summary">
        <StatsSummary />
      </div>
    </div>
  );
}

export default AdminPanel;
