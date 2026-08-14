const fs = require('fs');
const path = require('path');

// 1x1 solid purple PNG in base64
const purplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const buffer = Buffer.from(purplePngBase64, 'base64');

const assetsDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

fs.writeFileSync(path.join(assetsDir, 'icon.png'), buffer);
fs.writeFileSync(path.join(assetsDir, 'splash.png'), buffer);
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), buffer);

console.log('Created assets/icon.png, assets/splash.png, assets/adaptive-icon.png');
