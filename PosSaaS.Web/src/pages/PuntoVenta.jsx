import { useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import api from "../services/api";

function PuntoVenta() {
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [cajas, setCajas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [cargandoInventario, setCargandoInventario] = useState(false);
  const [cargandoCaja, setCargandoCaja] = useState(false);
  const [cargandoClientes, setCargandoClientes] = useState(false);
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [procesandoCodigo, setProcesandoCodigo] = useState(false);

  const [error, setError] = useState("");
  const [errorInventario, setErrorInventario] = useState("");
  const [errorCaja, setErrorCaja] = useState("");
  const [errorVenta, setErrorVenta] = useState("");
  const [avisoStock, setAvisoStock] = useState("");
  const [mensajeCodigo, setMensajeCodigo] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [codigoEscaneado, setCodigoEscaneado] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");

  const [cajaSeleccionada, setCajaSeleccionada] = useState("");
  const [sesionCaja, setSesionCaja] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState("");
  const [montoRecibido, setMontoRecibido] = useState("");

  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [ticket, setTicket] = useState(null);

  const inputCodigoRef = useRef(null);

  useEffect(() => {
    cargarInicial();
  }, []);

  useEffect(() => {
    if (!mostrarModalPago && !ticket) {
      const timer = setTimeout(() => inputCodigoRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [mostrarModalPago, ticket]);

  const cargarInicial = async () => {
    await Promise.all([
      cargarProductos(),
      cargarCajas(),
      cargarClientes(),
      cargarMetodosPago(),
    ]);
  };

  const cargarProductos = async () => {
    try {
      setCargando(true);
      setError("");
      const response = await api.get("/Productos");
      setProductos(response.data || []);
    } catch (err) {
      console.error(err);
      setError("No fue posible cargar los productos.");
    } finally {
      setCargando(false);
    }
  };

  const cargarInventario = async (sucursalId) => {
    if (!sucursalId) {
      setInventario([]);
      return;
    }

    try {
      setCargandoInventario(true);
      setErrorInventario("");
      const response = await api.get(`/Inventario/sucursal/${sucursalId}`);
      setInventario(response.data || []);
    } catch (err) {
      console.error(err);
      setInventario([]);
      setErrorInventario("No fue posible cargar el inventario de la sucursal.");
    } finally {
      setCargandoInventario(false);
    }
  };

  const buscarSesionAbierta = async (cajaId) => {
    if (!cajaId) {
      setSesionCaja(null);
      return;
    }

    try {
      setCargandoCaja(true);
      setErrorCaja("");
      const response = await api.get(`/Cajas/sesion-abierta/${cajaId}`);
      setSesionCaja(response.data);
    } catch (err) {
      console.error(err);
      setSesionCaja(null);

      if (err.response?.status !== 404) {
        setErrorCaja("No fue posible consultar la sesión de caja.");
      }
    } finally {
      setCargandoCaja(false);
    }
  };

  const cargarCajas = async () => {
    try {
      setErrorCaja("");
      const response = await api.get("/Cajas");
      const activas = (response.data || []).filter((caja) => caja.activa);
      setCajas(activas);

      if (activas.length === 1) {
        const caja = activas[0];
        setCajaSeleccionada(String(caja.id));
        await Promise.all([
          buscarSesionAbierta(caja.id),
          cargarInventario(caja.sucursalId),
        ]);
      }
    } catch (err) {
      console.error(err);
      setErrorCaja("No fue posible cargar las cajas.");
    }
  };

  const cargarClientes = async () => {
    try {
      setCargandoClientes(true);
      const response = await api.get("/Clientes");
      setClientes((response.data || []).filter((cliente) => cliente.activo));
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoClientes(false);
    }
  };

  const cargarMetodosPago = async () => {
    try {
      const response = await api.get("/MetodosPago");
      const activos = (response.data || []).filter((metodo) => metodo.activo);
      setMetodosPago(activos);

      if (activos.length > 0) {
        setMetodoPagoSeleccionado(String(activos[0].id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const obtenerStockProducto = (productoId) => {
    const registro = inventario.find(
      (item) => Number(item.productoId) === Number(productoId)
    );
    return registro ? Number(registro.cantidad) || 0 : 0;
  };

  const obtenerCantidadCarrito = (productoId) => {
    const item = carrito.find((x) => Number(x.id) === Number(productoId));
    return item ? Number(item.cantidad) : 0;
  };

  const mostrarAvisoStock = (mensaje) => {
    setAvisoStock(mensaje);
    setTimeout(() => setAvisoStock(""), 2500);
  };

  const agregarProducto = (producto) => {
    if (!cajaSeleccionada) {
      setErrorCaja("Selecciona una caja antes de agregar productos.");
      return false;
    }

    const stock = obtenerStockProducto(producto.id);
    const cantidadActual = obtenerCantidadCarrito(producto.id);

    if (stock <= 0) {
      mostrarAvisoStock(`${producto.nombre} está agotado.`);
      return false;
    }

    if (cantidadActual >= stock) {
      mostrarAvisoStock(`No hay más unidades disponibles de ${producto.nombre}.`);
      return false;
    }

    setCarrito((actual) => {
      const existe = actual.find((item) => Number(item.id) === Number(producto.id));

      if (existe) {
        return actual.map((item) =>
          Number(item.id) === Number(producto.id)
            ? { ...item, cantidad: Number(item.cantidad) + 1 }
            : item
        );
      }

      return [
        ...actual,
        {
          id: producto.id,
          nombre: producto.nombre,
          precio: Number(producto.precio),
          impuestoPorcentaje: Number(producto.impuestoPorcentaje || 0),
          cantidad: 1,
          codigoBarras: producto.codigoBarras || null,
        },
      ];
    });

    return true;
  };

  const cambiarCantidad = (productoId, cambio) => {
    const item = carrito.find((x) => Number(x.id) === Number(productoId));
    if (!item) return;

    const nuevaCantidad = Number(item.cantidad) + cambio;

    if (nuevaCantidad <= 0) {
      setCarrito((actual) => actual.filter((x) => Number(x.id) !== Number(productoId)));
      return;
    }

    const stock = obtenerStockProducto(productoId);
    if (nuevaCantidad > stock) {
      mostrarAvisoStock(`Solo hay ${stock} unidades disponibles de ${item.nombre}.`);
      return;
    }

    setCarrito((actual) =>
      actual.map((producto) =>
        Number(producto.id) === Number(productoId)
          ? { ...producto, cantidad: nuevaCantidad }
          : producto
      )
    );
  };

  const eliminarProducto = (productoId) => {
    setCarrito((actual) =>
      actual.filter((item) => Number(item.id) !== Number(productoId))
    );
  };

  const limpiarCarrito = () => {
    setCarrito([]);
    setErrorVenta("");
  };

  const manejarCambioCaja = async (e) => {
    const cajaId = e.target.value;
    setCajaSeleccionada(cajaId);
    setSesionCaja(null);
    setInventario([]);
    setCarrito([]);
    setErrorCaja("");
    setErrorInventario("");
    setMensajeCodigo("");

    if (!cajaId) return;

    const caja = cajas.find((item) => Number(item.id) === Number(cajaId));
    if (!caja) return;

    await Promise.all([
      buscarSesionAbierta(caja.id),
      cargarInventario(caja.sucursalId),
    ]);
  };

  const buscarProductoPorCodigo = async () => {
    const codigo = codigoEscaneado.trim();
    if (!codigo) return;

    if (!cajaSeleccionada) {
      setMensajeCodigo("Selecciona una caja antes de escanear productos.");
      setCodigoEscaneado("");
      return;
    }

    try {
      setProcesandoCodigo(true);
      setMensajeCodigo("");
      const response = await api.get(`/Productos/codigo/${encodeURIComponent(codigo)}`);
      const productoApi = response.data;
      const producto =
        productos.find((item) => Number(item.id) === Number(productoApi.id)) ||
        productoApi;

      if (agregarProducto(producto)) {
        setMensajeCodigo(`✓ ${producto.nombre} agregado al carrito.`);
      }
    } catch (err) {
      console.error(err);
      setMensajeCodigo(
        err.response?.status === 404
          ? `No existe un producto activo con el código ${codigo}.`
          : "No fue posible consultar el código de barras."
      );
    } finally {
      setCodigoEscaneado("");
      setProcesandoCodigo(false);
      setTimeout(() => inputCodigoRef.current?.focus(), 50);
    }
  };

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return productos.filter((producto) => {
      if (!producto.activo) return false;
      if (!texto) return true;

      return (
        producto.nombre?.toLowerCase().includes(texto) ||
        producto.sku?.toLowerCase().includes(texto) ||
        producto.codigoBarras?.toLowerCase().includes(texto) ||
        producto.categoria?.nombre?.toLowerCase().includes(texto)
      );
    });
  }, [productos, busqueda]);

  const clientesFiltrados = useMemo(() => {
    const texto = busquedaCliente.trim().toLowerCase();
    if (!texto) return clientes;

    return clientes.filter(
      (cliente) =>
        cliente.nombre?.toLowerCase().includes(texto) ||
        cliente.identificacion?.toLowerCase().includes(texto) ||
        cliente.telefono?.toLowerCase().includes(texto)
    );
  }, [clientes, busquedaCliente]);

  const resumen = useMemo(() => {
    let subtotal = 0;
    let impuesto = 0;

    carrito.forEach((item) => {
      const lineaSubtotal = Number(item.precio) * Number(item.cantidad);
      const lineaImpuesto =
        lineaSubtotal * (Number(item.impuestoPorcentaje) / 100);
      subtotal += lineaSubtotal;
      impuesto += lineaImpuesto;
    });

    return { subtotal, impuesto, total: subtotal + impuesto };
  }, [carrito]);

  const metodoPagoActual = useMemo(
    () =>
      metodosPago.find(
        (metodo) => Number(metodo.id) === Number(metodoPagoSeleccionado)
      ) || null,
    [metodosPago, metodoPagoSeleccionado]
  );

  const esEfectivo = metodoPagoActual?.tipo?.toUpperCase() === "EFECTIVO";
  const recibidoNumero = Number(montoRecibido) || 0;
  const cambio = esEfectivo
    ? Math.max(0, recibidoNumero - resumen.total)
    : 0;
  const efectivoInsuficiente = esEfectivo && recibidoNumero < resumen.total;

  const formatearColones = (monto) =>
    new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(monto) || 0);

  const formatearFecha = (fecha) =>
    fecha
      ? new Intl.DateTimeFormat("es-CR", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(fecha))
      : "";

  const abrirModalPago = () => {
    setErrorVenta("");

    if (!sesionCaja) {
      setErrorVenta("La caja seleccionada no tiene una sesión abierta.");
      return;
    }

    if (carrito.length === 0) {
      setErrorVenta("Agrega al menos un producto al carrito.");
      return;
    }

    for (const item of carrito) {
      const stock = obtenerStockProducto(item.id);
      if (Number(item.cantidad) > stock) {
        setErrorVenta(
          `No hay suficiente stock de ${item.nombre}. Disponible: ${stock}.`
        );
        return;
      }
    }

    const metodoId = metodoPagoSeleccionado ||
      (metodosPago.length > 0 ? String(metodosPago[0].id) : "");

    setMetodoPagoSeleccionado(metodoId);
    const metodo = metodosPago.find((x) => String(x.id) === String(metodoId));
    setMontoRecibido(
      metodo?.tipo?.toUpperCase() === "EFECTIVO"
        ? String(Math.ceil(resumen.total))
        : ""
    );
    setMostrarModalPago(true);
  };

  const cerrarModalPago = () => {
    if (procesandoVenta) return;
    setMostrarModalPago(false);
    setErrorVenta("");
    setMontoRecibido("");
  };

  const cambiarMetodoPago = (e) => {
    const id = e.target.value;
    setMetodoPagoSeleccionado(id);
    const metodo = metodosPago.find((x) => String(x.id) === String(id));

    if (metodo?.tipo?.toUpperCase() === "EFECTIVO") {
      setMontoRecibido(String(Math.ceil(resumen.total)));
    } else {
      setMontoRecibido("");
    }
  };

  const procesarVenta = async () => {
    if (!sesionCaja || !metodoPagoSeleccionado || carrito.length === 0) {
      setErrorVenta("Revisa la caja, el método de pago y los productos.");
      return;
    }

    if (efectivoInsuficiente) {
      setErrorVenta("El monto recibido es menor al total de la venta.");
      return;
    }

    try {
      setProcesandoVenta(true);
      setErrorVenta("");

      const payload = {
        cajaSesionId: sesionCaja.id,
        clienteId: clienteSeleccionado ? Number(clienteSeleccionado) : null,
        productos: carrito.map((item) => ({
          productoId: item.id,
          cantidad: Number(item.cantidad),
        })),
        pagos: [
          {
            metodoPagoId: Number(metodoPagoSeleccionado),
            monto: Number(resumen.total.toFixed(2)),
            referencia: null,
          },
        ],
      };

      const response = await api.post("/Ventas", payload);
      let detalleVenta = response.data;

      if (response.data?.ventaId) {
        try {
          const detalleResponse = await api.get(`/Ventas/${response.data.ventaId}`);
          detalleVenta = detalleResponse.data;
        } catch (err) {
          console.error("No se pudo cargar el detalle del ticket", err);
        }
      }

      setTicket({
        ...detalleVenta,
        recibido: esEfectivo ? recibidoNumero : null,
        cambio: esEfectivo ? cambio : null,
        metodoPago: metodoPagoActual?.nombre || "",
      });

      setCarrito([]);
      setMostrarModalPago(false);
      setBusquedaCliente("");
      setClienteSeleccionado("");
      setMontoRecibido("");

      const caja = cajas.find(
        (item) => Number(item.id) === Number(cajaSeleccionada)
      );

      if (caja) {
        await Promise.all([
          cargarProductos(),
          cargarInventario(caja.sucursalId),
          buscarSesionAbierta(caja.id),
        ]);
      }
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      setErrorVenta(
        typeof data === "string"
          ? data
          : data?.mensaje || data?.message || data?.title ||
            "No fue posible procesar la venta."
      );
    } finally {
      setProcesandoVenta(false);
    }
  };

  const imprimirTicket = () => {
    if (!ticket) return;

    const ventana = window.open("", "_blank", "width=420,height=720");
    if (!ventana) return;

    const productosTicket = ticket.productos || [];
    const pagosTicket = ticket.pagos || [];
    const negocio =
      localStorage.getItem("nombreComercial") ||
      localStorage.getItem("comercio") ||
      "POS SaaS";

    ventana.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${ticket.numeroVenta || "Ticket"}</title>
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
            <h2>${negocio}</h2>
            <p class="muted">Comprobante de venta</p>
          </div>
          <div class="line"></div>
          <div class="muted">${ticket.numeroVenta || ""}</div>
          <div class="muted">${formatearFecha(ticket.fecha)}</div>
          <div class="muted">Cliente: ${ticket.cliente?.nombre || "Consumidor final"}</div>
          <div class="line"></div>
          <table>
            <tbody>
              ${productosTicket
                .map(
                  (p) => `<tr><td>${p.cantidad} x ${p.productoNombre}</td><td>${formatearColones(p.total)}</td></tr>`
                )
                .join("")}
            </tbody>
          </table>
          <div class="line"></div>
          <div class="row"><span>Subtotal</span><span>${formatearColones(ticket.subtotal)}</span></div>
          <div class="row"><span>IVA</span><span>${formatearColones(ticket.impuesto)}</span></div>
          <div class="row bold"><span>Total</span><span>${formatearColones(ticket.total)}</span></div>
          <div class="line"></div>
          ${pagosTicket
            .map(
              (p) => `<div class="row"><span>${p.metodo}</span><span>${formatearColones(p.monto)}</span></div>`
            )
            .join("")}
          ${ticket.recibido != null ? `<div class="row"><span>Recibido</span><span>${formatearColones(ticket.recibido)}</span></div>` : ""}
          ${ticket.cambio != null ? `<div class="row bold"><span>Cambio</span><span>${formatearColones(ticket.cambio)}</span></div>` : ""}
          <div class="line"></div>
          <p class="center muted">¡Gracias por su compra!</p>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    ventana.document.close();
  };

  const cajaActual = cajas.find(
    (caja) => Number(caja.id) === Number(cajaSeleccionada)
  );

  return (
    <AppLayout>
      <div className="container-fluid px-0">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h2 className="fw-bold mb-1">Punto de Venta</h2>
            <p className="text-secondary mb-0">
              Registra ventas, escanea productos y controla el stock en tiempo real.
            </p>
          </div>

          <div style={{ minWidth: "260px" }}>
            <label className="form-label fw-semibold mb-1">Caja</label>
            <select
              className="form-select"
              value={cajaSeleccionada}
              onChange={manejarCambioCaja}
              disabled={cargandoCaja}
            >
              <option value="">Seleccionar caja...</option>
              {cajas.map((caja) => (
                <option key={caja.id} value={caja.id}>{caja.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {errorCaja && <div className="alert alert-warning">{errorCaja}</div>}
        {errorInventario && <div className="alert alert-warning">{errorInventario}</div>}
        {avisoStock && <div className="alert alert-warning">{avisoStock}</div>}

        <div className="row g-4">
          <div className="col-xl-8">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-4">
                <div className="d-flex flex-wrap justify-content-between gap-3 mb-3">
                  <div>
                    <h5 className="fw-bold mb-1">Escáner de código de barras</h5>
                    <small className="text-secondary">
                      Escanea el producto o escribe el código y presiona Enter.
                    </small>
                  </div>
                  <span className={`badge ${sesionCaja ? "text-bg-success" : "text-bg-secondary"}`}>
                    {cargandoCaja ? "Consultando caja..." : sesionCaja ? "Caja abierta" : "Caja sin abrir"}
                  </span>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); buscarProductoPorCodigo(); }}>
                  <div className="input-group input-group-lg">
                    <span className="input-group-text bg-white"><i className="bi bi-upc-scan"></i></span>
                    <input
                      ref={inputCodigoRef}
                      type="text"
                      className="form-control"
                      placeholder={cajaSeleccionada ? "Escanea aquí..." : "Primero selecciona una caja"}
                      value={codigoEscaneado}
                      onChange={(e) => setCodigoEscaneado(e.target.value)}
                      disabled={!cajaSeleccionada || procesandoCodigo || cargandoInventario}
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      className="btn btn-dark px-4"
                      disabled={!codigoEscaneado.trim() || procesandoCodigo || !cajaSeleccionada}
                    >
                      {procesandoCodigo ? <span className="spinner-border spinner-border-sm" /> : "Buscar"}
                    </button>
                  </div>
                </form>

                {mensajeCodigo && (
                  <div className={`mt-3 small fw-semibold ${mensajeCodigo.startsWith("✓") ? "text-success" : "text-danger"}`}>
                    {mensajeCodigo}
                  </div>
                )}

                {cajaActual && (
                  <div className="text-secondary small mt-2">
                    <i className="bi bi-shop me-1"></i>
                    Caja seleccionada: <strong>{cajaActual.nombre}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <div className="row g-3 align-items-center mb-4">
                  <div className="col-md-7">
                    <div className="input-group">
                      <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar por nombre, SKU o código..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-5 text-md-end">
                    <small className="text-secondary">{productosFiltrados.length} productos</small>
                  </div>
                </div>

                {cargando ? (
                  <div className="text-center py-5"><div className="spinner-border" /></div>
                ) : productosFiltrados.length === 0 ? (
                  <div className="text-center py-5 text-secondary">No encontramos productos.</div>
                ) : (
                  <div className="row g-3">
                    {productosFiltrados.map((producto) => {
                      const stock = obtenerStockProducto(producto.id);
                      const agotado = stock <= 0;

                      return (
                        <div className="col-sm-6 col-lg-4" key={producto.id}>
                          <button
                            type="button"
                            className="card h-100 w-100 border producto-pos text-start bg-white"
                            onClick={() => agregarProducto(producto)}
                            disabled={!cajaSeleccionada || cargandoInventario || agotado}
                          >
                            <div className="card-body">
                              <div className="d-flex justify-content-between gap-2 mb-2">
                                <span className="badge text-bg-light border">
                                  {producto.categoria?.nombre || "Producto"}
                                </span>
                                <span className={`badge ${agotado ? "text-bg-danger" : "text-bg-success"}`}>
                                  {agotado ? "AGOTADO" : `Stock: ${stock}`}
                                </span>
                              </div>
                              <h6 className="fw-bold mb-1">{producto.nombre}</h6>
                              <div className="fw-bold fs-5 mt-3">{formatearColones(producto.precio)}</div>
                              <small className="text-secondary">+ {producto.impuestoPorcentaje || 0}% IVA</small>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-xl-4">
            <div className="card border-0 shadow-sm" style={{ position: "sticky", top: "90px" }}>
              <div className="card-header bg-white border-0 px-4 pt-4 pb-2">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="fw-bold mb-1">Carrito</h5>
                    <small className="text-secondary">
                      {carrito.reduce((total, item) => total + Number(item.cantidad), 0)} unidades
                    </small>
                  </div>
                  {carrito.length > 0 && (
                    <button className="btn btn-sm btn-outline-danger" onClick={limpiarCarrito}>Limpiar</button>
                  )}
                </div>
              </div>

              <div className="card-body px-4">
                {carrito.length === 0 ? (
                  <div className="text-center py-5 text-secondary">
                    <i className="bi bi-cart3 fs-1"></i>
                    <p className="mt-3 mb-0">Escanea o selecciona productos para comenzar.</p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {carrito.map((item) => {
                      const stock = obtenerStockProducto(item.id);
                      return (
                        <div key={item.id} className="border-bottom pb-3">
                          <div className="d-flex justify-content-between gap-3">
                            <div>
                              <div className="fw-semibold">{item.nombre}</div>
                              <small className="text-secondary">{formatearColones(item.precio)} c/u</small>
                            </div>
                            <button className="btn btn-sm btn-link text-danger p-0" onClick={() => eliminarProducto(item.id)}>
                              <i className="bi bi-x-lg"></i>
                            </button>
                          </div>
                          <div className="d-flex justify-content-between align-items-center mt-2">
                            <div className="btn-group btn-group-sm">
                              <button className="btn btn-outline-secondary" onClick={() => cambiarCantidad(item.id, -1)}>-</button>
                              <button className="btn btn-outline-secondary disabled">{item.cantidad}</button>
                              <button
                                className="btn btn-outline-secondary"
                                onClick={() => cambiarCantidad(item.id, 1)}
                                disabled={Number(item.cantidad) >= stock}
                              >+</button>
                            </div>
                            <strong>{formatearColones(Number(item.precio) * Number(item.cantidad))}</strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="border-top mt-4 pt-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-secondary">Subtotal</span><span>{formatearColones(resumen.subtotal)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <span className="text-secondary">IVA</span><span>{formatearColones(resumen.impuesto)}</span>
                  </div>
                  <div className="d-flex justify-content-between border-top pt-3">
                    <strong className="fs-5">Total</strong><strong className="fs-4">{formatearColones(resumen.total)}</strong>
                  </div>
                </div>
              </div>

              <div className="card-footer bg-white border-0 p-4 pt-0">
                {errorVenta && !mostrarModalPago && <div className="alert alert-danger py-2 small">{errorVenta}</div>}
                <button
                  className="btn btn-dark btn-lg w-100"
                  onClick={abrirModalPago}
                  disabled={carrito.length === 0 || !sesionCaja || cargandoCaja}
                >
                  <i className="bi bi-credit-card me-2"></i>
                  Cobrar {carrito.length > 0 && formatearColones(resumen.total)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {mostrarModalPago && (
        <>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-bold">Cobrar venta</h5>
                    <small className="text-secondary">Selecciona cliente y método de pago.</small>
                  </div>
                  <button className="btn-close" onClick={cerrarModalPago} disabled={procesandoVenta} />
                </div>

                <div className="modal-body p-4">
                  {errorVenta && <div className="alert alert-danger">{errorVenta}</div>}

                  <div className="row g-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Cliente</label>
                      <input
                        className="form-control mb-2"
                        placeholder="Buscar cliente..."
                        value={busquedaCliente}
                        onChange={(e) => setBusquedaCliente(e.target.value)}
                      />
                      <select
                        className="form-select"
                        value={clienteSeleccionado}
                        onChange={(e) => setClienteSeleccionado(e.target.value)}
                        disabled={cargandoClientes}
                      >
                        <option value="">Consumidor final</option>
                        {clientesFiltrados.map((cliente) => (
                          <option key={cliente.id} value={cliente.id}>
                            {cliente.nombre}{cliente.identificacion ? ` - ${cliente.identificacion}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Método de pago</label>
                      <select className="form-select" value={metodoPagoSeleccionado} onChange={cambiarMetodoPago}>
                        <option value="">Seleccionar...</option>
                        {metodosPago.map((metodo) => (
                          <option key={metodo.id} value={metodo.id}>{metodo.nombre}</option>
                        ))}
                      </select>

                      {esEfectivo && (
                        <div className="mt-3">
                          <label className="form-label fw-semibold">Monto recibido</label>
                          <div className="input-group input-group-lg">
                            <span className="input-group-text">₡</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className={`form-control ${efectivoInsuficiente ? "is-invalid" : ""}`}
                              value={montoRecibido}
                              onChange={(e) => setMontoRecibido(e.target.value)}
                              autoFocus
                            />
                          </div>

                          <div className={`rounded-3 p-3 mt-3 ${efectivoInsuficiente ? "bg-danger-subtle" : "bg-success-subtle"}`}>
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="fw-semibold">Cambio</span>
                              <strong className="fs-4">{formatearColones(cambio)}</strong>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="card bg-light border-0 mt-4">
                    <div className="card-body">
                      <div className="d-flex justify-content-between mb-2"><span>Subtotal</span><span>{formatearColones(resumen.subtotal)}</span></div>
                      <div className="d-flex justify-content-between mb-2"><span>IVA</span><span>{formatearColones(resumen.impuesto)}</span></div>
                      <div className="d-flex justify-content-between border-top pt-3 mt-3">
                        <strong className="fs-5">Total</strong><strong className="fs-3">{formatearColones(resumen.total)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="btn btn-outline-secondary" onClick={cerrarModalPago} disabled={procesandoVenta}>Cancelar</button>
                  <button
                    className="btn btn-dark px-4"
                    onClick={procesarVenta}
                    disabled={procesandoVenta || !metodoPagoSeleccionado || efectivoInsuficiente}
                  >
                    {procesandoVenta ? (
                      <><span className="spinner-border spinner-border-sm me-2" />Procesando...</>
                    ) : (
                      <><i className="bi bi-check-lg me-2"></i>Confirmar venta</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {ticket && (
        <>
          <div className="modal fade show d-block" tabIndex="-1">
            <div className="modal-dialog modal-md modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-bold">
                      <i className="bi bi-check-circle-fill text-success me-2"></i>
                      Venta completada
                    </h5>
                    <small className="text-secondary">{ticket.numeroVenta}</small>
                  </div>
                  <button className="btn-close" onClick={() => setTicket(null)} />
                </div>

                <div className="modal-body p-4">
                  <div className="text-center mb-4">
                    <div className="fw-bold fs-4">
                      {localStorage.getItem("nombreComercial") || localStorage.getItem("comercio") || "POS SaaS"}
                    </div>
                    <small className="text-secondary">{formatearFecha(ticket.fecha)}</small>
                  </div>

                  <div className="d-flex justify-content-between mb-3">
                    <span className="text-secondary">Cliente</span>
                    <strong>{ticket.cliente?.nombre || "Consumidor final"}</strong>
                  </div>

                  <div className="border-top border-bottom py-3 mb-3">
                    {(ticket.productos || []).map((producto, index) => (
                      <div className="d-flex justify-content-between gap-3 mb-2" key={`${producto.productoId}-${index}`}>
                        <span>{producto.cantidad} x {producto.productoNombre}</span>
                        <strong>{formatearColones(producto.total)}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="d-flex justify-content-between mb-2"><span className="text-secondary">Subtotal</span><span>{formatearColones(ticket.subtotal)}</span></div>
                  <div className="d-flex justify-content-between mb-2"><span className="text-secondary">IVA</span><span>{formatearColones(ticket.impuesto)}</span></div>
                  <div className="d-flex justify-content-between border-top pt-3 mt-3"><strong className="fs-5">Total</strong><strong className="fs-3">{formatearColones(ticket.total)}</strong></div>

                  <div className="bg-light rounded-3 p-3 mt-4">
                    {(ticket.pagos || []).map((pago, index) => (
                      <div className="d-flex justify-content-between mb-2" key={index}>
                        <span>{pago.metodo}</span><strong>{formatearColones(pago.monto)}</strong>
                      </div>
                    ))}

                    {ticket.recibido != null && (
                      <>
                        <div className="d-flex justify-content-between mb-2"><span>Recibido</span><span>{formatearColones(ticket.recibido)}</span></div>
                        <div className="d-flex justify-content-between border-top pt-2"><strong>Cambio</strong><strong className="text-success fs-5">{formatearColones(ticket.cambio)}</strong></div>
                      </>
                    )}
                  </div>
                </div>

                <div className="modal-footer d-flex justify-content-between">
                  <button className="btn btn-outline-secondary" onClick={() => setTicket(null)}>Nueva venta</button>
                  <button className="btn btn-dark" onClick={imprimirTicket}>
                    <i className="bi bi-printer me-2"></i>Imprimir ticket
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </AppLayout>
  );
}

export default PuntoVenta;