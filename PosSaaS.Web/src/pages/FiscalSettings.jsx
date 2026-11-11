import { useEffect, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import api from "../services/api";

// Hacienda v4.4 expects province (1 digit), canton (2) and district (2).
// Display names are obtained from a third-party public territorial catalog;
// the codes stored in the fiscal configuration remain the standard values.
const provinciasCR = [
  ["1", "San José"], ["2", "Alajuela"], ["3", "Cartago"],
  ["4", "Heredia"], ["5", "Guanacaste"], ["6", "Puntarenas"], ["7", "Limón"],
];
const catalogoUbicacion = "https://ubicaciones.paginasweb.cr";
const normalizarOpciones = (json) =>
  Object.entries(json || {})
    .filter(([key, name]) => /^\d+$/.test(key) && typeof name === "string")
    .map(([key, name]) => ({ codigo: key.padStart(2, "0"), nombre: name }))
    .sort((a, b) => Number(a.codigo) - Number(b.codigo));

const inicial = {
  razonSocial: "", tipoIdentificacion: "02", identificacion: "",
  actividadEconomica: "", correo: "", telefono: "", provincia: "",
  canton: "", distrito: "", otrasSenas: "",
};

function FiscalSettings() {
  const [datos, setDatos] = useState(inicial);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [ventaId, setVentaId] = useState("");
  const [diagnostico, setDiagnostico] = useState(null);
  const [consultando, setConsultando] = useState(false);
  const [errorDiagnostico, setErrorDiagnostico] = useState("");
  const [xmlDraft, setXmlDraft] = useState("");
  const [cargandoXml, setCargandoXml] = useState(false);
  const [estadoXsd, setEstadoXsd] = useState(null);
  const [sucursales, setSucursales] = useState([]);
  const [sucursalFiscal, setSucursalFiscal] = useState("");
  const [tipoFiscal, setTipoFiscal] = useState("01");
  const [numeroPreview, setNumeroPreview] = useState(null);
  const [numeroError, setNumeroError] = useState("");
  const [numeroCargando, setNumeroCargando] = useState(false);
  const [cantonesCR, setCantonesCR] = useState([]);
  const [distritosCR, setDistritosCR] = useState([]);
  const [cargandoCantones, setCargandoCantones] = useState(false);
  const [cargandoDistritos, setCargandoDistritos] = useState(false);
  const [errorUbicacion, setErrorUbicacion] = useState("");
  const [ubicacionManual, setUbicacionManual] = useState(false);

  useEffect(() => {
    let activo = true;
    api.get("/Sucursales")
      .then(({ data }) => { if (activo) setSucursales(data || []); })
      .catch(() => { if (activo) setNumeroError("No se pudieron consultar las sucursales."); });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    let activo = true;
    api.get("/fiscal/config")
      .then(({ data }) => {
        if (activo && data) setDatos({
          ...inicial,
          ...data,
          provincia: data.provincia ? String(Number(data.provincia)) : "",
          canton: data.canton ? String(data.canton).padStart(2, "0") : "",
          distrito: data.distrito ? String(data.distrito).padStart(2, "0") : "",
        });
      })
      .catch((err) => { if (activo) setError(err.response?.data?.mensaje || "No se pudo cargar la configuración fiscal."); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (!datos.provincia || ubicacionManual) {
      setCantonesCR([]);
      return;
    }
    const controller = new AbortController();
    setCargandoCantones(true);
    setErrorUbicacion("");
    fetch(`${catalogoUbicacion}/provincia/${encodeURIComponent(datos.provincia)}/cantones.json`, {
      signal: controller.signal,
    }).then(r => {
      if (!r.ok) throw new Error("No disponible");
      return r.json();
    }).then(json => setCantonesCR(normalizarOpciones(json)))
      .catch(err => {
        if (err.name !== "AbortError") {
          setErrorUbicacion("El catálogo de cantones no respondió. Podés ingresar los códigos manualmente.");
          setCantonesCR([]);
        }
      }).finally(() => {
        if (!controller.signal.aborted) setCargandoCantones(false);
      });
    return () => controller.abort();
  }, [datos.provincia, ubicacionManual]);

  useEffect(() => {
    if (!datos.provincia || !datos.canton || ubicacionManual) {
      setDistritosCR([]);
      return;
    }
    const controller = new AbortController();
    setCargandoDistritos(true);
    fetch(`${catalogoUbicacion}/provincia/${encodeURIComponent(datos.provincia)}/canton/${Number(datos.canton)}/distritos.json`, {
      signal: controller.signal,
    }).then(r => {
      if (!r.ok) throw new Error("No disponible");
      return r.json();
    }).then(json => setDistritosCR(normalizarOpciones(json)))
      .catch(err => {
        if (err.name !== "AbortError") {
          setErrorUbicacion("No se pudo cargar el distrito. Podés ingresar los códigos manualmente.");
          setDistritosCR([]);
        }
      }).finally(() => {
        if (!controller.signal.aborted) setCargandoDistritos(false);
      });
    return () => controller.abort();
  }, [datos.provincia, datos.canton, ubicacionManual]);

  const cambiarProvincia = (provincia) => {
    setErrorUbicacion("");
    setDatos(actual => ({ ...actual, provincia, canton: "", distrito: "" }));
  };
  const cambiarCanton = (canton) => {
    setErrorUbicacion("");
    setDatos(actual => ({ ...actual, canton, distrito: "" }));
  };

  const campo = (clave, titulo, tipo = "text", obligatorio = false, ayuda = "") => (
    <div className="col-md-6" key={clave}>
      <label htmlFor={clave} className="form-label fw-semibold">{titulo}</label>
      <input id={clave} type={tipo} className="form-control"
        required={obligatorio} maxLength={clave === "otrasSenas" ? 500 : 200}
        value={datos[clave] ?? ""} disabled={guardando}
        onChange={(e) => setDatos((actual) => ({ ...actual, [clave]: e.target.value }))} />
      {ayuda && <small className="text-secondary">{ayuda}</small>}
    </div>
  );

  const diagnosticarVenta = async (e) => {
    e.preventDefault();
    if (!/^[1-9][0-9]*$/.test(ventaId.trim())) {
      setErrorDiagnostico("Ingresá un ID de venta válido.");
      return;
    }
    setConsultando(true);
    setErrorDiagnostico("");
    setDiagnostico(null);
    setXmlDraft("");
    try {
      const response = await api.get(`/fiscal/diagnostics/sale/${ventaId.trim()}`);
      setDiagnostico(response.data);
    } catch (err) {
      setErrorDiagnostico(err.response?.data?.mensaje || "No fue posible revisar esta venta.");
    } finally {
      setConsultando(false);
    }
  };

  const consultarNumero = async (e) => {
    e.preventDefault();
    if (!sucursalFiscal) {
      setNumeroError("Seleccioná una sucursal para la vista previa.");
      return;
    }
    setNumeroCargando(true);
    setNumeroPreview(null);
    setNumeroError("");
    try {
      const { data } = await api.get("/fiscal/numbering/preview", {
        params: { sucursalId: Number(sucursalFiscal), tipoDocumento: tipoFiscal },
      });
      setNumeroPreview(data);
    } catch (err) {
      setNumeroError(err.response?.data?.mensaje || "No se pudo calcular el consecutivo de ejemplo.");
    } finally {
      setNumeroCargando(false);
    }
  };

  const consultarEsquemas = async () => {
    setErrorDiagnostico("");
    try {
      const response = await api.get("/fiscal/schema/status");
      setEstadoXsd(response.data);
    } catch (err) {
      setErrorDiagnostico("No fue posible consultar los esquemas instalados en la API.");
    }
  };

  const generarBorradorXml = async () => {
    if (!diagnostico?.ventaId) return;
    setCargandoXml(true);
    setErrorDiagnostico("");
    setXmlDraft("");
    try {
      const response = await api.get(`/fiscal/diagnostics/sale/${diagnostico.ventaId}/xml-draft`, {
        responseType: "text",
      });
      setXmlDraft(response.data);
    } catch (err) {
      const data = err?.response?.data;
      setErrorDiagnostico(data?.mensaje || "No se pudo crear el borrador XML.");
    } finally {
      setCargandoXml(false);
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (guardando) return;
    if (!/^[1-7]$/.test(datos.provincia) ||
        !/^[0-9]{2}$/.test(datos.canton) ||
        !/^[0-9]{2}$/.test(datos.distrito)) {
      setError("Seleccioná una provincia, cantón y distrito válidos. Sus códigos deben tener 1, 2 y 2 dígitos.");
      return;
    }
    setGuardando(true);
    setError("");
    setMensaje("");
    try {
      const response = await api.put("/fiscal/config", datos);
      setDatos({ ...inicial, ...response.data });
      setMensaje("Configuración fiscal guardada. La emisión electrónica todavía está deshabilitada.");
    } catch (err) {
      const data = err.response?.data;
      setError(data?.mensaje || data?.title || "No se pudo guardar la configuración fiscal.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-4">
        <span className="badge text-bg-dark mb-2">FASE 1 · FACTURACIÓN ELECTRÓNICA</span>
        <h2 className="fw-bold">Configuración tributaria</h2>
        <p className="text-secondary">Prepará los datos de tu comercio para la futura integración directa con Hacienda de Costa Rica.</p>
      </div>
      <div className="alert alert-warning">
        <i className="bi bi-shield-lock me-2"></i>
        Modo preparación: esta pantalla no firma ni envía comprobantes a Hacienda. No ingresés contraseñas ni llaves criptográficas aquí.
      </div>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {mensaje && <div className="alert alert-success" role="status">{mensaje}</div>}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <h5 className="fw-bold mb-2">Numeración fiscal por sucursal</h5>
          <p className="text-secondary small">Vista previa de estructura: no reserva números ni genera claves o facturas.</p>
          <form onSubmit={consultarNumero} className="row g-2 align-items-end">
            <div className="col-md-5">
              <label className="form-label fw-semibold" htmlFor="sucursalFiscal">Sucursal</label>
              <select id="sucursalFiscal" className="form-select" value={sucursalFiscal}
                onChange={e => { setSucursalFiscal(e.target.value); setNumeroPreview(null); }}>
                <option value="">Seleccionar sucursal</option>
                {sucursales.map(x => <option key={x.id} value={String(x.id)}>
                  {x.nombre} {x.codigoSucursalFiscal ? "(" + x.codigoSucursalFiscal + ")" : "(sin código fiscal)"}
                </option>)}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-semibold" htmlFor="tipoFiscal">Tipo de comprobante</label>
              <select id="tipoFiscal" className="form-select" value={tipoFiscal}
                onChange={e => { setTipoFiscal(e.target.value); setNumeroPreview(null); }}>
                <option value="01">Factura electrónica (01)</option>
                <option value="04">Tiquete electrónico (04)</option>
              </select>
            </div>
            <div className="col-md-3 d-grid">
              <button type="submit" className="btn btn-outline-dark" disabled={numeroCargando}>
                {numeroCargando ? "Consultando..." : "Ver ejemplo"}
              </button>
            </div>
          </form>
          {numeroError && <div className="alert alert-danger mt-3 mb-0" role="alert">{numeroError}</div>}
          {numeroPreview && <div className="border rounded p-3 mt-3">
            <div className="text-secondary small mb-1">Consecutivo estimado · NO RESERVADO</div>
            <div className="fs-5 fw-bold font-monospace text-break">{numeroPreview.ejemploConsecutivo}</div>
            <div className="text-secondary small mt-2">
              Último registrado: {numeroPreview.ultimoNumeroRegistrado} · Siguiente estimado: {numeroPreview.siguienteNumeroEstimado}
            </div>
            <p className="small text-secondary mb-0 mt-2">Solo para verificar la configuración. El consecutivo definitivo se asignará al emitir, cuando el módulo esté habilitado.</p>
          </div>}
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <h5 className="fw-bold">Esquemas oficiales de Hacienda 4.4</h5>
          <p className="text-secondary small mb-2">Comprobá si la API tiene instalados los XSD oficiales. La disponibilidad del XSD no habilita la emisión.</p>
          <button type="button" className="btn btn-outline-dark btn-sm" onClick={consultarEsquemas}>
            Consultar XSD en la API
          </button>
          {estadoXsd && <div className="mt-3 small">
            <div>Factura electrónica: <strong>{estadoXsd.facturaElectronica ? "XSD disponible" : "XSD pendiente"}</strong></div>
            <div>Tiquete electrónico: <strong>{estadoXsd.tiqueteElectronico ? "XSD disponible" : "XSD pendiente"}</strong></div>
            <div className="text-secondary mt-1">Emisión: deshabilitada</div>
          </div>}
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-4">
          <h5 className="fw-bold">Diagnóstico fiscal de una venta</h5>
          <p className="text-secondary small">Solo verifica datos faltantes. No genera consecutivos, XML, ni envía facturas.</p>
          <form className="d-flex flex-wrap gap-2" onSubmit={diagnosticarVenta}>
            <input type="number" min="1" className="form-control" style={{ maxWidth: 220 }}
              placeholder="ID de venta" value={ventaId} onChange={e => setVentaId(e.target.value)} />
            <button className="btn btn-outline-dark" type="submit" disabled={consultando}>
              {consultando ? "Revisando..." : "Revisar venta"}
            </button>
          </form>
          {errorDiagnostico && <div className="alert alert-danger mt-3">{errorDiagnostico}</div>}
          {diagnostico && <button type="button" className="btn btn-outline-secondary mt-3"
            onClick={generarBorradorXml} disabled={cargandoXml}>
            {cargandoXml ? "Generando borrador..." : "Ver borrador XML interno"}
          </button>}
          {xmlDraft && <div className="mt-3">
            <p className="text-danger fw-semibold mb-2">Borrador interno sin validez fiscal. No corresponde al XSD 4.4 ni debe enviarse a Hacienda.</p>
            <pre className="bg-light border rounded p-3 overflow-auto" style={{ maxHeight: 300, fontSize: "0.75rem" }}>{xmlDraft}</pre>
          </div>}
          {diagnostico && <div className="alert alert-info mt-3 mb-0">
            <strong>Venta #{diagnostico.ventaId}: emisión deshabilitada.</strong>
            <div>{diagnostico.cantidadLineas} líneas · Total: {Number(diagnostico.total).toLocaleString("es-CR", {style:"currency",currency:"CRC"})}</div>
            {diagnostico.observaciones?.length > 0
              ? <ul className="mb-0 mt-2">{diagnostico.observaciones.map((w, i) => <li key={i}>{w}</li>)}</ul>
              : <p className="mb-0 mt-2">No se detectaron faltantes básicos; todavía falta validar reglas fiscales y XML 4.4.</p>}
          </div>}
        </div>
      </div>
      {cargando ? <p>Cargando configuración...</p> : (
        <form className="card border-0 shadow-sm" onSubmit={guardar}>
          <div className="card-body p-4">
            <h5 className="fw-bold mb-3">Datos del emisor</h5>
            <div className="row g-3">
              {campo("razonSocial", "Razón social", "text", true)}
              <div className="col-md-6">
                <label htmlFor="tipoIdentificacion" className="form-label fw-semibold">Tipo de identificación</label>
                <select id="tipoIdentificacion" className="form-select" value={datos.tipoIdentificacion}
                  disabled={guardando} onChange={e => setDatos(v => ({ ...v, tipoIdentificacion: e.target.value }))}>
                  <option value="01">Cédula física</option><option value="02">Cédula jurídica</option>
                  <option value="03">DIMEX</option><option value="04">NITE</option>
                </select>
              </div>
              {campo("identificacion", "Número de identificación", "text", true)}
              {campo("actividadEconomica", "Código de actividad económica", "text", false, "Según el registro tributario del contribuyente.")}
              {campo("correo", "Correo para comprobantes", "email", true)}
              {campo("telefono", "Teléfono")}
              <div className="col-12">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <label className="form-label fw-semibold mb-0">Ubicación del emisor (Costa Rica)</label>
                  <button type="button" className="btn btn-sm btn-link"
                    onClick={() => { setUbicacionManual(v => !v); setErrorUbicacion(""); }}>
                    {ubicacionManual ? "Elegir de la lista" : "Ingresar códigos manualmente"}
                  </button>
                </div>
                <div className="small text-secondary mt-1">
                  Elegí provincia, cantón y distrito. Se guardan sus códigos fiscales, no el nombre.
                </div>
              </div>
              {ubicacionManual ? <>
                {campo("provincia", "Provincia (1 dígito)", "text", true)}
                {campo("canton", "Cantón (2 dígitos)", "text", true)}
                {campo("distrito", "Distrito (2 dígitos)", "text", true)}
              </> : <>
                <div className="col-md-4">
                  <label htmlFor="provincia" className="form-label fw-semibold">Provincia</label>
                  <select id="provincia" className="form-select" required
                    value={datos.provincia} onChange={e => cambiarProvincia(e.target.value)}
                    disabled={guardando}>
                    <option value="">Seleccionar provincia</option>
                    {provinciasCR.map(([codigo, nombre]) =>
                      <option key={codigo} value={codigo}>{nombre}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label htmlFor="canton" className="form-label fw-semibold">Cantón</label>
                  <select id="canton" className="form-select" required
                    value={datos.canton} onChange={e => cambiarCanton(e.target.value)}
                    disabled={guardando || !datos.provincia || cargandoCantones}>
                    <option value="">{cargandoCantones ? "Cargando cantones..." : "Seleccionar cantón"}</option>
                    {datos.canton && !cantonesCR.some(x => x.codigo === datos.canton) &&
                      <option value={datos.canton}>Código guardado: {datos.canton}</option>}
                    {cantonesCR.map(x => <option key={x.codigo} value={x.codigo}>{x.nombre}</option>)}
                  </select>
                </div>
                <div className="col-md-4">
                  <label htmlFor="distrito" className="form-label fw-semibold">Distrito</label>
                  <select id="distrito" className="form-select" required
                    value={datos.distrito} onChange={e => setDatos(v => ({ ...v, distrito: e.target.value }))}
                    disabled={guardando || !datos.canton || cargandoDistritos}>
                    <option value="">{cargandoDistritos ? "Cargando distritos..." : "Seleccionar distrito"}</option>
                    {datos.distrito && !distritosCR.some(x => x.codigo === datos.distrito) &&
                      <option value={datos.distrito}>Código guardado: {datos.distrito}</option>}
                    {distritosCR.map(x => <option key={x.codigo} value={x.codigo}>{x.nombre}</option>)}
                  </select>
                </div>
              </>}
              {errorUbicacion && <div className="col-12">
                <div className="alert alert-warning py-2 mb-0" role="alert">{errorUbicacion}</div>
              </div>}
              {campo("otrasSenas", "Otras señas")}
            </div>
            <hr className="my-4" />
            <p className="mb-1 fw-semibold">Ambiente: Pruebas</p>
            <p className="text-secondary small mb-0">Estado: emisión deshabilitada. La conexión, certificado y firma se implementarán en las siguientes fases.</p>
          </div>
          <div className="card-footer bg-white border-0 px-4 pb-4">
            <button type="submit" className="btn btn-dark" disabled={guardando}>
              <i className="bi bi-save me-2"></i>{guardando ? "Guardando..." : "Guardar configuración"}
            </button>
          </div>
        </form>
      )}
    </AppLayout>
  );
}
export default FiscalSettings;
