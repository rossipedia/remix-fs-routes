declare module 'virtual:remix-fs-routes/routes' {
  import type { RouteMap } from 'remix/routes'

  export const routes: RouteMap
  export const routeManifest: readonly {
    readonly id: string
    readonly file: string
    readonly path?: string
    readonly pattern: string
    readonly parentId?: string
    readonly index: boolean
  }[]
}

declare module 'virtual:remix-fs-routes/controller' {
  import type { Controller } from 'remix/router'
  import type { RouteMap } from 'remix/routes'

  export const controller: Controller<RouteMap>
}

export {}
