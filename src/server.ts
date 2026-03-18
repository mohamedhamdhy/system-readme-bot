import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { analyzeRepo } from "../streamingAPI/repoAnalyzer";
import { generateReadme } from "../detectsStack/readmeGenerator";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

const CLONE_DIR = path.join(__dirname, "../.tmp/clones");
if (!fs.existsSync(CLONE_DIR)) fs.mkdirSync(CLONE_DIR, { recursive: true });

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

app.post("/generate", async (req, res) => {
    const { repoUrl, pushBack } = req.body;

    if (!repoUrl || !repoUrl.startsWith("http")) {
        res.status(400).json({ error: "Invalid or missing repository URL" });
        return;
    }

    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });

    const log = (msg: string) => {
        res.write(msg + "\n");
        console.log(`[READSYS] ${msg}`);
    };

    try {
        log(`TARGET: ${repoUrl}`);
        log("INITIALIZING REPO ANALYZER...");

        const meta = await analyzeRepo(repoUrl, CLONE_DIR, log);

        log(`REPO: ${meta.name}`);
        log(`LANGUAGE: ${meta.language}`);
        log(`TECH STACK: ${meta.techStack.join(", ") || "none detected"}`);
        log(`ENTRY POINTS: ${meta.entryPoints.join(", ") || "none detected"}`);
        log(`DOCKER: ${meta.hasDocker ? "YES" : "NO"} | CI/CD: ${meta.hasCICD ? "YES" : "NO"}`);

        const readme = await generateReadme(meta, log);

        const outputPath = path.join(meta.clonePath, "README.md");
        fs.writeFileSync(outputPath, readme);
        log(`README WRITTEN → ${outputPath}`);

        if (pushBack) {
            log("PUSHING README TO REMOTE...");
            const simpleGit = require("simple-git");
            const git = simpleGit(meta.clonePath);
            try {
                await git.add("README.md");
                await git.commit("docs: auto-generate README via READSYS");
                await git.push();
                log("✅ PUSHED TO REMOTE SUCCESSFULLY");
            } catch (err: any) {
                log(`⚠️  PUSH FAILED: ${err.message}`);
                log("TIP: Ensure you have SSH/HTTPS write access to the repo");
            }
        }

        io.emit("readme-ready", { name: meta.name, readme });

        log("──────────────────────────────────────");
        log("✅ MISSION COMPLETE");
        res.end("DONE");

    } catch (err: any) {
        log(`❌ FATAL ERROR: ${err.message}`);
        res.end("ERROR");
    } finally {
        try {
            const repoName = repoUrl.replace(/\.git$/, "").split("/").pop() || "repo";
            const clonePath = path.join(CLONE_DIR, repoName);
            if (fs.existsSync(clonePath)) {
                fs.rmSync(clonePath, { recursive: true, force: true });
                console.log(`[READSYS] CLEANUP: ${clonePath}`);
            }
        } catch (_) { }
    }
});

app.post("/download", (req, res) => {
    const { content, filename } = req.body;
    if (!content) { res.status(400).json({ error: "No content" }); return; }
    res.setHeader("Content-Disposition", `attachment; filename="${filename || "README.md"}"`);
    res.setHeader("Content-Type", "text/markdown");
    res.send(content);
});

io.on("connection", () => {
    console.log("[READSYS] Dashboard client connected");
});

server.listen(PORT, () => {
    console.log(`[READSYS] Server running → http://localhost:${PORT}`);
});