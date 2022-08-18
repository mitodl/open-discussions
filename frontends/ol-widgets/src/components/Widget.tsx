import React from "react"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import CardActions from "@mui/material/CardActions"
import Divider from "@mui/material/Divider"
import IconEdit from "@mui/icons-material/Edit"
import IconDelete from "@mui/icons-material/Delete"
import IconDrag from "@mui/icons-material/DragHandle"
import IconExpand from "@mui/icons-material/ExpandMore"
import IconCollapse from "@mui/icons-material/ExpandMore"

import type { WidgetInstance, RichTextWidgetInstance } from "../interfaces"
import { WidgetTypes } from "../interfaces"
import RichTextWdigetContent from "./RichTextWidgetContent"


type WidgetTemplateProps = {
  widget: WidgetInstance
  isEditing: boolean
  className?: string
  children?: React.ReactNode
}

const WidgetTemplate: React.FC<WidgetTemplateProps> = ({
  widget,
  children,
  className,
  isEditing = false
}) => {
  const isOpen = true
  return (
    <Card className={className}>
      <CardContent>
        <div className="ol-widget-header">
          <h2>{widget.title}</h2>
          {isEditing && (
            isOpen ?
              <button type="button"><IconCollapse fontSize="inherit"/></button> :
              <button type="button"><IconExpand fontSize="inherit"/></button>
          )}
        </div>
        <div>
          {children}
        </div>
      </CardContent>
      {isEditing && <>
        <Divider />
        <CardActions className="ol-widget-actions">
          <button type="button"><IconEdit fontSize="inherit"/></button>
          <button type="button"><IconDelete fontSize="inherit"/></button>
          <button type="button"><IconDrag fontSize="inherit"/></button>
        </CardActions>
      </>}
    </Card>
  )
}


const WidgetContent: React.FC<{ widget: WidgetInstance }> = ({ widget }) => {
  if (widget.widget_type === WidgetTypes.RichText) {
    return (
      <RichTextWdigetContent
        widget={widget as RichTextWidgetInstance}
      />
    )
  }
  throw new Error(`Unrecognized Widget Type: ${widget.widget_type}`)
}

type WidgetProps = Pick<WidgetTemplateProps, 'isEditing' | 'className' | 'widget' >

const Widget: React.FC<WidgetProps> = props => {
  return (
    <WidgetTemplate widget={props.widget} isEditing={props.isEditing} className={props.className}>
      <WidgetContent widget={props.widget} />
    </WidgetTemplate>
  )
}

export default Widget
export type { WidgetProps }
