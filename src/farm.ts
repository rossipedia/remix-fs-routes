import type { UnpluginInstance } from 'unplugin'

import type { RemixFsRoutesPluginOptions } from './types.js'
import { unplugin } from './unplugin.js'

const farm: UnpluginInstance<RemixFsRoutesPluginOptions | undefined>['farm'] =
  unplugin.farm

export default farm
