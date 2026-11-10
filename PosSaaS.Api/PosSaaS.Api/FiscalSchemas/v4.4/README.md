# Esquemas XML oficiales de Hacienda — versión 4.4

Este directorio se reserva para los archivos **XSD oficiales**, que todavía **no** están
incluidos en el repositorio ni instalados en Azure. La API fallará de forma segura (503)
si alguien intenta validar sin los XSD. No se emitirán ni transmitirán documentos.

Fuente oficial:
https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/frmAnexosyEstructuras.aspx

Instalación automatizada, desde la raíz del repositorio:

```bash
bash scripts/install-hacienda-xsd.sh
```

Este script obtiene los archivos directamente del dominio oficial de Hacienda,
comprueba que el contenido sea un XSD con namespace v4.4 e imprime SHA-256.
Si falla la descarga o la comprobación, no se debe habilitar emisión.

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


## Verificación y despliegue
La acción `.github/workflows/possaas-fiscal-ci.yml` compila el backend, compila
el frontend e intenta descargar/verificar los XSD oficiales. Un fallo de red
en Hacienda puede impedir completar esta prueba y **no** significa que el
XSD esté instalado en Azure. Para publicar con esquemas, ejecutar
`scripts/install-hacienda-xsd.sh` antes de `dotnet publish`; la configuración
del proyecto copia los XSD disponibles al resultado de publicación.

**ATENCIÓN:** el instalador valida estructura y namespace, pero no fija todavía
un SHA-256 de referencia aprobada. La integridad y versión exacta deberán
revisarse antes de tratar los esquemas como aptos para producción.

En la API, `/api/fiscal/schema/status` y `/api/fiscal/schema/validate`
requieren un administrador autenticado. Ninguno emite, firma ni transmite.
