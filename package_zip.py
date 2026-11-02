import os
import zipfile
import shutil

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(ROOT_DIR, 'public')
os.makedirs(PUBLIC_DIR, exist_ok=True)

SOURCE_ZIP = os.path.join(PUBLIC_DIR, 'veoveo-app-source.zip')
WEB_ZIP = os.path.join(PUBLIC_DIR, 'veoveo-app-web-dist.zip')

EXCLUDE_DIRS = {'node_modules', '.git', '.cache', 'coverage', '.aistudio'}
EXCLUDE_EXTS = {'.zip', '.log'}

# 1. Package Complete Source Code
print("Packing source code into", SOURCE_ZIP)
with zipfile.ZipFile(SOURCE_ZIP, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(ROOT_DIR):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in EXCLUDE_EXTS:
                continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, ROOT_DIR)
            if rel_path.startswith('public' + os.sep) and f.endswith('.zip'):
                continue
            zf.write(full_path, rel_path)

print("Source package created successfully.")

# 2. Package Web Dist if exists
DIST_DIR = os.path.join(ROOT_DIR, 'dist')
if os.path.exists(DIST_DIR):
    print("Packing dist into", WEB_ZIP)
    with zipfile.ZipFile(WEB_ZIP, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(DIST_DIR):
            for f in files:
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, DIST_DIR)
                zf.write(full_path, rel_path)
    print("Web dist package created successfully.")
