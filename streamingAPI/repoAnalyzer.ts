import simpleGit from "simple-git";
import fs from "fs";
import path from "path";

export interface RouteInfo {
    method: string;
    path: string;
    file: string;
}

export interface EnvVar {
    key: string;
    example: string;
    description: string;
}

export interface RepoMeta {
    name: string;
    description: string;
    repoUrl: string;
    clonePath: string;
    licenseType: string;
    language: string;
    nodeVersion: string;
    techStack: string[];
    techStackGrouped: Record<string, string[]>;
    entryPoints: string[];
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    features: Record<string, string[]>;
    hasDocker: boolean;
    hasDockerCompose: boolean;
    hasEnv: boolean;
    hasCICD: boolean;
    hasTests: boolean;
    hasLinting: boolean;
    hasPM2: boolean;
    hasContributing: boolean;
    fileTree: string[];
    topLevelDirs: string[];
    dirDescriptions: Record<string, string>;
    routes: RouteInfo[];
    hasAPI: boolean;
    envVars: EnvVar[];
    architectureType: string;
    architectureLayers: string[];
    dbType: string;
    hasORM: boolean;
    hasMigrations: boolean;
    hasSeeders: boolean;
    hasAuth: boolean;
    authFeatures: string[];

    prerequisites: string[];
}

function detectLanguage(files: string[]): string {
    const counts: Record<string, number> = {};
    for (const f of files) {
        const ext = path.extname(f).toLowerCase();
        counts[ext] = (counts[ext] || 0) + 1;
    }
    if (counts[".ts"] || counts[".tsx"]) return "TypeScript";
    if (counts[".js"] || counts[".jsx"]) return "JavaScript";
    if (counts[".py"]) return "Python";
    if (counts[".go"]) return "Go";
    if (counts[".rs"]) return "Rust";
    if (counts[".java"]) return "Java";
    if (counts[".cs"]) return "C#";
    if (counts[".cpp"] || counts[".cc"]) return "C++";
    if (counts[".rb"]) return "Ruby";
    if (counts[".php"]) return "PHP";
    return "Unknown";
}

