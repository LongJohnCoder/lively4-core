module.exports = {
  LOADER_TRANSPILE: true,
  WORKER_BASE: "./src/external/lively4-serviceworker/",
  WORKER_ENABLED: true,
  WORKER_INIT: "./src/swx.js",
  WORKER_EMBED: false,
  CLIENT_ENABLED: true,
  CLIENT_BASE: "./",
  CLIENT_INIT: "/src/init.js",
}