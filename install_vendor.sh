#!/bin/bash
# ============================================================
# สั่งติดตั้ง libraries ที่จำเป็นทั้งหมด bash install_vendor.sh
# ดาวน์โหลด frontend libraries ทั้งหมดมาเก็บไว้ใน assets/vendor/
# รันสคริปต์นี้ครั้งเดียวหลังจาก clone โปรเจค
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENDOR_DIR="$SCRIPT_DIR/assets/vendor"

echo "================================================"
echo "  MT System - Install Frontend Vendor Libraries"
echo "================================================"
echo "Target: $VENDOR_DIR"
echo ""

# สร้างโฟลเดอร์
mkdir -p "$VENDOR_DIR/bootstrap/css"
mkdir -p "$VENDOR_DIR/bootstrap/js"
mkdir -p "$VENDOR_DIR/fontawesome/css"
mkdir -p "$VENDOR_DIR/fontawesome/webfonts"
mkdir -p "$VENDOR_DIR/fonts/sarabun"
mkdir -p "$VENDOR_DIR/jquery"
mkdir -p "$VENDOR_DIR/popper"
mkdir -p "$VENDOR_DIR/chartjs"
mkdir -p "$VENDOR_DIR/jspdf"
mkdir -p "$VENDOR_DIR/html2canvas"
mkdir -p "$VENDOR_DIR/xlsx"

# ฟังก์ชันโหลดไฟล์พร้อม retry
download() {
    local url="$1"
    local dest="$2"
    local label="$3"
    if curl -sL --retry 3 --retry-delay 2 --max-time 60 "$url" -o "$dest"; then
        local size=$(du -sh "$dest" | cut -f1)
        echo "  [OK] $label ($size)"
    else
        echo "  [FAIL] $label"
        echo "         URL: $url"
        exit 1
    fi
}

# ── Bootstrap 4.5.2 ──────────────────────────────────────────
echo "Bootstrap 4.5.2"
download \
    "https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" \
    "$VENDOR_DIR/bootstrap/css/bootstrap.min.css" \
    "bootstrap.min.css"
download \
    "https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js" \
    "$VENDOR_DIR/bootstrap/js/bootstrap.min.js" \
    "bootstrap.min.js"
download \
    "https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js" \
    "$VENDOR_DIR/bootstrap/js/bootstrap.bundle.min.js" \
    "bootstrap.bundle.min.js"

# ── jQuery 3.5.1 ─────────────────────────────────────────────
echo "jQuery 3.5.1"
download \
    "https://code.jquery.com/jquery-3.5.1.min.js" \
    "$VENDOR_DIR/jquery/jquery-3.5.1.min.js" \
    "jquery-3.5.1.min.js"

# ── Popper.js 1.16.1 ─────────────────────────────────────────
echo "Popper.js 1.16.1"
download \
    "https://cdn.jsdelivr.net/npm/popper.js@1.16.1/dist/umd/popper.min.js" \
    "$VENDOR_DIR/popper/popper.min.js" \
    "popper.min.js"

# ── Chart.js 3.9.1 ───────────────────────────────────────────
echo "Chart.js 3.9.1"
download \
    "https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js" \
    "$VENDOR_DIR/chartjs/chart.min.js" \
    "chart.min.js"

# ── jsPDF 2.5.1 ──────────────────────────────────────────────
echo "jsPDF 2.5.1"
download \
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" \
    "$VENDOR_DIR/jspdf/jspdf.umd.min.js" \
    "jspdf.umd.min.js"

# ── html2canvas 1.4.1 ────────────────────────────────────────
echo "html2canvas 1.4.1"
download \
    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" \
    "$VENDOR_DIR/html2canvas/html2canvas.min.js" \
    "html2canvas.min.js"

# ── SheetJS xlsx 0.20.0 ──────────────────────────────────────
echo "SheetJS xlsx 0.20.0"
download \
    "https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js" \
    "$VENDOR_DIR/xlsx/xlsx.full.min.js" \
    "xlsx.full.min.js"

