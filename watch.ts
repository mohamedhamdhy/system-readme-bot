const chokidar = require("chokidar");
const { Server: SocketServer } = require("socket.io");
const http = require("http");

const reloadServer = http.createServer();
const reloadIO = new SocketServer(reloadServer, { cors: { origin: "*" } });

reloadServer.listen(3001, () => {
    console.log("👁  Watcher running on ws://localhost:3001");
});

const watcher = chokidar.watch("public/", {
    persistent: true,
    ignoreInitial: true
});

watcher.on("change", (filePath: string) => {
    console.log(`♻  Changed: ${filePath} — reloading...`);
    reloadIO.emit("reload");
});

watcher.on("add", (filePath: string) => {
    console.log(`➕ Added: ${filePath} — reloading...`);
    reloadIO.emit("reload");
});

console.log("📂 Watching public/ for changes...");