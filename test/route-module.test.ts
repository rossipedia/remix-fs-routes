import { createContextKey, type Middleware } from 'remix/router'
import { Route } from 'remix/routes'
import { describe, expect, it } from 'vitest'

import { createAction, createRouteModule, defineAction } from '../src/route-module.js'

describe('route-module actions', () => {
  it('creates a route-bound action factory', () => {
    let { route, createAction } = createRouteModule('/posts/:slug')
    let action = createAction(async ({ params }) => {
      expect(params.slug).toBeTypeOf('string')
      // @ts-expect-error The route does not define this parameter.
      void params.missing
      return new Response(params.slug)
    })

    expect(route.href({ slug: 'hello' })).toBe('/posts/hello')
    expect(action).toBeTypeOf('function')

    let optionalRoute = createRouteModule('(:lang/)about').route
    expect(optionalRoute.href()).toBe('/about')
    expect(optionalRoute.href({ lang: 'es' })).toBe('/es/about')
  })

  it('infers middleware before typing a bound handler', () => {
    let { createAction } = createRouteModule('/posts/:slug')
    let CurrentUser = createContextKey<{ id: string }>()
    let requireUser: Middleware<{ key: typeof CurrentUser; value: { id: string } }> = async (
      context,
      next,
    ) => {
      context.set(CurrentUser, { id: 'user-1' })
      return next()
    }
    let middleware = [requireUser] as const
    let action = createAction({ middleware })(async ({ get, params }) => {
      expect(params.slug).toBeTypeOf('string')
      expect(get(CurrentUser).id).toBeTypeOf('string')
      // @ts-expect-error The route does not define this parameter.
      void params.missing
      return new Response(params.slug)
    })

    expect(action.middleware).toBe(middleware)
    expect(action.handler).toBeTypeOf('function')
  })

  it('uses a generated route type without requiring its runtime value', () => {
    type PostRoute = Route<'ANY', '/posts/:slug'>
    let action = createAction<PostRoute>(({ params }) => {
      expect(params.slug).toBeTypeOf('string')
      // @ts-expect-error The route does not define this parameter.
      void params.missing
      return new Response(params.slug)
    })

    expect(action).toBeTypeOf('function')
    expect(createAction<PostRoute>(action)).toBe(action)
    expect(defineAction<PostRoute>()).toBeTypeOf('function')
  })

  it('retains the curried form for middleware inference', () => {
    type PostRoute = Route<'ANY', '/posts/:slug'>
    let action = createAction<PostRoute>()({
      middleware: [],
      handler({ params }) {
        return new Response(params.slug)
      },
    })

    expect(action).toHaveProperty('middleware')
  })

  it('retains the createAction(route, action) form', () => {
    let route = new Route('ANY', '/legacy/:id')
    let handler = () => new Response('legacy')

    expect(createAction(route, handler)).toBe(handler)
  })
})
