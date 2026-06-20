import type { AnyExtension } from '@tiptap/core'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'

const TableNode = Table.configure({
  allowTableNodeSelection: true,
  lastColumnResizable: false,
  resizable: false,
})
const tableExtensions: AnyExtension[] = [
  TableNode,
  TableRow,
  TableHeader,
  TableCell,
]

type MobileTableBridgeExtension = {
  clone: () => MobileTableBridgeExtension
  config?: unknown
  configureCSS: (css: string) => MobileTableBridgeExtension
  configureExtension: (config: unknown) => MobileTableBridgeExtension
  configureTiptapExtensionsOnRunTime: (config: unknown, extendConfig: unknown) => (AnyExtension | undefined)[]
  extendExtension: (extendConfig: unknown) => MobileTableBridgeExtension
  extendConfig?: unknown
  extendCSS: string
  name: string
  tiptapExtension: AnyExtension
}

type MobileTableBridgeOptions = {
  config?: unknown
  css?: string
  extendConfig?: unknown
}

export const MobileTableBridge = mobileTableBridge()

function mobileTableBridge({
  config,
  css = '',
  extendConfig,
}: MobileTableBridgeOptions = {}): MobileTableBridgeExtension {
  return {
    clone: () => mobileTableBridge({ config, css, extendConfig }),
    config,
    configureCSS: (nextCss) => mobileTableBridge({ config, css: nextCss, extendConfig }),
    configureExtension: (nextConfig) => mobileTableBridge({ config: nextConfig, css, extendConfig }),
    configureTiptapExtensionsOnRunTime: (runtimeConfig, runtimeExtendConfig) => (
      tableExtensions.map((extension) => configuredTableExtension(extension, {
        config: runtimeConfig,
        extendConfig: runtimeExtendConfig,
      }))
    ),
    extendExtension: (nextExtendConfig) => mobileTableBridge({ config, css, extendConfig: nextExtendConfig }),
    extendConfig,
    extendCSS: css,
    name: TableNode.name,
    tiptapExtension: TableNode,
  }
}

function configuredTableExtension(
  extension: AnyExtension,
  options: { config: unknown; extendConfig: unknown },
): AnyExtension {
  if (extension.name !== TableNode.name) return extension

  const configuredExtension = options.config ? extension.configure(options.config) : extension
  return options.extendConfig ? configuredExtension.extend(options.extendConfig) : configuredExtension
}
