const fs = require('fs');
const path = require('path');

/**
 * Reads JSON from /data safely.
 * If file is missing or invalid, returns fallback.
 */
function readJson(dataFileName, fallback) {
  const filePath = path.join(__dirname, '..', 'data', dataFileName);

  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw || raw.trim() === '') return fallback;
    return JSON.parse(raw);
  } catch (err) {
    // If JSON is malformed, do not crash the server; return fallback.
    return fallback;
  }
}

/**
 * Writes JSON to /data safely.
 */
function writeJson(dataFileName, value) {
  const filePath = path.join(__dirname, '..', 'data', dataFileName);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

module.exports = { readJson, writeJson };
