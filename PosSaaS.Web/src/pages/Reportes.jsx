import { useEffect, useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import api from "../services/api";

function Reportes() {
  const formatoInput = (fecha) => {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
  };

  const obtenerRango = (tipo) => {
    const hoy = new Date();
    const inicio = new Date(hoy);

    if (tipo === "HOY") {
      return {
        desde: formatoInput(hoy),
        hasta: formatoInput(hoy),
      };
    }

    if (tipo === "7_DIAS") {
      inicio.setDate(hoy.getDate() - 6);
      return {
        desde: formatoInput(inicio),
        hasta: formatoInput(hoy),
      };
    }

    if (tipo === "MES") {
      inicio.setDate(1);
      return {
        desde: formatoInput(inicio),
        hasta: formatoInput(hoy),
      };
    }

    inicio.setDate(hoy.getDate() - 29);
    return {
      desde: formatoInput(inicio),
      hasta: formatoInput(hoy),
    };
  };

  const rangoInicial = obtenerRango("30_DIAS");

  const [desde, setDesde] = useState(rangoInicial.desde);
  const [hasta, setHasta] = useState(rangoInicial.hasta);
  const [reporte, setReporte] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [periodoActivo, setPeriodoActivo] = useState("30_DIAS");

  useEffect(() => {
    cargarReporte(rangoInicial.desde, rangoInicial.hasta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarReporte = async (desdeConsulta = desde, hastaConsulta = hasta) => {
    if (!desdeConsulta || !hastaConsulta) {
      setError("Selecciona ambas fechas.");
      return;
    }

    if (desdeConsulta > hastaConsulta) {
      setError("La fecha inicial no puede ser mayor que la fecha final.");
      return;
    }

    try {
      setCargando(true);
      setError("");

      const response = await api.get("/Reportes/ventas", {
        params: {
          desde: desdeConsulta,
          hasta: hastaConsulta,
        },
      });

      setReporte(response.data);
    } catch (err) {
      console.error(err);
      const data = err.response?.data;

      setError(
        typeof data === "string"
          ? data
          : data?.message || data?.title || "No fue posible cargar el reporte."
      );
    } finally {
      setCargando(false);
    }
  };

  const aplicarPeriodo = async (tipo) => {
    const rango = obtenerRango(tipo);
    setPeriodoActivo(tipo);
    setDesde(rango.desde);
    setHasta(rango.hasta);
    await cargarReporte(rango.desde, rango.hasta);
  };

  const aplicarPersonalizado = async () => {
    setPeriodoActivo("PERSONALIZADO");
    await cargarReporte(desde, hasta);
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

  const porcentaje = (valor) =>
    new Intl.NumberFormat("es-CR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(Number(valor) || 0);

  const fechaCorta = (valor) => {
    if (!valor) return "-";

    const fecha = new Date(`${String(valor).slice(0, 10)}T12:00:00`);
    return new Intl.DateTimeFormat("es-CR", {
      day: "2-digit",
      month: "short",
    }).format(fecha);
  };

  const fechaCompleta = (valor) => {
    if (!valor) return "-";

    const fecha = new Date(`${String(valor).slice(0, 10)}T12:00:00`);
    return new Intl.DateTimeFormat("es-CR", {
      dateStyle: "medium",
    }).format(fecha);
  };

  const resumen = reporte?.resumen || {};
  const metodosPago = reporte?.metodosPago || [];
  const productos = reporte?.productosMasVendidos || [];
  const sucursales = reporte?.ventasPorSucursal || [];
  const ventasPorDia = reporte?.ventasPorDia || [];

  const sucursalesOrdenadas = useMemo(
    () =>
      sucursales
        .slice()
        .sort((a, b) => Number(b.total || 0) - Number(a.total || 0)),
    [sucursales]
  );

  const metodosOrdenados = useMemo(
    () =>
      metodosPago
        .slice()
        .sort((a, b) => Number(b.total || 0) - Number(a.total || 0)),
    [metodosPago]
  );

  const productosOrdenados = useMemo(
    () =>
      productos
        .slice()
        .sort((a, b) => Number(b.cantidad || 0) - Number(a.cantidad || 0)),
    [productos]
  );

  const maxMetodo = useMemo(
    () =>
      Math.max(...metodosOrdenados.map((x) => Number(x.total) || 0), 1),
    [metodosOrdenados]
  );

  const maxProducto = useMemo(
    () =>
      Math.max(...productosOrdenados.map((x) => Number(x.cantidad) || 0), 1),
    [productosOrdenados]
  );

  const totalVendido = Number(resumen.totalVendido) || 0;
  const cantidadVentas = Number(resumen.cantidadVentas) || 0;

  const diasConVentas = useMemo(
    () => ventasPorDia.filter((dia) => Number(dia.cantidad || 0) > 0).length,
    [ventasPorDia]
  );

  const promedioDiario =
    diasConVentas > 0 ? totalVendido / diasConVentas : 0;

  const mejorDia = useMemo(() => {
    if (ventasPorDia.length === 0) return null;

    return ventasPorDia.reduce((mejor, actual) => {
      if (!mejor) return actual;
      return Number(actual.total || 0) > Number(mejor.total || 0)
        ? actual
        : mejor;
    }, null);
  }, [ventasPorDia]);

  const mejorSucursal = sucursalesOrdenadas[0] || null;
  const productoEstrella = productosOrdenados[0] || null;
  const metodoPrincipal = metodosOrdenados[0] || null;

  const participacion = (total) => {
    if (totalVendido <= 0) return 0;
    return (Number(total || 0) / totalVendido) * 100;
  };

  const escaparCsv = (valor) => {
    const texto = String(valor ?? "");
    return `"${texto.replaceAll('"', '""')}"`;
  };

  const descargarCsv = () => {
    if (!reporte) return;

    const filas = [];

    filas.push(["REPORTE DE VENTAS"]);
    filas.push(["Desde", fechaCompleta(desde)]);
    filas.push(["Hasta", fechaCompleta(hasta)]);
    filas.push([]);

    filas.push(["RESUMEN"]);
    filas.push(["Indicador", "Valor"]);
    filas.push(["Total vendido", totalVendido]);
    filas.push(["Cantidad de ventas", cantidadVentas]);
    filas.push(["Ticket promedio", Number(resumen.ticketPromedio) || 0]);
    filas.push(["Subtotal", Number(resumen.subtotal) || 0]);
    filas.push(["Impuesto", Number(resumen.impuesto) || 0]);
    filas.push(["Descuento", Number(resumen.descuento) || 0]);
    filas.push(["Promedio diario", promedioDiario]);
    filas.push([]);

    filas.push(["VENTAS POR DÍA"]);
    filas.push(["Fecha", "Cantidad de ventas", "Total"]);
    ventasPorDia.forEach((dia) => {
      filas.push([
        String(dia.fecha || "").slice(0, 10),
        Number(dia.cantidad) || 0,
        Number(dia.total) || 0,
      ]);
    });
    filas.push([]);

    filas.push(["RENDIMIENTO POR SUCURSAL"]);
    filas.push(["Sucursal", "Ventas", "Total", "Participación %"]);
    sucursalesOrdenadas.forEach((sucursal) => {
      filas.push([
        sucursal.sucursal,
        Number(sucursal.cantidadVentas) || 0,
        Number(sucursal.total) || 0,
        participacion(sucursal.total).toFixed(2),
      ]);
    });
    filas.push([]);

    filas.push(["MÉTODOS DE PAGO"]);
    filas.push(["Método", "Pagos", "Total", "Participación %"]);
    metodosOrdenados.forEach((metodo) => {
      filas.push([
        metodo.nombre,
        Number(metodo.cantidadPagos) || 0,
        Number(metodo.total) || 0,
        participacion(metodo.total).toFixed(2),
      ]);
    });
    filas.push([]);

    filas.push(["PRODUCTOS MÁS VENDIDOS"]);
    filas.push(["Posición", "Producto", "Unidades", "Total"]);
    productosOrdenados.forEach((producto, index) => {
      filas.push([
        index + 1,
        producto.producto,
        Number(producto.cantidad) || 0,
        Number(producto.total) || 0,
      ]);
    });

    const contenido = filas
      .map((fila) => fila.map(escaparCsv).join(","))
      .join("\r\n");

    const blob = new Blob(["\ufeff", contenido], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `reporte-ventas-${desde}-a-${hasta}.csv`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  };

  const periodos = [
    { id: "HOY", nombre: "Hoy" },
    { id: "7_DIAS", nombre: "7 días" },
    { id: "30_DIAS", nombre: "30 días" },
    { id: "MES", nombre: "Este mes" },
  ];

  return (
    <AppLayout>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Reportes</h2>
          <p className="text-secondary mb-0">
            Analiza ventas, productos, métodos de pago y sucursales.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-success"
          onClick={descargarCsv}
          disabled={cargando || !reporte}
        >
          <i className="bi bi-file-earmark-spreadsheet me-2"></i>
          Exportar CSV / Excel
        </button>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="d-flex flex-wrap justify-content-between gap-3 mb-3">
            <div>
              <h5 className="fw-bold mb-1">Período</h5>
              <p className="text-secondary small mb-0">
                Usa un rango rápido o selecciona fechas personalizadas.
              </p>
            </div>

            <div className="d-flex flex-wrap gap-2">
              {periodos.map((periodo) => (
                <button
                  key={periodo.id}
                  type="button"
                  className={`btn btn-sm ${
                    periodoActivo === periodo.id
                      ? "btn-dark"
                      : "btn-outline-secondary"
                  }`}
                  onClick={() => aplicarPeriodo(periodo.id)}
                  disabled={cargando}
                >
                  {periodo.nombre}
                </button>
              ))}
            </div>
          </div>

          <div className="row g-3 align-items-end">
            <div className="col-sm-6 col-lg-3">
              <label className="form-label small fw-semibold mb-1">
                Desde
              </label>
              <input
                type="date"
                className="form-control"
                value={desde}
                onChange={(e) => {
                  setDesde(e.target.value);
                  setPeriodoActivo("PERSONALIZADO");
                }}
              />
            </div>

            <div className="col-sm-6 col-lg-3">
              <label className="form-label small fw-semibold mb-1">
                Hasta
              </label>
              <input
                type="date"
                className="form-control"
                value={hasta}
                onChange={(e) => {
                  setHasta(e.target.value);
                  setPeriodoActivo("PERSONALIZADO");
                }}
              />
            </div>

            <div className="col-sm-6 col-lg-3">
              <button
                type="button"
                className="btn btn-dark w-100"
                onClick={aplicarPersonalizado}
                disabled={cargando}
              >
                <i className="bi bi-funnel me-2"></i>
                Aplicar fechas
              </button>
            </div>

            <div className="col-sm-6 col-lg-3">
              <div className="border rounded px-3 py-2 bg-light h-100">
                <small className="text-secondary d-block">Rango actual</small>
                <strong>
                  {fechaCompleta(desde)} — {fechaCompleta(hasta)}
                </strong>
              </div>
            </div>
          </div>
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
          <p className="text-secondary mt-3 mb-0">Preparando reporte...</p>
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
                titulo: "Promedio diario",
                valor: moneda(promedioDiario),
                detalle:
                  diasConVentas > 0
                    ? `${diasConVentas} días con ventas`
                    : "Sin actividad",
                icono: "bi-calendar3",
              },
            ].map((card) => (
              <div className="col-sm-6 col-xl-3" key={card.titulo}>
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body p-4">
                    <div className="d-flex justify-content-between gap-3">
                      <div>
                        <p className="text-secondary mb-2">{card.titulo}</p>
                        <h3 className="fw-bold mb-1">{card.valor}</h3>
                        <small className="text-secondary">{card.detalle}</small>
                      </div>
                      <i className={`bi ${card.icono} fs-2`}></i>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="row g-3 mb-4">
            <div className="col-md-6 col-xl-3">
              <div className="card border-0 bg-light h-100">
                <div className="card-body p-4">
                  <small className="text-secondary">Mejor día</small>
                  <h5 className="fw-bold mt-1 mb-1">
                    {mejorDia ? fechaCompleta(mejorDia.fecha) : "Sin datos"}
                  </h5>
                  <span className="text-secondary">
                    {mejorDia
                      ? `${moneda(mejorDia.total)} · ${numero(
                          mejorDia.cantidad
                        )} ventas`
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="card border-0 bg-light h-100">
                <div className="card-body p-4">
                  <small className="text-secondary">Sucursal líder</small>
                  <h5 className="fw-bold mt-1 mb-1">
                    {mejorSucursal?.sucursal || "Sin datos"}
                  </h5>
                  <span className="text-secondary">
                    {mejorSucursal
                      ? `${moneda(mejorSucursal.total)} · ${porcentaje(
                          participacion(mejorSucursal.total)
                        )}%`
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="card border-0 bg-light h-100">
                <div className="card-body p-4">
                  <small className="text-secondary">Producto estrella</small>
                  <h5 className="fw-bold mt-1 mb-1">
                    {productoEstrella?.producto || "Sin datos"}
                  </h5>
                  <span className="text-secondary">
                    {productoEstrella
                      ? `${numero(productoEstrella.cantidad)} unidades`
                      : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="col-md-6 col-xl-3">
              <div className="card border-0 bg-light h-100">
                <div className="card-body p-4">
                  <small className="text-secondary">Pago principal</small>
                  <h5 className="fw-bold mt-1 mb-1">
                    {metodoPrincipal?.nombre || "Sin datos"}
                  </h5>
                  <span className="text-secondary">
                    {metodoPrincipal
                      ? `${moneda(metodoPrincipal.total)} · ${porcentaje(
                          participacion(metodoPrincipal.total)
                        )}%`
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <h5 className="fw-bold mb-1">Métodos de pago</h5>
                  <p className="text-secondary small mb-4">
                    Distribución de ingresos por forma de pago.
                  </p>

                  {metodosOrdenados.length === 0 ? (
                    <p className="text-secondary mb-0">
                      No hay pagos en este período.
                    </p>
                  ) : (
                    <div className="d-flex flex-column gap-4">
                      {metodosOrdenados.map((metodo) => {
                        const ancho =
                          (Number(metodo.total || 0) / maxMetodo) * 100;

                        return (
                          <div key={metodo.metodoPagoId}>
                            <div className="d-flex justify-content-between gap-3 mb-2">
                              <div>
                                <div className="fw-semibold">{metodo.nombre}</div>
                                <small className="text-secondary">
                                  {metodo.cantidadPagos} pagos · {porcentaje(
                                    participacion(metodo.total)
                                  )}% del total
                                </small>
                              </div>
                              <strong>{moneda(metodo.total)}</strong>
                            </div>
                            <div className="progress" style={{ height: 8 }}>
                              <div
                                className="progress-bar bg-dark"
                                style={{ width: `${ancho}%` }}
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
                  <h5 className="fw-bold mb-1">Productos más vendidos</h5>
                  <p className="text-secondary small mb-4">
                    Ranking por unidades vendidas.
                  </p>

                  {productosOrdenados.length === 0 ? (
                    <p className="text-secondary mb-0">
                      No hay productos vendidos en este período.
                    </p>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {productosOrdenados.map((producto, index) => {
                        const ancho =
                          (Number(producto.cantidad || 0) / maxProducto) * 100;

                        return (
                          <div key={producto.productoId}>
                            <div className="d-flex justify-content-between gap-3 mb-2">
                              <div className="d-flex gap-2">
                                <span className="badge text-bg-dark align-self-start">
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
                            <div className="progress" style={{ height: 8 }}>
                              <div
                                className="progress-bar bg-dark"
                                style={{ width: `${ancho}%` }}
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

          <div className="row g-4 mb-4">
            <div className="col-lg-7">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between gap-3 mb-3">
                    <div>
                      <h5 className="fw-bold mb-1">Ventas por día</h5>
                      <p className="text-secondary small mb-0">
                        Comportamiento diario dentro del período.
                      </p>
                    </div>
                    <span className="badge text-bg-light align-self-start">
                      {ventasPorDia.length} días
                    </span>
                  </div>

                  {ventasPorDia.length === 0 ? (
                    <div className="text-center py-4 text-secondary">
                      No hay ventas para mostrar.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
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
                                <td className="text-center">{dia.cantidad}</td>
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
                  <h5 className="fw-bold mb-1">Ranking de sucursales</h5>
                  <p className="text-secondary small mb-3">
                    Comparación de ventas por ubicación.
                  </p>

                  {sucursalesOrdenadas.length === 0 ? (
                    <div className="text-center py-4 text-secondary">
                      No hay información de sucursales.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Sucursal</th>
                            <th className="text-center">Ventas</th>
                            <th className="text-end">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sucursalesOrdenadas.map((sucursal, index) => (
                            <tr key={sucursal.sucursalId}>
                              <td>
                                <span
                                  className={`badge ${
                                    index === 0
                                      ? "text-bg-dark"
                                      : "text-bg-light"
                                  }`}
                                >
                                  {index + 1}
                                </span>
                              </td>
                              <td>
                                <div className="fw-semibold">
                                  {sucursal.sucursal}
                                </div>
                                <small className="text-secondary">
                                  {porcentaje(participacion(sucursal.total))}% del total
                                </small>
                              </td>
                              <td className="text-center">
                                {sucursal.cantidadVentas}
                              </td>
                              <td className="text-end fw-semibold">
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

          <div className="card border-0 shadow-sm">
            <div className="card-body p-4">
              <div className="row g-4 align-items-center">
                <div className="col-lg-8">
                  <h5 className="fw-bold mb-1">Resumen financiero</h5>
                  <p className="text-secondary small mb-0">
                    Desglose de los importes incluidos en el período seleccionado.
                  </p>
                </div>
                <div className="col-lg-4 text-lg-end">
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={descargarCsv}
                    disabled={!reporte}
                  >
                    <i className="bi bi-download me-2"></i>
                    Descargar reporte
                  </button>
                </div>
              </div>

              <hr className="my-4" />

              <div className="row g-3">
                {[
                  ["Subtotal", resumen.subtotal],
                  ["Impuesto", resumen.impuesto],
                  ["Descuentos", resumen.descuento],
                  ["Total vendido", resumen.totalVendido],
                ].map(([titulo, valor]) => (
                  <div className="col-sm-6 col-xl-3" key={titulo}>
                    <small className="text-secondary d-block">{titulo}</small>
                    <strong className="fs-5">{moneda(valor)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

export default Reportes;
