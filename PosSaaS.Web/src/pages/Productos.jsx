import { useEffect, useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import api from "../services/api";

function Productos() {
  const rol = localStorage.getItem("rol") || "Usuario";
  const esAdmin = rol === "Admin";

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [todasCategorias, setTodasCategorias] = useState([]);

  const [mostrarModalCategorias, setMostrarModalCategorias] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState(null);
  const [nombreCategoria, setNombreCategoria] = useState("");
  const [guardandoCategoria, setGuardandoCategoria] = useState(false);
  const [errorCategoria, setErrorCategoria] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [mostrarModal, setMostrarModal] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);

  const [formulario, setFormulario] = useState({
    categoriaId: "",
    nombre: "",
    descripcion: "",
    sku: "",
    codigoBarras: "",
    costo: "",
    precio: "",
    impuestoPorcentaje: "13",
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError("");

      const [productosResponse, categoriasResponse] =
        await Promise.all([
          api.get("/Productos"),
          api.get("/Categorias"),
        ]);

      setProductos(productosResponse.data);

      setTodasCategorias(categoriasResponse.data || []);

      setCategorias(
        (categoriasResponse.data || []).filter(
          (categoria) => categoria.activa
        )
      );
    } catch (err) {
      console.error(err);

      setError(
        "No fue posible cargar los productos."
      );
    } finally {
      setCargando(false);
    }
  };

  const categoriasFormulario = useMemo(() => {
    if (!productoEditando) {
      return categorias;
    }

    const categoriaIdActual = Number(
      productoEditando.categoriaId ??
        productoEditando.categoria?.id ??
        0
    );

    const categoriaActual = todasCategorias.find(
      (categoria) =>
        Number(categoria.id) === categoriaIdActual
    );

    if (
      categoriaActual &&
      !categorias.some(
        (categoria) =>
          Number(categoria.id) === categoriaIdActual
      )
    ) {
      return [...categorias, categoriaActual].sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
      );
    }

    return categorias;
  }, [categorias, todasCategorias, productoEditando]);

  const productosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return productos;
    }

    return productos.filter((producto) => {
      const nombre =
        producto.nombre?.toLowerCase() || "";

      const sku =
        producto.sku?.toLowerCase() || "";

      const codigo =
        producto.codigoBarras?.toLowerCase() || "";

      const categoria =
        producto.categoriaNombre?.toLowerCase() ||
        producto.categoria?.nombre?.toLowerCase() ||
        "";

      return (
        nombre.includes(texto) ||
        sku.includes(texto) ||
        codigo.includes(texto) ||
        categoria.includes(texto)
      );
    });
  }, [productos, busqueda]);

  const limpiarFormulario = () => {
    setFormulario({
      categoriaId: "",
      nombre: "",
      descripcion: "",
      sku: "",
      codigoBarras: "",
      costo: "",
      precio: "",
      impuestoPorcentaje: "13",
    });
  };

  const abrirNuevoProducto = () => {
    setProductoEditando(null);
    limpiarFormulario();
    setError("");
    setMensaje("");
    setMostrarModal(true);
  };

  const abrirEditarProducto = (producto) => {
    setProductoEditando(producto);

    setFormulario({
      categoriaId: String(
        producto.categoriaId ??
          producto.categoria?.id ??
          ""
      ),
      nombre: producto.nombre || "",
      descripcion: producto.descripcion || "",
      sku: producto.sku || "",
      codigoBarras:
        producto.codigoBarras || "",
      costo: String(producto.costo ?? ""),
      precio: String(producto.precio ?? ""),
      impuestoPorcentaje: String(
        producto.impuestoPorcentaje ?? 13
      ),
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
    setProductoEditando(null);
    limpiarFormulario();
  };

  const cambiarCampo = (e) => {
    const { name, value } = e.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  const validarFormulario = () => {
    if (!formulario.categoriaId) {
      return "Selecciona una categoría.";
    }

    if (!formulario.nombre.trim()) {
      return "El nombre es obligatorio.";
    }

    const costo = Number(formulario.costo);
    const precio = Number(formulario.precio);
    const impuesto = Number(
      formulario.impuestoPorcentaje
    );

    if (
      formulario.costo === "" ||
      Number.isNaN(costo) ||
      costo < 0
    ) {
      return "Ingresa un costo válido.";
    }

    if (
      formulario.precio === "" ||
      Number.isNaN(precio) ||
      precio < 0
    ) {
      return "Ingresa un precio válido.";
    }

    if (
      formulario.impuestoPorcentaje === "" ||
      Number.isNaN(impuesto) ||
      impuesto < 0
    ) {
      return "Ingresa un impuesto válido.";
    }

    return "";
  };

  const guardarProducto = async (e) => {
    e.preventDefault();

    const validacion =
      validarFormulario();

    if (validacion) {
      setError(validacion);
      return;
    }

    try {
      setGuardando(true);
      setError("");
      setMensaje("");

      const payload = {
        categoriaId: Number(
          formulario.categoriaId
        ),

        nombre: formulario.nombre.trim(),

        descripcion:
          formulario.descripcion.trim() ||
          null,

        sku:
          formulario.sku.trim() ||
          null,

        codigoBarras:
          formulario.codigoBarras.trim() ||
          null,

        costo: Number(
          formulario.costo
        ),

        precio: Number(
          formulario.precio
        ),

        impuestoPorcentaje: Number(
          formulario.impuestoPorcentaje
        ),
      };

      if (productoEditando) {
        await api.put(
          `/Productos/${productoEditando.id}`,
          payload
        );

        setMensaje(
          "Producto actualizado correctamente."
        );
      } else {
        await api.post(
          "/Productos",
          payload
        );

        setMensaje(
          "Producto creado correctamente."
        );
      }

      setMostrarModal(false);
      setProductoEditando(null);
      limpiarFormulario();

      await cargarDatos();
    } catch (err) {
      console.error(err);

      const data = err.response?.data;

      if (typeof data === "string") {
        setError(data);
      } else if (data?.message) {
        setError(data.message);
      } else if (data?.title) {
        setError(data.title);
      } else {
        setError(
          "No fue posible guardar el producto."
        );
      }
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (producto) => {
    try {
      setError("");
      setMensaje("");

      await api.patch(
        `/Productos/${producto.id}/estado`,
        null,
        {
          params: {
            activo: !producto.activo,
          },
        }
      );

      setMensaje(
        producto.activo
          ? "Producto desactivado."
          : "Producto activado."
      );

      await cargarDatos();
    } catch (err) {
      console.error(err);

      const data = err.response?.data;

      setError(
        typeof data === "string"
          ? data
          : "No fue posible cambiar el estado del producto."
      );
    }
  };

  const abrirCategorias = () => {
    setCategoriaEditando(null);
    setNombreCategoria("");
    setErrorCategoria("");
    setMostrarModalCategorias(true);
  };

  const cerrarCategorias = () => {
    if (guardandoCategoria) return;

    setMostrarModalCategorias(false);
    setCategoriaEditando(null);
    setNombreCategoria("");
    setErrorCategoria("");
  };

  const editarCategoria = (categoria) => {
    setCategoriaEditando(categoria);
    setNombreCategoria(categoria.nombre || "");
    setErrorCategoria("");
  };

  const cancelarEdicionCategoria = () => {
    setCategoriaEditando(null);
    setNombreCategoria("");
    setErrorCategoria("");
  };

  const guardarCategoria = async (e) => {
    e.preventDefault();

    const nombre = nombreCategoria.trim();

    if (!nombre) {
      setErrorCategoria("El nombre de la categoría es obligatorio.");
      return;
    }

    try {
      setGuardandoCategoria(true);
      setErrorCategoria("");

      if (categoriaEditando) {
        await api.put(
          `/Categorias/${categoriaEditando.id}`,
          { nombre }
        );

        setMensaje("Categoría actualizada correctamente.");
      } else {
        await api.post("/Categorias", { nombre });
        setMensaje("Categoría creada correctamente.");
      }

      setCategoriaEditando(null);
      setNombreCategoria("");

      await cargarDatos();
    } catch (err) {
      console.error(err);

      const data = err.response?.data;

      setErrorCategoria(
        typeof data === "string"
          ? data
          : data?.message ||
            data?.title ||
            "No fue posible guardar la categoría."
      );
    } finally {
      setGuardandoCategoria(false);
    }
  };

  const cambiarEstadoCategoria = async (categoria) => {
    try {
      setGuardandoCategoria(true);
      setErrorCategoria("");

      await api.patch(
        `/Categorias/${categoria.id}/estado`,
        null,
        {
          params: {
            activa: !categoria.activa,
          },
        }
      );

      setMensaje(
        categoria.activa
          ? "Categoría desactivada correctamente."
          : "Categoría activada correctamente."
      );

      if (
        categoriaEditando &&
        categoriaEditando.id === categoria.id
      ) {
        cancelarEdicionCategoria();
      }

      await cargarDatos();
    } catch (err) {
      console.error(err);

      const data = err.response?.data;

      setErrorCategoria(
        typeof data === "string"
          ? data
          : "No fue posible cambiar el estado de la categoría."
      );
    } finally {
      setGuardandoCategoria(false);
    }
  };

  const obtenerCategoria = (producto) => {
    if (producto.categoriaNombre) {
      return producto.categoriaNombre;
    }

    if (producto.categoria?.nombre) {
      return producto.categoria.nombre;
    }

    const categoria = categorias.find(
      (item) =>
        Number(item.id) ===
        Number(producto.categoriaId)
    );

    return categoria?.nombre || "-";
  };

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

  return (
    <AppLayout>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">
            Productos
          </h2>

          <p className="text-secondary mb-0">
            Administra el catálogo de productos del negocio.
          </p>
        </div>

        {esAdmin && (
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline-dark"
              onClick={abrirCategorias}
            >
              <i className="bi bi-tags me-2"></i>
              Categorías
            </button>

            <button
              type="button"
              className="btn btn-dark"
              onClick={abrirNuevoProducto}
            >
              <i className="bi bi-plus-lg me-2"></i>
              Nuevo producto
            </button>
          </div>
        )}
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

      {error && !mostrarModal && (
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-body p-4">
          <div className="row g-3 align-items-center mb-4">
            <div className="col-md-8 col-lg-6">
              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search"></i>
                </span>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por nombre, categoría, SKU o código..."
                  value={busqueda}
                  onChange={(e) =>
                    setBusqueda(
                      e.target.value
                    )
                  }
                />

                {busqueda && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() =>
                      setBusqueda("")
                    }
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                )}
              </div>
            </div>

            <div className="col-md-4 col-lg-6 text-md-end">
              <span className="text-secondary">
                {productosFiltrados.length}{" "}
                {productosFiltrados.length === 1
                  ? "producto"
                  : "productos"}
              </span>
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
                style={{
                  fontSize: "48px",
                }}
              ></i>

              <h5 className="mt-3">
                No encontramos productos
              </h5>

              <p className="text-secondary">
                Puedes crear el primero desde el botón Nuevo producto.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>SKU / Código</th>
                    <th className="text-end">
                      Costo
                    </th>
                    <th className="text-end">
                      Precio
                    </th>
                    <th className="text-center">
                      IVA
                    </th>
                    <th className="text-center">
                      Estado
                    </th>
                    {esAdmin && (
                      <th className="text-end">
                        Acciones
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {productosFiltrados.map(
                    (producto) => (
                      <tr key={producto.id}>
                        <td>
                          <div className="fw-semibold">
                            {producto.nombre}
                          </div>

                          {producto.descripcion && (
                            <small className="text-secondary">
                              {
                                producto.descripcion
                              }
                            </small>
                          )}
                        </td>

                        <td>
                          {obtenerCategoria(
                            producto
                          )}
                        </td>

                        <td>
                          {producto.sku ? (
                            <div>
                              <small className="text-secondary">
                                SKU
                              </small>

                              <div>
                                {producto.sku}
                              </div>
                            </div>
                          ) : null}

                          <div
                            className={
                              producto.sku
                                ? "mt-1"
                                : ""
                            }
                          >
                            <small className="text-secondary">
                              Código de barras
                            </small>

                            <div>
                              {producto.codigoBarras || "Sin código"}
                            </div>
                          </div>
                        </td>

                        <td className="text-end">
                          {formatearColones(
                            producto.costo
                          )}
                        </td>

                        <td className="text-end fw-semibold">
                          {formatearColones(
                            producto.precio
                          )}
                        </td>

                        <td className="text-center">
                          {
                            producto.impuestoPorcentaje
                          }
                          %
                        </td>

                        <td className="text-center">
                          <span
                            className={`badge ${
                              producto.activo
                                ? "text-bg-success"
                                : "text-bg-secondary"
                            }`}
                          >
                            {producto.activo
                              ? "Activo"
                              : "Inactivo"}
                          </span>
                        </td>

                        {esAdmin && (
                          <td className="text-end">
                            <div className="btn-group">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                title="Editar"
                                onClick={() =>
                                  abrirEditarProducto(
                                    producto
                                  )
                                }
                              >
                                <i className="bi bi-pencil"></i>
                              </button>

                              <button
                                type="button"
                                className={`btn btn-sm ${
                                  producto.activo
                                    ? "btn-outline-danger"
                                    : "btn-outline-success"
                                }`}
                                title={
                                  producto.activo
                                    ? "Desactivar"
                                    : "Activar"
                                }
                                onClick={() =>
                                  cambiarEstado(
                                    producto
                                  )
                                }
                              >
                                <i
                                  className={`bi ${
                                    producto.activo
                                      ? "bi-slash-circle"
                                      : "bi-check-circle"
                                  }`}
                                ></i>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {esAdmin && mostrarModalCategorias && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
          >
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content border-0 shadow">
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-bold">
                      Categorías
                    </h5>
                    <small className="text-secondary">
                      Administra las categorías disponibles para tus productos.
                    </small>
                  </div>

                  <button
                    type="button"
                    className="btn-close"
                    onClick={cerrarCategorias}
                    disabled={guardandoCategoria}
                  />
                </div>

                <div className="modal-body p-4">
                  {errorCategoria && (
                    <div className="alert alert-danger">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {errorCategoria}
                    </div>
                  )}

                  <form
                    onSubmit={guardarCategoria}
                    className="card border-0 bg-light mb-4"
                  >
                    <div className="card-body">
                      <label className="form-label fw-semibold">
                        {categoriaEditando
                          ? "Editar categoría"
                          : "Nueva categoría"}
                      </label>

                      <div className="d-flex flex-column flex-md-row gap-2">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Ej. Bebidas, Alimentos, Servicios..."
                          value={nombreCategoria}
                          onChange={(e) =>
                            setNombreCategoria(e.target.value)
                          }
                          disabled={guardandoCategoria}
                          autoFocus
                        />

                        <button
                          type="submit"
                          className="btn btn-dark px-4"
                          disabled={guardandoCategoria}
                        >
                          {guardandoCategoria ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : categoriaEditando ? (
                            <>
                              <i className="bi bi-check-lg me-2"></i>
                              Guardar
                            </>
                          ) : (
                            <>
                              <i className="bi bi-plus-lg me-2"></i>
                              Agregar
                            </>
                          )}
                        </button>

                        {categoriaEditando && (
                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={cancelarEdicionCategoria}
                            disabled={guardandoCategoria}
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </form>

                  {todasCategorias.length === 0 ? (
                    <div className="text-center py-4">
                      <i className="bi bi-tags fs-1 text-secondary"></i>
                      <h6 className="mt-3 mb-1">
                        Todavía no hay categorías
                      </h6>
                      <p className="text-secondary mb-0">
                        Agrega la primera categoría arriba.
                      </p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Categoría</th>
                            <th className="text-center">
                              Estado
                            </th>
                            <th className="text-end">
                              Acciones
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {todasCategorias.map((categoria) => (
                            <tr key={categoria.id}>
                              <td className="fw-semibold">
                                {categoria.nombre}
                              </td>

                              <td className="text-center">
                                <span
                                  className={`badge ${
                                    categoria.activa
                                      ? "text-bg-success"
                                      : "text-bg-secondary"
                                  }`}
                                >
                                  {categoria.activa
                                    ? "Activa"
                                    : "Inactiva"}
                                </span>
                              </td>

                              <td className="text-end">
                                <div className="btn-group">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-secondary"
                                    title="Editar"
                                    onClick={() =>
                                      editarCategoria(categoria)
                                    }
                                    disabled={guardandoCategoria}
                                  >
                                    <i className="bi bi-pencil"></i>
                                  </button>

                                  <button
                                    type="button"
                                    className={`btn btn-sm ${
                                      categoria.activa
                                        ? "btn-outline-danger"
                                        : "btn-outline-success"
                                    }`}
                                    title={
                                      categoria.activa
                                        ? "Desactivar"
                                        : "Activar"
                                    }
                                    onClick={() =>
                                      cambiarEstadoCategoria(
                                        categoria
                                      )
                                    }
                                    disabled={guardandoCategoria}
                                  >
                                    <i
                                      className={`bi ${
                                        categoria.activa
                                          ? "bi-slash-circle"
                                          : "bi-check-circle"
                                      }`}
                                    ></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={cerrarCategorias}
                    disabled={guardandoCategoria}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div
            className="modal-backdrop fade show"
            onClick={cerrarCategorias}
          ></div>
        </>
      )}

      {esAdmin && mostrarModal && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex="-1"
          >
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <form onSubmit={guardarProducto}>
                  <div className="modal-header">
                    <div>
                      <h5 className="modal-title fw-bold">
                        {productoEditando
                          ? "Editar producto"
                          : "Nuevo producto"}
                      </h5>

                      <small className="text-secondary">
                        Completa la información del producto.
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

                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Nombre *
                        </label>

                        <input
                          type="text"
                          className="form-control"
                          name="nombre"
                          value={
                            formulario.nombre
                          }
                          onChange={
                            cambiarCampo
                          }
                          autoFocus
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Categoría *
                        </label>

                        <select
                          className="form-select"
                          name="categoriaId"
                          value={
                            formulario.categoriaId
                          }
                          onChange={
                            cambiarCampo
                          }
                        >
                          <option value="">
                            Seleccionar...
                          </option>

                          {categoriasFormulario.map(
                            (categoria) => (
                              <option
                                key={
                                  categoria.id
                                }
                                value={
                                  categoria.id
                                }
                              >
                                {
                                  categoria.nombre
                                }
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-semibold">
                          Descripción
                        </label>

                        <textarea
                          className="form-control"
                          rows="2"
                          name="descripcion"
                          value={
                            formulario.descripcion
                          }
                          onChange={
                            cambiarCampo
                          }
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          SKU
                        </label>

                        <input
                          type="text"
                          className="form-control"
                          name="sku"
                          value={formulario.sku}
                          onChange={
                            cambiarCampo
                          }
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-semibold">
                          Código de barras
                        </label>

                        <input
                          type="text"
                          className="form-control"
                          name="codigoBarras"
                          value={
                            formulario.codigoBarras
                          }
                          onChange={
                            cambiarCampo
                          }
                        />
                      </div>

                      <div className="col-md-4">
                        <label className="form-label fw-semibold">
                          Costo *
                        </label>

                        <div className="input-group">
                          <span className="input-group-text">
                            ₡
                          </span>

                          <input
                            type="number"
                            className="form-control"
                            min="0"
                            step="0.01"
                            name="costo"
                            value={
                              formulario.costo
                            }
                            onChange={
                              cambiarCampo
                            }
                          />
                        </div>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label fw-semibold">
                          Precio *
                        </label>

                        <div className="input-group">
                          <span className="input-group-text">
                            ₡
                          </span>

                          <input
                            type="number"
                            className="form-control"
                            min="0"
                            step="0.01"
                            name="precio"
                            value={
                              formulario.precio
                            }
                            onChange={
                              cambiarCampo
                            }
                          />
                        </div>
                      </div>

                      <div className="col-md-4">
                        <label className="form-label fw-semibold">
                          IVA %
                        </label>

                        <div className="input-group">
                          <input
                            type="number"
                            className="form-control"
                            min="0"
                            step="0.01"
                            name="impuestoPorcentaje"
                            value={
                              formulario.impuestoPorcentaje
                            }
                            onChange={
                              cambiarCampo
                            }
                          />

                          <span className="input-group-text">
                            %
                          </span>
                        </div>
                      </div>
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
                      className="btn btn-dark px-4"
                      disabled={guardando}
                    >
                      {guardando ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-lg me-2"></i>
                          {productoEditando
                            ? "Guardar cambios"
                            : "Crear producto"}
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
            onClick={cerrarModal}
          ></div>
        </>
      )}
    </AppLayout>
  );
}

export default Productos;