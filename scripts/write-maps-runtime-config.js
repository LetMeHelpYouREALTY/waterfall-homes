#!/usr/bin/env node
/**
 * Writes js/maps-runtime-config.js from Vercel / local env (no secrets in repo).
 * Set PUBLIC_GOOGLE_MAPS_API_KEY and optional PUBLIC_GOOGLE_MAPS_MAP_ID.
 */
const fs = require("fs");
const path = require("path");

const key = process.env.PUBLIC_GOOGLE_MAPS_API_KEY || "";
const mapId = process.env.PUBLIC_GOOGLE_MAPS_MAP_ID || "";

const out = `/* Auto-generated at build — do not edit manually */\nwindow.PUBLIC_GOOGLE_MAPS_API_KEY = ${JSON.stringify(key)};\nwindow.PUBLIC_GOOGLE_MAPS_MAP_ID = ${JSON.stringify(mapId)};\n(function () {\n  function syncMapsMeta() {\n    var meta = document.querySelector('meta[name="google-maps-api-key"]');\n    if (meta && window.PUBLIC_GOOGLE_MAPS_API_KEY) {\n      meta.content = window.PUBLIC_GOOGLE_MAPS_API_KEY;\n    }\n  }\n  if (document.readyState === "loading") {\n    document.addEventListener("DOMContentLoaded", syncMapsMeta);\n  } else {\n    syncMapsMeta();\n  }\n})();\n`;

const target = path.join(__dirname, "..", "js", "maps-runtime-config.js");
fs.writeFileSync(target, out, "utf8");
console.log("Wrote maps runtime config (API key length: " + key.length + ")");
