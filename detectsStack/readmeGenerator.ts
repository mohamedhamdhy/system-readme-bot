import { RepoMeta } from "../streamingAPI/repoAnalyzer";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

async function aiDescribe(meta: RepoMeta): Promise<string> {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return "";
    try {
        const prompt = `You are a senior technical writer. Write a 2-3 sentence project description for a GitHub README.
Project: ${meta.name}
Existing description: ${meta.description || "none"}
Tech stack: ${meta.techStack.slice(0, 8).join(", ")}
Language: ${meta.language}
Architecture: ${meta.architectureType}
Write professionally and specifically. No fluff. No markdown.`;

        const res = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            { model: "gpt-3.5-turbo", messages: [{ role: "user", content: prompt }], max_tokens: 150, temperature: 0.7 },
            { headers: { Authorization: `Bearer ${key}` } }
        );
        return res.data.choices[0].message.content.trim();
    } catch (_) { return ""; }
}

function buildBadges(meta: RepoMeta): string {
    const badges: string[] = [];
    const ver = meta.nodeVersion || "18.x";
    badges.push(`[![Node.js](https://img.shields.io/badge/Node.js-${ver}-green.svg)](https://nodejs.org/)`);

    if (meta.techStack.includes("Express.js"))
        badges.push(`[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com/)`);
    if (meta.techStack.includes("TypeScript"))
        badges.push(`[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)`);
    if (meta.hasDocker)
        badges.push(`[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)`);
    if (meta.hasCICD)
        badges.push(`[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-green.svg)](https://github.com/features/actions)`);

    badges.push(`[![License](https://img.shields.io/badge/license-${meta.licenseType}-blue.svg)](LICENSE)`);
    if (meta.hasContributing)
        badges.push(`[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)`);

    return badges.join("\n");
}

function buildTOC(meta: RepoMeta): string {
    const items: string[] = [
        "- [Features](#-features)",
        "- [Architecture](#-architecture)",
        "- [Tech Stack](#-tech-stack)",
        "- [Project Structure](#-project-structure)",
        "- [Getting Started](#-getting-started)",
        "- [Environment Variables](#-environment-variables)",
    ];
    if (meta.hasAPI && meta.routes.length > 0) items.push("- [API Documentation](#-api-documentation)");
    if (meta.hasORM) items.push("- [Database Schema](#-database-schema)");
    if (meta.hasAuth) items.push("- [Authentication Flow](#-authentication-flow)");
    items.push("- [Development](#-development)");
    if (meta.hasTests) items.push("- [Testing](#-testing)");
    if (meta.hasDocker || meta.hasPM2) items.push("- [Deployment](#-deployment)");
    items.push("- [Contributing](#-contributing)");
    items.push("- [License](#-license)");
    return items.join("\n");
}

function buildFeatures(meta: RepoMeta): string {
    if (Object.keys(meta.features).length === 0) {
        return `- ✅ Built with ${meta.language}\n- ✅ Modular architecture\n- ✅ Easy to extend and maintain`;
    }

    const lines: string[] = [];
    for (const [category, items] of Object.entries(meta.features)) {
        lines.push(`### ${category}`);
        for (const item of items) {
            lines.push(`- **${item}**`);
        }
        lines.push("");
    }
    return lines.join("\n");
}

