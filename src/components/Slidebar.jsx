// ... diğer importlar
import { NavLink } from 'react-router-dom';

// role'ü mevcut mekanizmanızdan okuyun (ör: localStorage JWT decode)
const token = localStorage.getItem('token');
function decodeJWT(t) {
  try {
    const payload = t.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch { return null; }
}
const role = token ? (decodeJWT(token)?.role || decodeJWT(token)?.claims?.role) : null;

// JSX içinde uygun yere ekleyin:
{role === 'Genel Müdür' && (
  <NavLink to="/ret-assignment">RET Atama</NavLink>
)}