function detectTechStackGrouped(
    deps: Record<string, string>,
    devDeps: Record<string, string>,
    files: string[]
): Record<string, string[]> {
    const all = { ...deps, ...devDeps };
    const groups: Record<string, string[]> = {
        "Core": [],
        "Database & ORM": [],
        "Authentication & Security": [],
        "Caching & Queue": [],
        "Communication": [],
        "Frontend": [],
        "Testing": [],
        "DevOps & Tools": [],
    };

    if (all["express"]) groups["Core"].push("Express.js");
    if (all["fastify"]) groups["Core"].push("Fastify");
    if (all["koa"]) groups["Core"].push("Koa");
    if (all["hapi"] || all["@hapi/hapi"]) groups["Core"].push("Hapi.js");
    if (all["nestjs"] || all["@nestjs/core"]) groups["Core"].push("NestJS");
    if (all["typescript"]) groups["Core"].push("TypeScript");
    if (all["dotenv"]) groups["Core"].push("dotenv");
    if (all["axios"]) groups["Core"].push("Axios");
    if (all["mongoose"]) groups["Database & ORM"].push("MongoDB (Mongoose)");
    if (all["sequelize"]) groups["Database & ORM"].push("Sequelize ORM");
    if (all["prisma"] || all["@prisma/client"]) groups["Database & ORM"].push("Prisma ORM");
    if (all["typeorm"]) groups["Database & ORM"].push("TypeORM");
    if (all["pg"] || all["postgres"]) groups["Database & ORM"].push("PostgreSQL");
    if (all["mysql2"] || all["mysql"]) groups["Database & ORM"].push("MySQL");
    if (all["sqlite3"]) groups["Database & ORM"].push("SQLite");
    if (all["knex"]) groups["Database & ORM"].push("Knex.js");
    if (all["jsonwebtoken"] || all["jwt"]) groups["Authentication & Security"].push("JWT (jsonwebtoken)");
    if (all["bcrypt"] || all["bcryptjs"]) groups["Authentication & Security"].push("bcrypt");
    if (all["passport"] || all["passport-jwt"]) groups["Authentication & Security"].push("Passport.js");
    if (all["helmet"]) groups["Authentication & Security"].push("Helmet");
    if (all["cors"]) groups["Authentication & Security"].push("CORS");
    if (all["joi"] || all["yup"] || all["zod"]) groups["Authentication & Security"].push("Input Validation");
    if (all["express-rate-limit"]) groups["Authentication & Security"].push("Rate Limiting");
    if (all["redis"] || all["ioredis"]) groups["Caching & Queue"].push("Redis");
    if (all["bullmq"] || all["bull"]) groups["Caching & Queue"].push("BullMQ");
    if (all["node-cron"]) groups["Caching & Queue"].push("node-cron");
    if (all["nodemailer"]) groups["Communication"].push("Nodemailer (Email)");
    if (all["twilio"]) groups["Communication"].push("Twilio (SMS)");
    if (all["socket.io"]) groups["Communication"].push("Socket.IO (WebSocket)");
    if (all["ws"]) groups["Communication"].push("ws (WebSocket)");
    if (all["firebase-admin"]) groups["Communication"].push("Firebase Admin");
    if (all["react"]) groups["Frontend"].push("React");
    if (all["next"] || all["next.js"]) groups["Frontend"].push("Next.js");
    if (all["vue"]) groups["Frontend"].push("Vue.js");
    if (all["tailwindcss"]) groups["Frontend"].push("Tailwind CSS");
    if (all["vite"]) groups["Frontend"].push("Vite");
    if (all["jest"]) groups["Testing"].push("Jest");
    if (all["mocha"]) groups["Testing"].push("Mocha");
    if (all["chai"]) groups["Testing"].push("Chai");
    if (all["supertest"]) groups["Testing"].push("Supertest");
    if (all["vitest"]) groups["Testing"].push("Vitest");
    if (all["pm2"]) groups["DevOps & Tools"].push("PM2");
    if (all["eslint"]) groups["DevOps & Tools"].push("ESLint");
    if (all["prettier"]) groups["DevOps & Tools"].push("Prettier");
    if (all["morgan"]) groups["DevOps & Tools"].push("Morgan (Logger)");
    if (all["winston"]) groups["DevOps & Tools"].push("Winston (Logger)");
    if (files.some(f => f.includes("Dockerfile"))) groups["DevOps & Tools"].push("Docker");
    if (files.some(f => f.includes("docker-compose"))) groups["DevOps & Tools"].push("Docker Compose");
    if (files.some(f => f.includes(".github/workflows"))) groups["DevOps & Tools"].push("GitHub Actions");

    for (const k of Object.keys(groups)) {
        if (groups[k].length === 0) delete groups[k];
    }

    return groups;
}

function flatStack(grouped: Record<string, string[]>): string[] {
    return Object.values(grouped).flat();
}

function detectArchitecture(files: string[]): { type: string; layers: string[] } {
    const hasLayers = {
        api: files.some(f => f.includes("api/") || f.includes("controllers/")),
        application: files.some(f => f.includes("application/") || f.includes("services/") || f.includes("use-cases/")),
        domain: files.some(f => f.includes("domain/") || f.includes("entities/")),
        infrastructure: files.some(f => f.includes("infrastructure/") || f.includes("repositories/")),
        routes: files.some(f => f.includes("routes/")),
        models: files.some(f => f.includes("models/")),
        middleware: files.some(f => f.includes("middleware") || f.includes("middlewares")),
    };

    const layers: string[] = [];

    if (hasLayers.api && hasLayers.application && hasLayers.domain && hasLayers.infrastructure) {
        layers.push("API Layer (Routes, Controllers)", "Application Layer (Services, Use Cases)", "Domain Layer (Entities, Interfaces)", "Infrastructure Layer (DB, Cache, External)");
        return { type: "clean", layers };
    }

    if (hasLayers.routes && hasLayers.models) {
        layers.push("Routes Layer", "Controllers Layer", "Models Layer");
        if (hasLayers.middleware) layers.push("Middleware Layer");
        return { type: "mvc", layers };
    }

    if (hasLayers.application || hasLayers.infrastructure) {
        layers.push("API Layer", "Service Layer", "Data Access Layer");
        return { type: "layered", layers };
    }

    return { type: "simple", layers: ["Entry Point", "Modules", "Utilities"] };
}

