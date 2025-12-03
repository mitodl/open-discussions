import { Plugin } from "@ckeditor/ckeditor5-core"
import { BlockToolbar } from "@ckeditor/ckeditor5-ui"

interface BlockEditorIconConfig {
  icon: string
}

declare module "@ckeditor/ckeditor5-core" {
  interface EditorConfig {
    blockEditorIcon?: BlockEditorIconConfig
  }
}

/**
 * A plugin for modifying the icon of the block editor button.
 *
 * The icon is set via `EditorConfig.blockEditorIcon.icon`, the value of which
 * should be an SVG string `<svg>...</svg>`.
 *
 * NOTE: CKEditor exports several SVG icon strings that can be used. See
 * https://ckeditor.com/docs/ckeditor5/latest/framework/architecture/ui-components.html#icon
 *
 */
class BlockEditorIcon extends Plugin {
  static get pluginName() {
    return "BlockEditorIcon"
  }

  static get requires() {
    return [BlockToolbar]
  }

  init() {
    const config = this.editor.config.get("blockEditorIcon")
    if (!config) return
    const buttonView = this.editor.plugins.get("BlockToolbar").buttonView
    buttonView.set("icon", config.icon)
  }
}

export default BlockEditorIcon
