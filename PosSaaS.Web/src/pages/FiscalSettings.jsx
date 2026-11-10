import { useEffect, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import api from "../services/api";

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

  useEffect(() => {
    let activo = true;
    api.get("/fiscal/config")
      .then(({ data }) => { if (activo && data) setDatos({ ...inicial, ...data }); })
      .catch((err) => { if (activo) setError(err.response?.data?.mensaje || "No se pudo cargar la configuración fiscal."); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, []);

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
    try {
      const response = await api.get(`/fiscal/diagnostics/sale/${ventaId.trim()}`);
      setDiagnostico(response.data);
    } catch (err) {
      setErrorDiagnostico(err.response?.data?.mensaje || "No fue posible revisar esta venta.");
    } finally {
      setConsultando(false);
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (guardando) return;
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
              {campo("provincia", "Provincia (código)")}
              {campo("canton", "Cantón (código)")}
              {campo("distrito", "Distrito (código)")}
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
