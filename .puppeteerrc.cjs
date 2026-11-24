const { join } = require('path');
// keep the headless browser inside this folder (no system Chrome needed, nothing written to ~/.cache)
module.exports = { cacheDirectory: join(__dirname, '.cache', 'puppeteer'), chrome: { skipDownload: true }, 'chrome-headless-shell': { skipDownload: false } };
