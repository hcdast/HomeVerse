/**
 * PWA 图标生成脚本
 * 
 * 使用方法：
 * 1. 安装 sharp: npm install sharp --save-dev
 * 2. 运行: node scripts/generate-icons.js
 * 
 * 或者使用在线工具:
 * - https://realfavicongenerator.net/
 * - https://www.pwabuilder.com/imageGenerator
 */

const fs = require('fs');
const path = require('path');

// 如果安装了 sharp，可以使用以下代码生成图标
async function generateIcons() {
  try {
    const sharp = require('sharp');
    
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
    const inputSvg = path.join(__dirname, '../public/icons/icon.svg');
    const outputDir = path.join(__dirname, '../public/icons');

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
      
      await sharp(inputSvg)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ 生成: icon-${size}x${size}.png`);
    }

    // 生成 apple-touch-icon
    await sharp(inputSvg)
      .resize(180, 180)
      .png()
      .toFile(path.join(outputDir, '../apple-touch-icon.png'));
    
    console.log('✓ 生成: apple-touch-icon.png');

    // 生成 favicon
    await sharp(inputSvg)
      .resize(32, 32)
      .png()
      .toFile(path.join(outputDir, '../favicon.ico'));
    
    console.log('✓ 生成: favicon.ico');

    console.log('\n✅ 所有图标生成完成！');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('⚠️  sharp 模块未安装，请运行: npm install sharp --save-dev');
      console.log('\n或者使用在线工具生成图标:');
      console.log('  - https://realfavicongenerator.net/');
      console.log('  - https://www.pwabuilder.com/imageGenerator');
      console.log('\n将生成的图标放置在 public/icons/ 目录下');
    } else {
      console.error('生成图标时出错:', error);
    }
  }
}

generateIcons();