function describeDirs(dirs: string[]): Record<string, string> {
    const map: Record<string, string> = {
        "src": "Source code root",
        "api": "API layer — routes, controllers, validators",
        "controllers": "Request handlers",
        "routes": "API route definitions",
        "middlewares": "Express middleware functions",
        "middleware": "Express middleware functions",
        "validators": "Request validation schemas",
        "services": "Business logic services",
        "application": "Application layer — use cases and services",
        "use-cases": "Use case implementations",
        "domain": "Domain layer — entities and interfaces",
        "entities": "Domain entities / business objects",
        "interfaces": "Repository and service interfaces",
        "infrastructure": "Infrastructure — DB, cache, external services",
        "database": "Database configuration and models",
        "models": "Data models / Sequelize models",
        "migrations": "Database migration files",
        "seeders": "Database seed data",
        "repositories": "Repository pattern implementations",
        "cache": "Caching layer (Redis)",
        "external-services": "Third-party service integrations",
        "config": "Application configuration files",
        "utils": "Utility functions and helpers",
        "helpers": "Helper functions",
        "constants": "Application constants",
        "logger": "Logging configuration",
        "tests": "Test files",
        "test": "Test files",
        "__tests__": "Jest test files",
        "public": "Static assets",
        "views": "Template views",
        "scripts": "Utility scripts",
        "docs": "Documentation",
        "types": "TypeScript type definitions",
    };

    const result: Record<string, string> = {};
    for (const d of dirs) {
        const key = d.split(/[/\\]/).pop() || d;
        result[d] = map[key] || `${key} module`;
    }
    return result;
}

function scanRoutes(clonePath: string, files: string[]): RouteInfo[] {
    const routes: RouteInfo[] = [];
    const routeFiles = files.filter(f =>
        f.includes("routes") || f.includes("router") || f.includes("controller")
    );

    const methods = ["get", "post", "put", "patch", "delete"];

    for (const relFile of routeFiles.slice(0, 10)) {
        const fullPath = path.join(clonePath, relFile);
        try {
            const content = fs.readFileSync(fullPath, "utf-8");
            const lines = content.split("\n");
            for (const line of lines) {
                for (const method of methods) {
                    const regex = new RegExp(`\\.(${method})\\s*\\(\\s*['"\`]([^'"\`]+)['"\`]`, "i");
                    const match = line.match(regex);
                    if (match) {
                        routes.push({
                            method: method.toUpperCase(),
                            path: match[2],
                            file: relFile,
                        });
                    }
                }
            }
        } catch (_) { }
    }

    return routes.slice(0, 30);
}

