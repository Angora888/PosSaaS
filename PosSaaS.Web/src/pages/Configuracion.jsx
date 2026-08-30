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

  const metodosActivos = useMemo(
    () => metodos.filter((x) => x.activo).length,
    [metodos]
  );

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
    setMetodoForm({
      nombre: "",
      tipo: "EFECTIVO",
      afectaCaja: true,
    });
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

  return (
    <AppLayout>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Configuración</h2>
          <p className="text-secondary mb-0">
            Administra la estructura y formas de cobro del negocio.
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
        <div className="alert alert-success">
          <i className="bi bi-check-circle me-2"></i>
          {mensaje}
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-secondary mb-2">Sucursales activas</p>
                  <h3 className="fw-bold mb-0">{sucursalesActivas}</h3>
                </div>
                <i className="bi bi-shop fs-1 text-secondary"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-secondary mb-2">Métodos de pago activos</p>
                  <h3 className="fw-bold mb-0">{metodosActivos}</h3>
                </div>
                <i className="bi bi-credit-card fs-1 text-secondary"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-0 pt-4 px-4">
          <ul className="nav nav-pills gap-2">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${tab === "sucursales" ? "active" : ""}`}
                onClick={() => setTab("sucursales")}
              >
                <i className="bi bi-shop me-2"></i>
                Sucursales
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${tab === "metodos" ? "active" : ""}`}
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
              <p className="text-secondary mt-3 mb-0">
                Cargando configuración...
              </p>
            </div>
          ) : tab === "sucursales" ? (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                  <h5 className="fw-bold mb-1">Sucursales</h5>
                  <p className="text-secondary mb-0">
                    Administra los puntos físicos del negocio.
                  </p>
                </div>

                {puedeSucursales && (
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={abrirNuevaSucursal}
                  >
                    <i className="bi bi-plus-lg me-2"></i>
                    Nueva sucursal
                  </button>
                )}
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Nombre</th>
                      <th>Teléfono</th>
                      <th>Dirección</th>
                      <th>Estado</th>
                      {puedeSucursales && <th className="text-end">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sucursales.length ? (
                      sucursales.map((sucursal) => (
                        <tr key={sucursal.id}>
                          <td className="fw-semibold">{sucursal.nombre}</td>
                          <td>{sucursal.telefono || "-"}</td>
                          <td>{sucursal.direccion || "-"}</td>
                          <td>
                            <span
                              className={
                                sucursal.activa
                                  ? "badge text-bg-success"
                                  : "badge text-bg-secondary"
                              }
                            >
                              {sucursal.activa ? "ACTIVA" : "INACTIVA"}
                            </span>
                          </td>

                          {puedeSucursales && (
                            <td className="text-end">
                              <div className="d-flex justify-content-end gap-2">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-dark"
                                  onClick={() => abrirEditarSucursal(sucursal)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className={
                                    sucursal.activa
                                      ? "btn btn-sm btn-outline-danger"
                                      : "btn btn-sm btn-outline-success"
                                  }
                                  disabled={procesando}
                                  onClick={() =>
                                    cambiarEstadoSucursal(sucursal)
                                  }
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
                        <td
                          colSpan={puedeSucursales ? 5 : 4}
                          className="text-center text-secondary py-4"
                        >
                          No hay sucursales registradas.
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
                    Configura las formas de pago disponibles en el POS.
                  </p>
                </div>

                {puedeMetodos && (
                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={abrirNuevoMetodo}
                  >
                    <i className="bi bi-plus-lg me-2"></i>
                    Nuevo método
                  </button>
                )}
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Nombre</th>
                      <th>Tipo</th>
                      <th>Afecta caja</th>
                      <th>Estado</th>
                      {puedeMetodos && <th className="text-end">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {metodos.length ? (
                      metodos.map((metodo) => (
                        <tr key={metodo.id}>
                          <td className="fw-semibold">{metodo.nombre}</td>
                          <td>
                            <span className="badge text-bg-light">
                              {metodo.tipo}
                            </span>
                          </td>
                          <td>
                            {metodo.afectaCaja ? (
                              <span className="text-success fw-semibold">
                                Sí
                              </span>
                            ) : (
                              <span className="text-secondary">No</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={
                                metodo.activo
                                  ? "badge text-bg-success"
                                  : "badge text-bg-secondary"
                              }
                            >
                              {metodo.activo ? "ACTIVO" : "INACTIVO"}
                            </span>
                          </td>

                          {puedeMetodos && (
                            <td className="text-end">
                              <div className="d-flex justify-content-end gap-2">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-dark"
                                  onClick={() => abrirEditarMetodo(metodo)}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className={
                                    metodo.activo
                                      ? "btn btn-sm btn-outline-danger"
                                      : "btn btn-sm btn-outline-success"
                                  }
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
                        <td
                          colSpan={puedeMetodos ? 5 : 4}
                          className="text-center text-secondary py-4"
                        >
                          No hay métodos de pago registrados.
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
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0">
              <form onSubmit={guardarSucursal}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    {editandoId ? "Editar sucursal" : "Nueva sucursal"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setModal(null)}
                    aria-label="Cerrar"
                  ></button>
                </div>

                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Nombre</label>
                    <input
                      type="text"
                      className="form-control"
                      value={sucursalForm.nombre}
                      onChange={(e) =>
                        setSucursalForm({
                          ...sucursalForm,
                          nombre: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Teléfono</label>
                    <input
                      type="text"
                      className="form-control"
                      value={sucursalForm.telefono}
                      onChange={(e) =>
                        setSucursalForm({
                          ...sucursalForm,
                          telefono: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="form-label">Dirección</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={sucursalForm.direccion}
                      onChange={(e) =>
                        setSucursalForm({
                          ...sucursalForm,
                          direccion: e.target.value,
                        })
                      }
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setModal(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-dark"
                    disabled={procesando}
                  >
                    {editandoId ? "Guardar cambios" : "Crear sucursal"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {modal === "metodo" && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0">
              <form onSubmit={guardarMetodo}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    {editandoId
                      ? "Editar método de pago"
                      : "Nuevo método de pago"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setModal(null)}
                    aria-label="Cerrar"
                  ></button>
                </div>

                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Nombre</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ej. Efectivo, Tarjeta, SINPE Móvil"
                      value={metodoForm.nombre}
                      onChange={(e) =>
                        setMetodoForm({
                          ...metodoForm,
                          nombre: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Tipo</label>
                    <select
                      className="form-select"
                      value={metodoForm.tipo}
                      onChange={(e) => cambiarTipo(e.target.value)}
                    >
                      <option value="EFECTIVO">EFECTIVO</option>
                      <option value="TARJETA">TARJETA</option>
                      <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                      <option value="OTRO">OTRO</option>
                    </select>
                  </div>

                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="afectaCaja"
                      checked={metodoForm.afectaCaja}
                      onChange={(e) =>
                        setMetodoForm({
                          ...metodoForm,
                          afectaCaja: e.target.checked,
                        })
                      }
                    />
                    <label
                      className="form-check-label"
                      htmlFor="afectaCaja"
                    >
                      Este método afecta el efectivo de caja
                    </label>
                  </div>

                  <div className="form-text mt-2">
                    Normalmente solo Efectivo debe afectar la caja física.
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setModal(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-dark"
                    disabled={procesando}
                  >
                    {editandoId ? "Guardar cambios" : "Crear método"}
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
