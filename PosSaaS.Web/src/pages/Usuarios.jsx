import { useEffect, useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import api from "../services/api";

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [buscar, setBuscar] = useState("");
  const [filtroRol, setFiltroRol] = useState("Todos");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [filtroSucursal, setFiltroSucursal] = useState("Todas");

  const [modalActivo, setModalActivo] = useState(null);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

  const [formUsuario, setFormUsuario] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "Cajero",
    sucursalId: "",
  });

  const [formPassword, setFormPassword] = useState({
    password: "",
    confirmarPassword: "",
  });

  const usuarioActualId = Number(localStorage.getItem("usuarioId"));
  const rolActual = localStorage.getItem("rol") || "";
  const esAdmin = rolActual === "Admin";

  const rolesInfo = {
    Admin: {
      titulo: "Administrador",
      icono: "bi-shield-check",
      clase: "text-bg-dark",
      descripcion: "Control total del comercio, usuarios, configuración y operación.",
    },
    Supervisor: {
      titulo: "Supervisor",
      icono: "bi-person-workspace",
      clase: "text-bg-primary",
      descripcion: "Opera cajas, inventario, clientes, ventas y reportes sin administrar usuarios.",
    },
    Cajero: {
      titulo: "Cajero",
      icono: "bi-person-badge",
      clase: "text-bg-info",
      descripcion: "Enfocado en POS, clientes, ventas y operación diaria de caja.",
    },
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const obtenerMensajeError = (err, mensajeDefault) => {
    if (err.response?.data?.mensaje) return err.response.data.mensaje;
    if (typeof err.response?.data === "string") return err.response.data;
    if (!err.response) return "No se pudo conectar con el servidor.";
    return mensajeDefault;
  };

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError("");

      const [usuariosResponse, sucursalesResponse] = await Promise.all([
        api.get("/Usuarios"),
        api.get("/Sucursales"),
      ]);

      setUsuarios(Array.isArray(usuariosResponse.data) ? usuariosResponse.data : []);
      setSucursales(Array.isArray(sucursalesResponse.data) ? sucursalesResponse.data : []);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.status === 403
          ? "No tienes permisos para administrar usuarios."
          : obtenerMensajeError(err, "No se pudieron cargar los usuarios.")
      );
    } finally {
      setCargando(false);
    }
  };

  const mostrarMensaje = (texto) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(""), 3500);
  };

  const limpiarFormularioUsuario = () => {
    setFormUsuario({
      nombre: "",
      email: "",
      password: "",
      rol: "Cajero",
      sucursalId: "",
    });
  };

  const abrirNuevoUsuario = () => {
    setUsuarioSeleccionado(null);
    limpiarFormularioUsuario();
    setError("");
    setModalActivo("usuario");
  };

  const abrirEditarUsuario = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setFormUsuario({
      nombre: usuario.nombre || "",
      email: usuario.email || "",
      password: "",
      rol: usuario.rol || "Cajero",
      sucursalId:
        usuario.sucursalId !== null && usuario.sucursalId !== undefined
          ? String(usuario.sucursalId)
          : "",
    });
    setError("");
    setModalActivo("usuario");
  };

  const abrirCambiarPassword = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setFormPassword({ password: "", confirmarPassword: "" });
    setError("");
    setModalActivo("password");
  };

  const cerrarModal = () => {
    if (guardando) return;
    setModalActivo(null);
    setUsuarioSeleccionado(null);
    setError("");
  };

  const guardarUsuario = async (e) => {
    e.preventDefault();
    setError("");

    const nombre = formUsuario.nombre.trim();
    const email = formUsuario.email.trim().toLowerCase();

    if (!nombre) return setError("El nombre del usuario es obligatorio.");
    if (!email) return setError("El correo electrónico es obligatorio.");

    if (!usuarioSeleccionado && !formUsuario.password) {
      return setError("La contraseña es obligatoria.");
    }

    if (!usuarioSeleccionado && formUsuario.password.length < 6) {
      return setError("La contraseña debe tener al menos 6 caracteres.");
    }

    try {
      setGuardando(true);

      const sucursalId =
        formUsuario.sucursalId === "" ? null : Number(formUsuario.sucursalId);

      if (usuarioSeleccionado) {
        await api.put(`/Usuarios/${usuarioSeleccionado.id}`, {
          nombre,
          email,
          rol: formUsuario.rol,
          sucursalId,
        });
        mostrarMensaje("Usuario actualizado correctamente.");
      } else {
        await api.post("/Usuarios", {
          nombre,
          email,
          password: formUsuario.password,
          rol: formUsuario.rol,
          sucursalId,
        });
        mostrarMensaje("Usuario creado correctamente.");
      }

      setModalActivo(null);
      setUsuarioSeleccionado(null);
      await cargarDatos();
    } catch (err) {
      console.error(err);
      setError(obtenerMensajeError(err, "No se pudo guardar el usuario."));
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (usuario) => {
    if (usuario.id === usuarioActualId && usuario.activo) return;

    const nuevoEstado = !usuario.activo;
    const accion = nuevoEstado ? "activar" : "desactivar";

    if (!window.confirm(`¿Deseas ${accion} al usuario "${usuario.nombre}"?`)) return;

    try {
      setError("");
      await api.patch(`/Usuarios/${usuario.id}/estado?activo=${nuevoEstado}`);
      mostrarMensaje(
        nuevoEstado
          ? "Usuario activado correctamente."
          : "Usuario desactivado correctamente."
      );
      await cargarDatos();
    } catch (err) {
      console.error(err);
      setError(obtenerMensajeError(err, "No se pudo cambiar el estado del usuario."));
    }
  };

  const cambiarPassword = async (e) => {
    e.preventDefault();
    setError("");

    if (!usuarioSeleccionado) return;
    if (!formPassword.password) return setError("Ingresa la nueva contraseña.");
    if (formPassword.password.length < 6) {
      return setError("La contraseña debe tener al menos 6 caracteres.");
    }
    if (formPassword.password !== formPassword.confirmarPassword) {
      return setError("Las contraseñas no coinciden.");
    }

    try {
      setGuardando(true);
      await api.patch(`/Usuarios/${usuarioSeleccionado.id}/password`, {
        password: formPassword.password,
      });
      setModalActivo(null);
      setUsuarioSeleccionado(null);
      mostrarMensaje("Contraseña actualizada correctamente.");
    } catch (err) {
      console.error(err);
      setError(obtenerMensajeError(err, "No se pudo cambiar la contraseña."));
    } finally {
      setGuardando(false);
    }
  };

  const usuariosFiltrados = useMemo(() => {
    const texto = buscar.trim().toLowerCase();

    return usuarios.filter((usuario) => {
      const coincideTexto =
        !texto ||
        usuario.nombre?.toLowerCase().includes(texto) ||
        usuario.email?.toLowerCase().includes(texto) ||
        usuario.sucursal?.toLowerCase().includes(texto);

      const coincideRol = filtroRol === "Todos" || usuario.rol === filtroRol;
      const coincideEstado =
        filtroEstado === "Todos" ||
        (filtroEstado === "Activos" && usuario.activo) ||
        (filtroEstado === "Inactivos" && !usuario.activo);

      const coincideSucursal =
        filtroSucursal === "Todas" ||
        (filtroSucursal === "SinAsignar" && !usuario.sucursalId) ||
        String(usuario.sucursalId) === filtroSucursal;

      return coincideTexto && coincideRol && coincideEstado && coincideSucursal;
    });
  }, [usuarios, buscar, filtroRol, filtroEstado, filtroSucursal]);

  const limpiarFiltros = () => {
    setBuscar("");
    setFiltroRol("Todos");
    setFiltroEstado("Todos");
    setFiltroSucursal("Todas");
  };

  const totalUsuarios = usuarios.length;
  const usuariosActivos = usuarios.filter((x) => x.activo).length;
  const totalAdmins = usuarios.filter((x) => x.rol === "Admin" && x.activo).length;
  const totalSupervisores = usuarios.filter(
    (x) => x.rol === "Supervisor" && x.activo
  ).length;
  const totalCajeros = usuarios.filter((x) => x.rol === "Cajero" && x.activo).length;

  const obtenerBadgeRol = (rol) => rolesInfo[rol]?.clase || "text-bg-secondary";

  if (!esAdmin) {
    return (
      <AppLayout>
        <div className="container-fluid py-4">
          <div className="alert alert-warning">
            <i className="bi bi-shield-lock me-2"></i>
            No tienes permisos para administrar usuarios.
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container-fluid py-4 px-0">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <div className="text-secondary small mb-1">Administración</div>
            <h2 className="fw-bold mb-1">Usuarios y permisos</h2>
            <p className="text-secondary mb-0">
              Controla quién entra al sistema, qué puede hacer y desde qué sucursal opera.
            </p>
          </div>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-dark"
              onClick={cargarDatos}
              disabled={cargando}
            >
              <i className="bi bi-arrow-clockwise me-2"></i>
              Actualizar
            </button>
            <button type="button" className="btn btn-dark" onClick={abrirNuevoUsuario}>
              <i className="bi bi-person-plus me-2"></i>
              Nuevo usuario
            </button>
          </div>
        </div>

        {mensaje && (
          <div className="alert alert-success">
            <i className="bi bi-check-circle me-2"></i>
            {mensaje}
          </div>
        )}

        {error && !modalActivo && (
          <div className="alert alert-danger">
            <i className="bi bi-exclamation-circle me-2"></i>
            {error}
          </div>
        )}

        <div className="row g-3 mb-4">
          {[
            ["Usuarios", totalUsuarios, "bi-people", "text-secondary"],
            ["Activos", usuariosActivos, "bi-person-check", "text-success"],
            ["Admins", totalAdmins, "bi-shield-check", "text-dark"],
            ["Supervisores", totalSupervisores, "bi-person-workspace", "text-primary"],
            ["Cajeros", totalCajeros, "bi-person-badge", "text-info"],
          ].map(([titulo, valor, icono, clase]) => (
            <div className="col-6 col-md-4 col-xl" key={titulo}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-3 p-md-4">
                  <div className="d-flex justify-content-between align-items-center gap-2">
                    <div>
                      <div className="text-secondary small mb-1">{titulo}</div>
                      <div className="fs-3 fw-bold">{valor}</div>
                    </div>
                    <i className={`bi ${icono} fs-3 ${clase}`}></i>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                <h5 className="fw-bold mb-1">Guía de permisos</h5>
                <small className="text-secondary">
                  Usa el rol más limitado que permita realizar el trabajo necesario.
                </small>
              </div>
              <span className="badge text-bg-light border">Seguridad por roles</span>
            </div>

            <div className="row g-3">
              {Object.entries(rolesInfo).map(([rol, info]) => (
                <div className="col-md-4" key={rol}>
                  <div className="border rounded-3 p-3 h-100">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className={`badge ${info.clase}`}>
                        <i className={`bi ${info.icono} me-1`}></i>
                        {rol}
                      </span>
                      <strong>{info.titulo}</strong>
                    </div>
                    <small className="text-secondary">{info.descripcion}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body border-bottom p-4">
            <div className="row g-3 align-items-end">
              <div className="col-lg-4">
                <label className="form-label fw-semibold">Buscar</label>
                <div className="input-group">
                  <span className="input-group-text bg-white">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nombre, correo o sucursal..."
                    value={buscar}
                    onChange={(e) => setBuscar(e.target.value)}
                  />
                </div>
              </div>

              <div className="col-6 col-md-4 col-lg-2">
                <label className="form-label fw-semibold">Rol</label>
                <select
                  className="form-select"
                  value={filtroRol}
                  onChange={(e) => setFiltroRol(e.target.value)}
                >
                  <option value="Todos">Todos</option>
                  <option value="Admin">Admin</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Cajero">Cajero</option>
                </select>
              </div>

              <div className="col-6 col-md-4 col-lg-2">
                <label className="form-label fw-semibold">Estado</label>
                <select
                  className="form-select"
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <option value="Todos">Todos</option>
                  <option value="Activos">Activos</option>
                  <option value="Inactivos">Inactivos</option>
                </select>
              </div>

              <div className="col-md-4 col-lg-2">
                <label className="form-label fw-semibold">Sucursal</label>
                <select
                  className="form-select"
                  value={filtroSucursal}
                  onChange={(e) => setFiltroSucursal(e.target.value)}
                >
                  <option value="Todas">Todas</option>
                  <option value="SinAsignar">Acceso global / sin asignar</option>
                  {sucursales.map((sucursal) => (
                    <option key={sucursal.id} value={String(sucursal.id)}>
                      {sucursal.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-lg-2 d-grid">
                <button type="button" className="btn btn-outline-secondary" onClick={limpiarFiltros}>
                  Limpiar filtros
                </button>
              </div>
            </div>
          </div>

          <div className="card-body p-0">
            {cargando ? (
              <div className="text-center py-5">
                <div className="spinner-border" role="status" />
                <div className="text-secondary mt-3">Cargando usuarios...</div>
              </div>
            ) : usuariosFiltrados.length === 0 ? (
              <div className="text-center py-5 px-3">
                <i className="bi bi-people fs-1 text-secondary"></i>
                <h5 className="mt-3">No encontramos usuarios</h5>
                <p className="text-secondary mb-0">
                  Ajusta los filtros o crea un nuevo usuario.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">Usuario</th>
                      <th>Rol</th>
                      <th>Alcance</th>
                      <th>Estado</th>
                      <th className="text-end pe-4">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosFiltrados.map((usuario) => (
                      <tr key={usuario.id}>
                        <td className="ps-4">
                          <div className="d-flex align-items-center gap-3">
                            <div
                              className="rounded-circle bg-light border d-flex align-items-center justify-content-center fw-bold"
                              style={{ width: 42, height: 42, minWidth: 42 }}
                            >
                              {usuario.nombre?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="fw-semibold">
                                {usuario.nombre}
                                {usuario.id === usuarioActualId && (
                                  <span className="badge text-bg-light border ms-2">Tú</span>
                                )}
                              </div>
                              <div className="text-secondary small">{usuario.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${obtenerBadgeRol(usuario.rol)}`}>
                            {usuario.rol}
                          </span>
                        </td>
                        <td>
                          {usuario.sucursal ? (
                            <div>
                              <div className="fw-semibold">
                                <i className="bi bi-shop me-2 text-secondary"></i>
                                {usuario.sucursal}
                              </div>
                              <small className="text-secondary">Limitado a esta sucursal</small>
                            </div>
                          ) : (
                            <div>
                              <div className="fw-semibold">
                                <i className="bi bi-globe2 me-2 text-secondary"></i>
                                Acceso global
                              </div>
                              <small className="text-secondary">Sin sucursal asignada</small>
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              usuario.activo
                                ? "bg-success-subtle text-success border border-success-subtle"
                                : "bg-secondary-subtle text-secondary border"
                            }`}
                          >
                            {usuario.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="text-end pe-4">
                          <div className="d-inline-flex gap-1">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              title="Editar usuario"
                              onClick={() => abrirEditarUsuario(usuario)}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              title="Cambiar contraseña"
                              onClick={() => abrirCambiarPassword(usuario)}
                            >
                              <i className="bi bi-key"></i>
                            </button>
                            <button
                              type="button"
                              className={
                                usuario.activo
                                  ? "btn btn-sm btn-outline-danger"
                                  : "btn btn-sm btn-outline-success"
                              }
                              title={
                                usuario.id === usuarioActualId && usuario.activo
                                  ? "No puedes desactivar tu propia cuenta"
                                  : usuario.activo
                                    ? "Desactivar"
                                    : "Activar"
                              }
                              disabled={usuario.id === usuarioActualId && usuario.activo}
                              onClick={() => cambiarEstado(usuario)}
                            >
                              <i
                                className={
                                  usuario.activo
                                    ? "bi bi-person-x"
                                    : "bi bi-person-check"
                                }
                              ></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!cargando && (
            <div className="card-footer bg-white d-flex flex-wrap justify-content-between gap-2 text-secondary small">
              <span>
                Mostrando {usuariosFiltrados.length} de {usuarios.length} usuarios
              </span>
              <span>{sucursales.filter((x) => x.activa).length} sucursales activas</span>
            </div>
          )}
        </div>
      </div>

      {modalActivo === "usuario" && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,.5)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <form onSubmit={guardarUsuario}>
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-bold">
                      {usuarioSeleccionado ? "Editar usuario" : "Nuevo usuario"}
                    </h5>
                    <div className="text-secondary small">
                      {usuarioSeleccionado
                        ? "Actualiza identidad, permisos y alcance."
                        : "Crea un acceso para un miembro del equipo."}
                    </div>
                  </div>
                  <button type="button" className="btn-close" onClick={cerrarModal} disabled={guardando} />
                </div>

                <div className="modal-body p-4">
                  {error && (
                    <div className="alert alert-danger">
                      <i className="bi bi-exclamation-circle me-2"></i>
                      {error}
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Nombre completo</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej. María Rodríguez"
                        value={formUsuario.nombre}
                        onChange={(e) => setFormUsuario({ ...formUsuario, nombre: e.target.value })}
                        disabled={guardando}
                        autoFocus
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Correo electrónico</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="usuario@empresa.com"
                        value={formUsuario.email}
                        onChange={(e) => setFormUsuario({ ...formUsuario, email: e.target.value })}
                        disabled={guardando}
                      />
                    </div>

                    {!usuarioSeleccionado && (
                      <div className="col-12">
                        <label className="form-label fw-semibold">Contraseña inicial</label>
                        <input
                          type="password"
                          className="form-control"
                          placeholder="Mínimo 6 caracteres"
                          value={formUsuario.password}
                          onChange={(e) => setFormUsuario({ ...formUsuario, password: e.target.value })}
                          disabled={guardando}
                        />
                      </div>
                    )}

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Rol</label>
                      <select
                        className="form-select"
                        value={formUsuario.rol}
                        onChange={(e) => setFormUsuario({ ...formUsuario, rol: e.target.value })}
                        disabled={guardando}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Supervisor">Supervisor</option>
                        <option value="Cajero">Cajero</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Sucursal</label>
                      <select
                        className="form-select"
                        value={formUsuario.sucursalId}
                        onChange={(e) => setFormUsuario({ ...formUsuario, sucursalId: e.target.value })}
                        disabled={guardando}
                      >
                        <option value="">Acceso global / sin asignar</option>
                        {sucursales
                          .filter((sucursal) => sucursal.activa)
                          .map((sucursal) => (
                            <option key={sucursal.id} value={sucursal.id}>
                              {sucursal.nombre}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="alert alert-light border mt-4 mb-0">
                    <div className="d-flex gap-3 align-items-start">
                      <i className={`bi ${rolesInfo[formUsuario.rol]?.icono} fs-4`}></i>
                      <div>
                        <strong>{rolesInfo[formUsuario.rol]?.titulo}</strong>
                        <div className="text-secondary small mt-1">
                          {rolesInfo[formUsuario.rol]?.descripcion}
                        </div>
                        <div className="text-secondary small mt-2">
                          {formUsuario.sucursalId
                            ? "Este usuario quedará restringido a la sucursal seleccionada."
                            : "Sin sucursal asignada, el usuario tendrá alcance global dentro de los permisos de su rol."}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={cerrarModal} disabled={guardando}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-dark" disabled={guardando}>
                    {guardando ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-2"></i>
                        {usuarioSeleccionado ? "Guardar cambios" : "Crear usuario"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {modalActivo === "password" && usuarioSeleccionado && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <form onSubmit={cambiarPassword}>
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-bold">Cambiar contraseña</h5>
                    <div className="text-secondary small">{usuarioSeleccionado.nombre}</div>
                  </div>
                  <button type="button" className="btn-close" onClick={cerrarModal} disabled={guardando} />
                </div>

                <div className="modal-body p-4">
                  {error && (
                    <div className="alert alert-danger">
                      <i className="bi bi-exclamation-circle me-2"></i>
                      {error}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Nueva contraseña</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Mínimo 6 caracteres"
                      value={formPassword.password}
                      onChange={(e) => setFormPassword({ ...formPassword, password: e.target.value })}
                      disabled={guardando}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="form-label fw-semibold">Confirmar contraseña</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Repite la contraseña"
                      value={formPassword.confirmarPassword}
                      onChange={(e) => setFormPassword({ ...formPassword, confirmarPassword: e.target.value })}
                      disabled={guardando}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={cerrarModal} disabled={guardando}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-dark" disabled={guardando}>
                    {guardando ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-key me-2"></i>
                        Cambiar contraseña
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default Usuarios;
