import React from "react"
import type { EmbeddedUrlWidgetInstance } from "../interfaces"
import { EmbedlyCard } from "./embedly"

const RichTextWdigetContent: React.FC<{
  className?: string
  widget: Omit<EmbeddedUrlWidgetInstance, "id">
}> = ({ widget, className }) => {
  return <EmbedlyCard url={widget.configuration.url} className={className} />
}

export default RichTextWdigetContent
