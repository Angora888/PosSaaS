import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const iniciarSesion = async (e) => {
    e.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }

    try {
      setCargando(true);

      const response = await api.post("/Auth/login", {
        email: email.trim(),
        password,
      });

      const data = response.data;

      if (!data.token) {
        setError("La API no devolvió un token válido.");
        return;
      }

      if (!data.usuario) {
        setError("La API no devolvió la información del usuario.");
        return;
      }

      const usuario = data.usuario;

      // Token
      localStorage.setItem("token", data.token);

      // Información del usuario
      if (usuario.id !== undefined) {
        localStorage.setItem("usuarioId", usuario.id);
      }

      if (usuario.nombre) {
        localStorage.setItem("nombre", usuario.nombre);
      }

      if (usuario.email) {
        localStorage.setItem("email", usuario.email);
      }

      if (usuario.rol) {
        localStorage.setItem("rol", usuario.rol);
      }

      if (usuario.tenantId !== undefined) {
        localStorage.setItem("tenantId", usuario.tenantId);
      }

      if (
        usuario.sucursalId !== undefined &&
        usuario.sucursalId !== null
      ) {
        localStorage.setItem(
          "sucursalId",
          usuario.sucursalId
        );
      } else {
        localStorage.removeItem("sucursalId");
      }

      if (usuario.comercio) {
        localStorage.setItem(
          "comercio",
          usuario.comercio
        );
      }

      navigate("/dashboard", {
        replace: true,
      });
    } catch (err) {
      console.error(err);

      if (err.response?.status === 401) {
        setError("Correo o contraseña incorrectos.");
      } else if (err.response?.data?.mensaje) {
        setError(err.response.data.mensaje);
      } else if (
        typeof err.response?.data === "string"
      ) {
        setError(err.response.data);
      } else if (!err.response) {
        setError(
          "No se pudo conectar con el servidor. Verifica que la API esté ejecutándose."
        );
      } else {
        setError("Ocurrió un error al iniciar sesión.");
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div
        className="card border-0 shadow-sm"
        style={{
          width: "100%",
          maxWidth: "420px",
        }}
      >
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <div
              className="d-inline-flex align-items-center justify-content-center bg-dark text-white rounded-3 mb-3"
              style={{
                width: "55px",
                height: "55px",
                fontSize: "25px",
              }}
            >
              <i className="bi bi-shop"></i>
            </div>

            <h2 className="fw-bold mb-1">
              POS SaaS
            </h2>

            <p className="text-secondary mb-0">
              Inicia sesión para continuar
            </p>
          </div>

          {error && (
            <div
              className="alert alert-danger"
              role="alert"
            >
              <i className="bi bi-exclamation-circle me-2"></i>

              {error}
            </div>
          )}

          <form onSubmit={iniciarSesion}>
            <div className="mb-3">
              <label
                htmlFor="email"
                className="form-label"
              >
                Correo electrónico
              </label>

              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-envelope"></i>
                </span>

                <input
                  id="email"
                  type="email"
                  className="form-control"
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  autoComplete="email"
                  disabled={cargando}
                />
              </div>
            </div>

            <div className="mb-4">
              <label
                htmlFor="password"
                className="form-label"
              >
                Contraseña
              </label>

              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-lock"></i>
                </span>

                <input
                  id="password"
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
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
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Iniciar sesión
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <small className="text-secondary">
              Sistema de Punto de Venta
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;