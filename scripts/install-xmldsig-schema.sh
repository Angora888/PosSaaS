#!/usr/bin/env bash
set -euo pipefail

# The Hacienda 4.4 XSD imports the XML Digital Signature namespace without
# a schemaLocation. Compile offline with the W3C schema supplied locally.
# No remote XML schema resolution is performed at request time.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="${ROOT}/PosSaaS.Api/PosSaaS.Api/FiscalSchemas/v4.4"
mkdir -p "${DIR}"
TMP="${DIR}/.xmldsig-core-schema.original"
URL="https://www.w3.org/TR/2002/REC-xmldsig-core-20020212/xmldsig-core-schema.xsd"
curl --fail --location --retry 3 --retry-all-errors --connect-timeout 15 --max-time 90 \
    --silent --show-error "${URL}" --output "${TMP}"

python3 - "${TMP}" "${DIR}/xmldsig-core-schema.xsd" <<'PY'
import pathlib, re, sys, hashlib
import xml.etree.ElementTree as ET
raw_path, output_path = map(pathlib.Path, sys.argv[1:])
data = raw_path.read_bytes()
if len(data) > 256000:
    raise SystemExit("Unexpectedly large W3C signature schema")
fingerprint = hashlib.sha256(data).hexdigest()
if fingerprint != "35cf8197da812c85e40d57891b35c94187569ed474a2dac813ce5090dafcd35c":
    raise SystemExit("W3C XMLDSIG schema fingerprint changed. Review before install.")
print("Verified W3C XMLDSIG source SHA-256:", fingerprint)
source = data.decode("utf-8-sig")
# The W3C schema's internal DOCTYPE declares an entity for the namespace.
# Strip only that trusted fixed W3C DTD block for secure offline XmlReader parsing.
source, changed = re.subn(r'<!DOCTYPE\s+schema\b.*?\]>', '', source,
                           count=1, flags=re.DOTALL)
if changed != 1:
    raise SystemExit("Unexpected W3C XMLDSIG DTD format")
source = source.replace('&dsig;', 'http://www.w3.org/2000/09/xmldsig#')
root = ET.fromstring(source)
ns = '{http://www.w3.org/2001/XMLSchema}'
if root.tag != ns + 'schema' or root.get('targetNamespace') != 'http://www.w3.org/2000/09/xmldsig#':
    raise SystemExit("Not a W3C XMLDSIG core schema")
if not any(e.get('name') == 'Signature' for e in root.findall(ns + 'element')):
    raise SystemExit("Missing XMLDSIG Signature element")
output_path.write_text(source, encoding="utf-8")
print("Offline XMLDSIG schema ready:", hashlib.sha256(source.encode()).hexdigest())
PY
rm -f "${TMP}"
