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

      const [sucursalesResponse, productosResponse] =
        await Promise.all([
          api.get("/Sucursales"),
          api.get("/Productos"),
        ]);

      const sucursalesActivas =
        sucursalesResponse.data.filter(
          (sucursal) => sucursal.activa
        );

      const productosActivos =
        productosResponse.data.filter(
          (producto) => producto.activo
        );

      setSucursales(sucursalesActivas);
      setProductos(productosActivos);

      if (sucursalesActivas.length === 1) {
        const sucursal = sucursalesActivas[0];

        setSucursalSeleccionada(
          String(sucursal.id)
        );

        await cargarInventario(
          sucursal.id
        );
      }
    } catch (err) {
      console.error(err);

      setError(
        "No fue posible cargar la información inicial."
      );
    } finally {
      setCargandoSucursales(false);
    }
  };

  const cargarProductos = async () => {
    try {
      const response =
        await api.get("/Productos");

      setProductos(
        response.data.filter(
          (producto) => producto.activo
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const cargarInventario = async (
    sucursalId
  ) => {
    if (!sucursalId) {
      setInventario([]);
      return;
    }

    try {
      setCargandoInventario(true);
      setError("");

      const response = await api.get(
        `/Inventario/sucursal/${sucursalId}`
      );

      setInventario(response.data);
    } catch (err) {
      console.error(err);

      setInventario([]);

      setError(
        "No fue posible cargar el inventario."
      );
    } finally {
      setCargandoInventario(false);
    }
  };

  const manejarCambioSucursal = async (
    e
  ) => {
    const sucursalId =
      e.target.value;

    setSucursalSeleccionada(
      sucursalId
    );

    setBusqueda("");
    setMensaje("");
    setError("");

    await cargarInventario(
      sucursalId
    );
  };

  /*
    Construimos una lista combinada:

    1. Partimos de TODOS los productos activos.
    2. Buscamos si cada producto ya tiene
       registro de inventario en la sucursal.
    3. Si no existe, lo mostramos con cantidad 0.

    Así un producto recién creado (por ejemplo Pepsi)
    aparece inmediatamente en Inventario y se le puede
    hacer su primera entrada.
  */
  const inventarioCompleto =
    useMemo(() => {
      return productos.map(
        (producto) => {
          const registro =
            inventario.find(
              (item) =>
                Number(
                  item.productoId
                ) ===
                Number(
                  producto.id
                )
            );

          if (registro) {
            return {
              ...registro,

              productoId:
                producto.id,

              productoNombre:
                registro.productoNombre ||
                producto.nombre,

              sku:
                registro.sku ||
                producto.sku ||
                "",

              codigoBarras:
                registro.codigoBarras ||
                producto.codigoBarras ||
                "",

              producto,
            };
          }

          return {
            id: `nuevo-${producto.id}`,

            productoId:
              producto.id,

            productoNombre:
              producto.nombre,

            sku:
              producto.sku ||
              "",

            codigoBarras:
              producto.codigoBarras ||
              "",

            cantidad: 0,

            stockMinimo: 0,

            producto,
          };
        }
      );
    }, [
      productos,
      inventario,
    ]);

  const inventarioFiltrado =
    useMemo(() => {
      const texto = busqueda
        .trim()
        .toLowerCase();

      if (!texto) {
        return inventarioCompleto;
      }

      return inventarioCompleto.filter(
        (item) => {
          const nombre =
            item.productoNombre
              ?.toLowerCase() ||
            item.producto?.nombre
              ?.toLowerCase() ||
            "";

          const sku =
            item.sku
              ?.toLowerCase() ||
            item.producto?.sku
              ?.toLowerCase() ||
            "";

          const codigo =
            item.codigoBarras
              ?.toLowerCase() ||
            item.producto
              ?.codigoBarras
              ?.toLowerCase() ||
            "";

          return (
            nombre.includes(texto) ||
            sku.includes(texto) ||
            codigo.includes(texto)
          );
        }
      );
    }, [
      inventarioCompleto,
      busqueda,
    ]);

  const obtenerNombreProducto = (
    item
  ) => {
    return (
      item.productoNombre ||
      item.producto?.nombre ||
      "Producto"
    );
  };

  const obtenerSku = (item) => {
    return (
      item.sku ||
      item.producto?.sku ||
      ""
    );
  };

  const obtenerCodigo = (
    item
  ) => {
    return (
      item.codigoBarras ||
      item.producto
        ?.codigoBarras ||
      ""
    );
  };

  const obtenerCantidad = (
    item
  ) => {
    return (
      Number(item.cantidad) ||
      0
    );
  };

  const obtenerStockMinimo = (
    item
  ) => {
    return (
      Number(
        item.stockMinimo
      ) || 0
    );
  };

  const abrirMovimiento = (
    item,
    tipo
  ) => {
    setProductoSeleccionado(
      item
    );

    setTipoMovimiento(tipo);

    setFormulario({
      cantidad: "",
      observacion: "",
    });

    setError("");
    setMensaje("");
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    if (guardando) {
      return;
    }

    setMostrarModal(false);

    setProductoSeleccionado(
      null
    );

    setFormulario({
      cantidad: "",
      observacion: "",
    });
  };

  const cambiarCampo = (e) => {
    const {
      name,
      value,
    } = e.target;

    setFormulario(
      (actual) => ({
        ...actual,
        [name]: value,
      })
    );
  };

  const guardarMovimiento =
    async (e) => {
      e.preventDefault();

      if (
        !productoSeleccionado
      ) {
        return;
      }

      const cantidad =
        Number(
          formulario.cantidad
        );

      if (
        formulario.cantidad ===
          "" ||
        Number.isNaN(
          cantidad
        ) ||
        cantidad <= 0
      ) {
        setError(
          "Ingresa una cantidad válida mayor a 0."
        );

        return;
      }

      try {
        setGuardando(true);
        setError("");
        setMensaje("");

        const payload = {
          sucursalId:
            Number(
              sucursalSeleccionada
            ),

          productoId:
            Number(
              productoSeleccionado
                .productoId
            ),

          cantidad,

          observacion:
            formulario.observacion
              .trim() ||
            null,
        };

        const endpoint =
          tipoMovimiento ===
          "ENTRADA"
            ? "/Inventario/entrada"
            : "/Inventario/salida";

        await api.post(
          endpoint,
          payload
        );

        setMensaje(
          tipoMovimiento ===
            "ENTRADA"
            ? "Entrada de inventario registrada correctamente."
            : "Salida de inventario registrada correctamente."
        );

        setMostrarModal(
          false
        );

        setProductoSeleccionado(
          null
        );

        setFormulario({
          cantidad: "",
          observacion: "",
        });

        await Promise.all([
          cargarInventario(
            Number(
              sucursalSeleccionada
            )
          ),
          cargarProductos(),
        ]);
      } catch (err) {
        console.error(err);

        const data =
          err.response?.data;

        setError(
          typeof data ===
            "string"
            ? data
            : data?.message ||
                data?.title ||
                "No fue posible registrar el movimiento."
        );
      } finally {
        setGuardando(
          false
        );
      }
    };

  const totalProductos =
    inventarioCompleto.length;

  const productosAgotados =
    inventarioCompleto.filter(
      (item) =>
        obtenerCantidad(
          item
        ) <= 0
    ).length;

  const productosBajoMinimo =
    inventarioCompleto.filter(
      (item) => {
        const cantidad =
          obtenerCantidad(
            item
          );

        const minimo =
          obtenerStockMinimo(
            item
          );

        return (
          minimo > 0 &&
          cantidad <= minimo
        );
      }
    ).length;

  const sucursalActual =
    sucursales.find(
      (sucursal) =>
        Number(
          sucursal.id
        ) ===
        Number(
          sucursalSeleccionada
        )
    );

  return (
    <AppLayout>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            Inventario
          </h2>

          <p className="text-secondary mb-0">
            Consulta existencias y registra entradas o salidas por sucursal.
          </p>
        </div>

        <div
          style={{
            minWidth:
              "280px",
          }}
        >
          <label className="form-label fw-semibold mb-1">
            Sucursal
          </label>

          <select
            className="form-select"
            value={
              sucursalSeleccionada
            }
            onChange={
              manejarCambioSucursal
            }
            disabled={
              cargandoSucursales
            }
          >
            <option value="">
              Seleccionar sucursal...
            </option>

            {sucursales.map(
              (sucursal) => (
                <option
                  key={
                    sucursal.id
                  }
                  value={
                    sucursal.id
                  }
                >
                  {
                    sucursal.nombre
                  }
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {mensaje && (
        <div className="alert alert-success d-flex justify-content-between align-items-center">
          <div>
            <i className="bi bi-check-circle-fill me-2"></i>
            {mensaje}
          </div>

          <button
            type="button"
            className="btn-close"
            onClick={() =>
              setMensaje("")
            }
          />
        </div>
      )}

      {error &&
        !mostrarModal && (
          <div className="alert alert-danger">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

      {sucursalSeleccionada && (
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="text-secondary small">
                      Productos
                    </div>

                    <div className="fs-3 fw-bold">
                      {
                        totalProductos
                      }
                    </div>
                  </div>

                  <div className="fs-2 text-secondary">
                    <i className="bi bi-box-seam"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="text-secondary small">
                      Bajo mínimo
                    </div>

                    <div className="fs-3 fw-bold">
                      {
                        productosBajoMinimo
                      }
                    </div>
                  </div>

                  <div className="fs-2 text-warning">
                    <i className="bi bi-exclamation-triangle"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="text-secondary small">
                      Agotados
                    </div>

                    <div className="fs-3 fw-bold">
                      {
                        productosAgotados
                      }
                    </div>
                  </div>

                  <div className="fs-2 text-danger">
                    <i className="bi bi-x-octagon"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          {!sucursalSeleccionada ? (
            <div className="text-center py-5">
              <i
                className="bi bi-shop text-secondary"
                style={{
                  fontSize:
                    "48px",
                }}
              ></i>

              <h5 className="mt-3">
                Selecciona una sucursal
              </h5>

              <p className="text-secondary mb-0">
                El inventario se administra de forma independiente por sucursal.
              </p>
            </div>
          ) : (
            <>
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                <div>
                  <h5 className="fw-bold mb-1">
                    Existencias
                  </h5>

                  <small className="text-secondary">
                    {sucursalActual?.nombre ||
                      ""}
                  </small>
                </div>

                <div
                  className="input-group"
                  style={{
                    maxWidth:
                      "420px",
                  }}
                >
                  <span className="input-group-text bg-white">
                    <i className="bi bi-search"></i>
                  </span>

                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar por producto, SKU o código..."
                    value={
                      busqueda
                    }
                    onChange={(
                      e
                    ) =>
                      setBusqueda(
                        e.target
                          .value
                      )
                    }
                  />

                  {busqueda && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() =>
                        setBusqueda(
                          ""
                        )
                      }
                    >
                      <i className="bi bi-x-lg"></i>
                    </button>
                  )}
                </div>
              </div>

              {cargandoInventario ? (
                <div className="text-center py-5">
                  <div className="spinner-border" />

                  <p className="text-secondary mt-3 mb-0">
                    Cargando inventario...
                  </p>
                </div>
              ) : inventarioFiltrado.length ===
                0 ? (
                <div className="text-center py-5">
                  <i
                    className="bi bi-box text-secondary"
                    style={{
                      fontSize:
                        "48px",
                    }}
                  ></i>

                  <h5 className="mt-3">
                    No hay productos para mostrar
                  </h5>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>
                          Producto
                        </th>

                        <th>
                          SKU / Código
                        </th>

                        <th className="text-center">
                          Existencia
                        </th>

                        <th className="text-center">
                          Stock mínimo
                        </th>

                        <th className="text-center">
                          Estado
                        </th>

                        <th className="text-end">
                          Acciones
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {inventarioFiltrado.map(
                        (
                          item
                        ) => {
                          const cantidad =
                            obtenerCantidad(
                              item
                            );

                          const minimo =
                            obtenerStockMinimo(
                              item
                            );

                          const agotado =
                            cantidad <=
                            0;

                          const bajoMinimo =
                            !agotado &&
                            minimo >
                              0 &&
                            cantidad <=
                              minimo;

                          return (
                            <tr
                              key={
                                item.id
                              }
                            >
                              <td>
                                <div className="fw-semibold">
                                  {obtenerNombreProducto(
                                    item
                                  )}
                                </div>
                              </td>

                              <td>
                                {obtenerSku(
                                  item
                                ) && (
                                  <div>
                                    <small className="text-secondary">
                                      SKU
                                    </small>

                                    <div>
                                      {obtenerSku(
                                        item
                                      )}
                                    </div>
                                  </div>
                                )}

                                {obtenerCodigo(
                                  item
                                ) && (
                                  <div
                                    className={
                                      obtenerSku(
                                        item
                                      )
                                        ? "mt-1"
                                        : ""
                                    }
                                  >
                                    <small className="text-secondary">
                                      Código
                                    </small>

                                    <div>
                                      {obtenerCodigo(
                                        item
                                      )}
                                    </div>
                                  </div>
                                )}

                                {!obtenerSku(
                                  item
                                ) &&
                                  !obtenerCodigo(
                                    item
                                  ) &&
                                  "-"}
                              </td>

                              <td className="text-center">
                                <span className="fw-bold fs-5">
                                  {
                                    cantidad
                                  }
                                </span>
                              </td>

                              <td className="text-center">
                                {
                                  minimo
                                }
                              </td>

                              <td className="text-center">
                                <span
                                  className={`badge ${
                                    agotado
                                      ? "text-bg-danger"
                                      : bajoMinimo
                                      ? "text-bg-warning"
                                      : "text-bg-success"
                                  }`}
                                >
                                  {agotado
                                    ? "Agotado"
                                    : bajoMinimo
                                    ? "Bajo mínimo"
                                    : "Disponible"}
                                </span>
                              </td>

                              <td className="text-end">
                                <div className="btn-group">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-success"
                                    title="Registrar entrada"
                                    onClick={() =>
                                      abrirMovimiento(
                                        item,
                                        "ENTRADA"
                                      )
                                    }
                                  >
                                    <i className="bi bi-box-arrow-in-down me-1"></i>
                                    Entrada
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    title="Registrar salida"
                                    onClick={() =>
                                      abrirMovimiento(
                                        item,
                                        "SALIDA"
                                      )
                                    }
                                    disabled={
                                      cantidad <=
                                      0
                                    }
                                  >
                                    <i className="bi bi-box-arrow-up me-1"></i>
                                    Salida
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {mostrarModal &&
        productoSeleccionado && (
          <>
            <div
              className="modal fade show d-block"
              tabIndex="-1"
            >
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow">
                  <form
                    onSubmit={
                      guardarMovimiento
                    }
                  >
                    <div className="modal-header">
                      <div>
                        <h5 className="modal-title fw-bold">
                          {tipoMovimiento ===
                          "ENTRADA"
                            ? "Registrar entrada"
                            : "Registrar salida"}
                        </h5>

                        <small className="text-secondary">
                          {obtenerNombreProducto(
                            productoSeleccionado
                          )}
                        </small>
                      </div>

                      <button
                        type="button"
                        className="btn-close"
                        onClick={
                          cerrarModal
                        }
                        disabled={
                          guardando
                        }
                      />
                    </div>

                    <div className="modal-body p-4">
                      {error && (
                        <div className="alert alert-danger">
                          <i className="bi bi-exclamation-triangle me-2"></i>
                          {
                            error
                          }
                        </div>
                      )}

                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Existencia actual
                        </label>

                        <div className="form-control bg-light">
                          {obtenerCantidad(
                            productoSeleccionado
                          )}
                        </div>
                      </div>

                      <div className="mb-3">
                        <label className="form-label fw-semibold">
                          Cantidad *
                        </label>

                        <input
                          type="number"
                          className="form-control"
                          min="0.001"
                          step="0.001"
                          name="cantidad"
                          value={
                            formulario.cantidad
                          }
                          onChange={
                            cambiarCampo
                          }
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="form-label fw-semibold">
                          Observación
                        </label>

                        <textarea
                          className="form-control"
                          rows="3"
                          name="observacion"
                          value={
                            formulario.observacion
                          }
                          onChange={
                            cambiarCampo
                          }
                          placeholder={
                            tipoMovimiento ===
                            "ENTRADA"
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
                        onClick={
                          cerrarModal
                        }
                        disabled={
                          guardando
                        }
                      >
                        Cancelar
                      </button>

                      <button
                        type="submit"
                        className={`btn ${
                          tipoMovimiento ===
                          "ENTRADA"
                            ? "btn-success"
                            : "btn-danger"
                        } px-4`}
                        disabled={
                          guardando
                        }
                      >
                        {guardando ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <i
                              className={`bi ${
                                tipoMovimiento ===
                                "ENTRADA"
                                  ? "bi-plus-circle"
                                  : "bi-dash-circle"
                              } me-2`}
                            ></i>

                            {tipoMovimiento ===
                            "ENTRADA"
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

            <div
              className="modal-backdrop fade show"
              onClick={
                cerrarModal
              }
            ></div>
          </>
        )}
    </AppLayout>
  );
}

export default Inventario;