import { useEffect, useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import api from "../services/api";

function Clientes() {
  const rol = localStorage.getItem("rol") || "Usuario";
  const puedeCambiarEstado = rol === "Admin" || rol === "Supervisor";

  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [mostrarModal, setMostrarModal] = useState(false);
  const [clienteEditando, setClienteEditando] = useState(null);

  const [formulario, setFormulario] = useState({
    nombre: "",
    identificacion: "",
    telefono: "",
    email: "",
    direccion: "",
  });

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      setCargando(true);
      setError("");

      const response = await api.get("/Clientes");

      setClientes(response.data);
    } catch (err) {
      console.error(err);

      setError(
        "No fue posible cargar los clientes."
      );
    } finally {
      setCargando(false);
    }
  };

  const clientesFiltrados = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase();

    if (!texto) {
      return clientes;
    }

    return clientes.filter((cliente) => {
      const nombre =
        cliente.nombre?.toLowerCase() || "";

      const identificacion =
        cliente.identificacion?.toLowerCase() || "";

      const telefono =
        cliente.telefono?.toLowerCase() || "";

      const email =
        cliente.email?.toLowerCase() || "";

      return (
        nombre.includes(texto) ||
        identificacion.includes(texto) ||
        telefono.includes(texto) ||
        email.includes(texto)
      );
    });
  }, [clientes, busqueda]);

  const limpiarFormulario = () => {
    setFormulario({
      nombre: "",
      identificacion: "",
      telefono: "",
      email: "",
      direccion: "",
    });
  };

  const abrirNuevoCliente = () => {
    setClienteEditando(null);
    limpiarFormulario();

    setError("");
    setMensaje("");

    setMostrarModal(true);
  };

  const abrirEditarCliente = (cliente) => {
    setClienteEditando(cliente);

    setFormulario({
      nombre: cliente.nombre || "",
      identificacion:
        cliente.identificacion || "",
      telefono: cliente.telefono || "",
      email: cliente.email || "",
      direccion: cliente.direccion || "",
    });

    setError("");
    setMensaje("");

    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) {
      return;
    }

    setMostrarModal(false);
    setClienteEditando(null);

    limpiarFormulario();
  };

  const cambiarCampo = (e) => {
    const {
      name,
      value,
    } = e.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  const validarFormulario = () => {
    if (!formulario.nombre.trim()) {
      return "El nombre es obligatorio.";
    }

    if (
      formulario.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formulario.email.trim()
      )
    ) {
      return "Ingresa un correo electrónico válido.";
    }

    return "";
  };

  const guardarCliente = async (e) => {
    e.preventDefault();

    const validacion =
      validarFormulario();

    if (validacion) {
      setError(validacion);
      return;
    }

    try {
      setGuardando(true);

      setError("");
      setMensaje("");

      const payload = {
        nombre:
          formulario.nombre.trim(),

        identificacion:
          formulario.identificacion.trim() ||
          null,

        telefono:
          formulario.telefono.trim() ||
          null,

        email:
          formulario.email.trim() ||
          null,

        direccion:
          formulario.direccion.trim() ||
          null,
      };

      if (clienteEditando) {
        await api.put(
          `/Clientes/${clienteEditando.id}`,
          payload
        );

        setMensaje(
          "Cliente actualizado correctamente."
        );
      } else {
        await api.post(
          "/Clientes",
          payload
        );

        setMensaje(
          "Cliente creado correctamente."
        );
      }

      setMostrarModal(false);
      setClienteEditando(null);

      limpiarFormulario();

      await cargarClientes();
    } catch (err) {
      console.error(err);

      const data = err.response?.data;

      setError(
        typeof data === "string"
          ? data
          : data?.message ||
            data?.title ||
            "No fue posible guardar el cliente."
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (cliente) => {
    try {
      setError("");
      setMensaje("");

      await api.patch(
        `/Clientes/${cliente.id}/estado`,
        null,
        {
          params: {
            activo: !cliente.activo,
          },
        }
      );

      setMensaje(
        cliente.activo
          ? "Cliente desactivado correctamente."
          : "Cliente activado correctamente."
      );

      await cargarClientes();
    } catch (err) {
      console.error(err);

      const data = err.response?.data;

      setError(
        typeof data === "string"
          ? data
          : "No fue posible cambiar el estado del cliente."
      );
    }
  };

  const totalClientes = clientes.length;

  const activos = clientes.filter(
    (cliente) => cliente.activo
  ).length;

  const inactivos = clientes.filter(
    (cliente) => !cliente.activo
  ).length;

  return (
    <AppLayout>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            Clientes
          </h2>

          <p className="text-secondary mb-0">
            Administra los clientes del negocio y sus datos de contacto.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-dark"
          onClick={abrirNuevoCliente}
        >
          <i className="bi bi-person-plus me-2"></i>
          Nuevo cliente
        </button>
      </div>

      {mensaje && (
        <div className="alert alert-success d-flex justify-content-between align-items-center">
          <div>
            <i className="bi bi-check-circle-fill me-2"></i>
            {mensaje}
          </div>

          <button
            type="button"
            className="btn-close"
            onClick={() =>
              setMensaje("")
            }
          />
        </div>
      )}

      {error &&
        !mostrarModal && (
          <div className="alert alert-danger">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-secondary small">
                    Total clientes
                  </div>

                  <div className="fs-3 fw-bold">
                    {totalClientes}
                  </div>
                </div>

                <div className="fs-2 text-secondary">
                  <i className="bi bi-people"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-secondary small">
                    Activos
                  </div>

                  <div className="fs-3 fw-bold">
                    {activos}
                  </div>
                </div>

                <div className="fs-2 text-success">
                  <i className="bi bi-person-check"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-secondary small">
                    Inactivos
                  </div>

                  <div className="fs-3 fw-bold">
                    {inactivos}
                  </div>
                </div>

                <div className="fs-2 text-danger">
                  <i className="bi bi-person-x"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <div className="row g-3 align-items-center mb-4">
            <div className="col-md-8 col-lg-6">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por nombre, identificación, teléfono o correo..."
                  value={busqueda}
                  onChange={(e) =>
                    setBusqueda(
                      e.target.value
                    )
                  }
                />

                {busqueda && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() =>
                      setBusqueda("")
                    }
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                )}
              </div>
            </div>

            <div className="col-md-4 col-lg-6 text-md-end">
              <span className="text-secondary">
                {clientesFiltrados.length}{" "}
                {clientesFiltrados.length === 1
                  ? "cliente"
                  : "clientes"}
              </span>
            </div>
          </div>

          {cargando ? (
            <div className="text-center py-5">
              <div className="spinner-border" />

              <p className="text-secondary mt-3 mb-0">
                Cargando clientes...
              </p>
            </div>
          ) : clientesFiltrados.length ===
            0 ? (
            <div className="text-center py-5">
              <i
                className="bi bi-people text-secondary"
                style={{
                  fontSize:
                    "48px",
                }}
              ></i>

              <h5 className="mt-3">
                No encontramos clientes
              </h5>

              <p className="text-secondary">
                Puedes crear el primero desde el botón Nuevo cliente.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Identificación</th>
                    <th>Teléfono</th>
                    <th>Correo</th>
                    <th>Dirección</th>
                    <th className="text-center">
                      Estado
                    </th>
                    <th className="text-end">
                      Acciones
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {clientesFiltrados.map(
                    (cliente) => (
                      <tr key={cliente.id}>
                        <td>
                          <div className="fw-semibold">
                            {cliente.nombre}
                          </div>
                        </td>

                        <td>
                          {cliente.identificacion ||
                            "-"}
                        </td>

                        <td>
                          {cliente.telefono ? (
                            <a
                              href={`tel:${cliente.telefono}`}
                              className="text-decoration-none"
                            >
                              {cliente.telefono}
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td>
                          {cliente.email ? (
                            <a
                              href={`mailto:${cliente.email}`}
                              className="text-decoration-none"
                            >
                              {cliente.email}
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>

                        <td>
                          <div
                            style={{
                              maxWidth:
                                "260px",
                            }}
                            className="text-truncate"
                            title={
                              cliente.direccion ||
                              ""
                            }
                          >
                            {cliente.direccion ||
                              "-"}
                          </div>
                        </td>

                        <td className="text-center">
                          <span
                            className={`badge ${
                              cliente.activo
                                ? "text-bg-success"
                                : "text-bg-secondary"
                            }`}
                          >
                            {cliente.activo
                              ? "Activo"
                              : "Inactivo"}
                          </span>
                        </td>

                        <td className="text-end">
                          <div className="btn-group">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary"
                              title="Editar"
                              onClick={() =>
                                abrirEditarCliente(
                                  cliente
                                )
                              }
                            >
                              <i className="bi bi-pencil"></i>
                            </button>

                            {puedeCambiarEstado && (
                              <button
                                type="button"
                                className={`btn btn-sm ${
                                  cliente.activo
                                    ? "btn-outline-danger"
                                    : "btn-outline-success"
                                }`}
                                title={
                                  cliente.activo
                                    ? "Desactivar"
                                    : "Activar"
                                }
                                onClick={() =>
                                  cambiarEstado(
                                    cliente
                                  )
                                }
                              >
                                <i
                                  className={`bi ${
                                    cliente.activo
                                      ? "bi-slash-circle"
                                      : "bi-check-circle"
                                  }`}
                                ></i>
                              </button>
                            )}
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
      </div>

      {mostrarModal && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <form
                  onSubmit={
                    guardarCliente
                  }
                >
                  <div className="modal-header">
                    <div>
                      <h5 className="modal-title fw-bold">
                        {clienteEditando
                          ? "Editar cliente"
                          : "Nuevo cliente"}
                      </h5>

                      <small className="text-secondary">
                        Completa la información del cliente.
                      </small>
                    </div>

                    <button
                      type="button"
                      className="btn-close"
                      onClick={cerrarModal}
                      disabled={guardando}
                    />
                  </div>

                  <div className="modal-body p-4">
                    {error && (
                      <div className="alert alert-danger">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        {error}
                      </div>
                    )}

                    <div className="row g-3">
                      <div className="col-md-7">
                        <label className="form-label fw-semibold">
                          Nombre *
                        </label>

                        <input
                          type="text"
                          className="form-control"
                          name="nombre"
                          value={
                            formulario.nombre
                          }
                          onChange={
                            cambiarCampo
                          }
                          autoFocus
                        />
                      </div>

                      <div className="col-md-5">
                        <label className="form-label fw-semibold">
                          Identificación
                        </label>

                        <input
                          type="text"
                          className="form-control"
                          name="identificacion"
                          value={
                            formulario.identificacion
                          }
                          onChange={
                            cambiarCampo
                          }
                          placeholder="Cédula, DIMEX, etc."
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Teléfono
                        </label>

                        <input
                          type="text"
                          className="form-control"
                          name="telefono"
                          value={
                            formulario.telefono
                          }
                          onChange={
                            cambiarCampo
                          }
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Correo
                        </label>

                        <input
                          type="email"
                          className="form-control"
                          name="email"
                          value={
                            formulario.email
                          }
                          onChange={
                            cambiarCampo
                          }
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-semibold">
                          Dirección
                        </label>

                        <textarea
                          className="form-control"
                          rows="3"
                          name="direccion"
                          value={
                            formulario.direccion
                          }
                          onChange={
                            cambiarCampo
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={cerrarModal}
                      disabled={guardando}
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className="btn btn-dark px-4"
                      disabled={guardando}
                    >
                      {guardando ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-lg me-2"></i>

                          {clienteEditando
                            ? "Guardar cambios"
                            : "Crear cliente"}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div
            className="modal-backdrop fade show"
            onClick={cerrarModal}
          ></div>
        </>
      )}
    </AppLayout>
  );
}

export default Clientes;