import { SupplierCatalog } from './catalog.mjs';
import { createAtlasServer } from './http.mjs';

const port = Number(process.env.CATALOG_PREVIEW_PORT || 3100);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid catalog preview port');
const server = createAtlasServer({ catalogService: new SupplierCatalog() });
server.on('error', () => { console.error('Catalog preview could not start. Check whether the port is already in use.'); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Atlas catalog: http://127.0.0.1:${port}/?catalog=1`));
