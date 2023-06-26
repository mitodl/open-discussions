import React, { useMemo, useEffect } from "react"
import { CKEditor } from "@ckeditor/ckeditor5-react"

import { ClassicEditor } from "@ckeditor/ckeditor5-editor-classic"
import type { EditorConfig } from "@ckeditor/ckeditor5-core"

import { Essentials } from "@ckeditor/ckeditor5-essentials"
import { UploadAdapter } from "@ckeditor/ckeditor5-adapter-ckfinder"
import { Autoformat } from "@ckeditor/ckeditor5-autoformat"
import { Bold, Italic } from "@ckeditor/ckeditor5-basic-styles"
import { BlockQuote } from "@ckeditor/ckeditor5-block-quote"
import { EasyImage } from "@ckeditor/ckeditor5-easy-image"
import { Heading } from "@ckeditor/ckeditor5-heading"
import {
  Image,
  ImageStyle,
  ImageToolbar,
  ImageUpload
} from "@ckeditor/ckeditor5-image"
import { Link } from "@ckeditor/ckeditor5-link"
import { List } from "@ckeditor/ckeditor5-list"
import { MediaEmbed } from "@ckeditor/ckeditor5-media-embed"
import { Paragraph } from "@ckeditor/ckeditor5-paragraph"
import { CloudServices } from "@ckeditor/ckeditor5-cloud-services"

// block toolbar setup
import { BlockToolbar } from "@ckeditor/ckeditor5-ui"
import { ParagraphButtonUI } from "@ckeditor/ckeditor5-paragraph"
import getCloudServicesConfig from "./cloudServices"
import { ensureEmbedlyPlatform, embedlyCardHtml } from "ol-util"

const baseEditorConfig: EditorConfig = {
  plugins: [
    Essentials,
    Autoformat,
    Bold,
    Italic,
    BlockQuote,
    Heading,
    Link,
    List,
    MediaEmbed,
    Paragraph,
    BlockToolbar,
    UploadAdapter,
    CloudServices,
    EasyImage,
    Image,
    ImageStyle,
    ImageToolbar,
    ImageUpload,
    ParagraphButtonUI
  ],
  blockToolbar: ["mediaEmbed", "imageUpload"],
  toolbar:      {
    items: [
      "heading",
      "bold",
      "italic",
      "link",
      "bulletedList",
      "numberedList",
      "blockQuote"
    ]
  },
  placeholder: "Write here...",
  image:       {
    toolbar: [
      "imageStyle:block",
      "imageStyle:side",
      "|",
      "imageTextAlternative"
    ]
  },
  cloudServices: getCloudServicesConfig(),
  mediaEmbed:    {
    previewsInData: true,
    providers:      [
      {
        name: "embedly",
        url:  /.+/,
        html: match => {
          const url = match[0]

          return embedlyCardHtml(url)
        }
      }
    ]
  }
}

type CkeditorArticleProps = {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  id?: string
  className?: string
  placeholder?: string
  editableClassName?: string
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
      ...(placeholder ? { placeholder } : {})
    }
  }, [placeholder])

  useEffect(() => {
    ensureEmbedlyPlatform()
  }, [])

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