function buildArchitecture(meta: RepoMeta): string {
    if (meta.architectureType === "simple") {
        return `This project follows a simple modular structure with clear separation of concerns.`;
    }

    const lines: string[] = [];

    if (meta.architectureType === "clean") {
        lines.push(`This project follows **Clean Architecture** principles with clear separation of concerns:`);
        lines.push("");
        lines.push("```");
        lines.push("┌─────────────────────────────────────────────────┐");
        lines.push("│                   API Layer                     │");
        lines.push("│            (Routes, Controllers)                │");
        lines.push("└────────────────┬────────────────────────────────┘");
        lines.push("                 │");
        lines.push("┌────────────────▼────────────────────────────────┐");
        lines.push("│              Application Layer                  │");
        lines.push("│         (Use Cases, Services)                   │");
        lines.push("└────────────────┬────────────────────────────────┘");
        lines.push("                 │");
        lines.push("┌────────────────▼────────────────────────────────┐");
        lines.push("│               Domain Layer                      │");
        lines.push("│        (Entities, Interfaces)                   │");
        lines.push("└────────────────┬────────────────────────────────┘");
        lines.push("                 │");
        lines.push("┌────────────────▼────────────────────────────────┐");
        lines.push("│           Infrastructure Layer                  │");
        lines.push("│    (Database, Cache, External Services)         │");
        lines.push("└─────────────────────────────────────────────────┘");
        lines.push("```");
        lines.push("");
        lines.push("### Layer Responsibilities");
        lines.push("");
        for (const layer of meta.architectureLayers) {
            const name = layer.split("(")[0].trim();
            const detail = layer.includes("(") ? layer.match(/\(([^)]+)\)/)?.[1] || "" : "";
            lines.push(`**${name}**`);
            if (detail) lines.push(`- ${detail.split(",").map(s => s.trim()).join("\n- ")}`);
            lines.push("");
        }
    } else if (meta.architectureType === "mvc") {
        lines.push(`This project follows the **MVC (Model-View-Controller)** pattern:`);
        lines.push("");
        lines.push("```");
        lines.push("┌──────────────┐    ┌──────────────┐    ┌──────────────┐");
        lines.push("│    Routes    │───▶│ Controllers  │───▶│   Models     │");
        lines.push("│              │    │              │    │              │");
        lines.push("│ HTTP Routing │    │ Business     │    │ Data Layer   │");
        lines.push("└──────────────┘    └──────────────┘    └──────────────┘");
        lines.push("```");
    } else {
        lines.push(`This project follows a **Layered Architecture**:`);
        lines.push("");
        for (const layer of meta.architectureLayers) {
            lines.push(`- **${layer}**`);
        }
    }

    return lines.join("\n");
}

function buildTechStack(meta: RepoMeta): string {
    if (Object.keys(meta.techStackGrouped).length === 0) {
        return `- **${meta.language}**`;
    }

    const lines: string[] = [];
    for (const [category, items] of Object.entries(meta.techStackGrouped)) {
        lines.push(`### ${category}`);
        for (const item of items) {
            lines.push(`- **${item}**`);
        }
        lines.push("");
    }
    return lines.join("\n");
}

function buildProjectStructure(meta: RepoMeta): string {
    const lines: string[] = ["```", `${meta.name}/`];

    const tree: Record<string, any> = {};
    for (const f of meta.fileTree) {
        const parts = f.split("/");
        let node = tree;
        for (const part of parts) {
            if (!node[part]) node[part] = {};
            node = node[part];
        }
    }

    function renderTree(node: Record<string, any>, prefix = "", depth = 0): string[] {
        if (depth > 3) return [];
        const result: string[] = [];
        const entries = Object.entries(node);
        entries.forEach(([key, children], i) => {
            const isLast = i === entries.length - 1;
            const connector = isLast ? "└── " : "├── ";
            const isDir = Object.keys(children as object).length > 0;
            const desc = isDir && depth === 0 ? `   # ${meta.dirDescriptions[key] || ""}` : "";
            result.push(`${prefix}${connector}${key}${isDir ? "/" : ""}${desc}`);
            if (isDir && depth < 2) {
                const childPrefix = prefix + (isLast ? "    " : "│   ");
                result.push(...renderTree(children as Record<string, any>, childPrefix, depth + 1));
            }
        });
        return result;
    }

    lines.push(...renderTree(tree));
    lines.push("```");
    return lines.join("\n");
}

function buildPrerequisites(meta: RepoMeta): string {
    return meta.prerequisites.map(p => `- ${p}`).join("\n");
}

