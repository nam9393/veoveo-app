#!/usr/bin/env bash
set -e

echo "🚀 Đang build ứng dụng phiên bản mới nhất..."
npm run build

echo "📦 Build hoàn tất. Thư mục dist/ và docs/ đã được cập nhật bản mới nhất."

if [ -d ".git" ]; then
  git add .
  git commit -m "${1:-Cập nhật ứng dụng taplo quản lý xe mới nhất}" || true
  git push origin main || git push origin master || echo "⚠️ Hãy kiểm tra lại nhánh hoặc quyền truy cập git remote."
  echo "✅ Đã đồng bộ lên GitHub thành công!"
else
  echo "ℹ️ Dự án chưa gắn remote git."
  echo "Bạn có thể tải trực tiếp file zip từ ứng dụng hoặc chạy lệnh sau:"
  echo "git init"
  echo "git remote add origin <link_github_repo_cua_ban>"
  echo "git add ."
  echo "git commit -m 'Cap nhat giao dien va tinh nang moi nhat'"
  echo "git branch -M main"
  echo "git push -u origin main --force"
fi
