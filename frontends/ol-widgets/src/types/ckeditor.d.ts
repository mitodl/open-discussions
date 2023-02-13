declare module "@ckeditor/ckeditor5-react" {
  import type React from "react"

  interface Editor {
    getData(): string
  }

  type CKEditorProps = {
    editor: ConstructorType<Editor>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config?: any
    data: string
    onChange?: (event: unknown, editor: Editor) => void
    onBlur?: (event: unknown) => void
  }

  export const CKEditor: React.FC<CKEditorProps>
}

declare module "@ckeditor/ckeditor5-editor-classic" {
  import ClassicEditor from "@ckeditor/ckeditor5-editor-classic"
  export { ClassicEditor }
}

declare module "@ckeditor/ckeditor5-basic-styles/src/bold" {}
declare module "@ckeditor/ckeditor5-basic-styles/src/italic" {}
declare module "@ckeditor/ckeditor5-essentials/src/essentials" {}
declare module "@ckeditor/ckeditor5-list/src/list" {}
declare module "@ckeditor/ckeditor5-markdown-gfm/src/markdown" {}