function buildInstallation(meta: RepoMeta): string {
    const githubUser = process.env.GITHUB_USERNAME || "mohamedalhamdhy";
    const repoPath = meta.repoUrl.replace("https://github.com/", "").replace(/\.git$/, "");
    const steps: string[] = [];

    steps.push(`1. **Clone the repository**`);
    steps.push(`\`\`\`bash`);
    steps.push(`git clone ${meta.repoUrl}`);
    steps.push(`cd ${meta.name}`);
    steps.push(`\`\`\``);
    steps.push("");

    if (Object.keys(meta.dependencies).length > 0 || Object.keys(meta.devDependencies).length > 0) {
        steps.push(`2. **Install dependencies**`);
        steps.push(`\`\`\`bash`);
        steps.push(`npm install`);
        steps.push(`\`\`\``);
        steps.push("");
    }

    if (meta.hasEnv) {
        steps.push(`3. **Configure environment variables**`);
        steps.push(`\`\`\`bash`);
        steps.push(`cp .env.example .env`);
        steps.push(`# Edit .env with your configuration`);
        steps.push(`\`\`\``);
        steps.push("");
    }

    if (meta.hasMigrations) {
        steps.push(`4. **Setup database**`);
        steps.push(`\`\`\`bash`);
        steps.push(`# Run migrations`);
        steps.push(`npm run migrate`);
        if (meta.hasSeeders) {
            steps.push(`# (Optional) Seed database`);
            steps.push(`npm run seed`);
        }
        steps.push(`\`\`\``);
        steps.push("");
    }

    if (meta.techStack.some(t => t.toLowerCase().includes("redis"))) {
        const n = steps.filter(s => s.match(/^\d\./)).length + 1;
        steps.push(`${n}. **Start Redis server**`);
        steps.push(`\`\`\`bash`);
        steps.push(`redis-server`);
        steps.push(`\`\`\``);
        steps.push("");
    }

    const finalStep = steps.filter(s => s.match(/^\d\./)).length + 1;
    steps.push(`${finalStep}. **Run the application**`);
    steps.push(`\`\`\`bash`);
    if (meta.scripts["dev"]) steps.push(`# Development mode`);
    if (meta.scripts["dev"]) steps.push(`npm run dev`);
    if (meta.scripts["start"]) steps.push(`# Production mode`);
    if (meta.scripts["start"]) steps.push(`npm start`);
    if (!meta.scripts["dev"] && !meta.scripts["start"]) steps.push(`node ${meta.entryPoints[0] || "index.js"}`);
    steps.push(`\`\`\``);
    steps.push("");
    steps.push(`The server will start on \`http://localhost:3000\` (or your configured port).`);

    return steps.join("\n");
}

function buildEnvVars(meta: RepoMeta): string {
    if (!meta.hasEnv && meta.envVars.length === 0) {
        return "No environment variables required.";
    }

    const lines: string[] = [];
    lines.push(`Create a \`.env\` file in the root directory. See \`.env.example\` for reference.`);
    lines.push("");

    if (meta.envVars.length > 0) {
        lines.push("```env");
        const grouped: Record<string, typeof meta.envVars> = {};
        for (const v of meta.envVars) {
            const prefix = v.key.split("_")[0];
            if (!grouped[prefix]) grouped[prefix] = [];
            grouped[prefix].push(v);
        }

        for (const [prefix, vars] of Object.entries(grouped)) {
            lines.push(`# ${prefix}`);
            for (const v of vars) {
                lines.push(`${v.key}=${v.example}`);
            }
            lines.push("");
        }
        lines.push("```");
        lines.push("");

        lines.push("| Variable | Description |");
        lines.push("|----------|-------------|");
        for (const v of meta.envVars) {
            lines.push(`| \`${v.key}\` | ${v.description} |`);
        }
    } else {
        lines.push("| Variable | Description |");
        lines.push("|----------|-------------|");
        lines.push("| `PORT` | Server port (default: 3000) |");
        lines.push("| `NODE_ENV` | Environment (development/production) |");
    }

    return lines.join("\n");
}

