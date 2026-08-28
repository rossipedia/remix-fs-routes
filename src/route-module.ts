import type {
  Action,
  Middleware,
  RequestContext,
  RequestHandler,
  RouterTypes,
} from 'remix/router'
import { route as createRoutes } from 'remix/routes'
import type { Route } from 'remix/routes'

type ActionRoute = string | Route
type AnyMiddleware = Middleware<any>
type AbsolutePattern<pattern extends string> = pattern extends `/${string}`
  ? pattern
  : `/${pattern}`
type DefaultContext = RouterTypes extends {
  context: infer context extends RequestContext<any, any>
}
  ? context
  : RequestContext
type ActionHandler<
  route extends ActionRoute,
  context extends RequestContext<any, any>,
> = Extract<Action<route, context>, RequestHandler<any>>
type ActionObject<
  route extends ActionRoute,
  context extends RequestContext<any, any>,
  middleware extends readonly AnyMiddleware[],
> = Extract<Action<route, context, middleware>, { handler: RequestHandler<any> }>

export interface RouteActionFactory<
  route extends ActionRoute,
  context extends RequestContext<any, any>,
> {
  (handler: ActionHandler<route, context>): ActionHandler<route, context>
  <const middleware extends readonly AnyMiddleware[]>(options: {
    middleware: readonly [...middleware]
  }): (
    handler: ActionObject<route, context, middleware>['handler'],
  ) => ActionObject<route, context, middleware>
}

export interface ActionBuilder<
  route extends ActionRoute,
  context extends RequestContext<any, any>,
> {
  <const middleware extends readonly AnyMiddleware[]>(
    action: Action<route, context, middleware>,
  ): Action<route, context, middleware>
}

export function createAction<
  route extends ActionRoute,
  context extends RequestContext<any, any> = DefaultContext,
>(action: ActionHandler<route, context>): ActionHandler<route, context>
export function createAction<
  route extends ActionRoute,
  context extends RequestContext<any, any> = DefaultContext,
>(): ActionBuilder<route, context>
export function createAction<
  route extends ActionRoute,
  context extends RequestContext<any, any> = DefaultContext,
  const middleware extends readonly AnyMiddleware[] = readonly AnyMiddleware[],
>(
  route: route,
  action: Action<route, context, middleware>,
): Action<route, context, middleware>
export function createAction(
  ...args:
    | []
    | [Action<any, any, any>]
    | [ActionRoute, Action<any, any, any>]
): unknown {
  if (args.length === 0) return (action: unknown) => action
  return args.length === 1 ? args[0] : args[1]
}

export function createRouteModule<
  const pattern extends string,
  context extends RequestContext<any, any> = DefaultContext,
>(pattern: pattern) {
  let route = createRoutes({ route: pattern }).route as Route<'ANY', AbsolutePattern<pattern>>
  return {
    route,
    createAction: createRouteAction<typeof route, context>(),
  }
}

function createRouteAction<
  route extends ActionRoute,
  context extends RequestContext<any, any>,
>(): RouteActionFactory<route, context> {
  return ((handlerOrOptions: RequestHandler<any> | { middleware: readonly AnyMiddleware[] }) => {
    if (typeof handlerOrOptions === 'function') return handlerOrOptions
    return (handler: RequestHandler<any>) => ({ ...handlerOrOptions, handler })
  }) as RouteActionFactory<route, context>
}

export { createAction as defineAction }
