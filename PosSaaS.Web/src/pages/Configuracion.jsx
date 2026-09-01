import { useEffect, useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import api from "../services/api";

function Configuracion() {
  const rol = localStorage.getItem("rol") || "Usuario";
  const puedeSucursales = rol === "Admin";
  const puedeMetodos = rol === "Admin";

  const [tab, setTab] = useState("sucursales");
  const [sucursales, setSucursales] = useState([]);
  const [metodos, setMetodos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [modal, setModal] = useState(null);
  const [editandoId, setEditandoId] = useState(null);

  const [busquedaSucursal, setBusquedaSucursal] = useState("");
  const [estadoSucursal, setEstadoSucursal] = useState("TODAS");
  const [busquedaMetodo, setBusquedaMetodo] = useState("");
  const [estadoMetodo, setEstadoMetodo] = useState("TODOS");

  const [sucursalForm, setSucursalForm] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
  });

  const [metodoForm, setMetodoForm] = useState({
    nombre: "",
    tipo: "EFECTIVO",
    afectaCaja: true,
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const obtenerError = (err, fallback) => {
    const data = err?.response?.data;
    if (typeof data === "string") return data;
    if (data?.mensaje) return data.mensaje;
    if (data?.title) return data.title;
    return fallback;
  };

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError("");

      const [sucursalesResponse, metodosResponse] = await Promise.all([
        api.get("/Sucursales"),
        api.get("/MetodosPago"),
      ]);

      setSucursales(sucursalesResponse.data || []);
      setMetodos(metodosResponse.data || []);
    } catch (err) {
      console.error(err);
      setError(obtenerError(err, "No fue posible cargar la configuración."));
    } finally {
      setCargando(false);
    }
  };

  const sucursalesActivas = useMemo(
    () => sucursales.filter((x) => x.activa).length,
    [sucursales]
  );

  const sucursalesInactivas = sucursales.length - sucursalesActivas;

  const metodosActivos = useMemo(
    () => metodos.filter((x) => x.activo).length,
    [metodos]
  );

  const metodosCaja = useMemo(
    () => metodos.filter((x) => x.activo && x.afectaCaja).length,
    [metodos]
  );

  const sucursalesFiltradas = useMemo(() => {
    const texto = busquedaSucursal.trim().toLowerCase();

    return sucursales.filter((sucursal) => {
      const coincideTexto =
        !texto ||
        sucursal.nombre?.toLowerCase().includes(texto) ||
        sucursal.telefono?.toLowerCase().includes(texto) ||
        sucursal.direccion?.toLowerCase().includes(texto);

      const coincideEstado =
        estadoSucursal === "TODAS" ||
        (estadoSucursal === "ACTIVAS" && sucursal.activa) ||
        (estadoSucursal === "INACTIVAS" && !sucursal.activa);

      return coincideTexto && coincideEstado;
    });
  }, [sucursales, busquedaSucursal, estadoSucursal]);

  const metodosFiltrados = useMemo(() => {
    const texto = busquedaMetodo.trim().toLowerCase();

    return metodos.filter((metodo) => {
      const coincideTexto =
        !texto ||
        metodo.nombre?.toLowerCase().includes(texto) ||
        metodo.tipo?.toLowerCase().includes(texto);

      const coincideEstado =
        estadoMetodo === "TODOS" ||
        (estadoMetodo === "ACTIVOS" && metodo.activo) ||
        (estadoMetodo === "INACTIVOS" && !metodo.activo);

      return coincideTexto && coincideEstado;
    });
  }, [metodos, busquedaMetodo, estadoMetodo]);

  const abrirNuevaSucursal = () => {
    setEditandoId(null);
    setSucursalForm({ nombre: "", telefono: "", direccion: "" });
    setError("");
    setMensaje("");
    setModal("sucursal");
  };

  const abrirEditarSucursal = (sucursal) => {
    setEditandoId(sucursal.id);
    setSucursalForm({
      nombre: sucursal.nombre || "",
      telefono: sucursal.telefono || "",
      direccion: sucursal.direccion || "",
    });
    setError("");
    setMensaje("");
    setModal("sucursal");
  };

  const guardarSucursal = async (e) => {
    e.preventDefault();

    if (!sucursalForm.nombre.trim()) {
      setError("El nombre de la sucursal es obligatorio.");
      return;
    }

    try {
      setProcesando(true);
      setError("");
      const payload = {
        nombre: sucursalForm.nombre.trim(),
        telefono: sucursalForm.telefono.trim() || null,
        direccion: sucursalForm.direccion.trim() || null,
      };

      if (editandoId) {
        await api.put(`/Sucursales/${editandoId}`, payload);
        setMensaje("Sucursal actualizada correctamente.");
      } else {
        await api.post("/Sucursales", payload);
        setMensaje("Sucursal creada correctamente.");
      }

      setModal(null);
      await cargarDatos();
    } catch (err) {
      console.error(err);
      setError(obtenerError(err, "No fue posible guardar la sucursal."));
    } finally {
      setProcesando(false);
    }
  };

  const cambiarEstadoSucursal = async (sucursal) => {
    const accion = sucursal.activa ? "desactivar" : "activar";
    if (!window.confirm(`¿Deseas ${accion} la sucursal "${sucursal.nombre}"?`)) {
      return;
    }

    try {
      setProcesando(true);
      setError("");
      setMensaje("");

      await api.patch(
        `/Sucursales/${sucursal.id}/estado?activa=${!sucursal.activa}`
      );

      setMensaje(
        !sucursal.activa
          ? "Sucursal activada correctamente."
          : "Sucursal desactivada correctamente."
      );

      await cargarDatos();
    } catch (err) {
      console.error(err);
      setError(obtenerError(err, "No fue posible cambiar el estado."));
    } finally {
      setProcesando(false);
    }
  };

  const abrirNuevoMetodo = () => {
    setEditandoId(null);
    setMetodoForm({ nombre: "", tipo: "EFECTIVO", afectaCaja: true });
    setError("");
    setMensaje("");
    setModal("metodo");
  };

  const abrirEditarMetodo = (metodo) => {
    setEditandoId(metodo.id);
    setMetodoForm({
      nombre: metodo.nombre || "",
      tipo: metodo.tipo || "OTRO",
      afectaCaja: Boolean(metodo.afectaCaja),
    });
    setError("");
    setMensaje("");
    setModal("metodo");
  };

  const cambiarTipo = (tipo) => {
    setMetodoForm((actual) => ({
      ...actual,
      tipo,
      afectaCaja: tipo === "EFECTIVO" ? true : actual.afectaCaja,
    }));
  };

  const guardarMetodo = async (e) => {
    e.preventDefault();

    if (!metodoForm.nombre.trim() || !metodoForm.tipo.trim()) {
      setError("Nombre y tipo son obligatorios.");
      return;
    }

    try {
      setProcesando(true);
      setError("");

      const payload = {
        nombre: metodoForm.nombre.trim(),
        tipo: metodoForm.tipo.trim().toUpperCase(),
        afectaCaja: Boolean(metodoForm.afectaCaja),
      };

      if (editandoId) {
        await api.put(`/MetodosPago/${editandoId}`, payload);
        setMensaje("Método de pago actualizado correctamente.");
      } else {
        await api.post("/MetodosPago", payload);
        setMensaje("Método de pago creado correctamente.");
      }

      setModal(null);
      await cargarDatos();
    } catch (err) {
      console.error(err);
      setError(obtenerError(err, "No fue posible guardar el método de pago."));
    } finally {
      setProcesando(false);
    }
  };

  const cambiarEstadoMetodo = async (metodo) => {
    const accion = metodo.activo ? "desactivar" : "activar";
    if (!window.confirm(`¿Deseas ${accion} el método "${metodo.nombre}"?`)) {
      return;
    }

    try {
      setProcesando(true);
      setError("");
      setMensaje("");

      await api.patch(
        `/MetodosPago/${metodo.id}/estado?activo=${!metodo.activo}`
      );

      setMensaje(
        !metodo.activo
          ? "Método de pago activado."
          : "Método de pago desactivado."
      );

      await cargarDatos();
    } catch (err) {
      console.error(err);
      setError(obtenerError(err, "No fue posible cambiar el estado."));
    } finally {
      setProcesando(false);
    }
  };

  const descripcionTipo = (tipo) => {
    switch (tipo) {
      case "EFECTIVO":
        return "Dinero físico entregado en caja.";
      case "TARJETA":
        return "Pago procesado con tarjeta.";
      case "TRANSFERENCIA":
        return "SINPE, transferencia u otro pago bancario.";
      default:
        return "Otro medio de pago configurado por el negocio.";
    }
  };

  return (
    <AppLayout>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <div className="text-secondary small mb-1">Administración</div>
          <h2 className="fw-bold mb-1">Configuración</h2>
          <p className="text-secondary mb-0">
            Administra la estructura del negocio y las formas de cobro del POS.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-dark"
          onClick={cargarDatos}
          disabled={cargando || procesando}
        >
          <i className="bi bi-arrow-clockwise me-2"></i>
          Actualizar
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {mensaje && (
        <div className="alert alert-success d-flex justify-content-between align-items-center">
          <div>
            <i className="bi bi-check-circle me-2"></i>
            {mensaje}
          </div>
          <button className="btn-close" onClick={() => setMensaje("")} />
        </div>
      )}

      <div className="row g-3 mb-4">
        {[
          ["Sucursales activas", sucursalesActivas, "bi-shop", "text-success"],
          ["Sucursales inactivas", sucursalesInactivas, "bi-shop-window", "text-secondary"],
          ["Métodos activos", metodosActivos, "bi-credit-card", "text-primary"],
          ["Afectan efectivo", metodosCaja, "bi-cash-stack", "text-success"],
        ].map(([titulo, valor, icono, clase]) => (
          <div className="col-6 col-xl-3" key={titulo}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-3 p-md-4 d-flex justify-content-between align-items-center gap-2">
                <div>
                  <div className="text-secondary small mb-1">{titulo}</div>
                  <div className="fs-3 fw-bold">{valor}</div>
                </div>
                <i className={`bi ${icono} fs-2 ${clase}`}></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0 pt-4 px-4">
          <ul className="nav nav-pills gap-2 flex-nowrap overflow-auto pb-1">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link text-nowrap ${tab === "sucursales" ? "active" : ""}`}
                onClick={() => setTab("sucursales")}
              >
                <i className="bi bi-shop me-2"></i>
                Sucursales
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link text-nowrap ${tab === "metodos" ? "active" : ""}`}
                onClick={() => setTab("metodos")}
              >
                <i className="bi bi-credit-card me-2"></i>
                Métodos de pago
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body p-4">
          {cargando ? (
            <div className="text-center py-5">
              <div className="spinner-border"></div>
              <p className="text-secondary mt-3 mb-0">Cargando configuración...</p>
            </div>
          ) : tab === "sucursales" ? (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                  <h5 className="fw-bold mb-1">Sucursales</h5>
                  <p className="text-secondary mb-0">
                    Administra los puntos físicos y su disponibilidad operativa.
                  </p>
                </div>
                {puedeSucursales && (
                  <button type="button" className="btn btn-dark" onClick={abrirNuevaSucursal}>
                    <i className="bi bi-plus-lg me-2"></i>
                    Nueva sucursal
                  </button>
                )}
              </div>

              <div className="row g-2 mb-3">
                <div className="col-lg-8">
                  <div className="input-group">
                    <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                    <input
                      className="form-control"
                      placeholder="Buscar por nombre, teléfono o dirección..."
                      value={busquedaSucursal}
                      onChange={(e) => setBusquedaSucursal(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-lg-4">
                  <select
                    className="form-select"
                    value={estadoSucursal}
                    onChange={(e) => setEstadoSucursal(e.target.value)}
                  >
                    <option value="TODAS">Todas las sucursales</option>
                    <option value="ACTIVAS">Activas</option>
                    <option value="INACTIVAS">Inactivas</option>
                  </select>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Sucursal</th>
                      <th>Contacto</th>
                      <th>Dirección</th>
                      <th>Estado</th>
                      {puedeSucursales && <th className="text-end">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sucursalesFiltradas.length ? (
                      sucursalesFiltradas.map((sucursal) => (
                        <tr key={sucursal.id}>
                          <td>
                            <div className="fw-semibold">{sucursal.nombre}</div>
                            <small className="text-secondary">ID #{sucursal.id}</small>
                          </td>
                          <td>
                            {sucursal.telefono ? (
                              <a href={`tel:${sucursal.telefono}`} className="text-decoration-none">
                                <i className="bi bi-telephone me-2"></i>{sucursal.telefono}
                              </a>
                            ) : (
                              <span className="text-secondary">Sin teléfono</span>
                            )}
                          </td>
                          <td>
                            <div style={{ maxWidth: 360 }} className="text-truncate" title={sucursal.direccion || ""}>
                              {sucursal.direccion || "-"}
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${sucursal.activa ? "text-bg-success" : "text-bg-secondary"}`}>
                              {sucursal.activa ? "ACTIVA" : "INACTIVA"}
                            </span>
                          </td>
                          {puedeSucursales && (
                            <td className="text-end">
                              <div className="d-inline-flex gap-2">
                                <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => abrirEditarSucursal(sucursal)}>
                                  <i className="bi bi-pencil me-1"></i>Editar
                                </button>
                                <button
                                  type="button"
                                  className={sucursal.activa ? "btn btn-sm btn-outline-danger" : "btn btn-sm btn-outline-success"}
                                  disabled={procesando}
                                  onClick={() => cambiarEstadoSucursal(sucursal)}
                                >
                                  {sucursal.activa ? "Desactivar" : "Activar"}
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={puedeSucursales ? 5 : 4} className="text-center text-secondary py-5">
                          No hay sucursales que coincidan con los filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                  <h5 className="fw-bold mb-1">Métodos de pago</h5>
                  <p className="text-secondary mb-0">
                    Controla las formas de pago disponibles en el POS y su impacto en caja.
                  </p>
                </div>
                {puedeMetodos && (
                  <button type="button" className="btn btn-dark" onClick={abrirNuevoMetodo}>
                    <i className="bi bi-plus-lg me-2"></i>
                    Nuevo método
                  </button>
                )}
              </div>

              <div className="alert alert-light border d-flex gap-3 align-items-start">
                <i className="bi bi-info-circle fs-5 text-primary"></i>
                <div className="small">
                  <strong>Afecta caja</strong> significa que ese pago modifica el efectivo físico esperado al cerrar una sesión. Normalmente solo <strong>Efectivo</strong> debe tener esta opción activa.
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-lg-8">
                  <div className="input-group">
                    <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                    <input
                      className="form-control"
                      placeholder="Buscar por nombre o tipo..."
                      value={busquedaMetodo}
                      onChange={(e) => setBusquedaMetodo(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-lg-4">
                  <select className="form-select" value={estadoMetodo} onChange={(e) => setEstadoMetodo(e.target.value)}>
                    <option value="TODOS">Todos los métodos</option>
                    <option value="ACTIVOS">Activos</option>
                    <option value="INACTIVOS">Inactivos</option>
                  </select>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Método</th>
                      <th>Tipo</th>
                      <th>Afecta caja</th>
                      <th>Estado</th>
                      {puedeMetodos && <th className="text-end">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {metodosFiltrados.length ? (
                      metodosFiltrados.map((metodo) => (
                        <tr key={metodo.id}>
                          <td>
                            <div className="fw-semibold">{metodo.nombre}</div>
                            <small className="text-secondary">{descripcionTipo(metodo.tipo)}</small>
                          </td>
                          <td><span className="badge text-bg-light border">{metodo.tipo}</span></td>
                          <td>
                            {metodo.afectaCaja ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle">
                                <i className="bi bi-cash me-1"></i>Sí
                              </span>
                            ) : (
                              <span className="text-secondary">No</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${metodo.activo ? "text-bg-success" : "text-bg-secondary"}`}>
                              {metodo.activo ? "ACTIVO" : "INACTIVO"}
                            </span>
                          </td>
                          {puedeMetodos && (
                            <td className="text-end">
                              <div className="d-inline-flex gap-2">
                                <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => abrirEditarMetodo(metodo)}>
                                  <i className="bi bi-pencil me-1"></i>Editar
                                </button>
                                <button
                                  type="button"
                                  className={metodo.activo ? "btn btn-sm btn-outline-danger" : "btn btn-sm btn-outline-success"}
                                  disabled={procesando}
                                  onClick={() => cambiarEstadoMetodo(metodo)}
                                >
                                  {metodo.activo ? "Desactivar" : "Activar"}
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={puedeMetodos ? 5 : 4} className="text-center text-secondary py-5">
                          No hay métodos que coincidan con los filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {modal === "sucursal" && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,.5)" }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <form onSubmit={guardarSucursal}>
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-bold">{editandoId ? "Editar sucursal" : "Nueva sucursal"}</h5>
                    <small className="text-secondary">Configura los datos principales del punto de venta.</small>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setModal(null)} disabled={procesando}></button>
                </div>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Nombre *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={sucursalForm.nombre}
                      onChange={(e) => setSucursalForm({ ...sucursalForm, nombre: e.target.value })}
                      placeholder="Ej. Sucursal Centro"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Teléfono</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={sucursalForm.telefono}
                      onChange={(e) => setSucursalForm({ ...sucursalForm, telefono: e.target.value })}
                      placeholder="8888-8888"
                    />
                  </div>
                  <div>
                    <label className="form-label fw-semibold">Dirección</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={sucursalForm.direccion}
                      onChange={(e) => setSucursalForm({ ...sucursalForm, direccion: e.target.value })}
                      placeholder="Dirección física de la sucursal"
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setModal(null)} disabled={procesando}>Cancelar</button>
                  <button type="submit" className="btn btn-dark" disabled={procesando}>
                    {procesando ? <><span className="spinner-border spinner-border-sm me-2" />Guardando...</> : editandoId ? "Guardar cambios" : "Crear sucursal"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {modal === "metodo" && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,.5)" }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <form onSubmit={guardarMetodo}>
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-bold">{editandoId ? "Editar método de pago" : "Nuevo método de pago"}</h5>
                    <small className="text-secondary">Define cómo aparecerá este medio de pago en el POS.</small>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setModal(null)} disabled={procesando}></button>
                </div>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Nombre *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej. Efectivo, Tarjeta, SINPE Móvil"
                      value={metodoForm.nombre}
                      onChange={(e) => setMetodoForm({ ...metodoForm, nombre: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Tipo *</label>
                    <select className="form-select" value={metodoForm.tipo} onChange={(e) => cambiarTipo(e.target.value)}>
                      <option value="EFECTIVO">EFECTIVO</option>
                      <option value="TARJETA">TARJETA</option>
                      <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                      <option value="OTRO">OTRO</option>
                    </select>
                    <div className="form-text">{descripcionTipo(metodoForm.tipo)}</div>
                  </div>
                  <div className="form-check form-switch border rounded-3 p-3 ps-5">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="afectaCaja"
                      checked={metodoForm.afectaCaja}
                      onChange={(e) => setMetodoForm({ ...metodoForm, afectaCaja: e.target.checked })}
                    />
                    <label className="form-check-label fw-semibold" htmlFor="afectaCaja">Afecta el efectivo físico de caja</label>
                    <div className="small text-secondary mt-1">Actívalo solamente cuando el dinero realmente entra o sale del cajón de efectivo.</div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setModal(null)} disabled={procesando}>Cancelar</button>
                  <button type="submit" className="btn btn-dark" disabled={procesando}>
                    {procesando ? <><span className="spinner-border spinner-border-sm me-2" />Guardando...</> : editandoId ? "Guardar cambios" : "Crear método"}
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

export default Configuracion;