function scanEnvVars(clonePath: string): EnvVar[] {
    const envDescriptions: Record<string, string> = {
        "PORT": "Server port",
        "NODE_ENV": "Environment (development/production/test)",
        "DB_HOST": "Database host",
        "DB_PORT": "Database port",
        "DB_NAME": "Database name",
        "DB_USER": "Database username",
        "DB_PASSWORD": "Database password",
        "DB_DIALECT": "Database dialect (postgres/mysql)",
        "REDIS_HOST": "Redis host",
        "REDIS_PORT": "Redis port",
        "REDIS_PASSWORD": "Redis password",
        "JWT_SECRET": "JWT signing secret",
        "JWT_REFRESH_SECRET": "JWT refresh token secret",
        "JWT_ACCESS_EXPIRATION": "Access token expiry",
        "JWT_REFRESH_EXPIRATION": "Refresh token expiry",
        "SMTP_HOST": "SMTP server host",
        "SMTP_PORT": "SMTP server port",
        "SMTP_USER": "SMTP username/email",
        "SMTP_PASSWORD": "SMTP password or app password",
        "EMAIL_FROM": "Default sender email",
        "TWILIO_ACCOUNT_SID": "Twilio account SID",
        "TWILIO_AUTH_TOKEN": "Twilio auth token",
        "TWILIO_PHONE_NUMBER": "Twilio phone number",
        "OPENAI_API_KEY": "OpenAI API key",
        "API_VERSION": "API version prefix",
        "BCRYPT_ROUNDS": "bcrypt hashing rounds",
        "OTP_EXPIRATION": "OTP expiry in seconds",
        "LOG_LEVEL": "Logging level (info/debug/error)",
        "RATE_LIMIT_MAX_REQUESTS": "Max requests per window",
        "CORS_ORIGIN": "Allowed CORS origin",
    };

    const vars: EnvVar[] = [];
    const envFiles = [".env.example", ".env.sample", ".env.template"];

    for (const f of envFiles) {
        const envPath = path.join(clonePath, f);
        if (fs.existsSync(envPath)) {
            const lines = fs.readFileSync(envPath, "utf-8").split("\n");
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith("#")) continue;
                const [key, ...rest] = trimmed.split("=");
                if (!key) continue;
                const k = key.trim();
                vars.push({
                    key: k,
                    example: rest.join("=").trim() || "",
                    description: envDescriptions[k] || k.toLowerCase().replace(/_/g, " "),
                });
            }
            break;
        }
    }

    return vars;
}

function detectFeatures(
    deps: Record<string, string>,
    devDeps: Record<string, string>,
    files: string[],
    scripts: Record<string, string>
): Record<string, string[]> {
    const all = { ...deps, ...devDeps };
    const features: Record<string, string[]> = {};

    const authFeats: string[] = [];
    if (all["jsonwebtoken"]) authFeats.push("JWT-based authentication with access and refresh tokens");
    if (all["bcrypt"] || all["bcryptjs"]) authFeats.push("Password hashing with bcrypt");
    if (all["passport"]) authFeats.push("Passport.js authentication strategies");
    if (files.some(f => f.toLowerCase().includes("otp"))) authFeats.push("OTP verification (Email & SMS)");
    if (all["redis"] || all["ioredis"]) authFeats.push("Session management with Redis");
    if (all["express-rate-limit"]) authFeats.push("Rate limiting and DDoS protection");
    if (all["helmet"]) authFeats.push("Security headers with Helmet");
    if (all["cors"]) authFeats.push("CORS configuration");
    if (authFeats.length > 0) features["🔐 Authentication & Security"] = authFeats;

    const apiFeats: string[] = [];
    if (all["express"] || all["fastify"]) apiFeats.push("RESTful API architecture");
    if (files.some(f => f.includes("validators") || f.includes("validator"))) apiFeats.push("Request validation and sanitization");
    if (files.some(f => f.includes("middleware"))) apiFeats.push("Middleware pipeline");
    if (all["swagger-ui-express"] || all["@nestjs/swagger"]) apiFeats.push("Swagger API documentation");
    if (apiFeats.length > 0) features["🚀 API"] = apiFeats;

    const dataFeats: string[] = [];
    if (all["sequelize"] || all["typeorm"] || all["prisma"] || all["@prisma/client"]) dataFeats.push("ORM with migrations support");
    if (files.some(f => f.includes("repositories") || f.includes("repository"))) dataFeats.push("Repository pattern for data access");
    if (files.some(f => f.includes("migrations"))) dataFeats.push("Database migrations");
    if (files.some(f => f.includes("seeders"))) dataFeats.push("Database seeding");
    if (all["redis"] || all["ioredis"]) dataFeats.push("Redis caching for performance");
    if (dataFeats.length > 0) features["💾 Data Management"] = dataFeats;

    const infraFeats: string[] = [];
    if (all["nodemailer"]) infraFeats.push("Email service integration");
    if (all["twilio"]) infraFeats.push("SMS service integration");
    if (all["socket.io"]) infraFeats.push("Real-time WebSocket communication");
    if (all["bullmq"] || all["bull"]) infraFeats.push("Background job processing queue");
    if (all["winston"] || all["morgan"]) infraFeats.push("Centralized logging");
    if (all["pm2"]) infraFeats.push("PM2 process management");
    if (infraFeats.length > 0) features["🛠️ Infrastructure"] = infraFeats;

    const devFeats: string[] = [];
    if (scripts["dev"]) devFeats.push("Hot-reload development mode");
    if (all["typescript"]) devFeats.push("Fully typed TypeScript codebase");
    if (all["eslint"]) devFeats.push("ESLint code quality enforcement");
    if (all["prettier"]) devFeats.push("Prettier code formatting");
    if (files.some(f => f.includes("Dockerfile"))) devFeats.push("Docker containerization");
    if (files.some(f => f.includes(".github/workflows"))) devFeats.push("CI/CD with GitHub Actions");
    if (devFeats.length > 0) features["⚙️ Developer Experience"] = devFeats;

    return features;
}

