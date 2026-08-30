import { NavLink, useNavigate } from "react-router-dom";
import "../styles/layout.css";

function AppLayout({ children }) {
  const navigate = useNavigate();

  const nombre = localStorage.getItem("nombre") || "Usuario";
  const rol = localStorage.getItem("rol") || "Usuario";

  const esAdmin = rol === "Admin";
  const esSupervisor = rol === "Supervisor";
  const esCajero = rol === "Cajero";

  const puedeVerProductos = esAdmin || esSupervisor;
  const puedeVerInventario = esAdmin || esSupervisor;
  const puedeVerUsuarios = esAdmin;
  const puedeVerConfiguracion = esAdmin;

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuarioId");
    localStorage.removeItem("nombre");
    localStorage.removeItem("email");
    localStorage.removeItem("rol");
    localStorage.removeItem("tenantId");
    localStorage.removeItem("sucursalId");
    localStorage.removeItem("comercio");

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <i className="bi bi-shop"></i>
          </div>

          <div>
            <h4>POS SaaS</h4>
            <span>Punto de Venta</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <i className="bi bi-grid"></i>
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/pos"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <i className="bi bi-cart3"></i>
            <span>Punto de Venta</span>
          </NavLink>

          {puedeVerProductos && (
            <NavLink
              to="/productos"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <i className="bi bi-box-seam"></i>
              <span>Productos</span>
            </NavLink>
          )}

          {puedeVerInventario && (
            <NavLink
              to="/inventario"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <i className="bi bi-boxes"></i>
              <span>Inventario</span>
            </NavLink>
          )}

          <NavLink
            to="/clientes"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <i className="bi bi-people"></i>
            <span>Clientes</span>
          </NavLink>

          <NavLink
            to="/ventas"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <i className="bi bi-receipt"></i>
            <span>Ventas</span>
          </NavLink>

          <NavLink
            to="/cajas"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            <i className="bi bi-cash-stack"></i>
            <span>Cajas</span>
          </NavLink>

          {(puedeVerUsuarios || puedeVerConfiguracion) && (
            <div className="sidebar-separator"></div>
          )}

          {puedeVerUsuarios && (
            <NavLink
              to="/usuarios"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <i className="bi bi-person-gear"></i>
              <span>Usuarios</span>
            </NavLink>
          )}

          {puedeVerConfiguracion && (
            <NavLink
              to="/configuracion"
              className={({ isActive }) =>
                `sidebar-link ${isActive ? "active" : ""}`
              }
            >
              <i className="bi bi-gear"></i>
              <span>Configuración</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="usuario-info">
            <div className="usuario-avatar">
              {nombre.charAt(0).toUpperCase()}
            </div>

            <div className="usuario-datos">
              <strong>{nombre}</strong>
              <span>{rol}</span>
            </div>
          </div>

          <button
            className="btn-logout"
            onClick={cerrarSesion}
            title="Cerrar sesión"
          >
            <i className="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h5 className="mb-0">POS SaaS</h5>
          </div>

          <div className="topbar-right">
            <span className="badge text-bg-light">
              <i className="bi bi-person-circle me-1"></i>
              {rol}
            </span>
          </div>
        </header>

        <div className="content-area">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AppLayout;