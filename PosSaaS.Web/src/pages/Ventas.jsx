import { useEffect, useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import api from "../services/api";

function Ventas() {
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("");
  const [sucursal, setSucursal] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState("");

  useEffect(() => {
    cargarVentas();
  }, []);

  const cargarVentas = async () => {
    try {
      setCargando(true);
      setError("");
      const response = await api.get("/Ventas");
      setVentas(response.data || []);
    } catch (err) {
      console.error(err);
      setError("No fue posible cargar las ventas.");
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

  const monedaTicket = (valor) =>
    new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(valor) || 0);

  const fechaHora = (fecha) => {
    if (!fecha) return "-";
    return new Intl.DateTimeFormat("es-CR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(fecha));
  };

  const fechaTicket = (fecha) => {
    if (!fecha) return "";
    return new Intl.DateTimeFormat("es-CR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(fecha));
  };

  const escaparHtml = (valor) =>
    String(valor ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const sucursales = useMemo(
    () => [...new Set(ventas.map((x) => x.sucursal).filter(Boolean))].sort(),
    [ventas]
  );

  const estados = useMemo(
    () => [...new Set(ventas.map((x) => x.estado).filter(Boolean))].sort(),
    [ventas]
  );

  const ventasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return ventas.filter((venta) => {
      const coincideBusqueda =
        !texto ||
        venta.numeroVenta?.toLowerCase().includes(texto) ||
        venta.cliente?.toLowerCase().includes(texto) ||
        venta.usuario?.toLowerCase().includes(texto) ||
        venta.caja?.toLowerCase().includes(texto) ||
        venta.sucursal?.toLowerCase().includes(texto);

      const coincideEstado = !estado || venta.estado === estado;
      const coincideSucursal = !sucursal || venta.sucursal === sucursal;
      const fechaVenta = new Date(venta.fecha);
      const coincideDesde =
        !desde || fechaVenta >= new Date(`${desde}T00:00:00`);
      const coincideHasta =
        !hasta || fechaVenta <= new Date(`${hasta}T23:59:59`);

      return (
        coincideBusqueda &&
        coincideEstado &&
        coincideSucursal &&
        coincideDesde &&
        coincideHasta
      );
    });
  }, [ventas, busqueda, estado, sucursal, desde, hasta]);

  const totalFiltrado = useMemo(
    () =>
      ventasFiltradas.reduce(
        (sum, venta) => sum + Number(venta.total || 0),
        0
      ),
    [ventasFiltradas]
  );

  const ticketPromedio = useMemo(
    () =>
      ventasFiltradas.length > 0
        ? totalFiltrado / ventasFiltradas.length
        : 0,
    [ventasFiltradas, totalFiltrado]
  );

  const ultimaVenta = useMemo(() => {
    if (ventasFiltradas.length === 0) return null;

    return ventasFiltradas.reduce((masReciente, actual) => {
      if (!masReciente) return actual;
      return new Date(actual.fecha) > new Date(masReciente.fecha)
        ? actual
        : masReciente;
    }, null);
  }, [ventasFiltradas]);

  const abrirDetalle = async (ventaId) => {
    try {
      setCargandoDetalle(true);
      setErrorDetalle("");
      setDetalle(null);
      const response = await api.get(`/Ventas/${ventaId}`);
      setDetalle(response.data);
    } catch (err) {
      console.error(err);
      setErrorDetalle("No fue posible cargar el detalle de la venta.");
    } finally {
      setCargandoDetalle(false);
    }
  };

  const imprimirTicket = () => {
    if (!detalle) return;

    const ventana = window.open("", "_blank", "width=420,height=720");
    if (!ventana) {
      setErrorDetalle(
        "El navegador bloqueó la ventana de impresión. Permite ventanas emergentes e inténtalo nuevamente."
      );
      return;
    }

    const negocio =
      localStorage.getItem("nombreComercial") ||
      localStorage.getItem("comercio") ||
      "POS SaaS";

    const productosTicket = detalle.productos || [];
    const pagosTicket = detalle.pagos || [];

    ventana.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escaparHtml(detalle.numeroVenta || "Ticket")}</title>
          <style>
            body { font-family: Arial, sans-serif; width: 300px; margin: 20px auto; color: #111; }
            h2, p { margin: 0; }
            .center { text-align: center; }
            .muted { color: #666; font-size: 12px; }
            .line { border-top: 1px dashed #999; margin: 12px 0; }
            .row { display: flex; justify-content: space-between; gap: 12px; margin: 6px 0; }
            .bold { font-weight: 700; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            td { padding: 4px 0; vertical-align: top; }
            td:last-child { text-align: right; white-space: nowrap; }
            @media print { body { margin: 0 auto; } }
          </style>
        </head>
        <body>
          <div class="center">
            <h2>${escaparHtml(negocio)}</h2>
            <p class="muted">Comprobante de venta</p>
            <p class="muted">Reimpresión</p>
          </div>
          <div class="line"></div>
          <div class="muted">${escaparHtml(detalle.numeroVenta || "")}</div>
          <div class="muted">${escaparHtml(fechaTicket(detalle.fecha))}</div>
          <div class="muted">Sucursal: ${escaparHtml(detalle.sucursal || "-")}</div>
          <div class="muted">Caja: ${escaparHtml(detalle.caja || "-")}</div>
          <div class="muted">Atendido por: ${escaparHtml(detalle.usuario || "-")}</div>
          <div class="muted">Cliente: ${escaparHtml(detalle.cliente?.nombre || "Consumidor final")}</div>
          <div class="line"></div>
          <table>
            <tbody>
              ${productosTicket
                .map(
                  (p) => `<tr><td>${escaparHtml(p.cantidad)} x ${escaparHtml(
                    p.productoNombre
                  )}</td><td>${escaparHtml(monedaTicket(p.total))}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
          <div class="line"></div>
          <div class="row"><span>Subtotal</span><span>${escaparHtml(
            monedaTicket(detalle.subtotal)
          )}</span></div>
          <div class="row"><span>IVA</span><span>${escaparHtml(
            monedaTicket(detalle.impuesto)
          )}</span></div>
          ${
            Number(detalle.descuento || 0) > 0
              ? `<div class="row"><span>Descuento</span><span>${escaparHtml(
                  monedaTicket(detalle.descuento)
                )}</span></div>`
              : ""
          }
          <div class="row bold"><span>Total</span><span>${escaparHtml(
            monedaTicket(detalle.total)
          )}</span></div>
          <div class="line"></div>
          ${pagosTicket
            .map(
              (p) => `<div class="row"><span>${escaparHtml(
                p.metodo
              )}</span><span>${escaparHtml(monedaTicket(p.monto))}</span></div>${
                p.referencia
                  ? `<div class="muted">Ref: ${escaparHtml(p.referencia)}</div>`
                  : ""
              }`
            )
            .join("")}
          <div class="line"></div>
          <p class="center muted">¡Gracias por su compra!</p>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);

    ventana.document.close();
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setEstado("");
    setSucursal("");
    setDesde("");
    setHasta("");
  };

  const claseEstado = (valor) => {
    if (valor === "COMPLETADA") return "badge text-bg-success";
    if (valor === "ANULADA") return "badge text-bg-danger";
    return "badge text-bg-secondary";
  };

  return (
    <AppLayout>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Ventas</h2>
          <p className="text-secondary mb-0">
            Consulta transacciones, revisa su detalle y reimprime comprobantes.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-dark"
          onClick={cargarVentas}
          disabled={cargando}
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

      <div className="row g-3 mb-4">
        <div className="col-md-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <p className="text-secondary mb-2">Ventas mostradas</p>
                  <h3 className="fw-bold mb-0">{ventasFiltradas.length}</h3>
                </div>
                <i className="bi bi-receipt fs-3 text-secondary"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <p className="text-secondary mb-2">Total mostrado</p>
                  <h3 className="fw-bold mb-0">{moneda(totalFiltrado)}</h3>
                </div>
                <i className="bi bi-cash-stack fs-3 text-secondary"></i>
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
                  <h3 className="fw-bold mb-0">{moneda(ticketPromedio)}</h3>
                </div>
                <i className="bi bi-graph-up-arrow fs-3 text-secondary"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-6 col-xl-3">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <p className="text-secondary mb-2">Última venta</p>
                  <h6 className="fw-bold mb-1">
                    {ultimaVenta?.numeroVenta || "Sin ventas"}
                  </h6>
                  <small className="text-secondary">
                    {ultimaVenta ? fechaHora(ultimaVenta.fecha) : "-"}
                  </small>
                </div>
                <i className="bi bi-clock-history fs-3 text-secondary"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-lg-4">
              <label className="form-label">Buscar</label>
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Venta, cliente, usuario, caja o sucursal..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>

            <div className="col-md-6 col-lg-2">
              <label className="form-label">Estado</label>
              <select
                className="form-select"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                <option value="">Todos</option>
                {estados.map((valor) => (
                  <option key={valor} value={valor}>
                    {valor}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-6 col-lg-2">
              <label className="form-label">Sucursal</label>
              <select
                className="form-select"
                value={sucursal}
                onChange={(e) => setSucursal(e.target.value)}
              >
                <option value="">Todas</option>
                {sucursales.map((nombre) => (
                  <option key={nombre} value={nombre}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-6 col-lg-2">
              <label className="form-label">Desde</label>
              <input
                type="date"
                className="form-control"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>

            <div className="col-md-6 col-lg-2">
              <label className="form-label">Hasta</label>
              <input
                type="date"
                className="form-control"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
          </div>

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
            <small className="text-secondary">
              {ventasFiltradas.length} de {ventas.length} ventas visibles
            </small>
            <button
              type="button"
              className="btn btn-link text-decoration-none"
              onClick={limpiarFiltros}
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body p-0">
          {cargando ? (
            <div className="text-center py-5">
              <div className="spinner-border" role="status"></div>
              <p className="text-secondary mt-3 mb-0">Cargando ventas...</p>
            </div>
          ) : ventasFiltradas.length === 0 ? (
            <div className="text-center py-5 px-3">
              <i className="bi bi-receipt fs-1 text-secondary"></i>
              <h5 className="mt-3">No hay ventas para mostrar</h5>
              <p className="text-secondary mb-0">
                Ajusta los filtros o registra una nueva venta.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">Venta</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Sucursal</th>
                    <th>Caja</th>
                    <th>Usuario</th>
                    <th className="text-end">Total</th>
                    <th className="text-center">Estado</th>
                    <th className="text-end pe-4">Acción</th>
                  </tr>
                </thead>

                <tbody>
                  {ventasFiltradas.map((venta) => (
                    <tr key={venta.id}>
                      <td className="ps-4 fw-semibold">
                        {venta.numeroVenta}
                      </td>
                      <td>{fechaHora(venta.fecha)}</td>
                      <td>
                        {venta.cliente || (
                          <span className="text-secondary">Consumidor final</span>
                        )}
                      </td>
                      <td>{venta.sucursal}</td>
                      <td>{venta.caja}</td>
                      <td>{venta.usuario}</td>
                      <td className="text-end fw-semibold">
                        {moneda(venta.total)}
                      </td>
                      <td className="text-center">
                        <span className={claseEstado(venta.estado)}>
                          {venta.estado}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-dark"
                          data-bs-toggle="modal"
                          data-bs-target="#detalleVentaModal"
                          onClick={() => abrirDetalle(venta.id)}
                        >
                          <i className="bi bi-eye me-1"></i>
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div
        className="modal fade"
        id="detalleVentaModal"
        tabIndex="-1"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-xl modal-dialog-scrollable">
          <div className="modal-content border-0">
            <div className="modal-header">
              <div>
                <h5 className="modal-title fw-bold">Detalle de venta</h5>
                {detalle?.numeroVenta && (
                  <small className="text-secondary">{detalle.numeroVenta}</small>
                )}
              </div>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Cerrar"
              ></button>
            </div>

            <div className="modal-body p-4">
              {cargandoDetalle ? (
                <div className="text-center py-5">
                  <div className="spinner-border" role="status"></div>
                  <p className="text-secondary mt-3 mb-0">
                    Cargando detalle...
                  </p>
                </div>
              ) : errorDetalle ? (
                <div className="alert alert-danger mb-0">{errorDetalle}</div>
              ) : detalle ? (
                <>
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <span className={claseEstado(detalle.estado)}>
                      {detalle.estado}
                    </span>
                    <button
                      type="button"
                      className="btn btn-dark"
                      onClick={imprimirTicket}
                    >
                      <i className="bi bi-printer me-2"></i>
                      Reimprimir ticket
                    </button>
                  </div>

                  <div className="row g-3 mb-4">
                    {[
                      ["Fecha", fechaHora(detalle.fecha)],
                      ["Sucursal", detalle.sucursal],
                      ["Caja", detalle.caja],
                      ["Usuario", detalle.usuario],
                    ].map(([titulo, valor]) => (
                      <div className="col-md-6 col-xl-3" key={titulo}>
                        <div className="border rounded p-3 h-100">
                          <small className="text-secondary d-block">{titulo}</small>
                          <strong>{valor}</strong>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="card bg-light border-0 mb-4">
                    <div className="card-body">
                      <h6 className="fw-bold mb-3">
                        <i className="bi bi-person me-2"></i>
                        Cliente
                      </h6>
                      {detalle.cliente ? (
                        <div className="row g-3">
                          <div className="col-md-4">
                            <small className="text-secondary d-block">Nombre</small>
                            <strong>{detalle.cliente.nombre}</strong>
                          </div>
                          <div className="col-md-4">
                            <small className="text-secondary d-block">
                              Identificación
                            </small>
                            <span>{detalle.cliente.identificacion || "-"}</span>
                          </div>
                          <div className="col-md-4">
                            <small className="text-secondary d-block">Teléfono</small>
                            <span>{detalle.cliente.telefono || "-"}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-secondary">Consumidor final</span>
                      )}
                    </div>
                  </div>

                  <h6 className="fw-bold mb-3">Productos</h6>
                  <div className="table-responsive mb-4">
                    <table className="table align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Producto</th>
                          <th className="text-end">Cantidad</th>
                          <th className="text-end">Precio</th>
                          <th className="text-end">Impuesto</th>
                          <th className="text-end">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(detalle.productos || []).map((producto, index) => (
                          <tr key={`${producto.productoId}-${index}`}>
                            <td>{producto.productoNombre}</td>
                            <td className="text-end">{producto.cantidad}</td>
                            <td className="text-end">
                              {moneda(producto.precioUnitario)}
                            </td>
                            <td className="text-end">
                              {producto.impuestoPorcentaje}%
                            </td>
                            <td className="text-end fw-semibold">
                              {moneda(producto.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="row g-4">
                    <div className="col-lg-7">
                      <h6 className="fw-bold mb-3">Métodos de pago</h6>
                      <div className="list-group">
                        {(detalle.pagos || []).map((pago, index) => (
                          <div
                            key={`${pago.metodo}-${index}`}
                            className="list-group-item d-flex justify-content-between align-items-center gap-3"
                          >
                            <div>
                              <strong>{pago.metodo}</strong>
                              {pago.referencia && (
                                <small className="text-secondary d-block">
                                  Ref: {pago.referencia}
                                </small>
                              )}
                            </div>
                            <strong>{moneda(pago.monto)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="col-lg-5">
                      <div className="card border-0 bg-light">
                        <div className="card-body">
                          <div className="d-flex justify-content-between mb-2">
                            <span>Subtotal</span>
                            <strong>{moneda(detalle.subtotal)}</strong>
                          </div>
                          <div className="d-flex justify-content-between mb-2">
                            <span>Impuesto</span>
                            <strong>{moneda(detalle.impuesto)}</strong>
                          </div>
                          <div className="d-flex justify-content-between mb-3">
                            <span>Descuento</span>
                            <strong>{moneda(detalle.descuento)}</strong>
                          </div>
                          <hr />
                          <div className="d-flex justify-content-between fs-5">
                            <span className="fw-bold">Total</span>
                            <strong>{moneda(detalle.total)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default Ventas;