function detectPrerequisites(
    nodeVersion: string,
    deps: Record<string, string>,
    techStack: string[]
): string[] {
    const prereqs: string[] = [];
    prereqs.push(`Node.js >= ${nodeVersion || "16.x"}`);
    prereqs.push("npm or yarn");

    if (techStack.some(t => t.toLowerCase().includes("postgresql") || t.includes("pg"))) prereqs.push("PostgreSQL >= 13.x");
    if (techStack.some(t => t.toLowerCase().includes("mysql"))) prereqs.push("MySQL >= 8.x");
    if (techStack.some(t => t.toLowerCase().includes("mongodb") || t.toLowerCase().includes("mongoose"))) prereqs.push("MongoDB >= 5.x");
    if (techStack.some(t => t.toLowerCase().includes("redis"))) prereqs.push("Redis >= 6.x");
    if (techStack.some(t => t.toLowerCase().includes("docker"))) prereqs.push("Docker & Docker Compose");

    return prereqs;
}

function walkDir(dir: string, depth = 0, maxDepth = 4): string[] {
    if (depth > maxDepth) return [];
    const files: string[] = [];
    try {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
            if (["node_modules", ".git", "dist", "build", "__pycache__", ".next", "coverage"].includes(entry)) continue;
            const full = path.join(dir, entry);
            const stat = fs.statSync(full);
            if (stat.isDirectory()) {
                files.push(...walkDir(full, depth + 1, maxDepth));
            } else {
                files.push(full);
            }
        }
    } catch (_) { }
    return files;
}

