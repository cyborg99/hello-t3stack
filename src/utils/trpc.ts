import { httpBatchLink, loggerLink } from '@trpc/client'
import { createTRPCNext } from '@trpc/next'
import { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import { NextPageContext } from 'next'
import type { AppRouter } from '../server/routers/_app'
import { transformer } from './transformer'

function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return ''
  }
  // reference for vercel.com
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // // reference for render.com
  if (process.env.RENDER_INTERNAL_HOSTNAME) {
    return `http://${process.env.RENDER_INTERNAL_HOSTNAME}:${process.env.PORT}`
  }

  // assume localhost
  return `http://127.0.0.1:${process.env.PORT ?? 3000}`
}

/**
 * Extend `NextPageContext` with meta data that can be picked up by `responseMeta()` when server-side rendering
 */
export interface SSRContext extends NextPageContext {
  /**
   * Set HTTP Status code
   * @example
   * const utils = trpc.useUtils();
   * if (utils.ssrContext) {
   *   utils.ssrContext.status = 404;
   * }
   */
  status?: number
}

/**
 * A set of strongly-typed React hooks from your `AppRouter` type signature with `createReactQueryHooks`.
 * @link https://trpc.io/docs/react#3-create-trpc-hooks
 */
export const trpc = createTRPCNext<AppRouter, SSRContext>({
  config({ ctx }) {
    return {
      transformer,
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === 'development' ||
            (opts.direction === 'down' && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          headers() {
            if (!ctx?.req?.headers) {
              return {}
            }

            const {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              connection: _connection,
              ...headers
            } = ctx.req.headers
            return headers
          },
        }),
      ],
    }
  },
  ssr: true,
  responseMeta(opts) {
    const ctx = opts.ctx as SSRContext

    if (ctx.status) {
      return {
        status: ctx.status,
      }
    }

    const error = opts.clientErrors[0]
    if (error) {
      return {
        status: error.data?.httpStatus ?? 500,
      }
    }

    return {}
  },
})

export type RouterInput = inferRouterInputs<AppRouter>
export type RouterOutput = inferRouterOutputs<AppRouter>
