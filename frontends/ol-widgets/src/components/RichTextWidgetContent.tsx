import React from "react"
import type { RichTextWidgetInstance } from "../interfaces"

const RichTextWdigetContent: React.FC<{ widget: RichTextWidgetInstance }> = ({
  widget
}) => {
  return <>{widget.configuration.source}</>
}

export default RichTextWdigetContent
