import classNames from "classnames"
import React from "react"
import type { EmbeddedUrlWidgetInstance } from "../interfaces"


const RichTextWdigetContent: React.FC<{
  className?: string
  widget: Omit<EmbeddedUrlWidgetInstance, "id">
}> = ({ widget, className }) => {
  return (
    <div className={className}>
      {widget.configuration.url}
    </div>
  )
}

export default RichTextWdigetContent
