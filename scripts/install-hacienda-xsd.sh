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
  curl --fail --location --retry 5 --retry-all-errors --retry-delay 2 --connect-timeout 15 --max-time 120 --silent --show-error     "${BASE}/${name}" --output "${tmp}"
  python3 - "${tmp}" "${name}" <<'PY'
import sys
import xml.etree.ElementTree as ET
path,name=sys.argv[1:]
tree=ET.parse(path)
root=tree.getroot()
if root.tag != "{http://www.w3.org/2001/XMLSchema}schema":
    raise SystemExit("Archivo descargado NO es un esquema XML: "+name)
if "v4.4" not in root.attrib.get("targetNamespace", ""):
    raise SystemExit("Namespace inesperado; verificar versión antes de instalar: "+name)
print("Verificado XML Schema:",name,root.attrib.get("targetNamespace"))
PY
  # Approved SHA-256 fingerprints of official XSD files retrieved on 2026-11-10.
  # Do not silently accept a changed schema; review any Hacienda update first.
  case "${name}" in
    FacturaElectronica_V4.4.xsd)
      expected="d384afef665573606f6499b2182d6070850ada8c93bc40fa7f0f3901a25b9cc8" ;;
    TiqueteElectronico_V4.4.xsd)
      expected="cda1c7dd97f9a235111c29948f05d7893864663cd73792fd3b51e3dae582cfdb" ;;
    *) exit 1 ;;
  esac
  actual="$(sha256sum "${tmp}" | cut -d' ' -f1)"
  if [[ "${actual}" != "${expected}" ]]; then
    echo "ERROR: el SHA-256 de Hacienda cambió para ${name}. Revisar antes de instalar." >&2
    rm -f "${tmp}"
    exit 1
  fi
  mv "${tmp}" "${DEST}/${name}"
  echo "${actual}  ${DEST}/${name}"
done
echo "XSD disponibles localmente. Pendiente validar ejemplos fiscales y firma."
