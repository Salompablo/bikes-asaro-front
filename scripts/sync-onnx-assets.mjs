#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, 'public');
const wasmDir = path.join(publicDir, 'wasm');
const modelsDir = path.join(publicDir, 'models');

const stats = {
  copied: 0,
  ignored: 0,
  errors: 0,
  copiedFiles: [],
  ignoredFiles: [],
  errorFiles: [],
};

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function hashFile(filePath) {
  const data = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function shouldSkipCopy(sourcePath, destinationPath) {
  if (!(await exists(destinationPath))) {
    return { skip: false, reason: '' };
  }

  const [sourceStat, destinationStat] = await Promise.all([
    fs.stat(sourcePath),
    fs.stat(destinationPath),
  ]);

  if (sourceStat.size === destinationStat.size) {
    const [sourceHash, destinationHash] = await Promise.all([
      hashFile(sourcePath),
      hashFile(destinationPath),
    ]);

    if (sourceHash === destinationHash) {
      return { skip: true, reason: 'ya existe y es idéntico (mismo hash)' };
    }

    return {
      skip: true,
      reason: 'ya existe y difiere (mismo tamaño, distinto hash). No se sobrescribe',
    };
  }

  return {
    skip: true,
    reason: 'ya existe y difiere en tamaño. No se sobrescribe',
  };
}

async function* walkFiles(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'dist' || entry.name === '.angular') {
        continue;
      }
      yield* walkFiles(fullPath);
      continue;
    }

    if (entry.isFile()) {
      yield fullPath;
    }
  }
}

async function collectFilesByExtension(rootDir, extension, options = {}) {
  const { excludeDirs = [] } = options;
  const normalizedExcludes = excludeDirs.map((d) => path.resolve(d));
  const results = [];

  if (!(await exists(rootDir))) {
    return results;
  }

  for await (const filePath of walkFiles(rootDir)) {
    const absPath = path.resolve(filePath);
    const excluded = normalizedExcludes.some((excludedDir) =>
      absPath.startsWith(excludedDir + path.sep)
    );

    if (excluded) {
      continue;
    }

    if (path.extname(filePath).toLowerCase() === extension.toLowerCase()) {
      results.push(filePath);
    }
  }

  return results;
}

async function copyWithNoOverwrite(sourcePath, destinationDir) {
  const destinationPath = path.join(destinationDir, path.basename(sourcePath));

  try {
    const decision = await shouldSkipCopy(sourcePath, destinationPath);
    if (decision.skip) {
      stats.ignored += 1;
      stats.ignoredFiles.push(
        `${path.relative(projectRoot, sourcePath)} -> ${path.relative(projectRoot, destinationPath)} (${decision.reason})`
      );
      return;
    }

    await fs.copyFile(sourcePath, destinationPath);
    stats.copied += 1;
    stats.copiedFiles.push(
      `${path.relative(projectRoot, sourcePath)} -> ${path.relative(projectRoot, destinationPath)}`
    );
  } catch (error) {
    stats.errors += 1;
    stats.errorFiles.push(
      `${path.relative(projectRoot, sourcePath)} -> ${path.relative(projectRoot, destinationPath)} (${error.message})`
    );
  }
}

async function main() {
  console.log('> Sincronizando assets ONNX/WASM...');

  await ensureDir(wasmDir);
  await ensureDir(modelsDir);

  const onnxRuntimeDist = path.join(projectRoot, 'node_modules', 'onnxruntime-web', 'dist');
  const wasmFiles = await collectFilesByExtension(onnxRuntimeDist, '.wasm');

  const onnxSources = [
    path.join(projectRoot, 'node_modules'),
    path.join(projectRoot, 'src'),
    path.join(projectRoot, 'public'),
  ];

  const onnxFilesNested = await Promise.all(
    onnxSources.map((sourceDir) =>
      collectFilesByExtension(sourceDir, '.onnx', {
        excludeDirs: [modelsDir],
      })
    )
  );

  const onnxFiles = [...new Set(onnxFilesNested.flat())];

  for (const wasmFile of wasmFiles) {
    await copyWithNoOverwrite(wasmFile, wasmDir);
  }

  for (const onnxFile of onnxFiles) {
    await copyWithNoOverwrite(onnxFile, modelsDir);
  }

  console.log(`Copiados: ${stats.copied}`);
  console.log(`Ignorados: ${stats.ignored}`);
  console.log(`Errores: ${stats.errors}`);

  if (stats.copiedFiles.length > 0) {
    console.log('\nArchivos copiados:');
    for (const line of stats.copiedFiles) {
      console.log(`  + ${line}`);
    }
  }

  if (stats.ignoredFiles.length > 0) {
    console.log('\nArchivos ignorados:');
    for (const line of stats.ignoredFiles) {
      console.log(`  - ${line}`);
    }
  }

  if (stats.errorFiles.length > 0) {
    console.error('\nErrores:');
    for (const line of stats.errorFiles) {
      console.error(`  x ${line}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Error fatal al sincronizar assets:', error);
  process.exit(1);
});
