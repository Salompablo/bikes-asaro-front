#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const modelsDir = path.join(projectRoot, 'public', 'models');
const pkgPath = path.join(projectRoot, 'node_modules', '@imgly', 'background-removal', 'package.json');

const stats = {
  downloaded: 0,
  skipped: 0,
  rebuilt: 0,
  pruned: 0,
  errors: 0,
};

const allowedModels = new Set(['isnet', 'isnet_fp16', 'isnet_quint8']);

function getRequestedModel() {
  const cliArg = process.argv.find((arg) => arg.startsWith('--model='));
  const fromCli = cliArg ? cliArg.slice('--model='.length).trim() : '';
  const fromEnv = (process.env.IMGLY_MODEL || '').trim();
  const selected = fromCli || fromEnv || 'isnet_fp16';

  if (!allowedModels.has(selected)) {
    throw new Error(
      `Modelo inválido "${selected}". Usá uno de: ${Array.from(allowedModels).join(', ')}`
    );
  }

  return selected;
}

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

async function readManagedIndex(indexPath) {
  if (!(await exists(indexPath))) {
    return [];
  }

  try {
    const raw = await fs.readFile(indexPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.files)) {
      return parsed.files;
    }
    return [];
  } catch {
    return [];
  }
}

function isLegacyImglyChunkName(fileName) {
  return /^[a-f0-9]{64}$/i.test(fileName);
}

async function readInstalledVersion() {
  const raw = await fs.readFile(pkgPath, 'utf8');
  return JSON.parse(raw).version;
}

async function fetchWithFallback(urls) {
  let lastError = null;

  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response;
    } catch (error) {
      lastError = new Error(`${url} -> ${error.message}`);
    }
  }

  throw lastError ?? new Error('No se pudo descargar el recurso');
}

async function downloadChunk(baseUrls, chunkName, expectedSize) {
  const targetPath = path.join(modelsDir, chunkName);

  if (await exists(targetPath)) {
    const currentSize = (await fs.stat(targetPath)).size;
    if (currentSize === expectedSize) {
      stats.skipped += 1;
      console.log(`SKIP  ${chunkName} (${expectedSize} bytes)`);
      return targetPath;
    }
  }

  try {
    const response = await fetchWithFallback(baseUrls.map((baseUrl) => `${baseUrl}${chunkName}`));
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length !== expectedSize) {
      throw new Error(
        `Tamaño inesperado para ${chunkName}. Esperado: ${expectedSize}, recibido: ${buffer.length}`
      );
    }

    await fs.writeFile(targetPath, buffer);
    stats.downloaded += 1;
    console.log(`GET   ${chunkName} (${expectedSize} bytes)`);
    return targetPath;
  } catch (error) {
    stats.errors += 1;
    console.error(`ERR   ${chunkName}: ${error.message}`);
    throw error;
  }
}

async function rebuildFileFromChunks(entryKey, entry) {
  const isModel = entryKey.startsWith('/models/');
  const isRuntimeAsset = entryKey.startsWith('/onnxruntime-web/');

  if (!isModel && !isRuntimeAsset) {
    return;
  }

  let outputFileName = path.basename(entryKey);

  if (isModel) {
    outputFileName = `${outputFileName}.onnx`;
  }

  const outputPath = path.join(modelsDir, outputFileName);

  if (await exists(outputPath)) {
    const size = (await fs.stat(outputPath)).size;
    if (size === entry.size) {
      stats.skipped += 1;
      console.log(`SKIP  ${outputFileName} (${entry.size} bytes)`);
      return;
    }
  }

  const chunkBuffers = [];
  for (const chunk of entry.chunks) {
    const chunkPath = path.join(modelsDir, chunk.name);
    const chunkBuffer = await fs.readFile(chunkPath);
    chunkBuffers.push(chunkBuffer);
  }

  const merged = Buffer.concat(chunkBuffers);
  if (merged.length !== entry.size) {
    throw new Error(
      `Reconstrucción inválida para ${outputFileName}. Esperado: ${entry.size}, generado: ${merged.length}`
    );
  }

  await fs.writeFile(outputPath, merged);
  stats.rebuilt += 1;
  console.log(`MAKE  ${outputFileName} (${entry.size} bytes)`);
}

