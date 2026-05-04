import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { RPCHandler } from '@orpc/server/fetch';
import { router } from './routers';
import path from 'path';
import fs from 'fs';

const app = new Hono();

const rpcHandler = new RPCHandler(router);

app.use('/rpc/*', async (c, next) => {
  const { matched, response } = await rpcHandler.handle(c.req.raw, {
    prefix: '/rpc',
    context: {},
  });

  if (matched) {
    return c.newResponse(response.body, response);
  }

  await next();
});

const webDist = process.env.WEB_DIST || path.resolve(import.meta.dirname, '../../web/dist');

app.use('/assets/*', serveStatic({ root: webDist }));
app.use('/sounds/*', serveStatic({ root: webDist }));

app.get('*', async (c) => {
  const filePath = path.join(webDist, c.req.path === '/' ? 'index.html' : c.req.path.slice(1));
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return serveStatic({ root: webDist })(c, async () => {});
    }
  } catch {}
  const indexHtml = path.join(webDist, 'index.html');
  return c.html(fs.readFileSync(indexHtml, 'utf-8'));
});

const port = Number(process.env.PORT || 3001);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export type AppType = typeof app;
