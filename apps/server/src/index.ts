import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { RPCHandler } from '@orpc/server/fetch';
import { router } from './routers';

const app = new Hono();

app.use('*', cors({ origin: 'http://localhost:5173' }));

const rpcHandler = new RPCHandler(router);

const BODY_PARSER_METHODS = new Set(['json', 'text', 'arrayBuffer', 'blob', 'formData'] as const);

app.use('/rpc/*', async (c, next) => {
  const request = new Proxy(c.req.raw, {
    get(target, prop: string | symbol) {
      if (typeof prop === 'string' && BODY_PARSER_METHODS.has(prop as any)) {
        return () => c.req[prop as 'json' | 'text' | 'arrayBuffer' | 'blob' | 'formData']();
      }
      return Reflect.get(target, prop, target);
    },
  });

  const { matched, response } = await rpcHandler.handle(request, {
    prefix: '/rpc',
    context: {},
  });

  if (matched) {
    return c.newResponse(response.body, response);
  }

  await next();
});

app.get('/', (c) => c.text('Board Games API'));

const port = Number(process.env.PORT || 3000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export type AppType = typeof app;
