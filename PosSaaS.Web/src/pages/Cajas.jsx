import { useEffect, useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import api from "../services/api";

function Cajas() {
  const rol = localStorage.getItem("rol") || "Usuario";
  const puedeCrearCaja = rol === "Admin" || rol === "Supervisor";

  const [cajas, setCajas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [sesiones, setSesiones] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [modalActivo, setModalActivo] = useState(null);

  const [nuevaCaja, setNuevaCaja] = useState({
    sucursalId: "",
    nombre: "",
  });

  const [cajaSeleccionada, setCajaSeleccionada] = useState(null);
  const [sesionSeleccionada, setSesionSeleccionada] = useState(null);
  const [resumen, setResumen] = useState(null);

  const [montoApertura, setMontoApertura] = useState("");
  const [montoContado, setMontoContado] = useState("");

  const [tipoMovimiento, setTipoMovimiento] = useState("ingreso");
  const [movimiento, setMovimiento] = useState({
    monto: "",
    referencia: "",
    observacion: "",
  });

  useEffect(() => {
    cargarTodo();
  }, []);

  const obtenerMensajeError = (err, fallback) => {
    const data = err?.response?.data;

    if (typeof data === "string") return data;
    if (data?.mensaje) return data.mensaje;
    if (data?.title) return data.title;

    return fallback;
  };

  const moneda = (valor) =>
    new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      maximumFractionDigits: 0,
    }).format(Number(valor) || 0);

  const fechaHora = (fecha) => {
    if (!fecha) return "-";

    return new Intl.DateTimeFormat("es-CR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(fecha));
  };

  const cargarTodo = async () => {
    try {
      setCargando(true);
      setError("");

      const [cajasResponse, sucursalesResponse] = await Promise.all([
        api.get("/Cajas"),
        api.get("/Sucursales"),
      ]);

      const listaCajas = cajasResponse.data || [];

      setCajas(listaCajas);
      setSucursales(sucursalesResponse.data || []);

      const sesionesEncontradas = {};

      await Promise.all(
        listaCajas.map(async (caja) => {
          try {
            const response = await api.get(
              `/Cajas/sesion-abierta/${caja.id}`
            );

            sesionesEncontradas[caja.id] = response.data;
          } catch (err) {
            if (err?.response?.status !== 404) {
              console.error(err);
            }
          }
        })
      );

      setSesiones(sesionesEncontradas);
    } catch (err) {
      console.error(err);
      setError(
        obtenerMensajeError(err, "No fue posible cargar las cajas.")
      );
    } finally {
      setCargando(false);
    }
  };

  const sucursalesActivas = useMemo(
    () => sucursales.filter((x) => x.activa),
    [sucursales]
  );

  const cajasActivas = useMemo(
    () => cajas.filter((x) => x.activa).length,
    [cajas]
  );

  const cajasAbiertas = useMemo(
    () => Object.keys(sesiones).length,
    [sesiones]
  );

  const crearCaja = async (e) => {
    e.preventDefault();

    if (!nuevaCaja.sucursalId || !nuevaCaja.nombre.trim()) {
      setError("Selecciona una sucursal e ingresa el nombre de la caja.");
      return;
    }

    try {
      setProcesando(true);
      setError("");
      setMensaje("");

      await api.post("/Cajas", {
        sucursalId: Number(nuevaCaja.sucursalId),
        nombre: nuevaCaja.nombre.trim(),
      });

      setNuevaCaja({ sucursalId: "", nombre: "" });
      setMensaje("Caja creada correctamente.");
      await cargarTodo();
    } catch (err) {
      console.error(err);
      setError(obtenerMensajeError(err, "No fue posible crear la caja."));
    } finally {
      setProcesando(false);
    }
  };

  const prepararApertura = (caja) => {
    setModalActivo("abrir");
    setCajaSeleccionada(caja);
    setMontoApertura("");
    setError("");
    setMensaje("");
  };

  const abrirCaja = async (e) => {
    e.preventDefault();

    const monto = Number(montoApertura);

    if (!cajaSeleccionada) return;

    if (Number.isNaN(monto) || monto < 0) {
      setError("Ingresa un monto de apertura válido.");
      return;
    }

    try {
      setProcesando(true);
      setError("");
      setMensaje("");

      await api.post("/Cajas/abrir", {
        cajaId: cajaSeleccionada.id,
        montoApertura: monto,
      });

      setMensaje(`La caja ${cajaSeleccionada.nombre} fue abierta correctamente.`);
      setModalActivo(null);
      setCajaSeleccionada(null);
      setMontoApertura("");
      await cargarTodo();
    } catch (err) {
      console.error(err);
      setError(obtenerMensajeError(err, "No fue posible abrir la caja."));
    } finally {
      setProcesando(false);
    }
  };

  const cargarResumen = async (caja) => {
    const sesion = sesiones[caja.id];
    setModalActivo("resumen");
    if (!sesion) return;

    try {
      setProcesando(true);
      setError("");
      setCajaSeleccionada(caja);
      setSesionSeleccionada(sesion);
      setResumen(null);

      const response = await api.get(
        `/Cajas/sesion/${sesion.id}/resumen`
      );

      setResumen(response.data);
    } catch (err) {
      console.error(err);
      setError(
        obtenerMensajeError(err, "No fue posible cargar el resumen de caja.")
      );
    } finally {
      setProcesando(false);
    }
  };

  const prepararMovimiento = async (caja, tipo) => {
    const sesion = sesiones[caja.id];
    setModalActivo("movimiento");
    if (!sesion) return;

    setCajaSeleccionada(caja);
    setSesionSeleccionada(sesion);
    setTipoMovimiento(tipo);
    setMovimiento({ monto: "", referencia: "", observacion: "" });
    setResumen(null);
    setError("");
    setMensaje("");

    try {
      const response = await api.get(
        `/Cajas/sesion/${sesion.id}/resumen`
      );
      setResumen(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const registrarMovimiento = async (e) => {
    e.preventDefault();

    if (!sesionSeleccionada) return;

    const monto = Number(movimiento.monto);

    if (Number.isNaN(monto) || monto <= 0) {
      setError("El monto debe ser mayor que cero.");
      return;
    }

    try {
      setProcesando(true);
      setError("");
      setMensaje("");

      await api.post(
        `/Cajas/${sesionSeleccionada.id}/${tipoMovimiento}`,
        {
          monto,
          referencia: movimiento.referencia.trim() || null,
          observacion: movimiento.observacion.trim() || null,
        }
      );

      setMensaje(
        tipoMovimiento === "ingreso"
          ? "Ingreso registrado correctamente."
          : "Retiro registrado correctamente."
      );

      setMovimiento({ monto: "", referencia: "", observacion: "" });

      const response = await api.get(
        `/Cajas/sesion/${sesionSeleccionada.id}/resumen`
      );
      setResumen(response.data);

      await cargarTodo();
    } catch (err) {
      console.error(err);
      setError(
        obtenerMensajeError(
          err,
          tipoMovimiento === "ingreso"
            ? "No fue posible registrar el ingreso."
            : "No fue posible registrar el retiro."
        )
      );
    } finally {
      setProcesando(false);
    }
  };

  const prepararCierre = async (caja) => {
    const sesion = sesiones[caja.id];
    setModalActivo("cerrar");
    if (!sesion) return;

    setCajaSeleccionada(caja);
    setSesionSeleccionada(sesion);
    setMontoContado("");
    setResumen(null);
    setError("");
    setMensaje("");

    try {
      const response = await api.get(
        `/Cajas/sesion/${sesion.id}/resumen`
      );
      setResumen(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const cerrarCaja = async (e) => {
    e.preventDefault();

    if (!sesionSeleccionada) return;

    const monto = Number(montoContado);

    if (Number.isNaN(monto) || monto < 0) {
      setError("Ingresa un monto contado válido.");
      return;
    }

    try {
      setProcesando(true);
      setError("");
      setMensaje("");

      const response = await api.post(
        `/Cajas/${sesionSeleccionada.id}/cerrar`,
        { montoContado: monto }
      );

      setMensaje(
        `Caja cerrada correctamente. Diferencia: ${moneda(
          response.data?.diferencia || 0
        )}`
      );

      setModalActivo(null);
      setCajaSeleccionada(null);
      setSesionSeleccionada(null);
      setMontoContado("");
      setResumen(null);

      await cargarTodo();
    } catch (err) {
      console.error(err);
      setError(obtenerMensajeError(err, "No fue posible cerrar la caja."));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <AppLayout>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Cajas</h2>
          <p className="text-secondary mb-0">
            Administra aperturas, movimientos y cierres de caja.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-dark"
          onClick={cargarTodo}
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
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <p className="text-secondary mb-2">Cajas registradas</p>
              <h3 className="fw-bold mb-0">{cajas.length}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <p className="text-secondary mb-2">Cajas activas</p>
              <h3 className="fw-bold mb-0">{cajasActivas}</h3>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <p className="text-secondary mb-2">Sesiones abiertas</p>
              <h3 className="fw-bold mb-0">{cajasAbiertas}</h3>
            </div>
          </div>
        </div>
      </div>

      {puedeCrearCaja && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <h5 className="fw-bold mb-3">
              <i className="bi bi-plus-circle me-2"></i>
              Crear nueva caja
            </h5>

            <form onSubmit={crearCaja}>
              <div className="row g-3 align-items-end">
                <div className="col-md-5">
                  <label className="form-label">Sucursal</label>
                  <select
                    className="form-select"
                    value={nuevaCaja.sucursalId}
                    onChange={(e) =>
                      setNuevaCaja({
                        ...nuevaCaja,
                        sucursalId: e.target.value,
                      })
                    }
                  >
                    <option value="">Selecciona una sucursal</option>
                    {sucursalesActivas.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-5">
                  <label className="form-label">Nombre de la caja</label>
                  <input
                    className="form-control"
                    placeholder="Ej. Caja Principal"
                    value={nuevaCaja.nombre}
                    onChange={(e) =>
                      setNuevaCaja({
                        ...nuevaCaja,
                        nombre: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="col-md-2 d-grid">
                  <button
                    className="btn btn-dark"
                    type="submit"
                    disabled={procesando}
                  >
                    Crear
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          {cargando ? (
            <div className="text-center py-5">
              <div className="spinner-border"></div>
              <p className="text-secondary mt-3 mb-0">Cargando cajas...</p>
            </div>
          ) : cajas.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-cash-stack fs-1 text-secondary"></i>
              <h5 className="mt-3">No hay cajas registradas</h5>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Caja</th>
                    <th>Sucursal</th>
                    <th>Estado</th>
                    <th>Apertura</th>
                    <th className="text-end">Monto inicial</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {cajas.map((caja) => {
                    const sesion = sesiones[caja.id];

                    return (
                      <tr key={caja.id}>
                        <td className="fw-semibold">{caja.nombre}</td>
                        <td>{caja.sucursal}</td>
                        <td>
                          <span
                            className={
                              sesion
                                ? "badge text-bg-success"
                                : "badge text-bg-secondary"
                            }
                          >
                            {sesion ? "ABIERTA" : "CERRADA"}
                          </span>
                        </td>
                        <td>{sesion ? fechaHora(sesion.fechaApertura) : "-"}</td>
                        <td className="text-end">
                          {sesion ? moneda(sesion.montoApertura) : "-"}
                        </td>
                        <td className="text-end">
                          <div className="d-flex flex-wrap justify-content-end gap-2">
                            {!sesion ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-dark"
                                onClick={() => prepararApertura(caja)}
                                disabled={!caja.activa}
                              >
                                Abrir
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-dark"
                                  onClick={() => cargarResumen(caja)}
                                >
                                  Resumen
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-success"
                                  onClick={() => prepararMovimiento(caja, "ingreso")}
                                >
                                  Ingreso
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-warning"
                                  onClick={() => prepararMovimiento(caja, "retiro")}
                                >
                                  Retiro
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => prepararCierre(caja)}
                                >
                                  Cerrar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalActivo === "abrir" && (
      <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,.5)" }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0">
            <form onSubmit={abrirCaja}>
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">Abrir caja</h5>
                  <small className="text-secondary">{cajaSeleccionada?.nombre}</small>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalActivo(null)}
                  aria-label="Cerrar"
                ></button>
              </div>
              <div className="modal-body">
                <label className="form-label">Monto inicial de efectivo</label>
                <div className="input-group">
                  <span className="input-group-text">₡</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    value={montoApertura}
                    onChange={(e) => setMontoApertura(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setModalActivo(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-dark" disabled={procesando}>
                  Abrir caja
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}

      {modalActivo === "movimiento" && (
      <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,.5)" }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0">
            <form onSubmit={registrarMovimiento}>
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">
                    {tipoMovimiento === "ingreso" ? "Registrar ingreso" : "Registrar retiro"}
                  </h5>
                  <small className="text-secondary">{cajaSeleccionada?.nombre}</small>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalActivo(null)}
                  aria-label="Cerrar"
                ></button>
              </div>
              <div className="modal-body">
                {resumen?.resumen && (
                  <div className="alert alert-light border">
                    Efectivo esperado: <strong>{moneda(resumen.resumen.montoEsperado)}</strong>
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label">Monto</label>
                  <div className="input-group">
                    <span className="input-group-text">₡</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="form-control"
                      value={movimiento.monto}
                      onChange={(e) => setMovimiento({ ...movimiento, monto: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Referencia</label>
                  <input
                    className="form-control"
                    value={movimiento.referencia}
                    onChange={(e) => setMovimiento({ ...movimiento, referencia: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Observación</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={movimiento.observacion}
                    onChange={(e) => setMovimiento({ ...movimiento, observacion: e.target.value })}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setModalActivo(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={tipoMovimiento === "ingreso" ? "btn btn-success" : "btn btn-warning"}
                  disabled={procesando}
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}

      {modalActivo === "cerrar" && (
      <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,.5)" }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0">
            <form onSubmit={cerrarCaja}>
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">Cerrar caja</h5>
                  <small className="text-secondary">{cajaSeleccionada?.nombre}</small>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalActivo(null)}
                  aria-label="Cerrar"
                ></button>
              </div>
              <div className="modal-body">
                {resumen?.resumen && (
                  <div className="card bg-light border-0 mb-3">
                    <div className="card-body">
                      <div className="d-flex justify-content-between mb-2">
                        <span>Monto apertura</span>
                        <strong>{moneda(resumen.resumen.montoApertura)}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Ventas efectivo</span>
                        <strong>{moneda(resumen.resumen.ventasEfectivo)}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Efectivo esperado</span>
                        <strong>{moneda(resumen.resumen.montoEsperado)}</strong>
                      </div>
                    </div>
                  </div>
                )}

                <label className="form-label">Efectivo contado físicamente</label>
                <div className="input-group">
                  <span className="input-group-text">₡</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    value={montoContado}
                    onChange={(e) => setMontoContado(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => setModalActivo(null)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-danger" disabled={procesando}>
                  Cerrar caja
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      )}

      {modalActivo === "resumen" && (
      <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,.5)" }}>
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
          <div className="modal-content border-0">
            <div className="modal-header">
              <div>
                <h5 className="modal-title fw-bold">Resumen de caja</h5>
                <small className="text-secondary">{cajaSeleccionada?.nombre}</small>
              </div>
              <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalActivo(null)}
                  aria-label="Cerrar"
                ></button>
            </div>

            <div className="modal-body p-4">
              {!resumen ? (
                <div className="text-center py-5">
                  <div className="spinner-border"></div>
                </div>
              ) : (
                <>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6 col-xl-3">
                      <div className="card bg-light border-0 h-100">
                        <div className="card-body">
                          <small className="text-secondary">Apertura</small>
                          <h5 className="fw-bold mb-0">{moneda(resumen.resumen.montoApertura)}</h5>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 col-xl-3">
                      <div className="card bg-light border-0 h-100">
                        <div className="card-body">
                          <small className="text-secondary">Ventas efectivo</small>
                          <h5 className="fw-bold mb-0">{moneda(resumen.resumen.ventasEfectivo)}</h5>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 col-xl-3">
                      <div className="card bg-light border-0 h-100">
                        <div className="card-body">
                          <small className="text-secondary">Ingresos manuales</small>
                          <h5 className="fw-bold mb-0">{moneda(resumen.resumen.ingresosManuales)}</h5>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 col-xl-3">
                      <div className="card bg-light border-0 h-100">
                        <div className="card-body">
                          <small className="text-secondary">Efectivo esperado</small>
                          <h5 className="fw-bold mb-0">{moneda(resumen.resumen.montoEsperado)}</h5>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 text-secondary">
                    <strong className="text-dark">Sucursal:</strong> {resumen.sesion.sucursal} · {" "}
                    <strong className="text-dark">Abierta por:</strong> {resumen.sesion.usuarioApertura} · {" "}
                    <strong className="text-dark">Fecha:</strong> {fechaHora(resumen.sesion.fechaApertura)}
                  </div>

                  <h6 className="fw-bold mb-3">Movimientos</h6>

                  {resumen.movimientos?.length ? (
                    <div className="table-responsive">
                      <table className="table align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Fecha</th>
                            <th>Tipo</th>
                            <th>Usuario</th>
                            <th>Referencia</th>
                            <th>Observación</th>
                            <th className="text-end">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumen.movimientos.map((item) => (
                            <tr key={item.id}>
                              <td>{fechaHora(item.fecha)}</td>
                              <td>{item.tipo}</td>
                              <td>{item.usuario}</td>
                              <td>{item.referencia || "-"}</td>
                              <td>{item.observacion || "-"}</td>
                              <td className={Number(item.monto) < 0 ? "text-end fw-semibold text-danger" : "text-end fw-semibold text-success"}>
                                {moneda(item.monto)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-secondary">
                      Todavía no hay movimientos en esta sesión.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </AppLayout>
  );
}

export default Cajas;
