import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = path.dirname(new URL(import.meta.url).pathname),
  port = Number(process.env.PORT || 4173);
http
  .createServer(async (req, res) => {
    try {
      const name = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const file = path.resolve(
        root,
        "." + (name === "/" ? "/index.html" : name),
      );
      if (!file.startsWith(root + path.sep)) throw Error();
      const data = name === '/src/build-config.js'
        ? 'export const developmentMode = true;\n'
        : await readFile(file);
      res.writeHead(200, {
        "Content-Type":
          {
            ".html": "text/html; charset=utf-8",
            ".js": "text/javascript; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
          }[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(port, "0.0.0.0", () =>
    console.log(`Local: http://localhost:${port}`),
  );