function buildAPIDoc(meta: RepoMeta): string {
    if (meta.routes.length === 0) return "";

    const lines: string[] = [];
    lines.push("### Base URL");
    lines.push("```");
    lines.push("http://localhost:3000/api/v1");
    lines.push("```");
    lines.push("");

    const byResource: Record<string, typeof meta.routes> = {};
    for (const r of meta.routes) {
        const resource = r.file.split("/").pop()?.replace(/\.(routes?|controller)\.(t|j)s/, "") || "general";
        if (!byResource[resource]) byResource[resource] = [];
        byResource[resource].push(r);
    }

    for (const [resource, routes] of Object.entries(byResource)) {
        lines.push(`### ${resource.charAt(0).toUpperCase() + resource.slice(1)} Endpoints`);
        lines.push("");
        lines.push("| Method | Endpoint | Description |");
        lines.push("|--------|----------|-------------|");
        for (const r of routes) {
            const desc = `${r.method} ${r.path}`.toLowerCase()
                .replace("get /", "Get ")
                .replace("post /", "Create ")
                .replace("put /", "Update ")
                .replace("patch /", "Update ")
                .replace("delete /", "Delete ");
            lines.push(`| \`${r.method}\` | \`${r.path}\` | ${desc} |`);
        }
        lines.push("");
    }

    return lines.join("\n");
}

function buildDBSection(meta: RepoMeta): string {
    if (!meta.hasORM) return "";

    const lines: string[] = [];
    lines.push(`This project uses **${meta.dbType || "a relational database"}** with **${meta.techStack.find(t => t.toLowerCase().includes("orm") || t.toLowerCase().includes("sequelize") || t.toLowerCase().includes("prisma")) || "ORM"
        }**.`);
    lines.push("");

    if (meta.hasMigrations) {
        lines.push("### Migrations");
        lines.push("```bash");
        lines.push("# Run all pending migrations");
        if (meta.scripts["migrate"]) lines.push("npm run migrate");
        else if (meta.scripts["db:migrate"]) lines.push("npm run db:migrate");
        else lines.push("npx sequelize-cli db:migrate");
        lines.push("");
        lines.push("# Rollback last migration");
        if (meta.scripts["migrate:undo"]) lines.push("npm run migrate:undo");
        else lines.push("npx sequelize-cli db:migrate:undo");
        lines.push("```");
        lines.push("");
    }

    if (meta.hasSeeders) {
        lines.push("### Seeding");
        lines.push("```bash");
        if (meta.scripts["seed"]) lines.push("npm run seed");
        else lines.push("npx sequelize-cli db:seed:all");
        lines.push("```");
    }

    return lines.join("\n");
}

function buildAuthFlow(meta: RepoMeta): string {
    if (!meta.hasAuth) return "";

    const lines: string[] = [];

    if (meta.authFeatures.includes("JWT")) {
        lines.push("### JWT Authentication Flow");
        lines.push("");
        lines.push("```");
        lines.push("Client          API              Service          DB");
        lines.push("  │               │                 │               │");
        lines.push("  │──POST /login──▶               │               │");
        lines.push("  │               │──validate────▶│               │");
        lines.push("  │               │               │──check user──▶│");
        lines.push("  │               │               │◀──user data───│");
        if (meta.authFeatures.includes("OTP")) {
            lines.push("  │               │               │──send OTP─────▶ Email/SMS");
        }
        lines.push("  │               │               │──generate JWT─│");
        lines.push("  │◀──200 + tokens─               │               │");
        lines.push("  │               │                 │               │");
        lines.push("  │──GET /resource─▶               │               │");
        lines.push("  │  (Bearer JWT)  │                │               │");
        lines.push("  │               │──verify token─▶│               │");
        lines.push("  │◀──200 + data───                │               │");
        lines.push("```");
        lines.push("");
    }

    lines.push("### Token Strategy");
    lines.push("");
    lines.push("| Token | Purpose | Expiry |");
    lines.push("|-------|---------|--------|");
    lines.push("| Access Token | Authenticate API requests | Short-lived (15m) |");
    lines.push("| Refresh Token | Obtain new access tokens | Long-lived (7d) |");

    if (meta.authFeatures.includes("OTP")) {
        lines.push("");
        lines.push("### OTP Verification");
        lines.push("");
        lines.push("OTP is used for registration verification, login, and password reset. Delivered via email and/or SMS.");
    }

    return lines.join("\n");
}

