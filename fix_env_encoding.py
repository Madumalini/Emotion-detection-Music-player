import pathlib

p = pathlib.Path('.env')
if not p.exists():
    print('No .env file found.')
    raise SystemExit(1)

raw = p.read_bytes()
try:
    raw.decode('utf-8')
    print('Already UTF-8.')
except Exception:
    text = raw.decode('latin1')
    p.write_text(text, encoding='utf-8')
    print('Rewrote .env as UTF-8.')
