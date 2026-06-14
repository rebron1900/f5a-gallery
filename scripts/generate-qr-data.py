"""Generate F5AQR1 QR code data for each theme.
Output: public/qr-data.json — { slug: "F5AQR1|..." }
Frontend reads this and generates QR codes client-side.
"""
import json, os, glob, lzma, base64, binascii, hashlib, random, string

def gen_theme_id():
    """Generate T + 11 hex chars (like T031f7f1fc7a)"""
    return 'T' + ''.join(random.choices('0123456789abcdef', k=11))

def make_qr_string(theme_json_str):
    """Build F5AQR1 string from a theme JSON string."""
    # Wrap in schema envelope
    envelope = json.dumps({
        "schema": "f5a-theme-qr-v1",
        "theme": theme_json_str
    }, separators=(',', ':'), ensure_ascii=False)

    # XZ compress
    xz_data = lzma.compress(envelope.encode('utf-8'), format=lzma.FORMAT_XZ, preset=9)

    # URL-safe base64
    b64 = base64.b64encode(xz_data).decode('ascii')
    b64_urlsafe = b64.replace('+', '-').replace('/', '_').rstrip('=')

    # CRC32 of raw XZ data
    crc = binascii.crc32(xz_data) & 0xffffffff

    # Theme ID
    tid = gen_theme_id()

    return f"F5AQR1|{tid}|1/1|{crc}|{b64_urlsafe}"

themes_dir = os.path.join(os.path.dirname(__file__), '..', 'src', 'content', 'themes')
out_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'qr-data.json')

# Gallery-only fields — strip before QR encoding
STRIP_KEYS = {'builtin', 'author'}

qr_data = {}
for f in sorted(glob.glob(os.path.join(themes_dir, '*.json'))):
    slug = os.path.basename(f).replace('.json', '')
    with open(f) as fh:
        theme = json.load(fh)
    # Remove gallery-specific fields not in native format
    for k in STRIP_KEYS:
        theme.pop(k, None)
    theme_json = json.dumps(theme, separators=(',', ':'), ensure_ascii=False)
    qr_data[slug] = make_qr_string(theme_json)
    print(f"  {slug}")

with open(out_path, 'w') as fh:
    json.dump(qr_data, fh, ensure_ascii=False)

print(f"\nDone: {len(qr_data)} themes → {out_path}")
