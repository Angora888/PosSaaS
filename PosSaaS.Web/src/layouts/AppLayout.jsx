import { NavLink, useNavigate } from "react-router-dom";
import "../styles/layout.css";

function AppLayout({ children }) {
  const navigate = useNavigate();
  const nombre = localStorage.getItem("nombre") || "Usuario";
  const rol = localStorage.getItem("rol") || "Usuario";

  const esSuperAdmin = rol === "SuperAdmin";
  const esAdmin = rol === "Admin";
  const esSupervisor = rol === "Supervisor";
  const puedeVerProductos = esAdmin || esSupervisor;
  const puedeVerInventario = esAdmin || esSupervisor;
  const puedeVerReportes = esAdmin || esSupervisor;
  const puedeVerUsuarios = esAdmin;
  const puedeVerConfiguracion = esAdmin;

  const cerrarSesion = () => {
    ["token", "usuarioId", "nombre", "email", "rol", "tenantId", "sucursalId", "comercio", "nombreComercial"].forEach((item) => localStorage.removeItem(item));
    navigate("/login", { replace: true });
  };

  const enlace = (to, icono, texto) => (
    <NavLink to={to} className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
      <i className={`bi ${icono}`}></i><span>{texto}</span>
    </NavLink>
  );

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo"><i className={esSuperAdmin ? "bi bi-shield-lock" : "bi bi-shop"}></i></div>
          <div><h4>POS SaaS</h4><span>{esSuperAdmin ? "Plataforma" : "Punto de Venta"}</span></div>
        </div>

        <nav className="sidebar-nav">
          {esSuperAdmin ? (
            <>
              {enlace("/superadmin", "bi-speedometer2", "Plataforma")}
              <div className="sidebar-separator"></div>
              <div className="px-3 py-2 text-secondary small">Administración global</div>
            </>
          ) : (
            <>
              {enlace("/dashboard", "bi-grid", "Dashboard")}
              {enlace("/pos", "bi-cart3", "Punto de Venta")}
              {puedeVerProductos && enlace("/productos", "bi-box-seam", "Productos")}
              {puedeVerInventario && enlace("/inventario", "bi-boxes", "Inventario")}
              {enlace("/clientes", "bi-people", "Clientes")}
              {enlace("/ventas", "bi-receipt", "Ventas")}
              {enlace("/cajas", "bi-cash-stack", "Cajas")}
              {puedeVerReportes && enlace("/reportes", "bi-bar-chart-line", "Reportes")}
              {(puedeVerUsuarios || puedeVerConfiguracion) && <div className="sidebar-separator"></div>}
              {puedeVerUsuarios && enlace("/usuarios", "bi-person-gear", "Usuarios")}
              {puedeVerConfiguracion && enlace("/configuracion", "bi-gear", "Configuración")}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="usuario-info">
            <div className="usuario-avatar">{nombre.charAt(0).toUpperCase()}</div>
            <div className="usuario-datos"><strong>{nombre}</strong><span>{rol}</span></div>
          </div>
          <button className="btn-logout" onClick={cerrarSesion} title="Cerrar sesión"><i className="bi bi-box-arrow-right"></i></button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><h5 className="mb-0">{esSuperAdmin ? "POS SaaS · Plataforma" : "POS SaaS"}</h5></div>
          <div className="topbar-right"><span className={esSuperAdmin ? "badge text-bg-dark" : "badge text-bg-light"}><i className={esSuperAdmin ? "bi bi-shield-check me-1" : "bi bi-person-circle me-1"}></i>{rol}</span></div>
        </header>
        <div className="content-area">{children}</div>
      </main>
    </div>
  );
}

export default AppLayout;
