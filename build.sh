#!/bin/bash
# release.sh

# 确保在正确的分支上构建
git checkout main
npm run build

# 暂存构建文件和 package.json
git add build/ package.json
git stash push -m "Build files for release"

# 切换到发布分支
git checkout release 2>/dev/null || git checkout -b release

# 清理旧文件
git rm -rf . 2>/dev/null || true
rm -rf ./*

# 恢复构建文件
git stash pop

# 生成发布版 package.json
cp package.json package.json.bak
node -e "
const pkg = require('./package.json.bak');
const releasePkg = {
  name: pkg.name,
  version: pkg.version,
  main: pkg.main,
  module: pkg.module,
  typings: pkg.typings,
  dependencies: pkg.dependencies || {},
  files: ['build/**/*']
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