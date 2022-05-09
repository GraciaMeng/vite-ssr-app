const fs = require("fs");
const path = require("path");
const express = require("express");
const { createServer: _createServer } = require("vite");
// import { type ViteDevServer } from "vite";

const resolve = (p) => path.resolve(__dirname, p);

async function createServer(
  root = process.cwd(),
  isProd = process.env.NODE_ENV === "production"
) {
  let template = isProd
    ? fs.readFileSync(resolve("dist/client/index.html"), "utf-8")
    : fs.readFileSync(resolve("../index.html"), "utf-8");
  const manifest = isProd
    ? // @ts-ignore
      require("./dist/client/ssr-manifest.json")
    : {};

  const app = express();
  let vite;
  vite = await _createServer({
    root,
    server: {
      middlewareMode: true,
      watch: {
        usePolling: true,
        interval: 100,
      },
    },
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res) => {
    const { originalUrl: url } = req;
    try {
      let render;
      template = await vite.transformIndexHtml(url, template);
      render = (await vite.ssrLoadModule("/src/entry-server.ts")).render;

      let { html } = await render();
      html = template.replace(`<!--app-html-->`, html);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      isProd || vite.ssrFixStacktrace(e);
      console.error(`[error]`, e.stack);
      res.status(500).end(e.stack);
    }
  });
  return {
    app,
  };
}

// 创建服务
createServer().then(({ app }) => {
  app.listen(5000, () => {
    console.log("[server] http://localhost:5000");
  });
});
