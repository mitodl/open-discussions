import React from "react"
import { CKEditor } from "@ckeditor/ckeditor5-react"

import ClassicEditor from "@ckeditor/ckeditor5-editor-classic/src/classiceditor"
import Essentials from "@ckeditor/ckeditor5-essentials/src/essentials"
import Paragraph from "@ckeditor/ckeditor5-paragraph/src/paragraph"
import Bold from "@ckeditor/ckeditor5-basic-styles/src/bold"
import Italic from "@ckeditor/ckeditor5-basic-styles/src/italic"
import Markdown from "@ckeditor/ckeditor5-markdown-gfm/src/markdown"
import List from "@ckeditor/ckeditor5-list/src/list"
import Link from "@ckeditor/ckeditor5-link/src/link"
import AutoLink from "@ckeditor/ckeditor5-link/src/autolink"

const editorConfig = {
  plugins: [
    Markdown,
    Essentials,
    Paragraph,
    Bold,
    Italic,
    List,
    Link,
    AutoLink
  ],
  toolbar:  ["bold", "italic", "|", "bulletedList", "numberedList", "|", "link"],
  language: "en"
}

interface CkeditorMarkdownProps {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  id?: string
  className?: string
}

const CkeditorMarkdown: React.FC<CkeditorMarkdownProps> = ({
  value,
  onChange,
  onBlur,
  id,
  className
}) => {
  return (
    <div id={id} className={className}>
      <CKEditor
        editor={ClassicEditor}
        data={value}
        config={editorConfig}
        onChange={(_event, editor) => {
          const data = editor.getData()
          onChange(data)
        }}
        onReady={editor => {
          editor.ui.element
        }}
        onBlur={onBlur}
      />
    </div>
  )
}

export default CkeditorMarkdown
export type { CkeditorMarkdownProps }
