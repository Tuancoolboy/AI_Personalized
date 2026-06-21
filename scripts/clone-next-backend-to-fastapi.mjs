import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, "src/frontend");
const targetRoot = path.join(projectRoot, "src/backend/next_clone/frontend");
const manifestPath = path.join(
  projectRoot,
  "src/backend/next_clone/manifest.json",
);

const routeRoots = [
  "src/frontend/app/api",
  "src/frontend/app/moi/[token]/accept/route.ts",
];

const importRegex = /from\s+["']([^"']+)["']|import\s+["']([^"']+)["']/g;

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function walkRouteFiles(rootPath) {
  const absoluteRoot = path.join(projectRoot, rootPath);
  const files = [];

  if (!fs.existsSync(absoluteRoot)) {
    return files;
  }

  const stat = fs.statSync(absoluteRoot);
  if (stat.isFile()) {
    files.push(absoluteRoot);
    return files;
  }

  const stack = [absoluteRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const absoluteEntry = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absoluteEntry);
        continue;
      }
      if (entry.isFile() && entry.name === "route.ts") {
        files.push(absoluteEntry);
      }
    }
  }

  return files;
}

function resolveLocalImport(specifier, fromFile) {
  if (specifier.startsWith("@/")) {
    return path.join(sourceRoot, specifier.slice(2));
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return path.resolve(path.dirname(fromFile), specifier);
  }
  return null;
}

function tryResolveFile(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
  ];

  return (
    candidates.find((candidate) => {
      return fs.existsSync(candidate) && fs.statSync(candidate).isFile();
    }) ?? null
  );
}

function collectDependencyGraph(entryFiles) {
  const queue = [...new Set(entryFiles)];
  const seen = new Set();
  const collected = [];

  while (queue.length > 0) {
    const nextFile = queue.pop();
    const resolvedEntry = tryResolveFile(nextFile) ?? nextFile;
    if (!fs.existsSync(resolvedEntry) || seen.has(resolvedEntry)) {
      continue;
    }

    seen.add(resolvedEntry);
    collected.push(resolvedEntry);

    const fileText = fs.readFileSync(resolvedEntry, "utf8");
    for (const match of fileText.matchAll(importRegex)) {
      const specifier = match[1] ?? match[2];
      const resolvedBase = resolveLocalImport(specifier, resolvedEntry);
      const resolvedImport = resolvedBase
        ? tryResolveFile(resolvedBase)
        : null;
      if (resolvedImport && !seen.has(resolvedImport)) {
        queue.push(resolvedImport);
      }
    }
  }

  return collected.sort();
}

function copyClonedFiles(files) {
  for (const sourceFile of files) {
    const relativeToFrontend = path.relative(sourceRoot, sourceFile);
    const targetFile = path.join(targetRoot, relativeToFrontend);
    ensureDir(path.dirname(targetFile));
    fs.copyFileSync(sourceFile, targetFile);
  }
}

const routeEntryFiles = routeRoots.flatMap((routeRoot) => walkRouteFiles(routeRoot));
const clonedFiles = collectDependencyGraph(routeEntryFiles);

ensureDir(path.dirname(manifestPath));
copyClonedFiles(clonedFiles);

const manifest = {
  generatedAt: new Date().toISOString(),
  sourceRoot: "src/frontend",
  targetRoot: "src/backend/next_clone/frontend",
  routeEntryCount: routeEntryFiles.length,
  fileCount: clonedFiles.length,
  files: clonedFiles.map((file) => path.relative(projectRoot, file)),
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `Cloned ${manifest.fileCount} files from ${manifest.sourceRoot} to ${manifest.targetRoot}`,
);
