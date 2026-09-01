import { useEffect, useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import api from "../services/api";

function SuperAdmin() {
  const [resumen, setResumen] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [buscar, setBuscar] = useState("");
  const [estado, setEstado] = useState("TODOS");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [detalle, setDetalle] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const moneda = (valor) =>
    new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      maximumFractionDigits: 0,
    }).format(Number(valor) || 0);

  const fecha = (valor) =>
    valor
      ? new Intl.DateTimeFormat("es-CR", { dateStyle: "medium" }).format(
          new Date(valor)
        )
      : "-";

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
      const [resumenResponse, tenantsResponse] = await Promise.all([
        api.get("/Tenants/plataforma/resumen"),
        api.get("/Tenants/plataforma"),
      ]);
      setResumen(resumenResponse.data);
      setTenants(tenantsResponse.data || []);
    } catch (err) {
      console.error(err);
      setError(obtenerError(err, "No fue posible cargar la plataforma."));
    } finally {
      setCargando(false);
    }
  };

  const filtrados = useMemo(() => {
    const texto = buscar.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const coincideTexto =
        !texto ||
        tenant.nombre?.toLowerCase().includes(texto) ||
        tenant.nombreComercial?.toLowerCase().includes(texto) ||
        tenant.identificacion?.toLowerCase().includes(texto) ||
        tenant.email?.toLowerCase().includes(texto);
      const coincideEstado =
        estado === "TODOS" ||
        (estado === "ACTIVOS" && tenant.activo) ||
        (estado === "INACTIVOS" && !tenant.activo);
      return coincideTexto && coincideEstado;
    });
  }, [tenants, buscar, estado]);

  const abrirDetalle = async (tenant) => {
    try {
      setProcesando(true);
      setError("");
      const response = await api.get(`/Tenants/plataforma/${tenant.id}`);
      setDetalle(response.data);
    } catch (err) {
      console.error(err);
      setError(obtenerError(err, "No fue posible cargar el comercio."));
    } finally {
      setProcesando(false);
    }
  };

  const cambiarEstado = async (tenant) => {
    const nuevoEstado = !tenant.activo;
    const accion = nuevoEstado ? "activar" : "suspender";
    if (!window.confirm(`¿Seguro que deseas ${accion} ${tenant.nombreComercial || tenant.nombre}?`)) return;

    try {
      setProcesando(true);
      setError("");
      setMensaje("");
      await api.patch(`/Tenants/plataforma/${tenant.id}/estado?activo=${nuevoEstado}`);
      setMensaje(nuevoEstado ? "Comercio activado correctamente." : "Comercio suspendido correctamente.");
      if (detalle?.id === tenant.id) setDetalle({ ...detalle, activo: nuevoEstado });
      await cargarDatos();
    } catch (err) {
      console.error(err);
      setError(obtenerError(err, "No fue posible cambiar el estado del comercio."));
    } finally {
      setProcesando(false);
    }
  };

  return (
    <AppLayout>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <span className="badge text-bg-dark mb-2">SUPERADMIN</span>
          <h2 className="fw-bold mb-1">Administración de la plataforma</h2>
          <p className="text-secondary mb-0">Vista global de los comercios registrados en POS SaaS.</p>
        </div>
        <button className="btn btn-outline-dark" onClick={cargarDatos} disabled={cargando || procesando}>
          <i className="bi bi-arrow-clockwise me-2"></i>Actualizar
        </button>
      </div>

      {error && <div className="alert alert-danger"><i className="bi bi-exclamation-triangle me-2"></i>{error}</div>}
      {mensaje && <div className="alert alert-success"><i className="bi bi-check-circle me-2"></i>{mensaje}</div>}

      {cargando ? (
        <div className="text-center py-5"><div className="spinner-border"></div><p className="text-secondary mt-3">Cargando plataforma...</p></div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            {[
              ["Comercios", resumen?.tenants, "bi-buildings"],
              ["Activos", resumen?.tenantsActivos, "bi-check-circle"],
              ["Nuevos este mes", resumen?.nuevosEsteMes, "bi-graph-up-arrow"],
              ["Usuarios", resumen?.usuarios, "bi-people"],
              ["Sucursales", resumen?.sucursales, "bi-shop"],
              ["Ventas este mes", resumen?.ventasEsteMes, "bi-receipt"],
            ].map(([titulo, valor, icono]) => (
              <div className="col-6 col-xl-2" key={titulo}>
                <div className="card border-0 shadow-sm h-100"><div className="card-body p-3">
                  <i className={`bi ${icono} text-secondary fs-4`}></i>
                  <div className="fs-3 fw-bold mt-2">{valor ?? 0}</div>
                  <small className="text-secondary">{titulo}</small>
                </div></div>
              </div>
            ))}
          </div>

          <div className="card border-0 shadow-sm mb-4">
            <div className="card-body p-4 d-flex flex-wrap justify-content-between gap-3 align-items-center">
              <div><small className="text-secondary d-block">Volumen vendido este mes</small><h3 className="fw-bold mb-0">{moneda(resumen?.volumenEsteMes)}</h3></div>
              <div className="text-md-end"><small className="text-secondary d-block">Estado de la plataforma</small><span className="badge text-bg-success mt-1">{resumen?.tenantsActivos || 0} comercios operando</span>{resumen?.tenantsInactivos > 0 && <span className="badge text-bg-secondary ms-2">{resumen.tenantsInactivos} suspendidos</span>}</div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <div className="d-flex flex-wrap justify-content-between gap-3 mb-4">
                <div><h5 className="fw-bold mb-1">Comercios</h5><p className="text-secondary mb-0">Administra los tenants sin mezclar sus datos operativos.</p></div>
                <span className="badge text-bg-light align-self-center">{filtrados.length} resultados</span>
              </div>

              <div className="row g-2 mb-4">
                <div className="col-md-8"><div className="input-group"><span className="input-group-text bg-white"><i className="bi bi-search"></i></span><input className="form-control" placeholder="Buscar comercio, identificación o email..." value={buscar} onChange={(e) => setBuscar(e.target.value)} /></div></div>
                <div className="col-md-4"><select className="form-select" value={estado} onChange={(e) => setEstado(e.target.value)}><option value="TODOS">Todos los estados</option><option value="ACTIVOS">Activos</option><option value="INACTIVOS">Suspendidos</option></select></div>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light"><tr><th>Comercio</th><th>Registro</th><th className="text-center">Sucursales</th><th className="text-center">Usuarios</th><th className="text-end">Ventas</th><th className="text-end">Total vendido</th><th>Estado</th><th className="text-end">Acciones</th></tr></thead>
                  <tbody>
                    {filtrados.length ? filtrados.map((tenant) => (
                      <tr key={tenant.id}>
                        <td><div className="fw-semibold">{tenant.nombreComercial || tenant.nombre}</div><small className="text-secondary">{tenant.identificacion || tenant.email || `Tenant #${tenant.id}`}</small></td>
                        <td>{fecha(tenant.fechaCreacion)}</td>
                        <td className="text-center">{tenant.sucursalesActivas}/{tenant.sucursales}</td>
                        <td className="text-center">{tenant.usuariosActivos}/{tenant.usuarios}</td>
                        <td className="text-end">{tenant.ventas}</td>
                        <td className="text-end fw-semibold">{moneda(tenant.totalVendido)}</td>
                        <td><span className={tenant.activo ? "badge text-bg-success" : "badge text-bg-secondary"}>{tenant.activo ? "ACTIVO" : "SUSPENDIDO"}</span></td>
                        <td className="text-end"><div className="d-flex justify-content-end gap-2"><button className="btn btn-sm btn-outline-dark" onClick={() => abrirDetalle(tenant)}><i className="bi bi-eye"></i></button><button className={tenant.activo ? "btn btn-sm btn-outline-danger" : "btn btn-sm btn-outline-success"} disabled={procesando} onClick={() => cambiarEstado(tenant)}>{tenant.activo ? "Suspender" : "Activar"}</button></div></td>
                      </tr>
                    )) : <tr><td colSpan="8" className="text-center text-secondary py-5">No hay comercios que coincidan con los filtros.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {detalle && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,.5)" }}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable"><div className="modal-content border-0">
            <div className="modal-header"><div><h5 className="modal-title fw-bold">{detalle.nombreComercial || detalle.nombre}</h5><small className="text-secondary">Tenant #{detalle.id} · Registrado {fecha(detalle.fechaCreacion)}</small></div><button className="btn-close" onClick={() => setDetalle(null)}></button></div>
            <div className="modal-body p-4">
              <div className="row g-3 mb-4">
                <div className="col-md-4"><div className="card bg-light border-0 h-100"><div className="card-body"><small className="text-secondary">Identificación</small><div className="fw-semibold">{detalle.identificacion || "-"}</div></div></div></div>
                <div className="col-md-4"><div className="card bg-light border-0 h-100"><div className="card-body"><small className="text-secondary">Email</small><div className="fw-semibold">{detalle.email || "-"}</div></div></div></div>
                <div className="col-md-4"><div className="card bg-light border-0 h-100"><div className="card-body"><small className="text-secondary">Teléfono</small><div className="fw-semibold">{detalle.telefono || "-"}</div></div></div></div>
              </div>
              <h6 className="fw-bold">Sucursales</h6><div className="table-responsive mb-4"><table className="table table-sm align-middle"><thead><tr><th>Nombre</th><th>Teléfono</th><th>Dirección</th><th>Estado</th></tr></thead><tbody>{detalle.sucursales?.length ? detalle.sucursales.map((s) => <tr key={s.id}><td>{s.nombre}</td><td>{s.telefono || "-"}</td><td>{s.direccion || "-"}</td><td><span className={s.activa ? "badge text-bg-success" : "badge text-bg-secondary"}>{s.activa ? "ACTIVA" : "INACTIVA"}</span></td></tr>) : <tr><td colSpan="4" className="text-secondary">Sin sucursales.</td></tr>}</tbody></table></div>
              <h6 className="fw-bold">Usuarios</h6><div className="table-responsive"><table className="table table-sm align-middle"><thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Sucursal</th><th>Estado</th></tr></thead><tbody>{detalle.usuarios?.length ? detalle.usuarios.map((u) => <tr key={u.id}><td>{u.nombre}</td><td>{u.email}</td><td>{u.rol}</td><td>{u.sucursal || "Acceso global"}</td><td><span className={u.activo ? "badge text-bg-success" : "badge text-bg-secondary"}>{u.activo ? "ACTIVO" : "INACTIVO"}</span></td></tr>) : <tr><td colSpan="5" className="text-secondary">Sin usuarios.</td></tr>}</tbody></table></div>
            </div>
            <div className="modal-footer"><button className="btn btn-light" onClick={() => setDetalle(null)}>Cerrar</button></div>
          </div></div>
        </div>
      )}
    </AppLayout>
  );
}

export default SuperAdmin;
