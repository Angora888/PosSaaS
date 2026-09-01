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

  const [busqueda, setBusqueda] = useState("");
  const [filtroSucursal, setFiltroSucursal] = useState("TODAS");
  const [filtroEstado, setFiltroEstado] = useState("TODAS");

  const [nuevaCaja, setNuevaCaja] = useState({ sucursalId: "", nombre: "" });
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
            const response = await api.get(`/Cajas/sesion-abierta/${caja.id}`);
            sesionesEncontradas[caja.id] = response.data;
          } catch (err) {
            if (err?.response?.status !== 404) console.error(err);
          }
        })
      );
      setSesiones(sesionesEncontradas);
    } catch (err) {
      console.error(err);
      setError(obtenerMensajeError(err, "No fue posible cargar las cajas."));
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

  const cajasCerradas = cajas.filter((x) => x.activa && !sesiones[x.id]).length;

  const efectivoInicialAbierto = useMemo(
    () =>
      Object.values(sesiones).reduce(
        (total, sesion) => total + Number(sesion?.montoApertura || 0),
        0
      ),
    [sesiones]
  );

  const cajasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return cajas.filter((caja) => {
      const sesion = sesiones[caja.id];
      const coincideTexto =
        !texto ||
        caja.nombre?.toLowerCase().includes(texto) ||
        caja.sucursal?.toLowerCase().includes(texto);

      const coincideSucursal =
        filtroSucursal === "TODAS" ||
        String(caja.sucursalId) === String(filtroSucursal);

      const coincideEstado =
        filtroEstado === "TODAS" ||
        (filtroEstado === "ABIERTAS" && Boolean(sesion)) ||
        (filtroEstado === "CERRADAS" && !sesion) ||
        (filtroEstado === "INACTIVAS" && !caja.activa);

      return coincideTexto && coincideSucursal && coincideEstado;
    });
  }, [cajas, sesiones, busqueda, filtroSucursal, filtroEstado]);

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
    if (!sesion) return;
    setModalActivo("resumen");
    try {
      setProcesando(true);
      setError("");
      setCajaSeleccionada(caja);
      setSesionSeleccionada(sesion);
      setResumen(null);
      const response = await api.get(`/Cajas/sesion/${sesion.id}/resumen`);
      setResumen(response.data);
    } catch (err) {
      console.error(err);
      setError(obtenerMensajeError(err, "No fue posible cargar el resumen de caja."));
    } finally {
      setProcesando(false);
    }
  };

  const prepararMovimiento = async (caja, tipo) => {
    const sesion = sesiones[caja.id];
    if (!sesion) return;
    setModalActivo("movimiento");
    setCajaSeleccionada(caja);
    setSesionSeleccionada(sesion);
    setTipoMovimiento(tipo);
    setMovimiento({ monto: "", referencia: "", observacion: "" });
    setResumen(null);
    setError("");
    setMensaje("");
    try {
      const response = await api.get(`/Cajas/sesion/${sesion.id}/resumen`);
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
      await api.post(`/Cajas/${sesionSeleccionada.id}/${tipoMovimiento}`, {
        monto,
        referencia: movimiento.referencia.trim() || null,
        observacion: movimiento.observacion.trim() || null,
      });
      setMensaje(tipoMovimiento === "ingreso" ? "Ingreso registrado correctamente." : "Retiro registrado correctamente.");
      setMovimiento({ monto: "", referencia: "", observacion: "" });
      const response = await api.get(`/Cajas/sesion/${sesionSeleccionada.id}/resumen`);
      setResumen(response.data);
      await cargarTodo();
    } catch (err) {
      console.error(err);
      setError(obtenerMensajeError(err, tipoMovimiento === "ingreso" ? "No fue posible registrar el ingreso." : "No fue posible registrar el retiro."));
    } finally {
      setProcesando(false);
    }
  };

  const prepararCierre = async (caja) => {
    const sesion = sesiones[caja.id];
    if (!sesion) return;
    setModalActivo("cerrar");
    setCajaSeleccionada(caja);
    setSesionSeleccionada(sesion);
    setMontoContado("");
    setResumen(null);
    setError("");
    setMensaje("");
    try {
      const response = await api.get(`/Cajas/sesion/${sesion.id}/resumen`);
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
      const response = await api.post(`/Cajas/${sesionSeleccionada.id}/cerrar`, {
        montoContado: monto,
      });
      setMensaje(`Caja cerrada correctamente. Diferencia: ${moneda(response.data?.diferencia || 0)}`);
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

  const cerrarModal = () => {
    if (procesando) return;
    setModalActivo(null);
    setCajaSeleccionada(null);
    setSesionSeleccionada(null);
    setResumen(null);
    setError("");
  };

  return (
    <AppLayout>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <div className="text-secondary small mb-1">Operación</div>
          <h2 className="fw-bold mb-1">Cajas</h2>
          <p className="text-secondary mb-0">Controla aperturas, efectivo, movimientos y cierres por sucursal.</p>
        </div>
        <button type="button" className="btn btn-outline-dark" onClick={cargarTodo} disabled={cargando || procesando}>
          <i className="bi bi-arrow-clockwise me-2"></i>Actualizar
        </button>
      </div>

      {error && !modalActivo && <div className="alert alert-danger"><i className="bi bi-exclamation-triangle me-2"></i>{error}</div>}
      {mensaje && <div className="alert alert-success d-flex justify-content-between align-items-center"><div><i className="bi bi-check-circle me-2"></i>{mensaje}</div><button className="btn-close" onClick={() => setMensaje("")} /></div>}

      <div className="row g-3 mb-4">
        {[
          ["Cajas activas", cajasActivas, "bi-cash-register", "text-primary"],
          ["Abiertas ahora", cajasAbiertas, "bi-unlock", "text-success"],
          ["Cerradas", cajasCerradas, "bi-lock", "text-secondary"],
          ["Efectivo inicial abierto", moneda(efectivoInicialAbierto), "bi-cash-stack", "text-success"],
        ].map(([titulo, valor, icono, clase]) => (
          <div className="col-6 col-xl-3" key={titulo}>
            <div className="card border-0 shadow-sm h-100"><div className="card-body p-3 p-md-4 d-flex justify-content-between align-items-center gap-2"><div><div className="text-secondary small mb-1">{titulo}</div><div className="fs-4 fw-bold">{valor}</div></div><i className={`bi ${icono} fs-2 ${clase}`}></i></div></div>
          </div>
        ))}
      </div>

      {puedeCrearCaja && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <div className="d-flex gap-3 align-items-start mb-3">
              <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" style={{ width: 42, height: 42 }}><i className="bi bi-plus-circle fs-5"></i></div>
              <div><h5 className="fw-bold mb-1">Crear nueva caja</h5><div className="text-secondary small">Cada caja pertenece a una sucursal y puede tener una sesión abierta a la vez.</div></div>
            </div>
            <form onSubmit={crearCaja}>
              <div className="row g-3 align-items-end">
                <div className="col-md-5"><label className="form-label fw-semibold">Sucursal</label><select className="form-select" value={nuevaCaja.sucursalId} onChange={(e) => setNuevaCaja({ ...nuevaCaja, sucursalId: e.target.value })}><option value="">Selecciona una sucursal</option>{sucursalesActivas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></div>
                <div className="col-md-5"><label className="form-label fw-semibold">Nombre de la caja</label><input className="form-control" placeholder="Ej. Caja Principal" value={nuevaCaja.nombre} onChange={(e) => setNuevaCaja({ ...nuevaCaja, nombre: e.target.value })} /></div>
                <div className="col-md-2 d-grid"><button className="btn btn-dark" type="submit" disabled={procesando}><i className="bi bi-plus-lg me-2"></i>Crear</button></div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4 border-bottom">
          <div className="row g-2">
            <div className="col-lg-6"><div className="input-group"><span className="input-group-text bg-white"><i className="bi bi-search"></i></span><input className="form-control" placeholder="Buscar caja o sucursal..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></div></div>
            <div className="col-6 col-lg-3"><select className="form-select" value={filtroSucursal} onChange={(e) => setFiltroSucursal(e.target.value)}><option value="TODAS">Todas las sucursales</option>{sucursales.map((sucursal) => <option key={sucursal.id} value={sucursal.id}>{sucursal.nombre}</option>)}</select></div>
            <div className="col-6 col-lg-3"><select className="form-select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}><option value="TODAS">Todos los estados</option><option value="ABIERTAS">Abiertas</option><option value="CERRADAS">Cerradas</option><option value="INACTIVAS">Inactivas</option></select></div>
          </div>
          <div className="small text-secondary mt-3">{cajasFiltradas.length} de {cajas.length} cajas visibles</div>
        </div>

        <div className="card-body p-0">
          {cargando ? (
            <div className="text-center py-5"><div className="spinner-border"></div><p className="text-secondary mt-3 mb-0">Cargando cajas...</p></div>
          ) : cajasFiltradas.length === 0 ? (
            <div className="text-center py-5 px-3"><i className="bi bi-cash-stack fs-1 text-secondary"></i><h5 className="mt-3">No encontramos cajas</h5><p className="text-secondary mb-0">Ajusta los filtros o crea una nueva caja.</p></div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light"><tr><th className="ps-4">Caja</th><th>Sucursal</th><th>Estado</th><th>Apertura</th><th className="text-end">Monto inicial</th><th className="text-end pe-4">Acciones</th></tr></thead>
                <tbody>
                  {cajasFiltradas.map((caja) => {
                    const sesion = sesiones[caja.id];
                    return (
                      <tr key={caja.id}>
                        <td className="ps-4"><div className="fw-semibold">{caja.nombre}</div><small className="text-secondary">ID #{caja.id}</small></td>
                        <td><i className="bi bi-shop me-2 text-secondary"></i>{caja.sucursal}</td>
                        <td><span className={`badge ${!caja.activa ? "text-bg-secondary" : sesion ? "text-bg-success" : "bg-light text-dark border"}`}>{!caja.activa ? "INACTIVA" : sesion ? "ABIERTA" : "CERRADA"}</span></td>
                        <td>{sesion ? fechaHora(sesion.fechaApertura) : "-"}</td>
                        <td className="text-end">{sesion ? moneda(sesion.montoApertura) : "-"}</td>
                        <td className="text-end pe-4">
                          <div className="d-inline-flex flex-wrap justify-content-end gap-2">
                            {!sesion ? (
                              <button type="button" className="btn btn-sm btn-dark" onClick={() => prepararApertura(caja)} disabled={!caja.activa}><i className="bi bi-unlock me-1"></i>Abrir</button>
                            ) : (
                              <>
                                <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => cargarResumen(caja)}><i className="bi bi-receipt me-1"></i>Resumen</button>
                                <button type="button" className="btn btn-sm btn-outline-success" onClick={() => prepararMovimiento(caja, "ingreso")}><i className="bi bi-plus-circle me-1"></i>Ingreso</button>
                                <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => prepararMovimiento(caja, "retiro")}><i className="bi bi-dash-circle me-1"></i>Retiro</button>
                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => prepararCierre(caja)}><i className="bi bi-lock me-1"></i>Cerrar</button>
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
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,.5)" }}><div className="modal-dialog modal-dialog-centered"><div className="modal-content border-0 shadow"><form onSubmit={abrirCaja}><div className="modal-header"><div><h5 className="modal-title fw-bold">Abrir caja</h5><small className="text-secondary">{cajaSeleccionada?.nombre} · {cajaSeleccionada?.sucursal}</small></div><button type="button" className="btn-close" onClick={cerrarModal} disabled={procesando}></button></div><div className="modal-body">{error && <div className="alert alert-danger py-2">{error}</div>}<label className="form-label fw-semibold">Monto inicial de efectivo</label><div className="input-group input-group-lg"><span className="input-group-text">₡</span><input type="number" min="0" step="0.01" className="form-control" value={montoApertura} onChange={(e) => setMontoApertura(e.target.value)} required autoFocus /></div><div className="form-text mt-2">Este monto será la base para calcular el efectivo esperado al cierre.</div></div><div className="modal-footer"><button type="button" className="btn btn-light" onClick={cerrarModal} disabled={procesando}>Cancelar</button><button type="submit" className="btn btn-dark" disabled={procesando}>{procesando ? "Abriendo..." : "Abrir caja"}</button></div></form></div></div></div>
      )}

      {modalActivo === "movimiento" && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,.5)" }}><div className="modal-dialog modal-dialog-centered"><div className="modal-content border-0 shadow"><form onSubmit={registrarMovimiento}><div className="modal-header"><div><h5 className="modal-title fw-bold">{tipoMovimiento === "ingreso" ? "Registrar ingreso" : "Registrar retiro"}</h5><small className="text-secondary">{cajaSeleccionada?.nombre}</small></div><button type="button" className="btn-close" onClick={cerrarModal} disabled={procesando}></button></div><div className="modal-body">{error && <div className="alert alert-danger py-2">{error}</div>}{resumen?.resumen && <div className="alert alert-light border">Efectivo esperado actualmente: <strong>{moneda(resumen.resumen.montoEsperado)}</strong></div>}<div className="mb-3"><label className="form-label fw-semibold">Monto</label><div className="input-group input-group-lg"><span className="input-group-text">₡</span><input type="number" min="0.01" step="0.01" className="form-control" value={movimiento.monto} onChange={(e) => setMovimiento({ ...movimiento, monto: e.target.value })} required autoFocus /></div></div><div className="mb-3"><label className="form-label fw-semibold">Referencia</label><input className="form-control" placeholder="Ej. Fondo adicional, pago proveedor..." value={movimiento.referencia} onChange={(e) => setMovimiento({ ...movimiento, referencia: e.target.value })} /></div><div><label className="form-label fw-semibold">Observación</label><textarea className="form-control" rows="3" value={movimiento.observacion} onChange={(e) => setMovimiento({ ...movimiento, observacion: e.target.value })}></textarea></div></div><div className="modal-footer"><button type="button" className="btn btn-light" onClick={cerrarModal} disabled={procesando}>Cancelar</button><button type="submit" className={tipoMovimiento === "ingreso" ? "btn btn-success" : "btn btn-warning"} disabled={procesando}>Registrar {tipoMovimiento}</button></div></form></div></div></div>
      )}

      {modalActivo === "cerrar" && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,.5)" }}><div className="modal-dialog modal-dialog-centered"><div className="modal-content border-0 shadow"><form onSubmit={cerrarCaja}><div className="modal-header"><div><h5 className="modal-title fw-bold">Cerrar caja</h5><small className="text-secondary">{cajaSeleccionada?.nombre}</small></div><button type="button" className="btn-close" onClick={cerrarModal} disabled={procesando}></button></div><div className="modal-body">{error && <div className="alert alert-danger py-2">{error}</div>}{resumen?.resumen && <div className="card bg-light border-0 mb-3"><div className="card-body"><div className="d-flex justify-content-between mb-2"><span>Monto apertura</span><strong>{moneda(resumen.resumen.montoApertura)}</strong></div><div className="d-flex justify-content-between mb-2"><span>Ventas efectivo</span><strong>{moneda(resumen.resumen.ventasEfectivo)}</strong></div><div className="d-flex justify-content-between border-top pt-2"><span>Efectivo esperado</span><strong>{moneda(resumen.resumen.montoEsperado)}</strong></div></div></div>}<label className="form-label fw-semibold">Efectivo contado físicamente</label><div className="input-group input-group-lg"><span className="input-group-text">₡</span><input type="number" min="0" step="0.01" className="form-control" value={montoContado} onChange={(e) => setMontoContado(e.target.value)} required autoFocus /></div>{montoContado !== "" && resumen?.resumen && <div className={`rounded-3 p-3 mt-3 ${Number(montoContado) - Number(resumen.resumen.montoEsperado) === 0 ? "bg-success-subtle" : "bg-warning-subtle"}`}><div className="d-flex justify-content-between"><span className="fw-semibold">Diferencia estimada</span><strong>{moneda(Number(montoContado) - Number(resumen.resumen.montoEsperado))}</strong></div></div>}</div><div className="modal-footer"><button type="button" className="btn btn-light" onClick={cerrarModal} disabled={procesando}>Cancelar</button><button type="submit" className="btn btn-danger" disabled={procesando}>{procesando ? "Cerrando..." : "Cerrar caja"}</button></div></form></div></div></div>
      )}

      {modalActivo === "resumen" && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,.5)" }}><div className="modal-dialog modal-xl modal-dialog-scrollable"><div className="modal-content border-0 shadow"><div className="modal-header"><div><h5 className="modal-title fw-bold">Resumen de caja</h5><small className="text-secondary">{cajaSeleccionada?.nombre}</small></div><button type="button" className="btn-close" onClick={cerrarModal} disabled={procesando}></button></div><div className="modal-body p-4">{!resumen ? <div className="text-center py-5"><div className="spinner-border"></div></div> : <><div className="row g-3 mb-4">{[["Apertura", resumen.resumen.montoApertura],["Ventas efectivo", resumen.resumen.ventasEfectivo],["Ingresos manuales", resumen.resumen.ingresosManuales],["Efectivo esperado", resumen.resumen.montoEsperado]].map(([titulo, valor]) => <div className="col-6 col-xl-3" key={titulo}><div className="card bg-light border-0 h-100"><div className="card-body"><small className="text-secondary">{titulo}</small><h5 className="fw-bold mb-0">{moneda(valor)}</h5></div></div></div>)}</div><div className="mb-4 text-secondary"><strong className="text-dark">Sucursal:</strong> {resumen.sesion.sucursal} · <strong className="text-dark">Abierta por:</strong> {resumen.sesion.usuarioApertura} · <strong className="text-dark">Fecha:</strong> {fechaHora(resumen.sesion.fechaApertura)}</div><h6 className="fw-bold mb-3">Movimientos</h6>{resumen.movimientos?.length ? <div className="table-responsive"><table className="table align-middle"><thead className="table-light"><tr><th>Fecha</th><th>Tipo</th><th>Usuario</th><th>Referencia</th><th>Observación</th><th className="text-end">Monto</th></tr></thead><tbody>{resumen.movimientos.map((item) => <tr key={item.id}><td>{fechaHora(item.fecha)}</td><td>{item.tipo}</td><td>{item.usuario}</td><td>{item.referencia || "-"}</td><td>{item.observacion || "-"}</td><td className={Number(item.monto) < 0 ? "text-end fw-semibold text-danger" : "text-end fw-semibold text-success"}>{moneda(item.monto)}</td></tr>)}</tbody></table></div> : <div className="text-center py-4 text-secondary">Todavía no hay movimientos en esta sesión.</div>}</>}</div></div></div></div>
      )}
    </AppLayout>
  );
}

export default Cajas;
