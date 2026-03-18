#!/usr/bin/env node
/**
 * 将本项目（akool-tools）中除 node_modules 等忽略项外的所有文件同步到目标目录（如 D:\my-workspace\HomeVerse）。
 *
 * 用法（在项目根目录执行）：
 *   node scripts/sync-to-workspace.js [目标路径]
 *
 * 示例：
 *   node scripts/sync-to-workspace.js                    # 同步到默认 D:\my-workspace\HomeVerse
 *   node scripts/sync-to-workspace.js D:\my-workspace\HomeVerse
 *   node scripts/sync-to-workspace.js D:\backup\HomeVerse
 *
 * 忽略：node_modules、.git、dist、build、coverage、.env、*.log 等（见脚本内 IGNORE_*）。
 */

const fs = require('fs');
const path = require('path');

const SOURCE_ROOT = path.resolve(__dirname, '..');
const DEFAULT_TARGET = 'D:\\my-workspace\\HomeVerse';

// 忽略的目录名或文件名（与路径片段匹配即可，不含 node_modules 的子孙会整棵跳过）
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  'out',
  '.nuxt',
  '.cache',
  '.parcel-cache',
  '.svelte-kit',
  '.turbo',
  '.vite',
  'out',
  '.docusaurus',
  '.serverless',
  '.fusebox',
  '.nyc_output',
  'report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json',
]);

// 忽略的文件名模式（支持后缀或全名）
const IGNORE_FILES = new Set([
  '.env',
  '.env.local',
  '.env.*.local',
  '*.log',
  '*.pid',
  '*.seed',
  '*.tsbuildinfo',
  '.eslintcache',
  '.stylelintcache',
  'npm-debug.log*',
  'yarn-debug.log*',
  'yarn-error.log*',
  'vite.config.js.timestamp-*',
  'vite.config.ts.timestamp-*',
]);

function shouldIgnoreDir(dirName) {
  if (IGNORE_DIRS.has(dirName)) return true;
  for (const p of IGNORE_DIRS) {
    if (p.includes('*') && new RegExp('^' + p.replace(/\*/g, '.*') + '$').test(dirName)) return true;
  }
  return false;
}

function shouldIgnoreFile(fileName) {
  if (IGNORE_FILES.has(fileName)) return true;
  const lower = fileName.toLowerCase();
  if (lower === '.env' || lower.startsWith('.env.') && lower.endsWith('.local')) return true;
  if (/\d+\.\d+\.\d+\.\d+\.json$/.test(fileName) && fileName.startsWith('report.')) return true;
  if (/\.log$/i.test(fileName) || /\.pid$/i.test(fileName) || /\.seed$/i.test(fileName)) return true;
  if (fileName.endsWith('.tsbuildinfo')) return true;
  if (fileName.includes('timestamp-') && (fileName.startsWith('vite.config.') || fileName.includes('vite.config.'))) return true;
  return false;
}

function mkdirp(dir) {
  if (!fs.existsSync(dir)) {
    mkdirp(path.dirname(dir));
    fs.mkdirSync(dir, { recursive: true });
  }
}

function syncDir(srcDir, targetDir) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const ent of entries) {
    const srcPath = path.join(srcDir, ent.name);
    const relPath = path.relative(SOURCE_ROOT, srcPath);
    const targetPath = path.join(targetDir, ent.name);

    if (ent.isDirectory()) {
      if (shouldIgnoreDir(ent.name)) {
        console.log('跳过目录:', relPath);
        continue;
      }
      mkdirp(targetPath);
      syncDir(srcPath, targetPath);
    } else {
      if (shouldIgnoreFile(ent.name)) {
        console.log('跳过文件:', relPath);
        continue;
      }
      mkdirp(targetDir);
      try {
        fs.copyFileSync(srcPath, targetPath);
        console.log('同步:', relPath);
      } catch (err) {
        console.error('复制失败:', relPath, err.message);
      }
    }
  }
}

function main() {
  const target = path.resolve(process.argv[2] || DEFAULT_TARGET);
  const sourceReal = fs.realpathSync(SOURCE_ROOT);
  let targetReal;
  try {
    targetReal = fs.existsSync(target) ? fs.realpathSync(target) : path.resolve(target);
  } catch (_) {
    targetReal = path.resolve(target);
  }
  if (targetReal === sourceReal || (targetReal.startsWith(sourceReal + path.sep))) {
    console.error('错误：目标目录不能在源项目目录内，避免循环复制。');
    process.exit(1);
  }
  console.log('源目录:', SOURCE_ROOT);
  console.log('目标目录:', target);
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
    console.log('已创建目标目录');
  }
  syncDir(SOURCE_ROOT, target);
  console.log('同步完成。');
}

main();
