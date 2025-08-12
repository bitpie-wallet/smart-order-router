#!/bin/bash
# release.sh

# 确保在正确的分支上构建
git checkout main
npm run build

# 切换到发布分支
git checkout release 2>/dev/null || git checkout -b release

# 清理旧文件
git rm -rf . 2>/dev/null || true
rm -rf ./*

# 复制构建文件 - 保持原始目录结构
cp -r build/ ./
cp package.json ./package.json.bak

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

echo "Release branch updated successfully"