# Esquemas XML oficiales de Hacienda — versión 4.4

Este directorio se reserva para los archivos **XSD oficiales**, que todavía **no** están
incluidos en el repositorio ni instalados en Azure. La API fallará de forma segura (503)
si alguien intenta validar sin los XSD. No se emitirán ni transmitirán documentos.

Fuente oficial:
https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/frmAnexosyEstructuras.aspx

Descargar desde la sección v4.4, tras verificar su origen y versión:
- `FacturaElectronica_V4.4.xsd`
- `TiqueteElectronico_V4.4.xsd`

No sustituir por el XSD de v4.3, ni por uno generado a mano. Comprobar
dependencias, `xs:import` / `xs:include`, `targetNamespace` y huella SHA-256
de cada archivo antes de incorporarlos al despliegue.

Ruta por defecto en la API: `FiscalSchemas/v4.4`.
Puede configurarse `Fiscal__SchemaDirectory` como carpeta local administrada.
La validación funciona sin descargar esquemas durante una petición y bloquea
entidades externas (XXE). El endpoint `GET /api/fiscal/schema/status` muestra
qué XSD están disponibles. `POST /api/fiscal/schema/validate` valida un XML
aportado por un usuario Admin autenticado y devuelve errores.

## Próximas tareas
1. Versionar los XSD oficiales verificando sus huellas y licencias.
2. Construir el XML **fiscal real** conforme al esquema, distinto del borrador
   `urn:possaas:internal:fiscal-draft:1`.
3. Agregar pruebas positivas y negativas contra ejemplos válidos oficiales.
4. Implementar firma XAdES-EPES, secuencias transaccionales y API Hacienda.

**No existe emisión electrónica activa.**
