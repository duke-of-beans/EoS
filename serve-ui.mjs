import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = 8080;

http.createServer(async (req, res) => {
  const filePath = path.join(__dirname, req.url === '/' ? '/eye-of-sauron-ui.html' : req.url);
  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(port, () => {
  console.log(`Serving Eye of Sauron UI at http://localhost:${port}`);
});

function getContentType(file) {
  if (file.endsWith('.html')) return 'text/html';
  if (file.endsWith('.css')) return 'text/css';
  if (file.endsWith('.js')) return 'application/javascript';
  return 'text/plain';
}
