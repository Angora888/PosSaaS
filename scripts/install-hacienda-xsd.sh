#!/usr/bin/env bash
set -euo pipefail

# Download authoritative Hacienda XSDs to a local path under the API project.
# Source: https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/frmAnexosyEstructuras.aspx
# Usage: bash scripts/install-hacienda-xsd.sh
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${ROOT}/PosSaaS.Api/PosSaaS.Api/FiscalSchemas/v4.4"
BASE="https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4"
mkdir -p "${DEST}"
for name in FacturaElectronica_V4.4.xsd TiqueteElectronico_V4.4.xsd; do
  tmp="${DEST}/.${name}.part"
  echo "Descargando ${name} desde Hacienda..."
  curl --fail --location --retry 3 --connect-timeout 15 --max-time 90 --silent --show-error     "${BASE}/${name}" --output "${tmp}"
  python3 - "${tmp}" "${name}" <<'PY'
import sys
import xml.etree.ElementTree as ET
path,name=sys.argv[1:]
tree=ET.parse(path)
root=tree.getroot()
if root.tag != "{http://www.w3.org/2001/XMLSchema}schema":
    raise SystemExit("Archivo descargado NO es un esquema XML: "+name)
if "2024/v4.4" not in root.attrib.get("targetNamespace", ""):
    raise SystemExit("Namespace inesperado; verificar versión antes de instalar: "+name)
print("Verificado XML Schema:",name,root.attrib.get("targetNamespace"))
PY
  mv "${tmp}" "${DEST}/${name}"
  sha256sum "${DEST}/${name}"
done
echo "XSD disponibles localmente. Pendiente validar ejemplos fiscales y firma."
