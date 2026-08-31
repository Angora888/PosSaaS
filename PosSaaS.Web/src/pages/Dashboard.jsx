import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../layouts/AppLayout";
import api from "../services/api";

function Dashboard() {
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [sesionesAbiertas, setSesionesAbiertas] = useState([]);
  const [inventario, setInventario] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const rol = localStorage.getItem("rol") || "Cajero";
  const esAdmin = rol === "Admin";
  const esSupervisor = rol === "Supervisor";
  const puedeGestionarInventario = esAdmin || esSupervisor;
  const puedeVerReportes = esAdmin || esSupervisor;

  const nombreComercial =
    localStorage.getItem("nombreComercial") ||
    localStorage.getItem("comercio") ||
    "Mi negocio";

  useEffect(() => {
    cargarDashboard();
  }, []);

  const cargarDashboard = async () => {
    try {
      setCargando(true);
      setError("");

      const [ventasResponse, productosResponse, clientesResponse, cajasResponse] =
        await Promise.all([
          api.get("/Ventas"),
          api.get("/Productos"),
          api.get("/Clientes"),
          api.get("/Cajas"),
        ]);

      const ventasData = ventasResponse.data || [];
      const productosData = productosResponse.data || [];
      const clientesData = clientesResponse.data || [];
      const cajasData = cajasResponse.data || [];

      setVentas(ventasData);
      setProductos(productosData);
      setClientes(clientesData);
      setCajas(cajasData);

      const cajasActivas = cajasData.filter((caja) => caja.activa);
      const sesiones = await Promise.all(
        cajasActivas.map(async (caja) => {
          try {
            const response = await api.get(`/Cajas/sesion-abierta/${caja.id}`);
            return {
              ...response.data,
              sucursal: caja.sucursal,
              cajaNombre: caja.nombre,
            };
          } catch (err) {
            if (err.response?.status !== 404) {
              console.error(`No se pudo consultar la caja ${caja.id}`, err);
            }
            return null;
          }
        })
      );

      setSesionesAbiertas(sesiones.filter(Boolean));

      const sucursalesIds = [
        ...new Set(cajasData.map((caja) => caja.sucursalId).filter(Boolean)),
      ];

      const inventarios = await Promise.all(
        sucursalesIds.map(async (sucursalId) => {
          try {
            const response = await api.get(`/Inventario/sucursal/${sucursalId}`);
            const sucursalNombre =
              cajasData.find((caja) => Number(caja.sucursalId) === Number(sucursalId))
                ?.sucursal || "Sucursal";

            return (response.data || []).map((item) => ({
              ...item,
              sucursalId,
              sucursal: sucursalNombre,
            }));
          } catch (err) {
            console.error(`No se pudo cargar inventario de ${sucursalId}`, err);
            return [];
          }
        })
      );

      setInventario(inventarios.flat());
    } catch (err) {
      console.error(err);
      setError("No fue posible cargar la información del dashboard.");
    } finally {
      setCargando(false);
    }
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

  const esHoy = (fecha) => {
    if (!fecha) return false;

    const fechaVenta = new Date(fecha);
    const hoy = new Date();

    return (
      fechaVenta.getFullYear() === hoy.getFullYear() &&
      fechaVenta.getMonth() === hoy.getMonth() &&
      fechaVenta.getDate() === hoy.getDate()
    );
  };

  const ventasHoy = useMemo(
    () =>
      ventas.filter(
        (venta) => esHoy(venta.fecha) && venta.estado === "COMPLETADA"
      ),
    [ventas]
  );

  const totalVentasHoy = useMemo(
    () => ventasHoy.reduce((total, venta) => total + Number(venta.total || 0), 0),
    [ventasHoy]
  );

  const promedioVentaHoy =
    ventasHoy.length > 0 ? totalVentasHoy / ventasHoy.length : 0;

  const productosActivos = useMemo(
    () => productos.filter((producto) => producto.activo).length,
    [productos]
  );

  const clientesActivos = useMemo(
    () => clientes.filter((cliente) => cliente.activo).length,
    [clientes]
  );

  const stockBajo = useMemo(
    () =>
      inventario
        .filter((item) => item.stockBajo)
        .sort((a, b) => Number(a.cantidad) - Number(b.cantidad)),
    [inventario]
  );

  const ventasRecientes = useMemo(
    () =>
      [...ventas]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 6),
    [ventas]
  );

  const accesosRapidos = [
    {
      titulo: "Nueva venta",
      descripcion: "Abrir el punto de venta",
      icono: "bi-cart-check",
      ruta: "/pos",
      visible: true,
    },
    {
      titulo: "Cajas",
      descripcion: "Abrir, consultar o cerrar caja",
      icono: "bi-cash-register",
      ruta: "/cajas",
      visible: true,
    },
    {
      titulo: "Clientes",
      descripcion: "Buscar o registrar clientes",
      icono: "bi-people",
      ruta: "/clientes",
      visible: true,
    },
    {
      titulo: "Inventario",
      descripcion: "Revisar existencias y movimientos",
      icono: "bi-boxes",
      ruta: "/inventario",
      visible: puedeGestionarInventario,
    },
    {
      titulo: "Reportes",
      descripcion: "Analizar ventas y rendimiento",
      icono: "bi-bar-chart-line",
      ruta: "/reportes",
      visible: puedeVerReportes,
    },
  ].filter((item) => item.visible);

  const claseEstado = (estado) => {
    if (estado === "COMPLETADA") return "badge text-bg-success";
    if (estado === "ANULADA") return "badge text-bg-danger";
    return "badge text-bg-secondary";
  };

  return (
    <AppLayout>
      <div className="card border-0 shadow-sm mb-4 overflow-hidden">
        <div className="card-body p-4 p-lg-5">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-4">
            <div className="d-flex align-items-center gap-3">
              <div
                className="d-flex align-items-center justify-content-center bg-dark text-white rounded-4 flex-shrink-0"
                style={{ width: "64px", height: "64px", fontSize: "28px" }}
              >
                <i className="bi bi-shop"></i>
              </div>

              <div>
                <span className="text-secondary small text-uppercase fw-semibold">
                  Panel de control
                </span>
                <h2 className="fw-bold mb-1 mt-1">{nombreComercial}</h2>
                <p className="text-secondary mb-0">
                  Resumen operativo del negocio en tiempo real.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline-dark"
              onClick={cargarDashboard}
              disabled={cargando}
            >
              <i className="bi bi-arrow-clockwise me-2"></i>
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {cargando ? (
        <div className="py-5 text-center">
          <div className="spinner-border" role="status"></div>
          <p className="text-secondary mt-3 mb-0">Cargando dashboard...</p>
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start gap-3">
                    <div>
                      <p className="text-secondary mb-2">Ventas de hoy</p>
                      <h3 className="fw-bold mb-1">{moneda(totalVentasHoy)}</h3>
                      <small className="text-secondary">Total completado hoy</small>
                    </div>
                    <i className="bi bi-cash-coin fs-2"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start gap-3">
                    <div>
                      <p className="text-secondary mb-2">Transacciones hoy</p>
                      <h3 className="fw-bold mb-1">{ventasHoy.length}</h3>
                      <small className="text-secondary">Ventas completadas</small>
                    </div>
                    <i className="bi bi-receipt fs-2"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start gap-3">
                    <div>
                      <p className="text-secondary mb-2">Ticket promedio</p>
                      <h3 className="fw-bold mb-1">{moneda(promedioVentaHoy)}</h3>
                      <small className="text-secondary">Promedio de hoy</small>
                    </div>
                    <i className="bi bi-graph-up-arrow fs-2"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start gap-3">
                    <div>
                      <p className="text-secondary mb-2">Cajas abiertas</p>
                      <h3 className="fw-bold mb-1">{sesionesAbiertas.length}</h3>
                      <small className="text-secondary">
                        de {cajas.filter((caja) => caja.activa).length} cajas activas
                      </small>
                    </div>
                    <i className="bi bi-cash-register fs-2"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-xl-7">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white border-0 p-4 pb-2">
                  <div className="d-flex justify-content-between align-items-center gap-3">
                    <div>
                      <h5 className="fw-bold mb-1">Accesos rápidos</h5>
                      <p className="text-secondary mb-0">
                        Las tareas más comunes a un toque.
                      </p>
                    </div>
                    <i className="bi bi-lightning-charge fs-4"></i>
                  </div>
                </div>

                <div className="card-body p-4">
                  <div className="row g-3">
                    {accesosRapidos.map((acceso) => (
                      <div className="col-md-6" key={acceso.ruta}>
                        <Link
                          to={acceso.ruta}
                          className="text-decoration-none text-dark"
                        >
                          <div className="border rounded-4 p-3 h-100 d-flex align-items-center gap-3">
                            <div
                              className="d-flex align-items-center justify-content-center rounded-3 bg-light flex-shrink-0"
                              style={{ width: "46px", height: "46px" }}
                            >
                              <i className={`bi ${acceso.icono} fs-5`}></i>
                            </div>
                            <div>
                              <div className="fw-bold">{acceso.titulo}</div>
                              <small className="text-secondary">
                                {acceso.descripcion}
                              </small>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xl-5">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-white border-0 p-4 pb-2">
                  <div className="d-flex justify-content-between align-items-center gap-3">
                    <div>
                      <h5 className="fw-bold mb-1">Estado operativo</h5>
                      <p className="text-secondary mb-0">Alertas que requieren atención.</p>
                    </div>
                    <i className="bi bi-activity fs-4"></i>
                  </div>
                </div>

                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                      <div className="fw-semibold">Stock bajo</div>
                      <small className="text-secondary">Productos en mínimo o menos</small>
                    </div>
                    <span className={`badge ${stockBajo.length > 0 ? "text-bg-warning" : "text-bg-success"}`}>
                      {stockBajo.length}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                      <div className="fw-semibold">Cajas abiertas</div>
                      <small className="text-secondary">Sesiones actualmente activas</small>
                    </div>
                    <span className={`badge ${sesionesAbiertas.length > 0 ? "text-bg-success" : "text-bg-secondary"}`}>
                      {sesionesAbiertas.length}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <div>
                      <div className="fw-semibold">Productos activos</div>
                      <small className="text-secondary">Catálogo disponible</small>
                    </div>
                    <strong>{productosActivos}</strong>
                  </div>

                  <div className="d-flex justify-content-between align-items-center py-2">
                    <div>
                      <div className="fw-semibold">Clientes activos</div>
                      <small className="text-secondary">Base de clientes</small>
                    </div>
                    <strong>{clientesActivos}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {stockBajo.length > 0 && (
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-header bg-white border-0 p-4 pb-2">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                  <div>
                    <h5 className="fw-bold mb-1">Productos con stock bajo</h5>
                    <p className="text-secondary mb-0">
                      Prioriza estos productos antes de quedarte sin existencias.
                    </p>
                  </div>
                  {puedeGestionarInventario && (
                    <Link to="/inventario" className="btn btn-sm btn-outline-dark">
                      Ver inventario
                    </Link>
                  )}
                </div>
              </div>

              <div className="card-body p-4 pt-3">
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Producto</th>
                        <th>Sucursal</th>
                        <th className="text-end">Disponible</th>
                        <th className="text-end">Mínimo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockBajo.slice(0, 6).map((item) => (
                        <tr key={`${item.sucursalId}-${item.productoId}`}>
                          <td className="fw-semibold">{item.producto}</td>
                          <td>{item.sucursal}</td>
                          <td className="text-end">
                            <span className="badge text-bg-warning">
                              {item.cantidad}
                            </span>
                          </td>
                          <td className="text-end">{item.stockMinimo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 p-4 pb-2">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div>
                  <h5 className="fw-bold mb-1">Ventas recientes</h5>
                  <p className="text-secondary mb-0">
                    Últimas transacciones registradas.
                  </p>
                </div>
                <Link to="/ventas" className="btn btn-sm btn-outline-dark">
                  Ver todas
                </Link>
              </div>
            </div>

            <div className="card-body p-4 pt-3">
              {ventasRecientes.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-receipt fs-1 text-secondary"></i>
                  <h5 className="mt-3">Todavía no hay ventas</h5>
                  <p className="text-secondary mb-0">
                    Las ventas aparecerán aquí cuando uses el punto de venta.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Venta</th>
                        <th>Fecha</th>
                        <th>Cliente</th>
                        <th>Sucursal</th>
                        <th className="text-end">Total</th>
                        <th className="text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasRecientes.map((venta) => (
                        <tr key={venta.id}>
                          <td className="fw-semibold">{venta.numeroVenta}</td>
                          <td>{fechaHora(venta.fecha)}</td>
                          <td>
                            {venta.cliente || (
                              <span className="text-secondary">Consumidor final</span>
                            )}
                          </td>
                          <td>{venta.sucursal}</td>
                          <td className="text-end fw-semibold">
                            {moneda(venta.total)}
                          </td>
                          <td className="text-center">
                            <span className={claseEstado(venta.estado)}>
                              {venta.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

export default Dashboard;