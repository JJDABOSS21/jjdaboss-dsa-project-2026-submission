import { pathToFileURL } from 'node:url';
import { config } from './config.js';
import { createAppServer } from './http/app.js';

export function startServer(port = config.port) {
  const server = createAppServer();
  server.listen(port, () => {
    console.log(`Event ticketing server listening on port ${server.address().port}`);
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
