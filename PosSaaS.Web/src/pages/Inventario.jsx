import { useEffect, useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import api from "../services/api";

function Inventario() {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState("");
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState([]);

  const [cargandoSucursales, setCargandoSucursales] = useState(true);
  const [cargandoInventario, setCargandoInventario] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [mostrarModal, setMostrarModal] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState("ENTRADA");
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [formulario, setFormulario] = useState({
    cantidad: "",
    observacion: "",
  });

  useEffect(() => {
    cargarInicial();
  }, []);

  const cargarInicial = async () => {
    try {
      setCargandoSucursales(true);
      setError("");

      const [sucursalesResponse, productosResponse] = await Promise.all([
        api.get("/Sucursales"),
        api.get("/Productos"),
      ]);

      const sucursalesActivas = (sucursalesResponse.data || []).filter(
        (sucursal) => sucursal.activa
      );
      const productosActivos = (productosResponse.data || []).filter(
        (producto) => producto.activo
      );

      setSucursales(sucursalesActivas);
      setProductos(productosActivos);

      if (sucursalesActivas.length === 1) {
        const sucursal = sucursalesActivas[0];
        setSucursalSeleccionada(String(sucursal.id));
        await cargarInventario(sucursal.id);
      }
    } catch (err) {
      console.error(err);
      setError("No fue posible cargar la información inicial.");
    } finally {
      setCargandoSucursales(false);
    }
  };

  const cargarProductos = async () => {
    try {
      const response = await api.get("/Productos");
      setProductos((response.data || []).filter((producto) => producto.activo));
    } catch (err) {
      console.error(err);
    }
  };

  const cargarInventario = async (sucursalId) => {
    if (!sucursalId) {
      setInventario([]);
      return;
    }

    try {
      setCargandoInventario(true);
      setError("");
      const response = await api.get(`/Inventario/sucursal/${sucursalId}`);
      setInventario(response.data || []);
    } catch (err) {
      console.error(err);
      setInventario([]);
      setError("No fue posible cargar el inventario.");
    } finally {
      setCargandoInventario(false);
    }
  };

  const actualizarInventario = async () => {
    if (!sucursalSeleccionada) return;

    setMensaje("");
    await Promise.all([
      cargarInventario(Number(sucursalSeleccionada)),
      cargarProductos(),
    ]);
  };

  const manejarCambioSucursal = async (e) => {
    const sucursalId = e.target.value;
    setSucursalSeleccionada(sucursalId);
    setBusqueda("");
    setFiltroEstado("TODOS");
    setMensaje("");
    setError("");
    await cargarInventario(sucursalId);
  };

  const obtenerNombreProducto = (item) =>
    item.productoNombre || item.producto?.nombre || "Producto";

  const obtenerSku = (item) => item.sku || item.producto?.sku || "";

  const obtenerCodigo = (item) =>
    item.codigoBarras || item.producto?.codigoBarras || "";

  const obtenerCantidad = (item) => Number(item.cantidad) || 0;

  const obtenerStockMinimo = (item) => Number(item.stockMinimo) || 0;

  const inventarioCompleto = useMemo(() => {
    return productos.map((producto) => {
      const registro = inventario.find(
        (item) => Number(item.productoId) === Number(producto.id)
      );

      if (registro) {
        return {
          ...registro,
          productoId: producto.id,
          productoNombre: registro.producto || registro.productoNombre || producto.nombre,
          sku: registro.sku || producto.sku || "",
          codigoBarras: registro.codigoBarras || producto.codigoBarras || "",
          producto,
        };
      }

      return {
        id: `nuevo-${producto.id}`,
        productoId: producto.id,
        productoNombre: producto.nombre,
        sku: producto.sku || "",
        codigoBarras: producto.codigoBarras || "",
        cantidad: 0,
        stockMinimo: 0,
        producto,
      };
    });
  }, [productos, inventario]);

  const clasificarItem = (item) => {
    const cantidad = obtenerCantidad(item);
    const minimo = obtenerStockMinimo(item);

    if (cantidad <= 0) return "AGOTADO";
    if (minimo > 0 && cantidad <= minimo) return "BAJO";
    return "DISPONIBLE";
  };

  const inventarioFiltrado = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return inventarioCompleto
      .filter((item) => {
        if (filtroEstado === "TODOS") return true;
        return clasificarItem(item) === filtroEstado;
      })
      .filter((item) => {
        if (!texto) return true;

        return (
          obtenerNombreProducto(item).toLowerCase().includes(texto) ||
          obtenerSku(item).toLowerCase().includes(texto) ||
          obtenerCodigo(item).toLowerCase().includes(texto)
        );
      })
      .sort((a, b) => {
        const prioridad = { AGOTADO: 0, BAJO: 1, DISPONIBLE: 2 };
        const diferencia = prioridad[clasificarItem(a)] - prioridad[clasificarItem(b)];
        if (diferencia !== 0) return diferencia;
        return obtenerNombreProducto(a).localeCompare(obtenerNombreProducto(b), "es");
      });
  }, [inventarioCompleto, busqueda, filtroEstado]);

  const resumen = useMemo(() => {
    const agotados = inventarioCompleto.filter(
      (item) => clasificarItem(item) === "AGOTADO"
    ).length;
    const bajos = inventarioCompleto.filter(
      (item) => clasificarItem(item) === "BAJO"
    ).length;
    const disponibles = inventarioCompleto.filter(
      (item) => clasificarItem(item) === "DISPONIBLE"
    ).length;
    const unidades = inventarioCompleto.reduce(
      (total, item) => total + obtenerCantidad(item),
      0
    );

    return {
      total: inventarioCompleto.length,
      agotados,
      bajos,
      disponibles,
      unidades,
    };
  }, [inventarioCompleto]);

  const abrirMovimiento = (item, tipo) => {
    setProductoSeleccionado(item);
    setTipoMovimiento(tipo);
    setFormulario({ cantidad: "", observacion: "" });
    setError("");
    setMensaje("");
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) return;
    setMostrarModal(false);
    setProductoSeleccionado(null);
    setFormulario({ cantidad: "", observacion: "" });
    setError("");
  };

  const cambiarCampo = (e) => {
    const { name, value } = e.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
  };

  const guardarMovimiento = async (e) => {
    e.preventDefault();
    if (!productoSeleccionado) return;

    const cantidad = Number(formulario.cantidad);

    if (
      formulario.cantidad === "" ||
      Number.isNaN(cantidad) ||
      cantidad <= 0
    ) {
      setError("Ingresa una cantidad válida mayor a 0.");
      return;
    }

    if (
      tipoMovimiento === "SALIDA" &&
      cantidad > obtenerCantidad(productoSeleccionado)
    ) {
      setError("La salida no puede superar la existencia actual.");
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const payload = {
        sucursalId: Number(sucursalSeleccionada),
        productoId: Number(productoSeleccionado.productoId),
        cantidad,
        observacion: formulario.observacion.trim() || null,
      };

      const endpoint =
        tipoMovimiento === "ENTRADA"
          ? "/Inventario/entrada"
          : "/Inventario/salida";

      await api.post(endpoint, payload);

      setMensaje(
        tipoMovimiento === "ENTRADA"
          ? "Entrada de inventario registrada correctamente."
          : "Salida de inventario registrada correctamente."
      );

      setMostrarModal(false);
      setProductoSeleccionado(null);
      setFormulario({ cantidad: "", observacion: "" });

      await Promise.all([
        cargarInventario(Number(sucursalSeleccionada)),
        cargarProductos(),
      ]);
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      setError(
        typeof data === "string"
          ? data
          : data?.mensaje ||
              data?.message ||
              data?.title ||
              "No fue posible registrar el movimiento."
      );
    } finally {
      setGuardando(false);
    }
  };

  const sucursalActual = sucursales.find(
    (sucursal) => Number(sucursal.id) === Number(sucursalSeleccionada)
  );

  const filtros = [
    { id: "TODOS", texto: "Todos", cantidad: resumen.total, icono: "bi-grid" },
    {
      id: "BAJO",
      texto: "Bajo mínimo",
      cantidad: resumen.bajos,
      icono: "bi-exclamation-triangle",
    },
    {
      id: "AGOTADO",
      texto: "Agotados",
      cantidad: resumen.agotados,
      icono: "bi-x-octagon",
    },
    {
      id: "DISPONIBLE",
      texto: "Disponibles",
      cantidad: resumen.disponibles,
      icono: "bi-check-circle",
    },
  ];

  return (
    <AppLayout>
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Inventario</h2>
          <p className="text-secondary mb-0">
            Controla existencias y detecta rápidamente productos que requieren atención.
          </p>
        </div>

        <div className="d-flex flex-wrap gap-2 align-items-end">
          <div style={{ minWidth: "260px" }}>
            <label className="form-label fw-semibold mb-1">Sucursal</label>
            <select
              className="form-select"
              value={sucursalSeleccionada}
              onChange={manejarCambioSucursal}
              disabled={cargandoSucursales}
            >
              <option value="">Seleccionar sucursal...</option>
              {sucursales.map((sucursal) => (
                <option key={sucursal.id} value={sucursal.id}>
                  {sucursal.nombre}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-outline-dark"
            onClick={actualizarInventario}
            disabled={!sucursalSeleccionada || cargandoInventario}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Actualizar
          </button>
        </div>
      </div>

      {mensaje && (
        <div className="alert alert-success d-flex justify-content-between align-items-center gap-3">
          <div>
            <i className="bi bi-check-circle-fill me-2"></i>
            {mensaje}
          </div>
          <button type="button" className="btn-close" onClick={() => setMensaje("")} />
        </div>
      )}

      {error && !mostrarModal && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {sucursalSeleccionada && (
        <>
          {(resumen.agotados > 0 || resumen.bajos > 0) && (
            <div className="alert alert-warning d-flex align-items-start gap-3 mb-4">
              <i className="bi bi-exclamation-triangle-fill fs-5"></i>
              <div>
                <strong>Inventario requiere atención</strong>
                <div className="small mt-1">
                  {resumen.agotados} producto(s) agotado(s) y {resumen.bajos} bajo el mínimo configurado.
                </div>
              </div>
            </div>
          )}

          <div className="row g-3 mb-4">
            <div className="col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p className="text-secondary mb-2">Productos</p>
                      <h3 className="fw-bold mb-1">{resumen.total}</h3>
                      <small className="text-secondary">Productos activos</small>
                    </div>
                    <i className="bi bi-box-seam fs-2 text-secondary"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p className="text-secondary mb-2">Unidades</p>
                      <h3 className="fw-bold mb-1">{resumen.unidades}</h3>
                      <small className="text-secondary">Existencia acumulada</small>
                    </div>
                    <i className="bi bi-boxes fs-2 text-secondary"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p className="text-secondary mb-2">Bajo mínimo</p>
                      <h3 className="fw-bold mb-1">{resumen.bajos}</h3>
                      <small className="text-secondary">Requieren reposición</small>
                    </div>
                    <i className="bi bi-exclamation-triangle fs-2 text-warning"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-xl-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <p className="text-secondary mb-2">Agotados</p>
                      <h3 className="fw-bold mb-1">{resumen.agotados}</h3>
                      <small className="text-secondary">Sin existencias</small>
                    </div>
                    <i className="bi bi-x-octagon fs-2 text-danger"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          {!sucursalSeleccionada ? (
            <div className="text-center py-5">
              <i className="bi bi-shop fs-1 text-secondary"></i>
              <h5 className="mt-3">Selecciona una sucursal</h5>
              <p className="text-secondary mb-0">
                El inventario se administra de forma independiente por sucursal.
              </p>
            </div>
          ) : (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                <div>
                  <h5 className="fw-bold mb-1">Existencias</h5>
                  <small className="text-secondary">
                    {sucursalActual?.nombre || ""} · {inventarioFiltrado.length} producto(s) visibles
                  </small>
                </div>

                <div className="input-group" style={{ maxWidth: "430px" }}>
                  <span className="input-group-text bg-white">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Producto, SKU o código..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                  />
                  {busqueda && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setBusqueda("")}
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  )}
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 mb-4">
                {filtros.map((filtro) => (
                  <button
                    key={filtro.id}
                    type="button"
                    className={`btn btn-sm ${
                      filtroEstado === filtro.id ? "btn-dark" : "btn-outline-secondary"
                    }`}
                    onClick={() => setFiltroEstado(filtro.id)}
                  >
                    <i className={`bi ${filtro.icono} me-1`}></i>
                    {filtro.texto}
                    <span className="badge text-bg-light ms-2">{filtro.cantidad}</span>
                  </button>
                ))}
              </div>

              {cargandoInventario ? (
                <div className="text-center py-5">
                  <div className="spinner-border" role="status"></div>
                  <p className="text-secondary mt-3 mb-0">Cargando inventario...</p>
                </div>
              ) : inventarioFiltrado.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-search fs-1 text-secondary"></i>
                  <h5 className="mt-3">No hay productos para mostrar</h5>
                  <p className="text-secondary mb-3">
                    Cambia el filtro o ajusta la búsqueda.
                  </p>
                  <button
                    type="button"
                    className="btn btn-outline-dark btn-sm"
                    onClick={() => {
                      setBusqueda("");
                      setFiltroEstado("TODOS");
                    }}
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Producto</th>
                        <th>SKU / Código</th>
                        <th className="text-center">Existencia</th>
                        <th className="text-center">Mínimo</th>
                        <th className="text-center">Estado</th>
                        <th className="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventarioFiltrado.map((item) => {
                        const cantidad = obtenerCantidad(item);
                        const minimo = obtenerStockMinimo(item);
                        const estadoItem = clasificarItem(item);

                        return (
                          <tr key={item.id}>
                            <td>
                              <div className="fw-semibold">{obtenerNombreProducto(item)}</div>
                              {estadoItem !== "DISPONIBLE" && (
                                <small className="text-secondary">
                                  {estadoItem === "AGOTADO"
                                    ? "Reponer antes de vender"
                                    : `Quedan ${cantidad} unidad(es)`}
                                </small>
                              )}
                            </td>
                            <td>
                              {obtenerSku(item) ? (
                                <div className="small">
                                  <span className="text-secondary">SKU:</span> {obtenerSku(item)}
                                </div>
                              ) : null}
                              {obtenerCodigo(item) ? (
                                <div className="small">
                                  <span className="text-secondary">Código:</span> {obtenerCodigo(item)}
                                </div>
                              ) : null}
                              {!obtenerSku(item) && !obtenerCodigo(item) ? "-" : null}
                            </td>
                            <td className="text-center">
                              <span
                                className={`fw-bold fs-5 ${
                                  estadoItem === "AGOTADO"
                                    ? "text-danger"
                                    : estadoItem === "BAJO"
                                    ? "text-warning"
                                    : ""
                                }`}
                              >
                                {cantidad}
                              </span>
                            </td>
                            <td className="text-center">{minimo}</td>
                            <td className="text-center">
                              <span
                                className={`badge ${
                                  estadoItem === "AGOTADO"
                                    ? "text-bg-danger"
                                    : estadoItem === "BAJO"
                                    ? "text-bg-warning"
                                    : "text-bg-success"
                                }`}
                              >
                                {estadoItem === "AGOTADO"
                                  ? "Agotado"
                                  : estadoItem === "BAJO"
                                  ? "Bajo mínimo"
                                  : "Disponible"}
                              </span>
                            </td>
                            <td className="text-end">
                              <div className="btn-group">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-success"
                                  onClick={() => abrirMovimiento(item, "ENTRADA")}
                                >
                                  <i className="bi bi-plus-circle me-1"></i>
                                  Entrada
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => abrirMovimiento(item, "SALIDA")}
                                  disabled={cantidad <= 0}
                                >
                                  <i className="bi bi-dash-circle me-1"></i>
                                  Salida
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {mostrarModal && productoSeleccionado && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <form onSubmit={guardarMovimiento}>
                  <div className="modal-header">
                    <div>
                      <h5 className="modal-title fw-bold">
                        {tipoMovimiento === "ENTRADA"
                          ? "Registrar entrada"
                          : "Registrar salida"}
                      </h5>
                      <small className="text-secondary">
                        {obtenerNombreProducto(productoSeleccionado)}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={cerrarModal}
                      disabled={guardando}
                    />
                  </div>

                  <div className="modal-body p-4">
                    {error && (
                      <div className="alert alert-danger">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        {error}
                      </div>
                    )}

                    <div className="row g-3 mb-3">
                      <div className="col-6">
                        <small className="text-secondary d-block">Existencia actual</small>
                        <strong className="fs-4">
                          {obtenerCantidad(productoSeleccionado)}
                        </strong>
                      </div>
                      <div className="col-6">
                        <small className="text-secondary d-block">Stock mínimo</small>
                        <strong className="fs-4">
                          {obtenerStockMinimo(productoSeleccionado)}
                        </strong>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-semibold">Cantidad *</label>
                      <input
                        type="number"
                        className="form-control form-control-lg"
                        min="0.001"
                        step="0.001"
                        name="cantidad"
                        value={formulario.cantidad}
                        onChange={cambiarCampo}
                        autoFocus
                      />
                      {tipoMovimiento === "SALIDA" && (
                        <small className="text-secondary">
                          Máximo disponible: {obtenerCantidad(productoSeleccionado)}
                        </small>
                      )}
                    </div>

                    <div>
                      <label className="form-label fw-semibold">Observación</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        name="observacion"
                        value={formulario.observacion}
                        onChange={cambiarCampo}
                        placeholder={
                          tipoMovimiento === "ENTRADA"
                            ? "Ej: Compra a proveedor..."
                            : "Ej: Merma, daño, consumo interno..."
                        }
                      />
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={cerrarModal}
                      disabled={guardando}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={`btn ${
                        tipoMovimiento === "ENTRADA" ? "btn-success" : "btn-danger"
                      } px-4`}
                      disabled={guardando}
                    >
                      {guardando ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <i
                            className={`bi ${
                              tipoMovimiento === "ENTRADA"
                                ? "bi-plus-circle"
                                : "bi-dash-circle"
                            } me-2`}
                          ></i>
                          {tipoMovimiento === "ENTRADA"
                            ? "Registrar entrada"
                            : "Registrar salida"}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="modal-backdrop fade show" onClick={cerrarModal}></div>
        </>
      )}
    </AppLayout>
  );
}

export default Inventario;