async function main() {
  await ensureDir(modelsDir);
  const selectedModel = getRequestedModel();
  const managedIndexPath = path.join(modelsDir, '.imgly-managed-files.json');

  const version = await readInstalledVersion();
  const baseUrls = [
    `https://staticimgly.com/@imgly/background-removal-data/${version}/dist/`,
  ];

  console.log(`Version @imgly/background-removal: ${version}`);
  console.log(`Destino: ${path.relative(projectRoot, modelsDir)}`);
  console.log(`Modelo: ${selectedModel}`);

  const manifestResponse = await fetchWithFallback(baseUrls.map((baseUrl) => `${baseUrl}resources.json`));
  const resourceMap = await manifestResponse.json();

  const relevantEntries = Object.fromEntries(
    Object.entries(resourceMap).filter(([key]) => {
      if (key === `/models/${selectedModel}`) return true;
      if (key.startsWith('/onnxruntime-web/') && (key.endsWith('.wasm') || key.endsWith('.mjs'))) {
        return true;
      }
      return false;
    })
  );

  const localManifestPath = path.join(modelsDir, 'resources.json');
  await fs.writeFile(localManifestPath, JSON.stringify(relevantEntries, null, 2));
  console.log('WRITE public/models/resources.json');

  const chunkSpecs = new Map();
  for (const entry of Object.values(relevantEntries)) {
    for (const chunk of entry.chunks) {
      const chunkSize = chunk.offsets[1] - chunk.offsets[0];
      if (!chunkSpecs.has(chunk.name)) {
        chunkSpecs.set(chunk.name, chunkSize);
      }
    }
  }

  for (const [chunkName, chunkSize] of chunkSpecs) {
    await downloadChunk(baseUrls, chunkName, chunkSize);
  }

  for (const [entryKey, entry] of Object.entries(relevantEntries)) {
    await rebuildFileFromChunks(entryKey, entry);
  }

  const requiredFiles = new Set(['resources.json']);
  for (const chunkName of chunkSpecs.keys()) {
    requiredFiles.add(chunkName);
  }
  for (const [entryKey] of Object.entries(relevantEntries)) {
    let outputFileName = path.basename(entryKey);
    if (entryKey.startsWith('/models/')) {
      outputFileName = `${outputFileName}.onnx`;
    }
    requiredFiles.add(outputFileName);
  }

  const previouslyManaged = await readManagedIndex(managedIndexPath);
  for (const relativeFile of previouslyManaged) {
    if (requiredFiles.has(relativeFile)) {
      continue;
    }

    const stalePath = path.join(modelsDir, relativeFile);
    if (await exists(stalePath)) {
      await fs.unlink(stalePath);
      stats.pruned += 1;
      console.log(`DEL   ${relativeFile}`);
    }
  }

  const legacyCandidates = [
    'isnet.onnx',
    'isnet_fp16.onnx',
    'isnet_quint8.onnx',
    'ort-wasm-simd-threaded.jsep.wasm',
    'ort-wasm-simd-threaded.wasm',
    'ort-wasm-simd-threaded.jsep.mjs',
    'ort-wasm-simd-threaded.mjs',
  ];

  for (const fileName of legacyCandidates) {
    if (requiredFiles.has(fileName)) {
      continue;
    }
    const fullPath = path.join(modelsDir, fileName);
    if (await exists(fullPath)) {
      await fs.unlink(fullPath);
      stats.pruned += 1;
      console.log(`DEL   ${fileName}`);
    }
  }

  const currentEntries = await fs.readdir(modelsDir, { withFileTypes: true });
  for (const entry of currentEntries) {
    if (!entry.isFile()) {
      continue;
    }

    const fileName = entry.name;
    if (!isLegacyImglyChunkName(fileName)) {
      continue;
    }
    if (requiredFiles.has(fileName)) {
      continue;
    }

    const staleChunkPath = path.join(modelsDir, fileName);
    await fs.unlink(staleChunkPath);
    stats.pruned += 1;
    console.log(`DEL   ${fileName}`);
  }

  await fs.writeFile(
    managedIndexPath,
    JSON.stringify({
      version,
      model: selectedModel,
      files: Array.from(requiredFiles).sort(),
    }, null, 2)
  );

  console.log('');
  console.log(`Descargados: ${stats.downloaded}`);
  console.log(`Reconstruidos: ${stats.rebuilt}`);
  console.log(`Eliminados: ${stats.pruned}`);
  console.log(`Ignorados: ${stats.skipped}`);
  console.log(`Errores: ${stats.errors}`);

  if (stats.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Error fatal: ${error.message}`);
  process.exit(1);
});
