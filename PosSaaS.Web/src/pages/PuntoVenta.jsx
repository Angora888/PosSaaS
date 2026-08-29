import { useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import api from "../services/api";

function PuntoVenta() {
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [carrito, setCarrito] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [cargandoInventario, setCargandoInventario] = useState(false);
  const [error, setError] = useState("");
  const [errorInventario, setErrorInventario] = useState("");

  const [busqueda, setBusqueda] = useState("");

  const [cajas, setCajas] = useState([]);
  const [cajaSeleccionada, setCajaSeleccionada] = useState("");
  const [sesionCaja, setSesionCaja] = useState(null);
  const [cargandoCaja, setCargandoCaja] = useState(false);
  const [errorCaja, setErrorCaja] = useState("");

  const [clientes, setClientes] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState("");
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [cargandoClientes, setCargandoClientes] = useState(false);

  const [metodosPago, setMetodosPago] = useState([]);
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState("");

  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [errorVenta, setErrorVenta] = useState("");
  const [ventaExitosa, setVentaExitosa] = useState(null);

  const [avisoStock, setAvisoStock] = useState("");

  // Código de barras
  const [codigoEscaneado, setCodigoEscaneado] = useState("");
  const [procesandoCodigo, setProcesandoCodigo] = useState(false);
  const [mensajeCodigo, setMensajeCodigo] = useState("");
  const inputCodigoRef = useRef(null);

  useEffect(() => {
    cargarProductos();
    cargarCajas();
    cargarClientes();
    cargarMetodosPago();
  }, []);

  useEffect(() => {
    if (!mostrarModalPago) {
      setTimeout(() => {
        inputCodigoRef.current?.focus();
      }, 100);
    }
  }, [mostrarModalPago]);

  const cargarProductos = async () => {
    try {
      setCargando(true);
      setError("");

      const response = await api.get("/Productos");
      setProductos(response.data);
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

      const response = await api.get(
        `/Inventario/sucursal/${sucursalId}`
      );

      setInventario(response.data);
    } catch (err) {
      console.error(err);
      setInventario([]);
      setErrorInventario(
        "No fue posible cargar el inventario de la sucursal."
      );
    } finally {
      setCargandoInventario(false);
    }
  };

  const cargarCajas = async () => {
    try {
      setErrorCaja("");

      const response = await api.get("/Cajas");

      const cajasActivas = response.data.filter(
        (caja) => caja.activa
      );

      setCajas(cajasActivas);

      if (cajasActivas.length === 1) {
        const caja = cajasActivas[0];

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

  const buscarSesionAbierta = async (cajaId) => {
    if (!cajaId) {
      setSesionCaja(null);
      return;
    }

    try {
      setCargandoCaja(true);
      setErrorCaja("");

      const response = await api.get(
        `/Cajas/sesion-abierta/${cajaId}`
      );

      setSesionCaja(response.data);
    } catch (err) {
      console.error(err);

      if (err.response?.status === 404) {
        setSesionCaja(null);
      } else {
        setSesionCaja(null);
        setErrorCaja(
          "No fue posible consultar la sesión de caja."
        );
      }
    } finally {
      setCargandoCaja(false);
    }
  };

  const cargarClientes = async () => {
    try {
      setCargandoClientes(true);

      const response = await api.get("/Clientes");

      setClientes(
        response.data.filter(
          (cliente) => cliente.activo
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoClientes(false);
    }
  };

  const cargarMetodosPago = async () => {
    try {
      const response = await api.get("/MetodosPago");

      const activos = response.data.filter(
        (metodo) => metodo.activo
      );

      setMetodosPago(activos);

      if (activos.length > 0) {
        setMetodoPagoSeleccionado(
          String(activos[0].id)
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const obtenerStockProducto = (productoId) => {
    const registro = inventario.find(
      (item) =>
        Number(item.productoId) === Number(productoId)
    );

    if (!registro) {
      return 0;
    }

    return Number(registro.cantidad) || 0;
  };

  const obtenerCantidadCarrito = (productoId) => {
    const item = carrito.find(
      (x) => Number(x.id) === Number(productoId)
    );

    return item ? Number(item.cantidad) : 0;
  };

  const mostrarAvisoStock = (mensaje) => {
    setAvisoStock(mensaje);

    setTimeout(() => {
      setAvisoStock("");
    }, 2500);
  };

  const agregarProducto = (producto) => {
    if (!cajaSeleccionada) {
      setErrorCaja(
        "Selecciona una caja antes de agregar productos."
      );
      return false;
    }

    const stock = obtenerStockProducto(producto.id);

    if (stock <= 0) {
      mostrarAvisoStock(
        `${producto.nombre} está agotado.`
      );
      return false;
    }

    const cantidadActual =
      obtenerCantidadCarrito(producto.id);

    if (cantidadActual >= stock) {
      mostrarAvisoStock(
        `No hay más unidades disponibles de ${producto.nombre}.`
      );
      return false;
    }

    setCarrito((actual) => {
      const existe = actual.find(
        (item) => Number(item.id) === Number(producto.id)
      );

      if (existe) {
        return actual.map((item) =>
          Number(item.id) === Number(producto.id)
            ? {
                ...item,
                cantidad: Number(item.cantidad) + 1,
              }
            : item
        );
      }

      return [
        ...actual,
        {
          id: producto.id,
          nombre: producto.nombre,
          precio: Number(producto.precio),
          impuestoPorcentaje: Number(
            producto.impuestoPorcentaje || 0
          ),
          cantidad: 1,
          codigoBarras: producto.codigoBarras || null,
        },
      ];
    });

    return true;
  };

  const cambiarCantidad = (productoId, cambio) => {
    const item = carrito.find(
      (x) => Number(x.id) === Number(productoId)
    );

    if (!item) {
      return;
    }

    const nuevaCantidad =
      Number(item.cantidad) + cambio;

    if (nuevaCantidad <= 0) {
      eliminarProducto(productoId);
      return;
    }

    const stock =
      obtenerStockProducto(productoId);

    if (nuevaCantidad > stock) {
      mostrarAvisoStock(
        `Solo hay ${stock} unidades disponibles de ${item.nombre}.`
      );
      return;
    }

    setCarrito((actual) =>
      actual.map((producto) =>
        Number(producto.id) === Number(productoId)
          ? {
              ...producto,
              cantidad: nuevaCantidad,
            }
          : producto
      )
    );
  };

  const eliminarProducto = (productoId) => {
    setCarrito((actual) =>
      actual.filter(
        (item) =>
          Number(item.id) !== Number(productoId)
      )
    );
  };

  const limpiarCarrito = () => {
    setCarrito([]);
    setVentaExitosa(null);
    setErrorVenta("");
  };

  const manejarCambioCaja = async (e) => {
    const cajaId = e.target.value;

    setCajaSeleccionada(cajaId);
    setSesionCaja(null);
    setInventario([]);
    setErrorCaja("");
    setErrorInventario("");
    setCarrito([]);
    setVentaExitosa(null);
    setMensajeCodigo("");

    if (!cajaId) {
      return;
    }

    const caja = cajas.find(
      (item) =>
        Number(item.id) === Number(cajaId)
    );

    if (!caja) {
      return;
    }

    await Promise.all([
      buscarSesionAbierta(caja.id),
      cargarInventario(caja.sucursalId),
    ]);

    setTimeout(() => {
      inputCodigoRef.current?.focus();
    }, 100);
  };

  const buscarProductoPorCodigo = async () => {
    const codigo = codigoEscaneado.trim();

    if (!codigo) {
      return;
    }

    if (!cajaSeleccionada) {
      setMensajeCodigo(
        "Selecciona una caja antes de escanear productos."
      );
      setCodigoEscaneado("");
      return;
    }

    try {
      setProcesandoCodigo(true);
      setMensajeCodigo("");
      setError("");

      const response = await api.get(
        `/Productos/codigo/${encodeURIComponent(codigo)}`
      );

      const productoApi = response.data;

      // Preferimos el producto completo que ya tenemos cargado
      // para mantener toda la información necesaria en el carrito.
      const producto =
        productos.find(
          (item) =>
            Number(item.id) === Number(productoApi.id)
        ) || productoApi;

      const agregado = agregarProducto(producto);

      if (agregado) {
        setMensajeCodigo(
          `✓ ${producto.nombre} agregado al carrito.`
        );
      }
    } catch (err) {
      console.error(err);

      if (err.response?.status === 404) {
        setMensajeCodigo(
          `No existe un producto activo con el código ${codigo}.`
        );
      } else {
        setMensajeCodigo(
          "No fue posible consultar el código de barras."
        );
      }
    } finally {
      setCodigoEscaneado("");
      setProcesandoCodigo(false);

      setTimeout(() => {
        inputCodigoRef.current?.focus();
      }, 50);
    }
  };

  const manejarSubmitCodigo = async (e) => {
    e.preventDefault();
    await buscarProductoPorCodigo();
  };

  const productosFiltrados = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase();

    return productos.filter((producto) => {
      if (!producto.activo) {
        return false;
      }

      if (!texto) {
        return true;
      }

      return (
        producto.nombre
          ?.toLowerCase()
          .includes(texto) ||
        producto.sku
          ?.toLowerCase()
          .includes(texto) ||
        producto.codigoBarras
          ?.toLowerCase()
          .includes(texto) ||
        producto.categoria?.nombre
          ?.toLowerCase()
          .includes(texto)
      );
    });
  }, [productos, busqueda]);

  const clientesFiltrados = useMemo(() => {
    const texto = busquedaCliente
      .trim()
      .toLowerCase();

    if (!texto) {
      return clientes;
    }

    return clientes.filter((cliente) => {
      return (
        cliente.nombre
          ?.toLowerCase()
          .includes(texto) ||
        cliente.identificacion
          ?.toLowerCase()
          .includes(texto) ||
        cliente.telefono
          ?.toLowerCase()
          .includes(texto)
      );
    });
  }, [clientes, busquedaCliente]);

  const resumen = useMemo(() => {
    let subtotal = 0;
    let impuesto = 0;

    carrito.forEach((item) => {
      const lineaSubtotal =
        Number(item.precio) *
        Number(item.cantidad);

      const lineaImpuesto =
        lineaSubtotal *
        (Number(item.impuestoPorcentaje) / 100);

      subtotal += lineaSubtotal;
      impuesto += lineaImpuesto;
    });

    return {
      subtotal,
      impuesto,
      total: subtotal + impuesto,
    };
  }, [carrito]);

  const formatearColones = (monto) => {
    return new Intl.NumberFormat(
      "es-CR",
      {
        style: "currency",
        currency: "CRC",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    ).format(Number(monto) || 0);
  };

  const abrirModalPago = () => {
    setErrorVenta("");
    setVentaExitosa(null);

    if (!sesionCaja) {
      setErrorVenta(
        "La caja seleccionada no tiene una sesión abierta."
      );
      return;
    }

    if (carrito.length === 0) {
      setErrorVenta(
        "Agrega al menos un producto al carrito."
      );
      return;
    }

    for (const item of carrito) {
      const stock =
        obtenerStockProducto(item.id);

      if (Number(item.cantidad) > stock) {
        setErrorVenta(
          `No hay suficiente stock de ${item.nombre}. Disponible: ${stock}.`
        );
        return;
      }
    }

    if (!metodoPagoSeleccionado &&
        metodosPago.length > 0) {
      setMetodoPagoSeleccionado(
        String(metodosPago[0].id)
      );
    }

    setMostrarModalPago(true);
  };

  const cerrarModalPago = () => {
    if (procesandoVenta) {
      return;
    }

    setMostrarModalPago(false);
    setErrorVenta("");

    setTimeout(() => {
      inputCodigoRef.current?.focus();
    }, 100);
  };

  const procesarVenta = async () => {
    if (!sesionCaja) {
      setErrorVenta(
        "No hay una sesión de caja abierta."
      );
      return;
    }

    if (!metodoPagoSeleccionado) {
      setErrorVenta(
        "Selecciona un método de pago."
      );
      return;
    }

    if (carrito.length === 0) {
      setErrorVenta(
        "No hay productos en el carrito."
      );
      return;
    }

    for (const item of carrito) {
      const stock =
        obtenerStockProducto(item.id);

      if (Number(item.cantidad) > stock) {
        setErrorVenta(
          `Stock insuficiente para ${item.nombre}. Disponible: ${stock}.`
        );
        return;
      }
    }

    try {
      setProcesandoVenta(true);
      setErrorVenta("");

      const payload = {
        cajaSesionId: sesionCaja.id,

        clienteId: clienteSeleccionado
          ? Number(clienteSeleccionado)
          : null,

        productos: carrito.map(
          (item) => ({
            productoId: item.id,
            cantidad: Number(item.cantidad),
          })
        ),

        pagos: [
          {
            metodoPagoId: Number(
              metodoPagoSeleccionado
            ),
            monto: Number(
              resumen.total.toFixed(2)
            ),
            referencia: null,
          },
        ],
      };

      const response = await api.post(
        "/Ventas",
        payload
      );

      setVentaExitosa(response.data);
      setCarrito([]);
      setMostrarModalPago(false);
      setBusquedaCliente("");
      setClienteSeleccionado("");

      const caja = cajas.find(
        (item) =>
          Number(item.id) ===
          Number(cajaSeleccionada)
      );

      if (caja) {
        await Promise.all([
          cargarProductos(),
          cargarInventario(
            caja.sucursalId
          ),
          buscarSesionAbierta(
            caja.id
          ),
        ]);
      } else {
        await cargarProductos();
      }

      setTimeout(() => {
        inputCodigoRef.current?.focus();
      }, 100);
    } catch (err) {
      console.error(err);

      const data = err.response?.data;

      if (typeof data === "string") {
        setErrorVenta(data);
      } else if (data?.message) {
        setErrorVenta(data.message);
      } else if (data?.title) {
        setErrorVenta(data.title);
      } else {
        setErrorVenta(
          "No fue posible procesar la venta."
        );
      }

      const caja = cajas.find(
        (item) =>
          Number(item.id) ===
          Number(cajaSeleccionada)
      );

      if (caja) {
        await cargarInventario(
          caja.sucursalId
        );
      }
    } finally {
      setProcesandoVenta(false);
    }
  };

  const cajaActual = cajas.find(
    (caja) =>
      Number(caja.id) ===
      Number(cajaSeleccionada)
  );

  return (
    <AppLayout>
      <div className="container-fluid px-0">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div>
            <h2 className="fw-bold mb-1">
              Punto de Venta
            </h2>

            <p className="text-secondary mb-0">
              Registra ventas, escanea productos y controla el stock en tiempo real.
            </p>
          </div>

          <div style={{ minWidth: "260px" }}>
            <label className="form-label fw-semibold mb-1">
              Caja
            </label>

            <select
              className="form-select"
              value={cajaSeleccionada}
              onChange={manejarCambioCaja}
              disabled={cargandoCaja}
            >
              <option value="">
                Seleccionar caja...
              </option>

              {cajas.map((caja) => (
                <option
                  key={caja.id}
                  value={caja.id}
                >
                  {caja.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        {errorCaja && (
          <div className="alert alert-warning">
            <i className="bi bi-cash-register me-2"></i>
            {errorCaja}
          </div>
        )}

        {errorInventario && (
          <div className="alert alert-warning">
            <i className="bi bi-box-seam me-2"></i>
            {errorInventario}
          </div>
        )}

        {avisoStock && (
          <div className="alert alert-warning">
            <i className="bi bi-exclamation-circle me-2"></i>
            {avisoStock}
          </div>
        )}

        {ventaExitosa && (
          <div className="alert alert-success d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <i className="bi bi-check-circle-fill me-2"></i>
              Venta procesada correctamente
              {ventaExitosa.numeroVenta
                ? ` · ${ventaExitosa.numeroVenta}`
                : ""}
            </div>

            <button
              type="button"
              className="btn-close"
              onClick={() =>
                setVentaExitosa(null)
              }
            />
          </div>
        )}

        <div className="row g-4">
          <div className="col-xl-8">
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                  <div>
                    <h5 className="fw-bold mb-1">
                      Escáner de código de barras
                    </h5>

                    <small className="text-secondary">
                      Escanea el producto o escribe el código y presiona Enter.
                    </small>
                  </div>

                  <span
                    className={`badge ${
                      sesionCaja
                        ? "text-bg-success"
                        : "text-bg-secondary"
                    }`}
                  >
                    {cargandoCaja
                      ? "Consultando caja..."
                      : sesionCaja
                      ? "Caja abierta"
                      : "Caja sin abrir"}
                  </span>
                </div>

                <form
                  onSubmit={manejarSubmitCodigo}
                >
                  <div className="input-group input-group-lg">
                    <span className="input-group-text bg-white">
                      <i className="bi bi-upc-scan"></i>
                    </span>

                    <input
                      ref={inputCodigoRef}
                      type="text"
                      className="form-control"
                      placeholder={
                        cajaSeleccionada
                          ? "Escanea aquí..."
                          : "Primero selecciona una caja"
                      }
                      value={codigoEscaneado}
                      onChange={(e) =>
                        setCodigoEscaneado(
                          e.target.value
                        )
                      }
                      disabled={
                        !cajaSeleccionada ||
                        procesandoCodigo ||
                        cargandoInventario
                      }
                      autoComplete="off"
                    />

                    <button
                      type="submit"
                      className="btn btn-dark px-4"
                      disabled={
                        !codigoEscaneado.trim() ||
                        procesandoCodigo ||
                        !cajaSeleccionada
                      }
                    >
                      {procesandoCodigo ? (
                        <span className="spinner-border spinner-border-sm" />
                      ) : (
                        <>
                          <i className="bi bi-search me-2"></i>
                          Buscar
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {mensajeCodigo && (
                  <div
                    className={`mt-3 small fw-semibold ${
                      mensajeCodigo.startsWith("✓")
                        ? "text-success"
                        : "text-danger"
                    }`}
                  >
                    {mensajeCodigo}
                  </div>
                )}

                {cajaActual && (
                  <div className="text-secondary small mt-2">
                    <i className="bi bi-shop me-1"></i>
                    Caja seleccionada:{" "}
                    <strong>
                      {cajaActual.nombre}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            <div className="card border-0 shadow-sm">
              <div className="card-body p-4">
                <div className="row g-3 align-items-center mb-4">
                  <div className="col-md-7">
                    <div className="input-group">
                      <span className="input-group-text bg-white">
                        <i className="bi bi-search"></i>
                      </span>

                      <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar por nombre, SKU o código..."
                        value={busqueda}
                        onChange={(e) =>
                          setBusqueda(
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="col-md-5 text-md-end">
                    <small className="text-secondary">
                      {productosFiltrados.length} productos
                    </small>
                  </div>
                </div>

                {cargando ? (
                  <div className="text-center py-5">
                    <div className="spinner-border" />
                    <p className="text-secondary mt-3 mb-0">
                      Cargando productos...
                    </p>
                  </div>
                ) : productosFiltrados.length === 0 ? (
                  <div className="text-center py-5">
                    <i
                      className="bi bi-box-seam text-secondary"
                      style={{ fontSize: "46px" }}
                    ></i>

                    <h5 className="mt-3">
                      No encontramos productos
                    </h5>
                  </div>
                ) : (
                  <div className="row g-3">
                    {productosFiltrados.map(
                      (producto) => {
                        const stock =
                          obtenerStockProducto(
                            producto.id
                          );

                        const agotado =
                          stock <= 0;

                        const deshabilitado =
                          !cajaSeleccionada ||
                          cargandoInventario ||
                          agotado;

                        return (
                          <div
                            className="col-sm-6 col-lg-4"
                            key={producto.id}
                          >
                            <button
                              type="button"
                              className="card h-100 w-100 border producto-pos text-start bg-white"
                              onClick={() =>
                                agregarProducto(
                                  producto
                                )
                              }
                              disabled={
                                deshabilitado
                              }
                            >
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                                  <span className="badge text-bg-light border">
                                    {producto.categoria
                                      ?.nombre ||
                                      "Producto"}
                                  </span>

                                  <span
                                    className={`badge ${
                                      agotado
                                        ? "text-bg-danger"
                                        : "text-bg-success"
                                    }`}
                                  >
                                    {agotado
                                      ? "AGOTADO"
                                      : `Stock: ${stock}`}
                                  </span>
                                </div>

                                <h6 className="fw-bold mb-1">
                                  {producto.nombre}
                                </h6>

                                {(producto.sku ||
                                  producto.codigoBarras) && (
                                  <div className="text-secondary small mb-3">
                                    {producto.sku && (
                                      <div>
                                        SKU:{" "}
                                        {producto.sku}
                                      </div>
                                    )}

                                    {producto.codigoBarras && (
                                      <div>
                                        Código:{" "}
                                        {
                                          producto.codigoBarras
                                        }
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="fw-bold fs-5 mt-auto">
                                  {formatearColones(
                                    producto.precio
                                  )}
                                </div>

                                <small className="text-secondary">
                                  +{" "}
                                  {producto.impuestoPorcentaje ||
                                    0}
                                  % IVA
                                </small>
                              </div>
                            </button>
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="col-xl-4">
            <div
              className="card border-0 shadow-sm"
              style={{
                position: "sticky",
                top: "90px",
              }}
            >
              <div className="card-header bg-white border-0 px-4 pt-4 pb-2">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="fw-bold mb-1">
                      Carrito
                    </h5>

                    <small className="text-secondary">
                      {carrito.reduce(
                        (total, item) =>
                          total +
                          Number(
                            item.cantidad
                          ),
                        0
                      )}{" "}
                      unidades
                    </small>
                  </div>

                  {carrito.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={limpiarCarrito}
                    >
                      <i className="bi bi-trash me-1"></i>
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              <div className="card-body px-4">
                {carrito.length === 0 ? (
                  <div className="text-center py-5">
                    <i
                      className="bi bi-cart3 text-secondary"
                      style={{
                        fontSize: "44px",
                      }}
                    ></i>

                    <p className="text-secondary mt-3 mb-0">
                      Escanea o selecciona productos para comenzar.
                    </p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {carrito.map((item) => {
                      const stock =
                        obtenerStockProducto(
                          item.id
                        );

                      return (
                        <div
                          key={item.id}
                          className="border-bottom pb-3"
                        >
                          <div className="d-flex justify-content-between gap-3">
                            <div className="min-w-0">
                              <div className="fw-semibold">
                                {item.nombre}
                              </div>

                              <small className="text-secondary">
                                {formatearColones(
                                  item.precio
                                )}{" "}
                                c/u
                              </small>
                            </div>

                            <button
                              type="button"
                              className="btn btn-sm btn-link text-danger p-0"
                              onClick={() =>
                                eliminarProducto(
                                  item.id
                                )
                              }
                            >
                              <i className="bi bi-x-lg"></i>
                            </button>
                          </div>

                          <div className="d-flex justify-content-between align-items-center mt-2">
                            <div className="btn-group btn-group-sm">
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() =>
                                  cambiarCantidad(
                                    item.id,
                                    -1
                                  )
                                }
                              >
                                <i className="bi bi-dash"></i>
                              </button>

                              <button
                                type="button"
                                className="btn btn-outline-secondary disabled"
                              >
                                {item.cantidad}
                              </button>

                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() =>
                                  cambiarCantidad(
                                    item.id,
                                    1
                                  )
                                }
                                disabled={
                                  Number(
                                    item.cantidad
                                  ) >= stock
                                }
                              >
                                <i className="bi bi-plus"></i>
                              </button>
                            </div>

                            <strong>
                              {formatearColones(
                                Number(
                                  item.precio
                                ) *
                                  Number(
                                    item.cantidad
                                  )
                              )}
                            </strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="border-top mt-4 pt-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-secondary">
                      Subtotal
                    </span>

                    <span>
                      {formatearColones(
                        resumen.subtotal
                      )}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between mb-3">
                    <span className="text-secondary">
                      IVA
                    </span>

                    <span>
                      {formatearColones(
                        resumen.impuesto
                      )}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center border-top pt-3">
                    <strong className="fs-5">
                      Total
                    </strong>

                    <strong className="fs-4">
                      {formatearColones(
                        resumen.total
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="card-footer bg-white border-0 p-4 pt-0">
                {!sesionCaja &&
                  cajaSeleccionada && (
                    <div className="alert alert-warning py-2 small">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      Debes abrir la caja antes de cobrar.
                    </div>
                  )}

                {errorVenta &&
                  !mostrarModalPago && (
                    <div className="alert alert-danger py-2 small">
                      {errorVenta}
                    </div>
                  )}

                <button
                  type="button"
                  className="btn btn-dark btn-lg w-100"
                  onClick={abrirModalPago}
                  disabled={
                    carrito.length === 0 ||
                    !sesionCaja ||
                    cargandoCaja
                  }
                >
                  <i className="bi bi-credit-card me-2"></i>
                  Cobrar{" "}
                  {carrito.length > 0 &&
                    formatearColones(
                      resumen.total
                    )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {mostrarModalPago && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-bold">
                      Cobrar venta
                    </h5>

                    <small className="text-secondary">
                      Selecciona cliente y método de pago.
                    </small>
                  </div>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={cerrarModalPago}
                    disabled={procesandoVenta}
                  />
                </div>

                <div className="modal-body p-4">
                  {errorVenta && (
                    <div className="alert alert-danger">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {errorVenta}
                    </div>
                  )}

                  <div className="row g-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Cliente
                      </label>

                      <input
                        type="text"
                        className="form-control mb-2"
                        placeholder="Buscar cliente..."
                        value={busquedaCliente}
                        onChange={(e) =>
                          setBusquedaCliente(
                            e.target.value
                          )
                        }
                      />

                      <select
                        className="form-select"
                        value={
                          clienteSeleccionado
                        }
                        onChange={(e) =>
                          setClienteSeleccionado(
                            e.target.value
                          )
                        }
                        disabled={
                          cargandoClientes
                        }
                      >
                        <option value="">
                          Consumidor final
                        </option>

                        {clientesFiltrados.map(
                          (cliente) => (
                            <option
                              key={
                                cliente.id
                              }
                              value={
                                cliente.id
                              }
                            >
                              {
                                cliente.nombre
                              }
                              {cliente.identificacion
                                ? ` - ${cliente.identificacion}`
                                : ""}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        Método de pago
                      </label>

                      <select
                        className="form-select"
                        value={
                          metodoPagoSeleccionado
                        }
                        onChange={(e) =>
                          setMetodoPagoSeleccionado(
                            e.target.value
                          )
                        }
                      >
                        <option value="">
                          Seleccionar...
                        </option>

                        {metodosPago.map(
                          (metodo) => (
                            <option
                              key={
                                metodo.id
                              }
                              value={
                                metodo.id
                              }
                            >
                              {
                                metodo.nombre
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="card bg-light border-0 mt-4">
                    <div className="card-body">
                      <div className="d-flex justify-content-between mb-2">
                        <span>
                          Subtotal
                        </span>

                        <span>
                          {formatearColones(
                            resumen.subtotal
                          )}
                        </span>
                      </div>

                      <div className="d-flex justify-content-between mb-2">
                        <span>IVA</span>

                        <span>
                          {formatearColones(
                            resumen.impuesto
                          )}
                        </span>
                      </div>

                      <div className="d-flex justify-content-between border-top pt-3 mt-3">
                        <strong className="fs-5">
                          Total
                        </strong>

                        <strong className="fs-4">
                          {formatearColones(
                            resumen.total
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={cerrarModalPago}
                    disabled={procesandoVenta}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="btn btn-dark px-4"
                    onClick={procesarVenta}
                    disabled={
                      procesandoVenta ||
                      !metodoPagoSeleccionado
                    }
                  >
                    {procesandoVenta ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-2"></i>
                        Confirmar venta
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            className="modal-backdrop fade show"
            onClick={cerrarModalPago}
          ></div>
        </>
      )}
    </AppLayout>
  );
}

export default PuntoVenta;