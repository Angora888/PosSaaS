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

  const [modalActivo, setModalActivo] = useState(null);
  const [usuarioSeleccionado, setUsuarioSeleccionado] =
    useState(null);

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

  const usuarioActualId = Number(
    localStorage.getItem("usuarioId")
  );

  const rolActual =
    localStorage.getItem("rol") || "";

  const esAdmin =
    rolActual === "Admin";

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError("");

      const [usuariosResponse, sucursalesResponse] =
        await Promise.all([
          api.get("/Usuarios"),
          api.get("/Sucursales"),
        ]);

      setUsuarios(
        Array.isArray(usuariosResponse.data)
          ? usuariosResponse.data
          : []
      );

      setSucursales(
        Array.isArray(sucursalesResponse.data)
          ? sucursalesResponse.data
          : []
      );
    } catch (err) {
      console.error(err);

      if (err.response?.status === 403) {
        setError(
          "No tienes permisos para administrar usuarios."
        );
      } else {
        setError(
          obtenerMensajeError(
            err,
            "No se pudieron cargar los usuarios."
          )
        );
      }
    } finally {
      setCargando(false);
    }
  };

  const obtenerMensajeError = (
    err,
    mensajeDefault
  ) => {
    if (err.response?.data?.mensaje) {
      return err.response.data.mensaje;
    }

    if (typeof err.response?.data === "string") {
      return err.response.data;
    }

    if (!err.response) {
      return "No se pudo conectar con el servidor.";
    }

    return mensajeDefault;
  };

  const mostrarMensaje = (texto) => {
    setMensaje(texto);

    setTimeout(() => {
      setMensaje("");
    }, 3500);
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
        usuario.sucursalId !== null &&
        usuario.sucursalId !== undefined
          ? String(usuario.sucursalId)
          : "",
    });

    setError("");
    setModalActivo("usuario");
  };

  const abrirCambiarPassword = (usuario) => {
    setUsuarioSeleccionado(usuario);

    setFormPassword({
      password: "",
      confirmarPassword: "",
    });

    setError("");
    setModalActivo("password");
  };

  const cerrarModal = () => {
    if (guardando) {
      return;
    }

    setModalActivo(null);
    setUsuarioSeleccionado(null);
    setError("");
  };

  const guardarUsuario = async (e) => {
    e.preventDefault();

    setError("");

    const nombre =
      formUsuario.nombre.trim();

    const email =
      formUsuario.email.trim().toLowerCase();

    if (!nombre) {
      setError(
        "El nombre del usuario es obligatorio."
      );
      return;
    }

    if (!email) {
      setError(
        "El correo electrónico es obligatorio."
      );
      return;
    }

    if (
      !usuarioSeleccionado &&
      !formUsuario.password
    ) {
      setError(
        "La contraseña es obligatoria."
      );
      return;
    }

    if (
      !usuarioSeleccionado &&
      formUsuario.password.length < 6
    ) {
      setError(
        "La contraseña debe tener al menos 6 caracteres."
      );
      return;
    }

    try {
      setGuardando(true);

      const sucursalId =
        formUsuario.sucursalId === ""
          ? null
          : Number(formUsuario.sucursalId);

      if (usuarioSeleccionado) {
        await api.put(
          `/Usuarios/${usuarioSeleccionado.id}`,
          {
            nombre,
            email,
            rol: formUsuario.rol,
            sucursalId,
          }
        );

        mostrarMensaje(
          "Usuario actualizado correctamente."
        );
      } else {
        await api.post("/Usuarios", {
          nombre,
          email,
          password: formUsuario.password,
          rol: formUsuario.rol,
          sucursalId,
        });

        mostrarMensaje(
          "Usuario creado correctamente."
        );
      }

      setModalActivo(null);
      setUsuarioSeleccionado(null);

      await cargarDatos();
    } catch (err) {
      console.error(err);

      setError(
        obtenerMensajeError(
          err,
          "No se pudo guardar el usuario."
        )
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (usuario) => {
    const nuevoEstado = !usuario.activo;

    const accion = nuevoEstado
      ? "activar"
      : "desactivar";

    const confirmado = window.confirm(
      `¿Deseas ${accion} al usuario "${usuario.nombre}"?`
    );

    if (!confirmado) {
      return;
    }

    try {
      setError("");

      await api.patch(
        `/Usuarios/${usuario.id}/estado?activo=${nuevoEstado}`
      );

      mostrarMensaje(
        nuevoEstado
          ? "Usuario activado correctamente."
          : "Usuario desactivado correctamente."
      );

      await cargarDatos();
    } catch (err) {
      console.error(err);

      setError(
        obtenerMensajeError(
          err,
          "No se pudo cambiar el estado del usuario."
        )
      );
    }
  };

  const cambiarPassword = async (e) => {
    e.preventDefault();

    setError("");

    if (!usuarioSeleccionado) {
      return;
    }

    if (!formPassword.password) {
      setError(
        "Ingresa la nueva contraseña."
      );
      return;
    }

    if (formPassword.password.length < 6) {
      setError(
        "La contraseña debe tener al menos 6 caracteres."
      );
      return;
    }

    if (
      formPassword.password !==
      formPassword.confirmarPassword
    ) {
      setError(
        "Las contraseñas no coinciden."
      );
      return;
    }

    try {
      setGuardando(true);

      await api.patch(
        `/Usuarios/${usuarioSeleccionado.id}/password`,
        {
          password: formPassword.password,
        }
      );

      setModalActivo(null);
      setUsuarioSeleccionado(null);

      mostrarMensaje(
        "Contraseña actualizada correctamente."
      );
    } catch (err) {
      console.error(err);

      setError(
        obtenerMensajeError(
          err,
          "No se pudo cambiar la contraseña."
        )
      );
    } finally {
      setGuardando(false);
    }
  };

  const usuariosFiltrados = useMemo(() => {
    const texto =
      buscar.trim().toLowerCase();

    return usuarios.filter((usuario) => {
      const coincideTexto =
        !texto ||
        usuario.nombre
          ?.toLowerCase()
          .includes(texto) ||
        usuario.email
          ?.toLowerCase()
          .includes(texto) ||
        usuario.sucursal
          ?.toLowerCase()
          .includes(texto);

      const coincideRol =
        filtroRol === "Todos" ||
        usuario.rol === filtroRol;

      const coincideEstado =
        filtroEstado === "Todos" ||
        (filtroEstado === "Activos" &&
          usuario.activo) ||
        (filtroEstado === "Inactivos" &&
          !usuario.activo);

      return (
        coincideTexto &&
        coincideRol &&
        coincideEstado
      );
    });
  }, [
    usuarios,
    buscar,
    filtroRol,
    filtroEstado,
  ]);

  const totalUsuarios =
    usuarios.length;

  const usuariosActivos =
    usuarios.filter((x) => x.activo).length;

  const totalAdmins =
    usuarios.filter(
      (x) => x.rol === "Admin" && x.activo
    ).length;

  const totalCajeros =
    usuarios.filter(
      (x) => x.rol === "Cajero" && x.activo
    ).length;

  const obtenerBadgeRol = (rol) => {
    switch (rol) {
      case "Admin":
        return "bg-dark";

      case "Supervisor":
        return "bg-primary";

      case "Cajero":
        return "bg-info text-dark";

      default:
        return "bg-secondary";
    }
  };

  if (!esAdmin) {
    return (
      <AppLayout>
        <div className="container-fluid py-4">
          <div className="alert alert-warning">
            <i className="bi bi-shield-lock me-2"></i>
            No tienes permisos para administrar
            usuarios.
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container-fluid py-4">
        {/* ENCABEZADO */}

        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <div className="text-secondary small mb-1">
              Administración
            </div>

            <h2 className="fw-bold mb-1">
              Usuarios
            </h2>

            <p className="text-secondary mb-0">
              Administra el acceso de tu equipo al
              sistema.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-dark"
            onClick={abrirNuevoUsuario}
          >
            <i className="bi bi-person-plus me-2"></i>
            Nuevo usuario
          </button>
        </div>

        {/* MENSAJES */}

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

        {/* TARJETAS */}

        <div className="row g-3 mb-4">
          <div className="col-6 col-xl-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <div className="text-secondary small">
                      Usuarios
                    </div>

                    <div className="fs-3 fw-bold">
                      {totalUsuarios}
                    </div>
                  </div>

                  <div className="fs-3 text-secondary">
                    <i className="bi bi-people"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-6 col-xl-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <div className="text-secondary small">
                      Activos
                    </div>

                    <div className="fs-3 fw-bold">
                      {usuariosActivos}
                    </div>
                  </div>

                  <div className="fs-3 text-success">
                    <i className="bi bi-person-check"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-6 col-xl-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <div className="text-secondary small">
                      Administradores
                    </div>

                    <div className="fs-3 fw-bold">
                      {totalAdmins}
                    </div>
                  </div>

                  <div className="fs-3 text-secondary">
                    <i className="bi bi-shield-check"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-6 col-xl-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <div className="text-secondary small">
                      Cajeros
                    </div>

                    <div className="fs-3 fw-bold">
                      {totalCajeros}
                    </div>
                  </div>

                  <div className="fs-3 text-secondary">
                    <i className="bi bi-person-badge"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LISTADO */}

        <div className="card border-0 shadow-sm">
          <div className="card-body border-bottom">
            <div className="row g-2">
              <div className="col-12 col-lg-6">
                <div className="input-group">
                  <span className="input-group-text bg-white">
                    <i className="bi bi-search"></i>
                  </span>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar por nombre, correo o sucursal..."
                    value={buscar}
                    onChange={(e) =>
                      setBuscar(e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="col-6 col-lg-3">
                <select
                  className="form-select"
                  value={filtroRol}
                  onChange={(e) =>
                    setFiltroRol(e.target.value)
                  }
                >
                  <option value="Todos">
                    Todos los roles
                  </option>

                  <option value="Admin">
                    Admin
                  </option>

                  <option value="Supervisor">
                    Supervisor
                  </option>

                  <option value="Cajero">
                    Cajero
                  </option>
                </select>
              </div>

              <div className="col-6 col-lg-3">
                <select
                  className="form-select"
                  value={filtroEstado}
                  onChange={(e) =>
                    setFiltroEstado(e.target.value)
                  }
                >
                  <option value="Todos">
                    Todos
                  </option>

                  <option value="Activos">
                    Activos
                  </option>

                  <option value="Inactivos">
                    Inactivos
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div className="card-body p-0">
            {cargando ? (
              <div className="text-center py-5">
                <div
                  className="spinner-border"
                  role="status"
                />

                <div className="text-secondary mt-3">
                  Cargando usuarios...
                </div>
              </div>
            ) : usuariosFiltrados.length === 0 ? (
              <div className="text-center py-5 px-3">
                <div className="fs-1 text-secondary mb-3">
                  <i className="bi bi-people"></i>
                </div>

                <h5>No encontramos usuarios</h5>

                <p className="text-secondary mb-0">
                  Intenta cambiar los filtros o crea
                  un nuevo usuario.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-4">
                        Usuario
                      </th>

                      <th>Rol</th>

                      <th>Sucursal</th>

                      <th>Estado</th>

                      <th className="text-end pe-4">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {usuariosFiltrados.map(
                      (usuario) => (
                        <tr key={usuario.id}>
                          <td className="ps-4">
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className="rounded-circle bg-light d-flex align-items-center justify-content-center fw-bold"
                                style={{
                                  width: "42px",
                                  height: "42px",
                                  minWidth: "42px",
                                }}
                              >
                                {usuario.nombre
                                  ?.charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <div className="fw-semibold">
                                  {usuario.nombre}

                                  {usuario.id ===
                                    usuarioActualId && (
                                    <span className="badge text-bg-light border ms-2">
                                      Tú
                                    </span>
                                  )}
                                </div>

                                <div className="text-secondary small">
                                  {usuario.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span
                              className={`badge ${obtenerBadgeRol(
                                usuario.rol
                              )}`}
                            >
                              {usuario.rol}
                            </span>
                          </td>

                          <td>
                            {usuario.sucursal ? (
                              <>
                                <i className="bi bi-shop me-2 text-secondary"></i>
                                {usuario.sucursal}
                              </>
                            ) : (
                              <span className="text-secondary">
                                Todas / Sin asignar
                              </span>
                            )}
                          </td>

                          <td>
                            {usuario.activo ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle">
                                Activo
                              </span>
                            ) : (
                              <span className="badge bg-secondary-subtle text-secondary border">
                                Inactivo
                              </span>
                            )}
                          </td>

                          <td className="text-end pe-4">
                            <div className="d-inline-flex gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                title="Editar usuario"
                                onClick={() =>
                                  abrirEditarUsuario(
                                    usuario
                                  )
                                }
                              >
                                <i className="bi bi-pencil"></i>
                              </button>

                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                title="Cambiar contraseña"
                                onClick={() =>
                                  abrirCambiarPassword(
                                    usuario
                                  )
                                }
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
                                  usuario.activo
                                    ? "Desactivar"
                                    : "Activar"
                                }
                                disabled={
                                  usuario.id ===
                                    usuarioActualId &&
                                  usuario.activo
                                }
                                onClick={() =>
                                  cambiarEstado(
                                    usuario
                                  )
                                }
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
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!cargando &&
            usuariosFiltrados.length > 0 && (
              <div className="card-footer bg-white text-secondary small">
                Mostrando{" "}
                {usuariosFiltrados.length} de{" "}
                {usuarios.length} usuarios
              </div>
            )}
        </div>
      </div>

      {/* MODAL CREAR / EDITAR USUARIO */}

      {modalActivo === "usuario" && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{
            backgroundColor:
              "rgba(0, 0, 0, 0.5)",
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <form onSubmit={guardarUsuario}>
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-bold">
                      {usuarioSeleccionado
                        ? "Editar usuario"
                        : "Nuevo usuario"}
                    </h5>

                    <div className="text-secondary small">
                      {usuarioSeleccionado
                        ? "Actualiza la información y permisos."
                        : "Crea un nuevo acceso para tu equipo."}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={cerrarModal}
                    disabled={guardando}
                  />
                </div>

                <div className="modal-body">
                  {error && (
                    <div className="alert alert-danger">
                      <i className="bi bi-exclamation-circle me-2"></i>
                      {error}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">
                      Nombre completo
                    </label>

                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej. María Rodríguez"
                      value={formUsuario.nombre}
                      onChange={(e) =>
                        setFormUsuario({
                          ...formUsuario,
                          nombre: e.target.value,
                        })
                      }
                      disabled={guardando}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Correo electrónico
                    </label>

                    <input
                      type="email"
                      className="form-control"
                      placeholder="usuario@empresa.com"
                      value={formUsuario.email}
                      onChange={(e) =>
                        setFormUsuario({
                          ...formUsuario,
                          email: e.target.value,
                        })
                      }
                      disabled={guardando}
                    />
                  </div>

                  {!usuarioSeleccionado && (
                    <div className="mb-3">
                      <label className="form-label">
                        Contraseña
                      </label>

                      <input
                        type="password"
                        className="form-control"
                        placeholder="Mínimo 6 caracteres"
                        value={
                          formUsuario.password
                        }
                        onChange={(e) =>
                          setFormUsuario({
                            ...formUsuario,
                            password:
                              e.target.value,
                          })
                        }
                        disabled={guardando}
                      />

                      <div className="form-text">
                        El usuario podrá cambiarla
                        posteriormente si agregamos esa
                        opción a su perfil.
                      </div>
                    </div>
                  )}

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">
                        Rol
                      </label>

                      <select
                        className="form-select"
                        value={formUsuario.rol}
                        onChange={(e) =>
                          setFormUsuario({
                            ...formUsuario,
                            rol: e.target.value,
                          })
                        }
                        disabled={guardando}
                      >
                        <option value="Admin">
                          Admin
                        </option>

                        <option value="Supervisor">
                          Supervisor
                        </option>

                        <option value="Cajero">
                          Cajero
                        </option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">
                        Sucursal
                      </label>

                      <select
                        className="form-select"
                        value={
                          formUsuario.sucursalId
                        }
                        onChange={(e) =>
                          setFormUsuario({
                            ...formUsuario,
                            sucursalId:
                              e.target.value,
                          })
                        }
                        disabled={guardando}
                      >
                        <option value="">
                          Sin asignar
                        </option>

                        {sucursales
                          .filter(
                            (sucursal) =>
                              sucursal.activa
                          )
                          .map((sucursal) => (
                            <option
                              key={sucursal.id}
                              value={sucursal.id}
                            >
                              {sucursal.nombre}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div className="alert alert-light border mt-4 mb-0">
                    <div className="d-flex gap-2">
                      <i className="bi bi-info-circle text-secondary"></i>

                      <small className="text-secondary">
                        <strong>Admin:</strong>{" "}
                        administración del comercio.{" "}
                        <strong>Supervisor:</strong>{" "}
                        operaciones y supervisión.{" "}
                        <strong>Cajero:</strong>{" "}
                        operación diaria del punto de
                        venta.
                      </small>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={cerrarModal}
                    disabled={guardando}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="btn btn-dark"
                    disabled={guardando}
                  >
                    {guardando ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-2"></i>

                        {usuarioSeleccionado
                          ? "Guardar cambios"
                          : "Crear usuario"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CAMBIAR PASSWORD */}

      {modalActivo === "password" &&
        usuarioSeleccionado && (
          <div
            className="modal d-block"
            tabIndex="-1"
            style={{
              backgroundColor:
                "rgba(0, 0, 0, 0.5)",
            }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <form onSubmit={cambiarPassword}>
                  <div className="modal-header">
                    <div>
                      <h5 className="modal-title fw-bold">
                        Cambiar contraseña
                      </h5>

                      <div className="text-secondary small">
                        {usuarioSeleccionado.nombre}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-close"
                      onClick={cerrarModal}
                      disabled={guardando}
                    />
                  </div>

                  <div className="modal-body">
                    {error && (
                      <div className="alert alert-danger">
                        <i className="bi bi-exclamation-circle me-2"></i>
                        {error}
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label">
                        Nueva contraseña
                      </label>

                      <input
                        type="password"
                        className="form-control"
                        placeholder="Mínimo 6 caracteres"
                        value={
                          formPassword.password
                        }
                        onChange={(e) =>
                          setFormPassword({
                            ...formPassword,
                            password:
                              e.target.value,
                          })
                        }
                        disabled={guardando}
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="form-label">
                        Confirmar contraseña
                      </label>

                      <input
                        type="password"
                        className="form-control"
                        placeholder="Repite la contraseña"
                        value={
                          formPassword.confirmarPassword
                        }
                        onChange={(e) =>
                          setFormPassword({
                            ...formPassword,
                            confirmarPassword:
                              e.target.value,
                          })
                        }
                        disabled={guardando}
                      />
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-light"
                      onClick={cerrarModal}
                      disabled={guardando}
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className="btn btn-dark"
                      disabled={guardando}
                    >
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