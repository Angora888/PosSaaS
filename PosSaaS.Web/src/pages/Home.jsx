import { useState } from "react";
import { Link } from "react-router-dom";

const WHATSAPP_NUMBER = "50600000000";

function Home() {
  const [formulario, setFormulario] = useState({
    nombre: "",
    negocio: "",
    telefono: "",
    mensaje: "",
  });

  const [menuAbierto, setMenuAbierto] = useState(false);

  const cambiarCampo = (e) => {
    const { name, value } = e.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  const solicitarInformacion = (e) => {
    e.preventDefault();

    const texto = [
      "Hola, me interesa conocer más sobre POS SaaS.",
      "",
      `Nombre: ${formulario.nombre || "No indicado"}`,
      `Negocio: ${formulario.negocio || "No indicado"}`,
      `Teléfono: ${formulario.telefono || "No indicado"}`,
      formulario.mensaje
        ? `Mensaje: ${formulario.mensaje}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const url = `https://wa.me/${60662375}?text=${encodeURIComponent(
      texto
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const irASeccion = (id) => {
    setMenuAbierto(false);

    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
      });
  };

  return (
    <div className="bg-white text-dark">
      <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top">
        <div className="container py-2">
          <button
            type="button"
            className="navbar-brand border-0 bg-transparent p-0 d-flex align-items-center gap-2"
            onClick={() => irASeccion("inicio")}
          >
            <span
              className="d-inline-flex align-items-center justify-content-center rounded-3 bg-dark text-white"
              style={{
                width: "42px",
                height: "42px",
              }}
            >
              <i className="bi bi-grid-1x2-fill"></i>
            </span>

            <span className="fw-bold fs-4">
              POS SaaS
            </span>
          </button>

          <button
            className="navbar-toggler"
            type="button"
            onClick={() =>
              setMenuAbierto((actual) => !actual)
            }
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div
            className={`collapse navbar-collapse ${
              menuAbierto ? "show" : ""
            }`}
          >
            <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-2">
              <li className="nav-item">
                <button
                  className="nav-link border-0 bg-transparent"
                  onClick={() =>
                    irASeccion("funciones")
                  }
                >
                  Funciones
                </button>
              </li>

              <li className="nav-item">
                <button
                  className="nav-link border-0 bg-transparent"
                  onClick={() =>
                    irASeccion("beneficios")
                  }
                >
                  Beneficios
                </button>
              </li>

              <li className="nav-item">
                <button
                  className="nav-link border-0 bg-transparent"
                  onClick={() =>
                    irASeccion("como-funciona")
                  }
                >
                  Cómo funciona
                </button>
              </li>

              <li className="nav-item">
                <button
                  className="nav-link border-0 bg-transparent"
                  onClick={() =>
                    irASeccion("contacto")
                  }
                >
                  Adquirir
                </button>
              </li>

              <li className="nav-item ms-lg-2">
                <Link
                  to="/login"
                  className="btn btn-outline-dark"
                >
                  Iniciar sesión
                </Link>
              </li>

              <li className="nav-item">
                <button
                  className="btn btn-dark"
                  onClick={() =>
                    irASeccion("contacto")
                  }
                >
                  Solicitar demo
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <main>
        <section
          id="inicio"
          className="position-relative overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)",
          }}
        >
          <div className="container py-5">
            <div className="row align-items-center g-5 py-lg-5">
              <div className="col-lg-6 py-4">
                <span className="badge rounded-pill text-bg-light border px-3 py-2 mb-3">
                  <i className="bi bi-lightning-charge-fill me-2"></i>
                  Tu negocio, más simple y bajo control
                </span>

                <h1
                  className="display-3 fw-bold lh-1 mb-4"
                  style={{
                    letterSpacing: "-2px",
                  }}
                >
                  Vende, controla y haz crecer tu negocio desde un solo lugar.
                </h1>

                <p className="lead text-secondary mb-4">
                  Un sistema POS moderno para comercios que necesitan vender rápido,
                  controlar inventario, administrar cajas, clientes y sucursales sin
                  complicaciones.
                </p>

                <div className="d-flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="btn btn-dark btn-lg px-4"
                    onClick={() =>
                      irASeccion("contacto")
                    }
                  >
                    Quiero adquirirlo
                    <i className="bi bi-arrow-right ms-2"></i>
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-dark btn-lg px-4"
                    onClick={() =>
                      irASeccion("funciones")
                    }
                  >
                    Ver funciones
                  </button>
                </div>

                <div className="d-flex flex-wrap gap-4 mt-5 text-secondary">
                  <div>
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    Fácil de usar
                  </div>

                  <div>
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    Acceso web
                  </div>

                  <div>
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    Multi-sucursal
                  </div>
                </div>
              </div>

              <div className="col-lg-6">
                <div
                  className="rounded-5 p-3 p-md-4 shadow-lg"
                  style={{
                    background:
                      "linear-gradient(135deg, #111 0%, #2d2d2d 100%)",
                  }}
                >
                  <div className="bg-white rounded-4 overflow-hidden">
                    <div className="border-bottom p-3 d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-2">
                        <span className="rounded-circle bg-danger d-block" style={{ width: 10, height: 10 }}></span>
                        <span className="rounded-circle bg-warning d-block" style={{ width: 10, height: 10 }}></span>
                        <span className="rounded-circle bg-success d-block" style={{ width: 10, height: 10 }}></span>
                      </div>

                      <small className="text-secondary">
                        Punto de Venta
                      </small>
                    </div>

                    <div className="p-4">
                      <div className="row g-3">
                        <div className="col-8">
                          <div className="bg-light rounded-3 p-3 mb-3">
                            <div className="input-group">
                              <span className="input-group-text bg-white">
                                <i className="bi bi-upc-scan"></i>
                              </span>

                              <div className="form-control text-secondary">
                                Escanea un producto...
                              </div>
                            </div>
                          </div>

                          <div className="row g-2">
                            {[
                              ["Coca-Cola", "₡1,356"],
                              ["Pepsi", "₡1,130"],
                              ["Agua", "₡850"],
                              ["Snack", "₡750"],
                              ["Café", "₡1,500"],
                              ["Galletas", "₡950"],
                            ].map(([nombre, precio]) => (
                              <div
                                className="col-6"
                                key={nombre}
                              >
                                <div className="border rounded-3 p-3 h-100">
                                  <div className="small fw-semibold">
                                    {nombre}
                                  </div>

                                  <div className="fw-bold mt-2">
                                    {precio}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="col-4">
                          <div className="border rounded-3 p-3 h-100">
                            <div className="fw-bold mb-3">
                              Venta
                            </div>

                            <div className="small d-flex justify-content-between mb-2">
                              <span>Coca-Cola</span>
                              <span>x2</span>
                            </div>

                            <div className="small d-flex justify-content-between mb-2">
                              <span>Snack</span>
                              <span>x1</span>
                            </div>

                            <hr />

                            <div className="d-flex justify-content-between fw-bold">
                              <span>Total</span>
                              <span>₡3,462</span>
                            </div>

                            <div className="btn btn-dark w-100 mt-4">
                              Cobrar
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-top border-bottom bg-white">
          <div className="container py-4">
            <div className="row g-4 text-center">
              <div className="col-6 col-md-3">
                <div className="fw-bold fs-4">
                  POS
                </div>
                <small className="text-secondary">
                  Ventas rápidas
                </small>
              </div>

              <div className="col-6 col-md-3">
                <div className="fw-bold fs-4">
                  Inventario
                </div>
                <small className="text-secondary">
                  Stock en tiempo real
                </small>
              </div>

              <div className="col-6 col-md-3">
                <div className="fw-bold fs-4">
                  Clientes
                </div>
                <small className="text-secondary">
                  Información organizada
                </small>
              </div>

              <div className="col-6 col-md-3">
                <div className="fw-bold fs-4">
                  Sucursales
                </div>
                <small className="text-secondary">
                  Todo centralizado
                </small>
              </div>
            </div>
          </div>
        </section>

        <section
          id="funciones"
          className="py-5"
        >
          <div className="container py-lg-5">
            <div className="text-center mx-auto mb-5" style={{ maxWidth: 760 }}>
              <span className="text-uppercase fw-semibold small text-secondary">
                Todo lo que necesitas
              </span>

              <h2 className="display-5 fw-bold mt-2">
                Un POS pensado para el día a día de tu negocio
              </h2>

              <p className="lead text-secondary">
                Menos herramientas separadas, menos trabajo manual y más control
                desde una única plataforma.
              </p>
            </div>

            <div className="row g-4">
              {[
                {
                  icono: "bi-cart-check",
                  titulo: "Punto de venta",
                  texto:
                    "Registra ventas de manera rápida, agrega productos con un clic o utiliza un lector de código de barras.",
                },
                {
                  icono: "bi-box-seam",
                  titulo: "Inventario",
                  texto:
                    "Consulta existencias por sucursal y registra entradas y salidas manteniendo un historial de movimientos.",
                },
                {
                  icono: "bi-cash-stack",
                  titulo: "Control de cajas",
                  texto:
                    "Administra aperturas, cierres, ingresos, retiros y ventas en efectivo con mayor trazabilidad.",
                },
                {
                  icono: "bi-people",
                  titulo: "Clientes",
                  texto:
                    "Guarda clientes, sus datos de contacto y asócialos directamente a sus compras.",
                },
                {
                  icono: "bi-shop",
                  titulo: "Multi-sucursal",
                  texto:
                    "Maneja distintas sucursales y su inventario dentro de la misma cuenta.",
                },
                {
                  icono: "bi-credit-card",
                  titulo: "Métodos de pago",
                  texto:
                    "Acepta efectivo, tarjeta, transferencias y otros métodos configurables según tu operación.",
                },
              ].map((item) => (
                <div
                  className="col-md-6 col-lg-4"
                  key={item.titulo}
                >
                  <div className="card border-0 shadow-sm h-100 rounded-4">
                    <div className="card-body p-4">
                      <div
                        className="d-inline-flex align-items-center justify-content-center bg-dark text-white rounded-3 mb-4"
                        style={{
                          width: 52,
                          height: 52,
                        }}
                      >
                        <i className={`bi ${item.icono} fs-4`}></i>
                      </div>

                      <h4 className="fw-bold">
                        {item.titulo}
                      </h4>

                      <p className="text-secondary mb-0">
                        {item.texto}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="beneficios"
          className="py-5 bg-light"
        >
          <div className="container py-lg-5">
            <div className="row align-items-center g-5">
              <div className="col-lg-5">
                <span className="text-uppercase fw-semibold small text-secondary">
                  Beneficios
                </span>

                <h2 className="display-5 fw-bold mt-2">
                  Más control sin hacer tu operación más complicada
                </h2>

                <p className="lead text-secondary">
                  Diseñado para que el personal pueda aprenderlo rápido y para que
                  el administrador tenga la información que necesita.
                </p>

                <button
                  type="button"
                  className="btn btn-dark btn-lg mt-2"
                  onClick={() =>
                    irASeccion("contacto")
                  }
                >
                  Solicitar información
                </button>
              </div>

              <div className="col-lg-7">
                <div className="row g-3">
                  {[
                    [
                      "bi-speedometer2",
                      "Venta más rápida",
                      "Reduce pasos al momento de cobrar y utiliza códigos de barras para agilizar la atención.",
                    ],
                    [
                      "bi-graph-up-arrow",
                      "Información centralizada",
                      "Productos, clientes, inventario, cajas y ventas permanecen organizados en el mismo sistema.",
                    ],
                    [
                      "bi-shield-check",
                      "Usuarios y permisos",
                      "Cada usuario accede según su rol y las operaciones quedan asociadas a quien las realizó.",
                    ],
                    [
                      "bi-cloud",
                      "Acceso desde la web",
                      "Consulta y administra tu negocio sin depender de una instalación tradicional en cada equipo.",
                    ],
                  ].map(([icono, titulo, texto]) => (
                    <div
                      className="col-md-6"
                      key={titulo}
                    >
                      <div className="bg-white rounded-4 p-4 h-100 shadow-sm">
                        <i className={`bi ${icono} fs-2`}></i>

                        <h5 className="fw-bold mt-3">
                          {titulo}
                        </h5>

                        <p className="text-secondary mb-0">
                          {texto}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          className="py-5"
        >
          <div className="container py-lg-5">
            <div className="text-center mx-auto mb-5" style={{ maxWidth: 720 }}>
              <span className="text-uppercase fw-semibold small text-secondary">
                Empezar es sencillo
              </span>

              <h2 className="display-5 fw-bold mt-2">
                Tu negocio listo en pocos pasos
              </h2>
            </div>

            <div className="row g-4">
              {[
                [
                  "01",
                  "Cuéntanos sobre tu negocio",
                  "Conocemos tus sucursales, productos y forma de trabajar para preparar la configuración inicial.",
                ],
                [
                  "02",
                  "Configuramos tu cuenta",
                  "Creamos tu acceso y dejamos listas las opciones principales del sistema.",
                ],
                [
                  "03",
                  "Carga tus productos",
                  "Registra productos, precios, códigos de barras e inventario inicial.",
                ],
                [
                  "04",
                  "Comienza a vender",
                  "Abre tu caja, entra al POS y empieza a registrar ventas.",
                ],
              ].map(([numero, titulo, texto]) => (
                <div
                  className="col-md-6 col-lg-3"
                  key={numero}
                >
                  <div className="h-100">
                    <div className="display-6 fw-bold text-secondary opacity-50">
                      {numero}
                    </div>

                    <h4 className="fw-bold mt-3">
                      {titulo}
                    </h4>

                    <p className="text-secondary">
                      {texto}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-5">
          <div className="container">
            <div className="bg-dark text-white rounded-5 p-4 p-md-5">
              <div className="row align-items-center g-4">
                <div className="col-lg-8">
                  <span className="badge text-bg-light mb-3">
                    Para comercios de todos los tamaños
                  </span>

                  <h2 className="display-5 fw-bold">
                    Ideal para tiendas, minisúper, sodas, cafeterías, restaurantes y más.
                  </h2>

                  <p className="lead text-white-50 mb-0">
                    La plataforma puede crecer junto con tu operación, desde un
                    pequeño negocio hasta múltiples sucursales.
                  </p>
                </div>

                <div className="col-lg-4 text-lg-end">
                  <button
                    type="button"
                    className="btn btn-light btn-lg px-4"
                    onClick={() =>
                      irASeccion("contacto")
                    }
                  >
                    Quiero una demo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="contacto"
          className="py-5 bg-light"
        >
          <div className="container py-lg-5">
            <div className="row g-5">
              <div className="col-lg-5">
                <span className="text-uppercase fw-semibold small text-secondary">
                  Adquiere POS SaaS
                </span>

                <h2 className="display-5 fw-bold mt-2">
                  ¿Quieres verlo funcionando en tu negocio?
                </h2>

                <p className="lead text-secondary">
                  Solicita una demostración y recibe información sobre configuración,
                  implementación y opciones disponibles para tu negocio.
                </p>

                <div className="mt-4">
                  <div className="d-flex gap-3 mb-3">
                    <i className="bi bi-check-circle-fill text-success fs-5"></i>

                    <div>
                      <div className="fw-semibold">
                        Demostración del sistema
                      </div>

                      <div className="text-secondary">
                        Te mostramos el flujo completo antes de adquirirlo.
                      </div>
                    </div>
                  </div>

                  <div className="d-flex gap-3 mb-3">
                    <i className="bi bi-check-circle-fill text-success fs-5"></i>

                    <div>
                      <div className="fw-semibold">
                        Configuración inicial
                      </div>

                      <div className="text-secondary">
                        Te ayudamos a preparar tu cuenta para empezar.
                      </div>
                    </div>
                  </div>

                  <div className="d-flex gap-3">
                    <i className="bi bi-check-circle-fill text-success fs-5"></i>

                    <div>
                      <div className="fw-semibold">
                        Plan según tus necesidades
                      </div>

                      <div className="text-secondary">
                        La propuesta se adapta al tamaño y operación de tu negocio.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-7">
                <div className="card border-0 shadow rounded-4">
                  <div className="card-body p-4 p-md-5">
                    <h4 className="fw-bold mb-1">
                      Solicitar información
                    </h4>

                    <p className="text-secondary mb-4">
                      Completa tus datos y te contactaremos para coordinar una demo.
                    </p>

                    <form onSubmit={solicitarInformacion}>
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label fw-semibold">
                            Nombre *
                          </label>

                          <input
                            type="text"
                            className="form-control form-control-lg"
                            name="nombre"
                            value={formulario.nombre}
                            onChange={cambiarCampo}
                            required
                          />
                        </div>

                        <div className="col-md-6">
                          <label className="form-label fw-semibold">
                            Negocio
                          </label>

                          <input
                            type="text"
                            className="form-control form-control-lg"
                            name="negocio"
                            value={formulario.negocio}
                            onChange={cambiarCampo}
                          />
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold">
                            Teléfono / WhatsApp *
                          </label>

                          <input
                            type="tel"
                            className="form-control form-control-lg"
                            name="telefono"
                            value={formulario.telefono}
                            onChange={cambiarCampo}
                            required
                          />
                        </div>

                        <div className="col-12">
                          <label className="form-label fw-semibold">
                            ¿Qué necesitas?
                          </label>

                          <textarea
                            className="form-control"
                            rows="4"
                            name="mensaje"
                            value={formulario.mensaje}
                            onChange={cambiarCampo}
                            placeholder="Ej: Tengo una tienda con 2 sucursales y quiero controlar ventas e inventario."
                          />
                        </div>

                        <div className="col-12">
                          <button
                            type="submit"
                            className="btn btn-success btn-lg w-100"
                          >
                            <i className="bi bi-whatsapp me-2"></i>
                            Solicitar información por WhatsApp
                          </button>
                        </div>

                        <div className="col-12">
                          <small className="text-secondary">
                            Al enviar, se abrirá WhatsApp con tu solicitud lista para enviar.
                          </small>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-dark text-white py-5">
        <div className="container">
          <div className="row g-4 align-items-center">
            <div className="col-md-6">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span
                  className="d-inline-flex align-items-center justify-content-center rounded-3 bg-white text-dark"
                  style={{
                    width: "38px",
                    height: "38px",
                  }}
                >
                  <i className="bi bi-grid-1x2-fill"></i>
                </span>

                <span className="fw-bold fs-4">
                  POS SaaS
                </span>
              </div>

              <p className="text-white-50 mb-0">
                Tecnología sencilla para administrar y hacer crecer tu negocio.
              </p>
            </div>

            <div className="col-md-6 text-md-end">
              <button
                type="button"
                className="btn btn-link text-white text-decoration-none"
                onClick={() =>
                  irASeccion("funciones")
                }
              >
                Funciones
              </button>

              <button
                type="button"
                className="btn btn-link text-white text-decoration-none"
                onClick={() =>
                  irASeccion("contacto")
                }
              >
                Adquirir
              </button>

              <Link
                to="/login"
                className="btn btn-link text-white text-decoration-none"
              >
                Iniciar sesión
              </Link>
            </div>
          </div>

          <hr className="border-secondary my-4" />

          <div className="d-flex flex-wrap justify-content-between gap-2 text-white-50 small">
            <span>
              © {new Date().getFullYear()} POS SaaS. Todos los derechos reservados.
            </span>

            <span>
              Sistema de punto de venta en la nube.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;