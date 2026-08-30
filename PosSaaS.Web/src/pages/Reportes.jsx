import { useEffect, useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import api from "../services/api";

function Reportes() {
  const hoy = new Date();
  const hace30Dias = new Date();
  hace30Dias.setDate(hoy.getDate() - 29);

  const formatoInput = (fecha) =>
    fecha.toISOString().slice(0, 10);

  const [desde, setDesde] = useState(
    formatoInput(hace30Dias)
  );
  const [hasta, setHasta] = useState(
    formatoInput(hoy)
  );
  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarReporte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarReporte = async () => {
    if (!desde || !hasta) {
      setError("Selecciona ambas fechas.");
      return;
    }

    if (desde > hasta) {
      setError(
        "La fecha inicial no puede ser mayor que la fecha final."
      );
      return;
    }

    try {
      setCargando(true);
      setError("");

      const response = await api.get(
        "/Reportes/ventas",
        {
          params: { desde, hasta },
        }
      );

      setReporte(response.data);
    } catch (err) {
      console.error(err);
      const data = err.response?.data;

      setError(
        typeof data === "string"
          ? data
          : "No fue posible cargar el reporte."
      );
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

  const numero = (valor) =>
    new Intl.NumberFormat("es-CR", {
      maximumFractionDigits: 2,
    }).format(Number(valor) || 0);

  const fechaCorta = (valor) => {
    if (!valor) return "-";

    const fecha = new Date(`${valor.slice(0, 10)}T12:00:00`);
    return new Intl.DateTimeFormat("es-CR", {
      day: "2-digit",
      month: "short",
    }).format(fecha);
  };

  const resumen = reporte?.resumen || {};
  const metodosPago = reporte?.metodosPago || [];
  const productos = reporte?.productosMasVendidos || [];
  const sucursales = reporte?.ventasPorSucursal || [];
  const ventasPorDia = reporte?.ventasPorDia || [];

  const maxMetodo = useMemo(
    () =>
      Math.max(
        ...metodosPago.map((x) => Number(x.total) || 0),
        1
      ),
    [metodosPago]
  );

  const maxProducto = useMemo(
    () =>
      Math.max(
        ...productos.map((x) => Number(x.cantidad) || 0),
        1
      ),
    [productos]
  );

  return (
    <AppLayout>
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Reportes</h2>
          <p className="text-secondary mb-0">
            Analiza ventas, productos, métodos de pago y sucursales.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2 align-items-end">
          <div>
            <label className="form-label small fw-semibold mb-1">
              Desde
            </label>
            <input
              type="date"
              className="form-control"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label small fw-semibold mb-1">
              Hasta
            </label>
            <input
              type="date"
              className="form-control"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn-dark"
            onClick={cargarReporte}
            disabled={cargando}
          >
            <i className="bi bi-funnel me-2"></i>
            Aplicar
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {cargando ? (
        <div className="text-center py-5">
          <div className="spinner-border" />
          <p className="text-secondary mt-3 mb-0">
            Preparando reporte...
          </p>
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            {[
              {
                titulo: "Total vendido",
                valor: moneda(resumen.totalVendido),
                detalle: "Ventas completadas",
                icono: "bi-cash-coin",
              },
              {
                titulo: "Transacciones",
                valor: numero(resumen.cantidadVentas),
                detalle: "Ventas en el período",
                icono: "bi-receipt",
              },
              {
                titulo: "Ticket promedio",
                valor: moneda(resumen.ticketPromedio),
                detalle: "Promedio por venta",
                icono: "bi-graph-up-arrow",
              },
              {
                titulo: "Impuestos",
                valor: moneda(resumen.impuesto),
                detalle: "IVA generado",
                icono: "bi-percent",
              },
            ].map((card) => (
              <div
                className="col-sm-6 col-xl-3"
                key={card.titulo}
              >
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between gap-3">
                      <div>
                        <p className="text-secondary mb-2">
                          {card.titulo}
                        </p>
                        <h3 className="fw-bold mb-1">
                          {card.valor}
                        </h3>
                        <small className="text-secondary">
                          {card.detalle}
                        </small>
                      </div>
                      <i className={`bi ${card.icono} fs-2`}></i>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="row g-4 mb-4">
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-1">
                    Métodos de pago
                  </h5>
                  <p className="text-secondary small mb-4">
                    Distribución de ingresos por forma de pago.
                  </p>

                  {metodosPago.length === 0 ? (
                    <p className="text-secondary mb-0">
                      No hay pagos en este período.
                    </p>
                  ) : (
                    <div className="d-flex flex-column gap-4">
                      {metodosPago.map((metodo) => {
                        const porcentaje =
                          (Number(metodo.total) / maxMetodo) * 100;

                        return (
                          <div key={metodo.metodoPagoId}>
                            <div className="d-flex justify-content-between gap-3 mb-2">
                              <div>
                                <div className="fw-semibold">
                                  {metodo.nombre}
                                </div>
                                <small className="text-secondary">
                                  {metodo.cantidadPagos} pagos
                                </small>
                              </div>
                              <strong>{moneda(metodo.total)}</strong>
                            </div>
                            <div
                              className="progress"
                              style={{ height: 8 }}
                            >
                              <div
                                className="progress-bar bg-dark"
                                style={{ width: `${porcentaje}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-1">
                    Productos más vendidos
                  </h5>
                  <p className="text-secondary small mb-4">
                    Top 10 por unidades vendidas.
                  </p>

                  {productos.length === 0 ? (
                    <p className="text-secondary mb-0">
                      No hay productos vendidos en este período.
                    </p>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {productos.map((producto, index) => {
                        const porcentaje =
                          (Number(producto.cantidad) / maxProducto) * 100;

                        return (
                          <div key={producto.productoId}>
                            <div className="d-flex justify-content-between gap-3 mb-2">
                              <div className="d-flex gap-2">
                                <span className="text-secondary">
                                  #{index + 1}
                                </span>
                                <div>
                                  <div className="fw-semibold">
                                    {producto.producto}
                                  </div>
                                  <small className="text-secondary">
                                    {numero(producto.cantidad)} unidades
                                  </small>
                                </div>
                              </div>
                              <strong>{moneda(producto.total)}</strong>
                            </div>
                            <div
                              className="progress"
                              style={{ height: 8 }}
                            >
                              <div
                                className="progress-bar bg-dark"
                                style={{ width: `${porcentaje}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-lg-7">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-1">
                    Ventas por día
                  </h5>
                  <p className="text-secondary small mb-3">
                    Comportamiento diario dentro del rango seleccionado.
                  </p>

                  {ventasPorDia.length === 0 ? (
                    <div className="text-center py-4 text-secondary">
                      No hay ventas para mostrar.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th className="text-center">Ventas</th>
                            <th className="text-end">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ventasPorDia
                            .slice()
                            .reverse()
                            .map((dia) => (
                              <tr key={dia.fecha}>
                                <td>{fechaCorta(dia.fecha)}</td>
                                <td className="text-center">
                                  {dia.cantidad}
                                </td>
                                <td className="text-end fw-semibold">
                                  {moneda(dia.total)}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-5">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-1">
                    Rendimiento por sucursal
                  </h5>
                  <p className="text-secondary small mb-3">
                    Ventas completadas por ubicación.
                  </p>

                  {sucursales.length === 0 ? (
                    <div className="text-center py-4 text-secondary">
                      No hay información de sucursales.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Sucursal</th>
                            <th className="text-center">Ventas</th>
                            <th className="text-end">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sucursales.map((sucursal) => (
                            <tr key={sucursal.sucursalId}>
                              <td className="fw-semibold">
                                {sucursal.sucursal}
                              </td>
                              <td className="text-center">
                                {sucursal.cantidadVentas}
                              </td>
                              <td className="text-end">
                                {moneda(sucursal.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

export default Reportes;