#!/bin/bash
# release.sh

set -e  # 遇到错误立即退出

echo "=== 开始发布流程 ==="

# 确保在正确的分支上构建
echo "1. 切换到 main 分支..."
git checkout main

# 检查并安装依赖
echo "2. 检查依赖..."
if [ ! -d "node_modules" ]; then
  echo "   安装依赖..."
  npm install
else
  echo "   依赖已存在，跳过安装"
fi

# 构建项目
echo "3. 构建项目..."
npm run build

# 检查构建是否成功
if [ ! -d "build" ] || [ ! -f "package.json" ]; then
  echo "错误: 构建失败或文件缺失"
  exit 1
fi

echo "4. 构建成功，准备发布文件..."

# 创建临时目录保存构建文件
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT  # 确保退出时清理临时目录

cp -r build "$TEMP_DIR/"
cp package.json "$TEMP_DIR/"
# 复制文档文件
if [ -f "CHANGELOG.md" ]; then
  cp CHANGELOG.md "$TEMP_DIR/"
fi
if [ -f "README.md" ]; then
  cp README.md "$TEMP_DIR/"
fi
if [ -f "LICENSE" ]; then
  cp LICENSE "$TEMP_DIR/"
fi

# 切换到发布分支
echo "5. 切换到 build 分支..."
if git show-ref --verify --quiet refs/heads/build; then
  # build 分支已存在，直接切换
  echo "   build 分支已存在，切换到该分支..."
  git checkout build
else
  # build 分支不存在，创建新分支
  echo "   build 分支不存在，创建新分支..."
  git checkout -b build
fi

# 清理旧文件（保留 .git 目录）
echo "6. 清理旧文件..."
# 删除所有已跟踪的文件和目录
git rm -rf . 2>/dev/null || true
# 删除所有未跟踪的文件和目录（除了 .git）
find . -mindepth 1 -maxdepth 1 ! -name '.git' -type f -delete 2>/dev/null || true
find . -mindepth 1 -maxdepth 1 ! -name '.git' -type d -exec rm -rf {} + 2>/dev/null || true

# 从临时目录复制构建文件
echo "7. 复制构建文件..."
cp -r "$TEMP_DIR/build" ./
cp "$TEMP_DIR/package.json" ./package.json.bak
# 复制文档文件
if [ -f "$TEMP_DIR/CHANGELOG.md" ]; then
  cp "$TEMP_DIR/CHANGELOG.md" ./
fi
if [ -f "$TEMP_DIR/README.md" ]; then
  cp "$TEMP_DIR/README.md" ./
fi
if [ -f "$TEMP_DIR/LICENSE" ]; then
  cp "$TEMP_DIR/LICENSE" ./
fi

# 生成发布版 package.json
echo "8. 生成发布版 package.json..."
node -e "
const fs = require('fs');
const path = require('path');
const pkgPath = path.resolve('./package.json.bak');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const releasePkg = {
  name: pkg.name,
  version: pkg.version,
  main: pkg.main,
  module: pkg.module,
  typings: pkg.typings,
  dependencies: pkg.dependencies || {},
  files: ['build/**/*']
};
fs.writeFileSync('./package.json', JSON.stringify(releasePkg, null, 2));
"

# 清理临时文件
rm -f package.json.bak

# 提交并推送
echo "9. 提交更改..."
# 强制添加 build 目录（即使被 gitignore 忽略）
git add -f build/
git add package.json
# 添加文档文件
if [ -f "CHANGELOG.md" ]; then
  git add CHANGELOG.md
fi
if [ -f "README.md" ]; then
  git add README.md
fi
if [ -f "LICENSE" ]; then
  git add LICENSE
fi
VERSION=$(node -e "const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8')); console.log(pkg.version);")
COMMIT_MSG="Release v${VERSION} - $(date '+%Y年%m月%d日 %H:%M:%S')"
# 检查是否有更改需要提交
if ! git diff --cached --quiet || ! git diff --quiet; then
  echo "   提交更改..."
  git commit -m "$COMMIT_MSG"
else
  echo "   没有文件更改，跳过提交"
fi

echo "10. 推送到远程..."
# 检查是否有新的提交需要推送
if git rev-parse --verify origin/build >/dev/null 2>&1; then
  # 远程分支存在，检查是否有新提交
  if git log origin/build..HEAD --oneline 2>/dev/null | grep -q .; then
    git push origin build || echo "推送失败，请手动推送"
  else
    echo "   没有新提交需要推送"
  fi
else
  # 远程分支不存在，直接推送
  git push -u origin build || echo "推送失败，请手动推送"
fi

# 切换回 main 分支
echo "11. 切换回 main 分支..."
git checkout main

echo "=== 发布流程完成 ==="
echo "Build branch updated successfully"

