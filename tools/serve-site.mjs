#!/usr/bin/env node

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || process.argv[2] || 4174);
const publishedFile = path.join(root, 'facebook-archive', 'published.json');
const imageCaptionsFile = path.join(root, 'facebook-archive', 'image-captions.json');

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.3gp', 'video/3gpp'],
  ['.avi', 'video/x-msvideo'],
  ['.m4v', 'video/x-m4v'],
  ['.mov', 'video/quicktime'],
  ['.mp4', 'video/mp4'],
  ['.mpeg', 'video/mpeg'],
  ['.mpg', 'video/mpeg'],
  ['.webm', 'video/webm'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8']
]);

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

    if (url.pathname === '/api/published' && request.method === 'GET') {
      return sendJson(response, await readPublished());
    }

    if (url.pathname === '/api/published' && request.method === 'POST') {
      const body = await readJsonBody(request);
      const current = await readPublished();
      const ids = new Set(current.publishedIds);
      for (const id of normalizeIds(body.publishedIds)) {
        ids.add(id);
      }
      return sendJson(response, await writePublished([...ids]));
    }

    if (url.pathname === '/api/published/toggle' && request.method === 'POST') {
      const body = await readJsonBody(request);
      if (typeof body.id !== 'string' || !body.id) {
        return sendJson(response, { error: 'Missing post id' }, 400);
      }
      const current = await readPublished();
      const ids = new Set(current.publishedIds);
      if (body.published) {
        ids.add(body.id);
      } else {
        ids.delete(body.id);
      }
      return sendJson(response, await writePublished([...ids]));
    }

    if (url.pathname === '/api/image-captions' && request.method === 'GET') {
      return sendJson(response, await readImageCaptions());
    }

    if (url.pathname === '/api/image-captions' && request.method === 'POST') {
      const body = await readJsonBody(request);
      const current = await readImageCaptions();
      return sendJson(response, await writeImageCaptions({
        ...current.captions,
        ...normalizeCaptionObject(body.captions)
      }));
    }

    if (url.pathname === '/api/image-captions/save' && request.method === 'POST') {
      const body = await readJsonBody(request);
      if (typeof body.id !== 'string' || !body.id) {
        return sendJson(response, { error: 'Missing post id' }, 400);
      }
      const current = await readImageCaptions();
      const captions = { ...current.captions };
      const caption = normalizeCaption(body.caption);
      if (caption) {
        captions[body.id] = caption;
      } else {
        delete captions[body.id];
      }
      return sendJson(response, await writeImageCaptions(captions));
    }

    if (url.pathname.startsWith('/api/')) {
      return sendJson(response, { error: 'Not found' }, 404);
    }

    return serveStatic(url.pathname, response);
  } catch (error) {
    console.error(error);
    return sendJson(response, { error: 'Server error' }, 500);
  }
});

server.listen(port, host, () => {
  console.log(`林宜毅 Facebook 內網已啟動：http://127.0.0.1:${port}/`);
});

async function serveStatic(urlPath, response) {
  const decodedPath = decodeURIComponent(urlPath);
  const normalizedPath = decodedPath === '/' ? '/' : decodedPath;
  const requestedPath = path.resolve(root, `.${normalizedPath}`);

  if (requestedPath !== root && !requestedPath.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  let filePath = requestedPath;
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  if (stat.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  const data = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    'Content-Type': mimeTypes.get(ext) || 'application/octet-stream',
    'Cache-Control': 'no-store'
  });
  response.end(data);
}

async function readPublished() {
  await fs.mkdir(path.dirname(publishedFile), { recursive: true });
  try {
    const parsed = JSON.parse(await fs.readFile(publishedFile, 'utf8'));
    return {
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      publishedIds: normalizeIds(parsed.publishedIds)
    };
  } catch {
    return writePublished([]);
  }
}

async function writePublished(ids) {
  const payload = {
    updatedAt: new Date().toISOString(),
    publishedIds: normalizeIds(ids).sort()
  };
  await fs.writeFile(publishedFile, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

async function readImageCaptions() {
  await fs.mkdir(path.dirname(imageCaptionsFile), { recursive: true });
  try {
    const parsed = JSON.parse(await fs.readFile(imageCaptionsFile, 'utf8'));
    return {
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      captions: normalizeCaptionObject(parsed.captions)
    };
  } catch {
    return writeImageCaptions({});
  }
}

async function writeImageCaptions(captions) {
  const payload = {
    updatedAt: new Date().toISOString(),
    captions: normalizeCaptionObject(captions)
  };
  await fs.writeFile(imageCaptionsFile, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

function normalizeIds(ids) {
  return Array.isArray(ids)
    ? [...new Set(ids.filter((id) => typeof id === 'string' && id.length))]
    : [];
}

function normalizeCaptionObject(captions) {
  if (!captions || typeof captions !== 'object' || Array.isArray(captions)) return {};
  return Object.fromEntries(Object.entries(captions)
    .map(([id, caption]) => [id, normalizeCaption(caption)])
    .filter(([id, caption]) => typeof id === 'string' && id.length && caption));
}

function normalizeCaption(caption) {
  if (!caption || typeof caption !== 'object') return null;
  const title = String(caption.title || '').trim();
  const body = String(caption.body || '').trim();
  if (!title && !body) return null;
  return {
    title,
    body,
    updatedAt: typeof caption.updatedAt === 'string' ? caption.updatedAt : new Date().toISOString()
  };
}

function sendJson(response, payload, status = 200) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) {
      throw new Error('Request body too large');
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