function buildScripts(meta: RepoMeta): string {
    if (Object.keys(meta.scripts).length === 0) return "No scripts defined.";

    const descriptions: Record<string, string> = {
        "dev": "Start development server with hot-reload",
        "start": "Start production server",
        "build": "Compile TypeScript to JavaScript",
        "test": "Run all tests",
        "test:unit": "Run unit tests",
        "test:integration": "Run integration tests",
        "test:e2e": "Run end-to-end tests",
        "test:coverage": "Generate test coverage report",
        "lint": "Check code for linting errors",
        "lint:fix": "Auto-fix linting errors",
        "format": "Format code with Prettier",
        "migrate": "Run database migrations",
        "migrate:undo": "Rollback last migration",
        "seed": "Seed the database",
        "type-check": "Run TypeScript type checking",
    };

    const lines: string[] = [];
    lines.push("```bash");
    for (const [script, cmd] of Object.entries(meta.scripts)) {
        const desc = descriptions[script] || cmd;
        lines.push(`npm run ${script.padEnd(20)} # ${desc}`);
    }
    lines.push("```");
    return lines.join("\n");
}

function buildTesting(meta: RepoMeta): string {
    const lines: string[] = [];

    lines.push("```bash");
    if (meta.scripts["test"]) lines.push("# Run all tests");
    if (meta.scripts["test"]) lines.push("npm test");
    if (meta.scripts["test:unit"]) lines.push("npm run test:unit");
    if (meta.scripts["test:integration"]) lines.push("npm run test:integration");
    if (meta.scripts["test:e2e"]) lines.push("npm run test:e2e");
    if (meta.scripts["test:coverage"]) lines.push("npm run test:coverage");
    if (lines.length === 1) lines.push("npm test");
    lines.push("```");

    return lines.join("\n");
}

function buildDeployment(meta: RepoMeta): string {
    const lines: string[] = [];

    if (meta.hasPM2) {
        lines.push("### Using PM2");
        lines.push("");
        lines.push("```bash");
        lines.push("# Install PM2 globally");
        lines.push("npm install -g pm2");
        lines.push("");
        lines.push("# Start application");
        lines.push("pm2 start ecosystem.config.js");
        lines.push("");
        lines.push("# Monitor");
        lines.push("pm2 monit");
        lines.push("");
        lines.push("# View logs");
        lines.push("pm2 logs");
        lines.push("```");
        lines.push("");
    }

    if (meta.hasDocker) {
        lines.push("### Docker");
        lines.push("");
        lines.push("```bash");
        lines.push("# Build image");
        lines.push(`docker build -t ${meta.name} .`);
        lines.push("");
        lines.push("# Run container");
        lines.push(`docker run -p 3000:3000 --env-file .env ${meta.name}`);
        lines.push("```");
        lines.push("");
    }

    if (meta.hasDockerCompose) {
        lines.push("### Docker Compose");
        lines.push("");
        lines.push("```bash");
        lines.push("# Start all services");
        lines.push("docker-compose up -d");
        lines.push("");
        lines.push("# Stop all services");
        lines.push("docker-compose down");
        lines.push("```");
        lines.push("");
    }

    lines.push("### Production Checklist");
    lines.push("");
    lines.push("- [ ] Set `NODE_ENV=production`");
    lines.push("- [ ] Use strong secrets for JWT and session keys");
    lines.push("- [ ] Enable HTTPS / SSL");
    lines.push("- [ ] Configure rate limiting");
    lines.push("- [ ] Setup monitoring and alerting");
    lines.push("- [ ] Enable database backups");
    lines.push("- [ ] Configure CORS properly");
    if (meta.techStack.some(t => t.toLowerCase().includes("redis"))) {
        lines.push("- [ ] Setup Redis persistence");
        lines.push("- [ ] Configure Redis password");
    }
    lines.push("- [ ] Setup reverse proxy (Nginx/Caddy)");
    lines.push("- [ ] Enable compression (gzip)");
    lines.push("- [ ] Configure health check endpoints");

    return lines.join("\n");
}