export async function analyzeRepo(
    repoUrl: string,
    cloneBase: string,
    log: (msg: string) => void
): Promise<RepoMeta> {
    const repoName = repoUrl.replace(/\.git$/, "").split("/").pop() || "repo";
    const clonePath = path.join(cloneBase, repoName);

    if (fs.existsSync(clonePath)) {
        log(`REMOVING OLD CLONE: ${clonePath}`);
        fs.rmSync(clonePath, { recursive: true, force: true });
    }

    log(`CLONING: ${repoUrl}`);
    const git = simpleGit();
    await git.clone(repoUrl, clonePath, ["--depth", "1"]);
    log(`CLONE COMPLETE → ${clonePath}`);

    const allFiles = walkDir(clonePath);
    const relFiles = allFiles.map(f => path.relative(clonePath, f).replace(/\\/g, "/"));
    log(`FILES SCANNED: ${relFiles.length}`);

    let pkgJson: any = {};
    const pkgPath = path.join(clonePath, "package.json");
    if (fs.existsSync(pkgPath)) {
        try { pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8")); } catch (_) { }
        log(`PARSED: package.json`);
    }

    const deps = pkgJson.dependencies || {};
    const devDeps = pkgJson.devDependencies || {};
    const scripts = pkgJson.scripts || {};
    const engines = pkgJson.engines || {};
    const nodeVer = engines.node ? engines.node.replace(/[^0-9.]/g, "").split(".")[0] + ".x" : "18.x";

    const techGrouped = detectTechStackGrouped(deps, devDeps, relFiles);
    const techStack = flatStack(techGrouped);
    const language = detectLanguage(relFiles);
    const arch = detectArchitecture(relFiles);
    const features = detectFeatures(deps, devDeps, relFiles, scripts);
    const routes = scanRoutes(clonePath, relFiles);
    const envVars = scanEnvVars(clonePath);
    const prereqs = detectPrerequisites(nodeVer, deps, techStack);

    const topDirsSet = new Set<string>();
    for (const f of relFiles) {
        const parts = f.split("/");
        if (parts.length > 1) topDirsSet.add(parts[0]);
    }
    const topLevelDirs = [...topDirsSet];
    const dirDescriptions = describeDirs(topLevelDirs);

    const entryNames = ["index.ts", "index.js", "main.ts", "main.js", "app.ts", "app.js", "server.ts", "server.js"];
    const entryPoints = entryNames.filter(e => relFiles.some(f => f.endsWith(e)));

    let licenseType = pkgJson.license || "MIT";
    const licensePath = path.join(clonePath, "LICENSE");
    if (fs.existsSync(licensePath)) {
        const content = fs.readFileSync(licensePath, "utf-8").substring(0, 300);
        if (content.includes("MIT")) licenseType = "MIT";
        else if (content.includes("Apache")) licenseType = "Apache-2.0";
        else if (content.includes("GPL")) licenseType = "GPL-3.0";
        else if (content.includes("BSD")) licenseType = "BSD-3-Clause";
    }

    const authFeatures: string[] = [];
    if (deps["jsonwebtoken"] || devDeps["jsonwebtoken"]) authFeatures.push("JWT");
    if (deps["bcrypt"] || deps["bcryptjs"] || devDeps["bcrypt"]) authFeatures.push("bcrypt");
    if (relFiles.some(f => f.toLowerCase().includes("otp"))) authFeatures.push("OTP");

    log(`LANGUAGE: ${language}`);
    log(`TECH STACK: ${techStack.slice(0, 6).join(", ")}${techStack.length > 6 ? "..." : ""}`);
    log(`DOCKER: ${relFiles.some(f => f.includes("Dockerfile")) ? "YES" : "NO"} | CI/CD: ${relFiles.some(f => f.includes(".github/workflows")) ? "YES" : "NO"}`);
    log(`ROUTES FOUND: ${routes.length}`);
    log(`ENV VARS FOUND: ${envVars.length}`);
    log(`ARCHITECTURE: ${arch.type.toUpperCase()}`);

    return {
        name: pkgJson.name || repoName,
        description: pkgJson.description || "",
        repoUrl,
        clonePath,
        licenseType,
        language,
        nodeVersion: nodeVer,
        techStack,
        techStackGrouped: techGrouped,
        entryPoints,
        scripts,
        dependencies: deps,
        devDependencies: devDeps,
        features,
        hasDocker: relFiles.some(f => f.includes("Dockerfile")),
        hasDockerCompose: relFiles.some(f => f.includes("docker-compose")),
        hasEnv: relFiles.some(f => f.includes(".env.example") || f.includes(".env.sample")),
        hasCICD: relFiles.some(f => f.includes(".github/workflows") || f.includes(".gitlab-ci")),
        hasTests: relFiles.some(f => f.includes("test") || f.includes("spec") || f.includes("__tests__")),
        hasLinting: !!(deps["eslint"] || devDeps["eslint"]),
        hasPM2: !!(deps["pm2"] || devDeps["pm2"]),
        hasContributing: relFiles.some(f => f.toLowerCase().includes("contributing")),
        fileTree: relFiles.slice(0, 80),
        topLevelDirs,
        dirDescriptions,
        routes,
        hasAPI: relFiles.some(f => f.includes("routes") || f.includes("controllers")),
        envVars,
        architectureType: arch.type,
        architectureLayers: arch.layers,
        dbType: techStack.find(t => ["PostgreSQL", "MySQL", "MongoDB (Mongoose)", "SQLite"].some(d => t.includes(d))) || "",
        hasORM: !!(deps["sequelize"] || deps["prisma"] || deps["@prisma/client"] || deps["typeorm"] || deps["mongoose"]),
        hasMigrations: relFiles.some(f => f.includes("migrations")),
        hasSeeders: relFiles.some(f => f.includes("seeders")),
        hasAuth: authFeatures.length > 0,
        authFeatures,
        prerequisites: prereqs,
    };
}