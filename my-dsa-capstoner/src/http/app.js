import { createServer } from 'node:http';
import { realpath, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DomainError } from '../domain/errors.js';
import { createRouter } from './router.js';

const DEFAULT_PUBLIC_DIR = fileURLToPath(new URL('../../public/', import.meta.url));
const MAX_JSON_BODY_BYTES = 1024 * 1024;

const STATUS_BY_DOMAIN_CODE = {
  NOT_FOUND: 404,
  SOLD_OUT: 409,
  INVALID_STATE: 409,
  INVALID_TRANSITION: 409,
  VALIDATION: 400,
};

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function sendJson(response, status, body, headOnly = false) {
  const content = JSON.stringify(body);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(content),
  });
  response.end(headOnly ? undefined : content);
}

async function readJsonBody(request) {
  const contentType = request.headers['content-type']?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json' && !contentType?.endsWith('+json')) return undefined;

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_JSON_BODY_BYTES) {
      throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large');
    }
    chunks.push(chunk);
  }

  if (size === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'BAD_REQUEST', 'Request body must contain valid JSON');
  }
}

function isWithinDirectory(directory, candidate) {
  const relative = path.relative(directory, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function serveStatic(request, response, publicDir, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    throw new HttpError(400, 'BAD_REQUEST', 'Request path is not valid');
  }

  if (decodedPath.includes('\0')) {
    throw new HttpError(400, 'BAD_REQUEST', 'Request path is not valid');
  }

  const root = await realpath(publicDir);
  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const resolvedPath = path.resolve(root, `.${requestedPath}`);
  if (!isWithinDirectory(root, resolvedPath)) {
    throw new HttpError(404, 'NOT_FOUND', 'File not found');
  }

  let actualPath;
  try {
    actualPath = await realpath(resolvedPath);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      throw new HttpError(404, 'NOT_FOUND', 'File not found');
    }
    throw error;
  }
  if (!isWithinDirectory(root, actualPath)) {
    throw new HttpError(404, 'NOT_FOUND', 'File not found');
  }

  const details = await stat(actualPath);
  if (!details.isFile()) throw new HttpError(404, 'NOT_FOUND', 'File not found');

  const content = await readFile(actualPath);
  response.writeHead(200, {
    'content-type': CONTENT_TYPES[path.extname(actualPath).toLowerCase()] ?? 'application/octet-stream',
    'content-length': content.length,
  });
  response.end(request.method === 'HEAD' ? undefined : content);
}

function sendError(response, error, requestMethod) {
  if (error instanceof HttpError) {
    sendJson(response, error.status, { error: { code: error.code, message: error.message } }, requestMethod === 'HEAD');
    return;
  }
  if (error instanceof DomainError) {
    const status = STATUS_BY_DOMAIN_CODE[error.code] ?? 400;
    sendJson(response, status, { error: { code: error.code, message: error.message } }, requestMethod === 'HEAD');
    return;
  }

  console.error(error);
  sendJson(
    response,
    500,
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    requestMethod === 'HEAD',
  );
}

export function createApp({ publicDir = DEFAULT_PUBLIC_DIR, router = createRouter() } = {}) {
  router.get('/health', () => ({ status: 'ok' }));

  return async function handleRequest(request, response) {
    try {
      const url = new URL(request.url, 'http://localhost');
      const body = await readJsonBody(request);
      const match = router.match(request.method, url.pathname);

      if (match) {
        const result = await match.handler({ request, response, params: match.params, body, query: url.searchParams });
        if (!response.writableEnded && result !== undefined) sendJson(response, 200, result, request.method === 'HEAD');
        return;
      }

      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
        throw new HttpError(404, 'NOT_FOUND', 'API route not found');
      }

      if (request.method === 'GET' || request.method === 'HEAD') {
        await serveStatic(request, response, path.resolve(publicDir), url.pathname);
        return;
      }
      throw new HttpError(404, 'NOT_FOUND', 'Route not found');
    } catch (error) {
      if (!response.headersSent) sendError(response, error, request.method);
      else response.destroy(error);
    }
  };
}

export function createAppServer(options) {
  return createServer(createApp(options));
}
