import { useEffect, useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import api from "../services/api";

function Clientes() {
  const rol = localStorage.getItem("rol") || "Usuario";
  const puedeCambiarEstado = rol === "Admin" || rol === "Supervisor";

  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
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
      setClientes(response.data || []);
    } catch (err) {
      console.error(err);
      setError("No fue posible cargar los clientes.");
    } finally {
      setCargando(false);
    }
  };

  const clientesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return clientes.filter((cliente) => {
      const coincideEstado =
        filtroEstado === "TODOS" ||
        (filtroEstado === "ACTIVOS" && cliente.activo) ||
        (filtroEstado === "INACTIVOS" && !cliente.activo);

      const coincideBusqueda =
        !texto ||
        cliente.nombre?.toLowerCase().includes(texto) ||
        cliente.identificacion?.toLowerCase().includes(texto) ||
        cliente.telefono?.toLowerCase().includes(texto) ||
        cliente.email?.toLowerCase().includes(texto) ||
        cliente.direccion?.toLowerCase().includes(texto);

      return coincideEstado && coincideBusqueda;
    });
  }, [clientes, busqueda, filtroEstado]);

  const totalClientes = clientes.length;
  const activos = clientes.filter((cliente) => cliente.activo).length;
  const inactivos = totalClientes - activos;
  const conTelefono = clientes.filter((cliente) => cliente.telefono).length;

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
      identificacion: cliente.identificacion || "",
      telefono: cliente.telefono || "",
      email: cliente.email || "",
      direccion: cliente.direccion || "",
    });
    setError("");
    setMensaje("");
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setMostrarModal(false);
    setClienteEditando(null);
    limpiarFormulario();
    setError("");
  };

  const cambiarCampo = (e) => {
    const { name, value } = e.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
  };

  const validarFormulario = () => {
    if (!formulario.nombre.trim()) return "El nombre es obligatorio.";

    if (
      formulario.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulario.email.trim())
    ) {
      return "Ingresa un correo electrónico válido.";
    }

    return "";
  };

  const guardarCliente = async (e) => {
    e.preventDefault();
    const validacion = validarFormulario();

    if (validacion) {
      setError(validacion);
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const payload = {
        nombre: formulario.nombre.trim(),
        identificacion: formulario.identificacion.trim() || null,
        telefono: formulario.telefono.trim() || null,
        email: formulario.email.trim() || null,
        direccion: formulario.direccion.trim() || null,
      };

      if (clienteEditando) {
        await api.put(`/Clientes/${clienteEditando.id}`, payload);
        setMensaje("Cliente actualizado correctamente.");
      } else {
        await api.post("/Clientes", payload);
        setMensaje("Cliente creado correctamente.");
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
          : data?.message || data?.title || "No fue posible guardar el cliente."
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (cliente) => {
    try {
      setError("");
      setMensaje("");
      await api.patch(`/Clientes/${cliente.id}/estado`, null, {
        params: { activo: !cliente.activo },
      });
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

  const telefonoWhatsApp = (telefono) => {
    const digitos = String(telefono || "").replace(/\D/g, "");
    if (!digitos) return "";
    return digitos.length === 8 ? `506${digitos}` : digitos;
  };

  const abrirWhatsApp = (cliente) => {
    const telefono = telefonoWhatsApp(cliente.telefono);
    if (!telefono) return;
    const texto = encodeURIComponent(`Hola ${cliente.nombre} 👋`);
    window.open(`https://wa.me/${telefono}?text=${texto}`, "_blank", "noopener,noreferrer");
  };

  const csvCampo = (valor) => `"${String(valor ?? "").replaceAll('"', '""')}"`;

  const exportarClientes = () => {
    if (clientesFiltrados.length === 0) return;

    const filas = [
      ["Nombre", "Identificación", "Teléfono", "Correo", "Dirección", "Estado"],
      ...clientesFiltrados.map((cliente) => [
        cliente.nombre,
        cliente.identificacion || "",
        cliente.telefono || "",
        cliente.email || "",
        cliente.direccion || "",
        cliente.activo ? "Activo" : "Inactivo",
      ]),
    ];

    const contenido = filas.map((fila) => fila.map(csvCampo).join(";")).join("\r\n");
    const blob = new Blob(["\ufeff", contenido], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroEstado("TODOS");
  };

  const tarjetas = [
    { titulo: "Total clientes", valor: totalClientes, icono: "bi-people", clase: "text-secondary" },
    { titulo: "Activos", valor: activos, icono: "bi-person-check", clase: "text-success" },
    { titulo: "Inactivos", valor: inactivos, icono: "bi-person-x", clase: "text-danger" },
    { titulo: "Con teléfono", valor: conTelefono, icono: "bi-telephone", clase: "text-primary" },
  ];

  return (
    <AppLayout>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Clientes</h2>
          <p className="text-secondary mb-0">
            Gestiona contactos, comunícate rápidamente y exporta tu cartera de clientes.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline-dark"
            onClick={exportarClientes}
            disabled={clientesFiltrados.length === 0}
          >
            <i className="bi bi-download me-2"></i>
            Exportar CSV / Excel
          </button>
          <button type="button" className="btn btn-dark" onClick={abrirNuevoCliente}>
            <i className="bi bi-person-plus me-2"></i>
            Nuevo cliente
          </button>
        </div>
      </div>

      {mensaje && (
        <div className="alert alert-success d-flex justify-content-between align-items-center">
          <div>
            <i className="bi bi-check-circle-fill me-2"></i>
            {mensaje}
          </div>
          <button type="button" className="btn-close" onClick={() => setMensaje("")} />
        </div>
      )}

      {error && !mostrarModal && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      <div className="row g-3 mb-4">
        {tarjetas.map((tarjeta) => (
          <div className="col-6 col-xl-3" key={tarjeta.titulo}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-3 p-md-4">
                <div className="d-flex justify-content-between align-items-center gap-2">
                  <div>
                    <div className="text-secondary small mb-1">{tarjeta.titulo}</div>
                    <div className="fs-3 fw-bold">{tarjeta.valor}</div>
                  </div>
                  <i className={`bi ${tarjeta.icono} fs-2 ${tarjeta.clase}`}></i>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="row g-3 align-items-end">
            <div className="col-lg-7">
              <label className="form-label fw-semibold">Buscar cliente</label>
              <div className="input-group">
                <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nombre, identificación, teléfono, correo o dirección..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <label className="form-label fw-semibold">Estado</label>
              <select
                className="form-select"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="TODOS">Todos</option>
                <option value="ACTIVOS">Activos</option>
                <option value="INACTIVOS">Inactivos</option>
              </select>
            </div>
            <div className="col-md-6 col-lg-2 d-grid">
              <button type="button" className="btn btn-outline-secondary" onClick={limpiarFiltros}>
                Limpiar
              </button>
            </div>
          </div>
          <div className="mt-3 text-secondary small">
            {clientesFiltrados.length} de {clientes.length} clientes visibles
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {cargando ? (
            <div className="text-center py-5">
              <div className="spinner-border" />
              <p className="text-secondary mt-3 mb-0">Cargando clientes...</p>
            </div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="text-center py-5 px-3">
              <i className="bi bi-people fs-1 text-secondary"></i>
              <h5 className="mt-3">No encontramos clientes</h5>
              <p className="text-secondary mb-0">Ajusta los filtros o registra un nuevo cliente.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Cliente</th>
                    <th>Contacto</th>
                    <th>Identificación</th>
                    <th>Dirección</th>
                    <th className="text-center">Estado</th>
                    <th className="text-end pe-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesFiltrados.map((cliente) => (
                    <tr key={cliente.id}>
                      <td className="ps-4">
                        <div className="fw-semibold">{cliente.nombre}</div>
                        {cliente.email && (
                          <a href={`mailto:${cliente.email}`} className="small text-secondary text-decoration-none">
                            {cliente.email}
                          </a>
                        )}
                      </td>
                      <td>
                        {cliente.telefono ? (
                          <div className="d-flex align-items-center gap-2">
                            <a href={`tel:${cliente.telefono}`} className="text-decoration-none">
                              {cliente.telefono}
                            </a>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success"
                              title="WhatsApp"
                              onClick={() => abrirWhatsApp(cliente)}
                            >
                              <i className="bi bi-whatsapp"></i>
                            </button>
                          </div>
                        ) : <span className="text-secondary">Sin teléfono</span>}
                      </td>
                      <td>{cliente.identificacion || "-"}</td>
                      <td>
                        <div style={{ maxWidth: "280px" }} className="text-truncate" title={cliente.direccion || ""}>
                          {cliente.direccion || "-"}
                        </div>
                      </td>
                      <td className="text-center">
                        <span className={`badge ${cliente.activo ? "text-bg-success" : "text-bg-secondary"}`}>
                          {cliente.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <div className="btn-group">
                          {cliente.telefono && (
                            <a className="btn btn-sm btn-outline-secondary" href={`tel:${cliente.telefono}`} title="Llamar">
                              <i className="bi bi-telephone"></i>
                            </a>
                          )}
                          {cliente.email && (
                            <a className="btn btn-sm btn-outline-secondary" href={`mailto:${cliente.email}`} title="Correo">
                              <i className="bi bi-envelope"></i>
                            </a>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-dark"
                            title="Editar"
                            onClick={() => abrirEditarCliente(cliente)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          {puedeCambiarEstado && (
                            <button
                              type="button"
                              className={`btn btn-sm ${cliente.activo ? "btn-outline-danger" : "btn-outline-success"}`}
                              title={cliente.activo ? "Desactivar" : "Activar"}
                              onClick={() => cambiarEstado(cliente)}
                            >
                              <i className={`bi ${cliente.activo ? "bi-slash-circle" : "bi-check-circle"}`}></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {mostrarModal && (
        <>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content border-0 shadow">
                <form onSubmit={guardarCliente}>
                  <div className="modal-header">
                    <div>
                      <h5 className="modal-title fw-bold">
                        {clienteEditando ? "Editar cliente" : "Nuevo cliente"}
                      </h5>
                      <small className="text-secondary">
                        Completa la información principal del cliente.
                      </small>
                    </div>
                    <button type="button" className="btn-close" onClick={cerrarModal} disabled={guardando} />
                  </div>

                  <div className="modal-body p-4">
                    {error && (
                      <div className="alert alert-danger">
                        <i className="bi bi-exclamation-triangle me-2"></i>{error}
                      </div>
                    )}

                    <div className="row g-3">
                      <div className="col-md-7">
                        <label className="form-label">Nombre *</label>
                        <input
                          type="text"
                          className="form-control"
                          name="nombre"
                          value={formulario.nombre}
                          onChange={cambiarCampo}
                          autoFocus
                        />
                      </div>
                      <div className="col-md-5">
                        <label className="form-label">Identificación</label>
                        <input
                          type="text"
                          className="form-control"
                          name="identificacion"
                          value={formulario.identificacion}
                          onChange={cambiarCampo}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Teléfono</label>
                        <input
                          type="tel"
                          className="form-control"
                          name="telefono"
                          value={formulario.telefono}
                          onChange={cambiarCampo}
                          placeholder="8888-8888"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">Correo</label>
                        <input
                          type="email"
                          className="form-control"
                          name="email"
                          value={formulario.email}
                          onChange={cambiarCampo}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label">Dirección</label>
                        <textarea
                          className="form-control"
                          name="direccion"
                          rows="3"
                          value={formulario.direccion}
                          onChange={cambiarCampo}
                        ></textarea>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary" onClick={cerrarModal} disabled={guardando}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-dark" disabled={guardando}>
                      {guardando ? (
                        <><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</>
                      ) : (
                        <><i className="bi bi-check2 me-2"></i>{clienteEditando ? "Guardar cambios" : "Crear cliente"}</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </AppLayout>
  );
}

export default Clientes;
