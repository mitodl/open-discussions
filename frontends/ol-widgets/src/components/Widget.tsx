import React from "react"
import type { WidgetInstance, MarkdownWidgetConfig } from "../interfaces"
import { WidgetTypes } from "../interfaces"
import MarkdownWidget from "./MarkdownWidget"

interface WidgetProps {
  widget: WidgetInstance
  className?: string
}

const Widget: React.FC<WidgetProps> = ({ widget, className }) => {
  if (widget.widget_type === WidgetTypes.Markdown) {
    return <MarkdownWidget className={className} widget={widget as WidgetInstance<MarkdownWidgetConfig>} />
  }
  throw new Error(`Unrecognized Widget Type: ${widget.widget_type}`)
}

export default Widget
export type { WidgetProps }
