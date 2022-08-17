import React from "react"
import type { WidgetProps, RichTextWidgetInstance } from "../interfaces"

import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"

type RichTextWidgetProps = WidgetProps<RichTextWidgetInstance>

const RichTextWdiget: React.FC<RichTextWidgetProps> = ({widget, className}) => {
  return <Card className={className}>
    <CardContent>
      <h2>{widget.title}</h2>
      {widget.configuration.source}
    </CardContent>
  </Card>
}

export type { RichTextWidgetProps }
export default RichTextWdiget
