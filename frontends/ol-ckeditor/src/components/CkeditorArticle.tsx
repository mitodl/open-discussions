import React, { useMemo } from "react"
import { CKEditor } from "@ckeditor/ckeditor5-react"

import ClassicEditor from "@ckeditor/ckeditor5-editor-classic/src/classiceditor"
import type { EditorConfig } from '@ckeditor/ckeditor5-core'

import Essentials from "@ckeditor/ckeditor5-essentials/src/essentials"
// import UploadAdapter from "@ckeditor/ckeditor5-adapter-ckfinder/src/uploadadapter"
import Autoformat from "@ckeditor/ckeditor5-autoformat/src/autoformat"
import Bold from "@ckeditor/ckeditor5-basic-styles/src/bold"
import Italic from "@ckeditor/ckeditor5-basic-styles/src/italic"
import BlockQuote from "@ckeditor/ckeditor5-block-quote/src/blockquote"
import EasyImage from "@ckeditor/ckeditor5-easy-image/src/easyimage"
import Heading from "@ckeditor/ckeditor5-heading/src/heading"
import Image from "@ckeditor/ckeditor5-image/src/image"
import ImageStyle from "@ckeditor/ckeditor5-image/src/imagestyle"
import ImageToolbar from "@ckeditor/ckeditor5-image/src/imagetoolbar"
import ImageUpload from "@ckeditor/ckeditor5-image/src/imageupload"
import Link from "@ckeditor/ckeditor5-link/src/link"
import List from "@ckeditor/ckeditor5-list/src/list"
import MediaEmbed from "@ckeditor/ckeditor5-media-embed/src/mediaembed"
import Paragraph from "@ckeditor/ckeditor5-paragraph/src/paragraph"

// block toolbar setup
import BlockToolbar from "@ckeditor/ckeditor5-ui/src/toolbar/block/blocktoolbar"
import ParagraphButtonUI from "@ckeditor/ckeditor5-paragraph/src/paragraphbuttonui"

const baseEditorConfig: EditorConfig = ({
  plugins: [
    Essentials,
    // UploadAdapter,
    Autoformat,
    Bold,
    Italic,
    BlockQuote,
    // EasyImage,
    Heading,
    Image,
    ImageStyle,
    ImageToolbar,
    // ImageUpload,
    Link,
    List,
    MediaEmbed,
    Paragraph,
    BlockToolbar,
    ParagraphButtonUI,
  ],
  toolbar:      {
    items: [
      "heading",
      "bold",
      "italic",
      "link",
      "bulletedList",
      "numberedList",
      "blockQuote",
      "mediaEmbed",
      "imageUpload"
    ]
  },
  placeholder: "Type here...",
})

type CkeditorArticleProps = {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  id?: string
  className?: string
  placeholder?: string
}

const CkeditorArticle: React.FC<CkeditorArticleProps> = ({
  value,
  onChange,
  onBlur,
  id,
  className,
  placeholder
}) => {
  const config = useMemo(() => {
    return {
      ...baseEditorConfig,
      placeholder
    }
  }, [placeholder])
  return (
    <div id={id} className={className}>
      <CKEditor
        editor={ClassicEditor}
        data={value}
        config={config}
        onChange={(_event, editor) => {
          const data = editor.getData()
          onChange(data)
        }}
        onBlur={onBlur}
      />
    </div>
  )
}

export default CkeditorArticle
export type { CkeditorArticleProps }
