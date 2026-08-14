const fs = require('fs');
const path = require('path');

// Search node_modules in project for files that might cause "Cannot read property 'S' of undefined"
const searchDir = path.join(__dirname, '..', 'node_modules');

function scanFile(filePath) {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.json')) return;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    // Search for patterns like undefined.S or .S where S is accessed on an undefined object
    if (content.includes('TurboModuleRegistry') || content.includes('.S') || content.includes('global.S')) {
      // Print files of interest
    }
  } catch (e) {}
}

console.log('Scanning node_modules...');
