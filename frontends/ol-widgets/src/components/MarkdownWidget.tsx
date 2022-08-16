import React from "react"
import type { WidgetProps, MarkdownWidgetInstance } from "../interfaces"

import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"

type MarkdownWidgetProps = WidgetProps<MarkdownWidgetInstance>

const MarkdownWidget: React.FC<MarkdownWidgetProps> = ({widget, className}) => {
  return <Card className={className}>
    <CardContent>
      <h2>{widget.title}</h2>
      {widget.configuration.source}
    </CardContent>
  </Card>
}

export type { MarkdownWidgetProps }
export default MarkdownWidget
