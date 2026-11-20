import os
import zipfile
import shutil

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(ROOT_DIR, 'public')
os.makedirs(PUBLIC_DIR, exist_ok=True)

SOURCE_ZIP = os.path.join(PUBLIC_DIR, 'veoveo-app-source.zip')
WEB_ZIP = os.path.join(PUBLIC_DIR, 'veoveo-app-web-dist.zip')

EXCLUDE_DIRS = {'node_modules', '.git', '.cache', 'coverage', '.aistudio', 'docs'}
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
                if f.endswith('.zip'):
                    continue
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, DIST_DIR)
                zf.write(full_path, rel_path)
    print("Web dist package created successfully.")

# Also sync packages into dist and docs
for target in [os.path.join(ROOT_DIR, 'dist'), os.path.join(ROOT_DIR, 'docs')]:
    if os.path.exists(target):
        try:
            shutil.copy2(SOURCE_ZIP, target)
            shutil.copy2(WEB_ZIP, target)
            # Ensure assets from public/assets (like MP3 chill music) are copied
            public_assets = os.path.join(PUBLIC_DIR, 'assets')
            target_assets = os.path.join(target, 'assets')
            if os.path.exists(public_assets) and os.path.exists(target_assets):
                for item in os.listdir(public_assets):
                    s = os.path.join(public_assets, item)
                    d = os.path.join(target_assets, item)
                    if os.path.isdir(s):
                        if not os.path.exists(d):
                            shutil.copytree(s, d)
                    else:
                        shutil.copy2(s, d)
        except Exception as e:
            print("Sync warning:", e)
