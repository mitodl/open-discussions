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

type WidgetTemplateProps = {
  title:    string
  children: React.ReactNode
  className?: string
  isOpen:   boolean
  isEditing: boolean
}

const WidgetTemplate: React.FC<WidgetTemplateProps> = ({
  title,
  children,
  className,
  isOpen = true,
  isEditing = false
}) => {
  return (
    <Card className={className}>
      <CardContent>
        <div className="ol-widget-header">
          <h2>{title}</h2>
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

export default WidgetTemplate