function buildContributing(meta: RepoMeta): string {
    const lines: string[] = [];
    lines.push("We welcome contributions! Please follow these guidelines:");
    lines.push("");
    lines.push("1. **Fork the repository**");
    lines.push("2. **Create a feature branch**");
    lines.push("   ```bash");
    lines.push("   git checkout -b feature/amazing-feature");
    lines.push("   ```");
    lines.push("3. **Commit your changes**");
    lines.push("   ```bash");
    lines.push("   git commit -m 'feat: add amazing feature'");
    lines.push("   ```");
    lines.push("4. **Push to the branch**");
    lines.push("   ```bash");
    lines.push("   git push origin feature/amazing-feature");
    lines.push("   ```");
    lines.push("5. **Open a Pull Request**");
    lines.push("");
    lines.push("### Commit Convention");
    lines.push("We follow [Conventional Commits](https://www.conventionalcommits.org/):");
    lines.push("");
    lines.push("- `feat:` New feature");
    lines.push("- `fix:` Bug fix");
    lines.push("- `docs:` Documentation changes");
    lines.push("- `style:` Code style changes");
    lines.push("- `refactor:` Code refactoring");
    lines.push("- `test:` Adding or updating tests");
    lines.push("- `chore:` Maintenance tasks");
    return lines.join("\n");
}

function buildTroubleshooting(meta: RepoMeta): string {
    const lines: string[] = [];
    const hasPG = meta.techStack.some(t => t.includes("PostgreSQL") || t.includes("pg"));
    const hasRedis = meta.techStack.some(t => t.includes("Redis"));
    const hasEmail = meta.techStack.some(t => t.includes("Nodemailer"));

    if (hasPG) {
        lines.push("**Database Connection Failed**");
        lines.push("```bash");
        lines.push("# Check if database is running");
        lines.push("pg_isready");
        lines.push("# Verify credentials in .env");
        lines.push("```");
        lines.push("");
    }

    if (hasRedis) {
        lines.push("**Redis Connection Failed**");
        lines.push("```bash");
        lines.push("redis-cli ping  # Should return PONG");
        lines.push("```");
        lines.push("");
    }

    if (hasEmail) {
        lines.push("**Emails Not Sending**");
        lines.push("- Verify SMTP credentials in `.env`");
        lines.push("- For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833)");
        lines.push("- Check spam/junk folder");
        lines.push("");
    }

    lines.push("**JWT Token Invalid**");
    lines.push("- Verify `JWT_SECRET` is set in `.env`");
    lines.push("- Check token expiration");
    lines.push("- Ensure clock synchronization between services");

    return lines.join("\n");
}

function buildRoadmap(meta: RepoMeta): string {
    const items: string[] = [];
    if (!meta.techStack.some(t => t.includes("Swagger"))) items.push("[ ] API documentation with Swagger/OpenAPI");
    if (!meta.hasCICD) items.push("[ ] CI/CD pipeline setup");
    if (!meta.hasDocker) items.push("[ ] Docker containerization");
    if (!meta.hasTests) items.push("[ ] Unit and integration test coverage");
    items.push("[ ] Performance monitoring and metrics");
    items.push("[ ] Caching layer optimization");
    items.push("[ ] API versioning strategy");
    items.push("[ ] GraphQL support");
    items.push("[ ] Multi-language support (i18n)");
    items.push("[ ] Advanced analytics dashboard");
    items.push("[ ] Mobile app integration");
    return items.map(i => `- ${i}`).join("\n");
}

