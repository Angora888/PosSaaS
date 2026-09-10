import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function SuperAdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const limpiarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuarioId");
    localStorage.removeItem("platformUserId");
    localStorage.removeItem("userType");
    localStorage.removeItem("nombre");
    localStorage.removeItem("email");
    localStorage.removeItem("rol");
    localStorage.removeItem("tenantId");
    localStorage.removeItem("sucursalId");
    localStorage.removeItem("comercio");
    localStorage.removeItem("nombreComercial");
  };

  const iniciarSesion = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }

    try {
      setCargando(true);

      const response = await api.post("/PlatformAuth/login", {
        email: email.trim(),
        password,
      });

      const data = response.data;

      if (!data.token || !data.usuario) {
        setError("La API no devolvió una sesión válida.");
        return;
      }

      if (data.usuario.rol !== "SuperAdmin") {
        limpiarSesion();
        setError("La cuenta no tiene permisos de SuperAdmin.");
        return;
      }

      limpiarSesion();

      localStorage.setItem("token", data.token);
      localStorage.setItem("rol", data.usuario.rol);
      localStorage.setItem("userType", "platform");

      if (data.usuario.id !== undefined) {
        localStorage.setItem("platformUserId", data.usuario.id);
      }

      if (data.usuario.nombre) {
        localStorage.setItem("nombre", data.usuario.nombre);
      }

      if (data.usuario.email) {
        localStorage.setItem("email", data.usuario.email);
      }

      navigate("/superadmin", { replace: true });
    } catch (err) {
      console.error(err);

      if (err.response?.status === 401) {
        setError(
          err.response?.data?.mensaje ||
            "Correo o contraseña incorrectos."
        );
      } else if (err.response?.data?.mensaje) {
        setError(err.response.data.mensaje);
      } else if (typeof err.response?.data === "string") {
        setError(err.response.data);
      } else if (!err.response) {
        setError(
          "No se pudo conectar con el servidor. Verifica que la API esté disponible."
        );
      } else {
        setError("Ocurrió un error al iniciar sesión.");
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark">
      <div
        className="card border-0 shadow-lg"
        style={{ width: "100%", maxWidth: "420px" }}
      >
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <div
              className="d-inline-flex align-items-center justify-content-center bg-dark text-white rounded-3 mb-3"
              style={{ width: "58px", height: "58px", fontSize: "26px" }}
            >
              <i className="bi bi-shield-lock"></i>
            </div>

            <h2 className="fw-bold mb-1">Administración</h2>

            <p className="text-secondary mb-0">
              Acceso de plataforma POS SaaS
            </p>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              <i className="bi bi-exclamation-circle me-2"></i>
              {error}
            </div>
          )}

          <form onSubmit={iniciarSesion}>
            <div className="mb-3">
              <label htmlFor="platform-email" className="form-label">
                Correo electrónico
              </label>

              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-envelope"></i>
                </span>

                <input
                  id="platform-email"
                  type="email"
                  className="form-control"
                  placeholder="admin@plataforma.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={cargando}
                />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="platform-password" className="form-label">
                Contraseña
              </label>

              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-lock"></i>
                </span>

                <input
                  id="platform-password"
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={cargando}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-dark w-100 py-2"
              disabled={cargando}
            >
              {cargando ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    aria-hidden="true"
                  />
                  Iniciando...
                </>
              ) : (
                <>
                  <i className="bi bi-shield-check me-2"></i>
                  Entrar a plataforma
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <small className="text-secondary">
              Acceso exclusivo para administración de plataforma
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminLogin;