# ── Font Awesome 5.15.4 ──────────────────────────────────────
echo "Font Awesome 5.15.4 (CSS)"
download \
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" \
    "$VENDOR_DIR/fontawesome/css/all.min.css" \
    "all.min.css"

echo "Font Awesome 5.15.4 (webfonts)"
FA_BASE="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/webfonts"
for f in \
    fa-brands-400.eot fa-brands-400.svg fa-brands-400.ttf fa-brands-400.woff fa-brands-400.woff2 \
    fa-regular-400.eot fa-regular-400.svg fa-regular-400.ttf fa-regular-400.woff fa-regular-400.woff2 \
    fa-solid-900.eot fa-solid-900.svg fa-solid-900.ttf fa-solid-900.woff fa-solid-900.woff2; do
    download "$FA_BASE/$f" "$VENDOR_DIR/fontawesome/webfonts/$f" "$f"
done

# ── Sarabun Font (Google Fonts - Thai) ───────────────────────
echo "Sarabun Font (Thai)"
echo "  Fetching font CSS from Google..."
SARABUN_CSS=$(curl -sL \
    "https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;600;700;800&display=swap" \
    -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

if [ -z "$SARABUN_CSS" ]; then
    echo "  [FAIL] Cannot fetch Sarabun font CSS"
    exit 1
fi

# โหลด woff2 และสร้าง local CSS
python3 - <<PYEOF
import re, hashlib, subprocess, sys

css = """$SARABUN_CSS"""

urls = re.findall(r'url\((https://fonts\.gstatic\.com/[^)]+\.woff2)\)', css)

if not urls:
    print("  [FAIL] No font URLs found in CSS")
    sys.exit(1)

def bash_md5(url):
    result = subprocess.check_output(f'echo "{url}" | md5sum', shell=True)
    return result.decode()[:8]

def download_font(url, dest):
    ret = subprocess.call(['curl', '-sL', '--retry', '3', '--max-time', '30', url, '-o', dest])
    return ret == 0

def replace_url(m):
    url = m.group(1)
    if 'fonts.gstatic.com' in url and '.woff2' in url:
        h = bash_md5(url)
        return f"url(sarabun/{h}.woff2)"
    return m.group(0)

# โหลดแต่ละ font file
success = 0
for url in urls:
    h = bash_md5(url)
    dest = f"$VENDOR_DIR/fonts/sarabun/{h}.woff2"
    if download_font(url, dest):
        success += 1
    else:
        print(f"  [WARN] Failed: {url}")

print(f"  [OK] Downloaded {success}/{len(urls)} font files")

# สร้าง sarabun.css
local_css = re.sub(r'url\((https://[^)]+\.woff2)\)', replace_url, css)
with open("$VENDOR_DIR/fonts/sarabun.css", 'w') as f:
    f.write(local_css)

print("  [OK] Created sarabun.css")
PYEOF

# ── สรุป ─────────────────────────────────────────────────────
echo ""
echo "================================================"
echo "  Done! Total size: $(du -sh "$VENDOR_DIR" | cut -f1)"
echo "================================================"
echo ""
echo "Libraries installed:"
echo "  assets/vendor/bootstrap/      - Bootstrap 4.5.2"
echo "  assets/vendor/jquery/         - jQuery 3.5.1"
echo "  assets/vendor/popper/         - Popper.js 1.16.1"
echo "  assets/vendor/chartjs/        - Chart.js 3.9.1"
echo "  assets/vendor/jspdf/          - jsPDF 2.5.1"
echo "  assets/vendor/html2canvas/    - html2canvas 1.4.1"
echo "  assets/vendor/xlsx/           - SheetJS xlsx 0.20.0"
echo "  assets/vendor/fontawesome/    - Font Awesome 5.15.4"
echo "  assets/vendor/fonts/          - Sarabun (Thai font)"
