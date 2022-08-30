import classNames from "classnames"
import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { RichTextWidgetInstance } from "../interfaces"

const REMARK_PLUGINS = [remarkGfm]

const RichTextWdigetContent: React.FC<{
  className?: string
  widget: Omit<RichTextWidgetInstance, "id">
}> = ({ widget, className }) => {
  return (
    <ReactMarkdown
      className={classNames("ol-markdown", className)}
      remarkPlugins={REMARK_PLUGINS}
    >
      {widget.configuration.source}
    </ReactMarkdown>
  )
}

export default RichTextWdigetContent
