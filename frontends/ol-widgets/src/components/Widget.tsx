import React from "react"
import type { WidgetInstance, RichTextWidgetInstance } from "../interfaces"
import { WidgetTypes } from "../interfaces"
import RichTextWdiget from "./RichTextWidget"

interface WidgetProps {
  widget: WidgetInstance
  className?: string
}

const Widget: React.FC<WidgetProps> = ({ widget, className }) => {
  if (widget.widget_type === WidgetTypes.RichText) {
    return <RichTextWdiget className={className} widget={widget as RichTextWidgetInstance} />
  }
  throw new Error(`Unrecognized Widget Type: ${widget.widget_type}`)
}

export default Widget
export type { WidgetProps }
