#!/bin/bash
# release.sh

# 确保在正确的分支上构建
git checkout main
npm run build

# 检查构建是否成功
if [ ! -d "build" ] || [ ! -f "package.json" ]; then
  echo "Error: Build failed or files missing"
  exit 1
fi

# 创建临时目录保存构建文件
TEMP_DIR=$(mktemp -d)
cp -r build "$TEMP_DIR/"
cp package.json "$TEMP_DIR/"

# 切换到发布分支
git checkout release 2>/dev/null || git checkout -b release

# 清理旧文件（保留 .git 目录）
git rm -rf . 2>/dev/null || true
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} + 2>/dev/null || true

# 从临时目录复制构建文件
cp -r "$TEMP_DIR/build" ./
cp "$TEMP_DIR/package.json" ./package.json.bak

# 清理临时目录
rm -rf "$TEMP_DIR"

# 生成发布版 package.json
node -e "
const pkg = require('./package.json.bak');
const releasePkg = {
  name: pkg.name,
  version: pkg.version,
  main: pkg.main,        // 'build/main/index.js'
  module: pkg.module,    // 'build/module/index.js'
  typings: pkg.typings,  // 'build/main/index.d.ts'
  dependencies: pkg.dependencies || {},
  files: [
    'build/**/*'
  ]
};
require('fs').writeFileSync('./package.json', JSON.stringify(releasePkg, null, 2));
"

# 清理临时文件
rm package.json.bak

# 提交并推送
git add .
git commit -m "Release v$(node -e "console.log(require('./package.json').version)") - $(date)"
git push origin release

# 切换回 main 分支
git checkout main

echo "Release branch updated successfully"

