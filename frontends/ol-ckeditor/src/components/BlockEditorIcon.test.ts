import { ClassicEditor } from "@ckeditor/ckeditor5-editor-classic"
import { BlockToolbar } from "@ckeditor/ckeditor5-ui"
import { Paragraph } from "@ckeditor/ckeditor5-paragraph"
import { Essentials } from "@ckeditor/ckeditor5-essentials"
import BlockEditorIcon from "./BlockEditorIcon"

describe("BlockEditorIconPlugin", () => {
  it("Allows passing an icon string via editor config", async () => {
    const editor = await ClassicEditor.create("", {
      plugins:         [Essentials, Paragraph, BlockToolbar, BlockEditorIcon],
      blockEditorIcon: { icon: "<svg><!-- Cool SVG --></svg>" }
    })

    expect(editor.plugins.get("BlockToolbar").buttonView.icon).toBe(
      "<svg><!-- Cool SVG --></svg>"
    )
  })
})
