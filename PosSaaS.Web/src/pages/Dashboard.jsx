import { useEffect, useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import api from "../services/api";

function Dashboard() {
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

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

      const [ventasResponse, productosResponse, clientesResponse] =
        await Promise.all([
          api.get("/Ventas"),
          api.get("/Productos"),
          api.get("/Clientes"),
        ]);

      setVentas(ventasResponse.data || []);
      setProductos(productosResponse.data || []);
      setClientes(clientesResponse.data || []);
    } catch (err) {
      console.error(err);

      setError(
        "No fue posible cargar la información del dashboard."
      );
    } finally {
      setCargando(false);
    }
  };

  const moneda = (valor) => {
    return new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      maximumFractionDigits: 0,
    }).format(Number(valor) || 0);
  };

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

  const ventasHoy = useMemo(() => {
    return ventas.filter(
      (venta) =>
        esHoy(venta.fecha) &&
        venta.estado === "COMPLETADA"
    );
  }, [ventas]);

  const totalVentasHoy = useMemo(() => {
    return ventasHoy.reduce(
      (total, venta) =>
        total + Number(venta.total || 0),
      0
    );
  }, [ventasHoy]);

  const productosActivos = useMemo(() => {
    return productos.filter(
      (producto) => producto.activo
    ).length;
  }, [productos]);

  const clientesActivos = useMemo(() => {
    return clientes.filter(
      (cliente) => cliente.activo
    ).length;
  }, [clientes]);

  const ventasRecientes = useMemo(() => {
    return ventas.slice(0, 8);
  }, [ventas]);

  const promedioVentaHoy =
    ventasHoy.length > 0
      ? totalVentasHoy / ventasHoy.length
      : 0;

  return (
    <AppLayout>
      <div className="card border-0 shadow-sm mb-4 overflow-hidden">
        <div className="card-body p-4 p-lg-5">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-4">
            <div className="d-flex align-items-center gap-3">
              <div
                className="d-flex align-items-center justify-content-center bg-dark text-white rounded-4 flex-shrink-0"
                style={{
                  width: "64px",
                  height: "64px",
                  fontSize: "28px",
                }}
              >
                <i className="bi bi-shop"></i>
              </div>

              <div>
                <span className="text-secondary small text-uppercase fw-semibold">
                  Panel de control
                </span>

                <h2 className="fw-bold mb-1 mt-1">
                  {nombreComercial}
                </h2>

                <p className="text-secondary mb-0">
                  Resumen general y actividad de tu negocio.
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
        <div
          className="alert alert-danger"
          role="alert"
        >
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {cargando ? (
        <div className="py-5 text-center">
          <div
            className="spinner-border"
            role="status"
          ></div>

          <p className="text-secondary mt-3 mb-0">
            Cargando dashboard...
          </p>
        </div>
      ) : (
        <>
          <div className="row g-4 mb-4">
            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p className="text-secondary mb-2">Ventas de hoy</p>
                      <h3 className="fw-bold mb-1">{moneda(totalVentasHoy)}</h3>
                      <small className="text-secondary">Total vendido hoy</small>
                    </div>
                    <div className="fs-2"><i className="bi bi-cash-coin"></i></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p className="text-secondary mb-2">Transacciones</p>
                      <h3 className="fw-bold mb-1">{ventasHoy.length}</h3>
                      <small className="text-secondary">Ventas completadas hoy</small>
                    </div>
                    <div className="fs-2"><i className="bi bi-receipt"></i></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p className="text-secondary mb-2">Productos</p>
                      <h3 className="fw-bold mb-1">{productosActivos}</h3>
                      <small className="text-secondary">Productos activos</small>
                    </div>
                    <div className="fs-2"><i className="bi bi-box-seam"></i></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p className="text-secondary mb-2">Clientes</p>
                      <h3 className="fw-bold mb-1">{clientesActivos}</h3>
                      <small className="text-secondary">Clientes activos</small>
                    </div>
                    <div className="fs-2"><i className="bi bi-people"></i></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-lg-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <p className="text-secondary mb-2">Ticket promedio de hoy</p>
                  <h3 className="fw-bold mb-0">{moneda(promedioVentaHoy)}</h3>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <p className="text-secondary mb-2">Ventas históricas</p>
                  <h3 className="fw-bold mb-0">{ventas.length}</h3>
                </div>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <p className="text-secondary mb-2">Estado del sistema</p>
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge text-bg-success" style={{ fontSize: "0.85rem" }}>Operativo</span>
                    <span className="text-secondary">Datos actualizados</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 p-4 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="fw-bold mb-1">Ventas recientes</h5>
                  <p className="text-secondary mb-0">Últimas transacciones registradas.</p>
                </div>
                <i className="bi bi-clock-history fs-4"></i>
              </div>
            </div>

            <div className="card-body p-4">
              {ventasRecientes.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-receipt fs-1 text-secondary"></i>
                  <h5 className="mt-3">Todavía no hay ventas</h5>
                  <p className="text-secondary mb-0">
                    Las ventas aparecerán aquí cuando empieces a utilizar el punto de venta.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>Venta</th><th>Fecha</th><th>Cliente</th><th>Sucursal</th><th>Caja</th><th>Usuario</th>
                        <th className="text-end">Total</th><th className="text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ventasRecientes.map((venta) => (
                        <tr key={venta.id}>
                          <td><span className="fw-semibold">{venta.numeroVenta}</span></td>
                          <td>{fechaHora(venta.fecha)}</td>
                          <td>{venta.cliente || <span className="text-secondary">Consumidor final</span>}</td>
                          <td>{venta.sucursal}</td><td>{venta.caja}</td><td>{venta.usuario}</td>
                          <td className="text-end fw-semibold">{moneda(venta.total)}</td>
                          <td className="text-center">
                            <span className={venta.estado === "COMPLETADA" ? "badge text-bg-success" : "badge text-bg-secondary"}>
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