export async function generateReadme(
    meta: RepoMeta,
    log: (msg: string) => void
): Promise<string> {
    const authorName = process.env.AUTHOR_NAME || "Mohamed Al Hamdhy";
    const githubUser = process.env.GITHUB_USERNAME || "mohamedalhamdhy";
    const email = process.env.AUTHOR_EMAIL || "mohamedalhamdhy@gmail.com";

    log("BUILDING BADGES...");
    log("GENERATING AI DESCRIPTION (if key set)...");
    const aiDesc = await aiDescribe(meta);
    const description = aiDesc || meta.description || `${meta.name} is a ${meta.language} application built with ${meta.techStack.slice(0, 3).join(", ") || meta.language}.`;

    log("BUILDING TABLE OF CONTENTS...");
    log("BUILDING FEATURES SECTION...");
    log("BUILDING ARCHITECTURE DIAGRAM...");
    log("BUILDING TECH STACK...");
    log("BUILDING PROJECT STRUCTURE...");
    log("BUILDING INSTALLATION GUIDE...");
    log("BUILDING ENV VARIABLES...");
    if (meta.hasAPI && meta.routes.length > 0) log("BUILDING API DOCUMENTATION...");
    if (meta.hasORM) log("BUILDING DATABASE SECTION...");
    if (meta.hasAuth) log("BUILDING AUTH FLOW...");
    log("BUILDING DEPLOYMENT GUIDE...");
    log("ASSEMBLING FINAL README...");

    const apiSection = meta.hasAPI && meta.routes.length > 0 ? `
## 📚 API Documentation

${buildAPIDoc(meta)}` : "";

    const dbSection = meta.hasORM ? `
## 💾 Database

${buildDBSection(meta)}` : "";

    const authSection = meta.hasAuth ? `
## 🔒 Authentication Flow

${buildAuthFlow(meta)}` : "";

    const testSection = meta.hasTests ? `
## 🧪 Testing

${buildTesting(meta)}` : "";

    const deploySection = (meta.hasDocker || meta.hasPM2) ? `
## 🚢 Deployment

${buildDeployment(meta)}` : `
## 🚢 Deployment

${buildDeployment(meta)}`;

    const troubleshoot = `
## 🔍 Troubleshooting

${buildTroubleshooting(meta)}`;

    const readme = `# ${meta.name}

${buildBadges(meta)}

## 📋 Table of Contents

${buildTOC(meta)}

## ✨ Features

${buildFeatures(meta)}

## 🏗️ Architecture

${buildArchitecture(meta)}

## 🚀 Tech Stack

${buildTechStack(meta)}

## 📁 Project Structure

${buildProjectStructure(meta)}

## 🚦 Getting Started

### Prerequisites

${buildPrerequisites(meta)}

### Installation

${buildInstallation(meta)}

## 🔧 Environment Variables

${buildEnvVars(meta)}
${apiSection}
${dbSection}
${authSection}

## 🔨 Development

### Available Scripts

${buildScripts(meta)}

### Code Style

${meta.hasLinting
            ? `This project uses ESLint${meta.techStack.includes("Prettier") ? " and Prettier" : ""} for code quality.\n\n\`\`\`bash\nnpm run lint        # Check for issues\nnpm run lint:fix    # Auto-fix issues\n${meta.techStack.includes("Prettier") ? "npm run format      # Format code\n" : ""}\`\`\``
            : "Follow the existing code style and conventions in the project."}
${testSection}
${deploySection}
${troubleshoot}

## 🗺️ Roadmap

${buildRoadmap(meta)}

## 🤝 Contributing

${buildContributing(meta)}

## 📄 License

This project is licensed under the **${meta.licenseType}** License — see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **${authorName}** — [@${githubUser}](https://github.com/${githubUser})

## 📞 Support

For support, email [${email}](mailto:${email}) or open an issue on GitHub.

---

**Made with ❤️ by ${authorName}**

> *Generated by [READSYS](https://github.com/${githubUser}/readsys) — README Automation by ${authorName}*
`;

    log("README GENERATION COMPLETE");
    return readme;
}