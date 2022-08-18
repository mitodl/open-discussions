import React, { useCallback } from "react"
import classNames from "classnames"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import CardActions from "@mui/material/CardActions"
import Divider from "@mui/material/Divider"
import IconEdit from "@mui/icons-material/Edit"
import IconDelete from "@mui/icons-material/Delete"
import IconDrag from "@mui/icons-material/DragHandle"
import IconExpand from "@mui/icons-material/ExpandMore"
import IconCollapse from "@mui/icons-material/ExpandLess"

import type { WidgetInstance, RichTextWidgetInstance } from "../interfaces"
import { WidgetTypes } from "../interfaces"
import RichTextWdigetContent from "./RichTextWidgetContent"

type WidgetTemplateProps = {
  widget: WidgetInstance
  isEditing?: boolean
  isOpen?: boolean
  className?: string
  actionsClassName?: string
  children?: React.ReactNode
  onEdit?: (widget: WidgetInstance) => void
  onDelete?: (widget: WidgetInstance) => void
  onVisibilityChange?: (widget: WidgetInstance) => void
}

const WidgetTemplate: React.FC<WidgetTemplateProps> = ({
  widget,
  children,
  className,
  actionsClassName,
  isEditing = false,
  isOpen = true,
  onEdit,
  onDelete,
  onVisibilityChange
}) => {
  const handleVisibilityChange = useCallback(() => {
    if (!onVisibilityChange) return
    onVisibilityChange(widget)
  }, [widget, onVisibilityChange])
  const handleEdit = useCallback(() => {
    if (!onEdit) return
    onEdit(widget)
  }, [widget, onEdit])
  const handleDelete = useCallback(() => {
    if (!onDelete) return
    onDelete(widget)
  }, [widget, onDelete])
  return (
    <Card className={classNames("ol-widget", className, {
      'ol-widget-collapsed': !isOpen
    })}>
      <CardContent>
        <h2 className="ol-widget-header">
          {widget.title}
          {isEditing &&
            (isOpen ? (
              <button
                aria-label="Hide widget content"
                onClick={handleVisibilityChange}
              >
                <IconCollapse fontSize="inherit" />
              </button>
            ) : (
              <button
                aria-label="Show widget content"
                onClick={handleVisibilityChange}
              >
                <IconExpand fontSize="inherit" />
              </button>
            ))}
        </h2>
        {
          isOpen && <div className="ol-widget-content">{children}</div>
        }
      </CardContent>
      {isEditing && (
        <>
          <Divider />
          <CardActions
            className={classNames("ol-widget-actions", actionsClassName)}
          >
            <button aria-label="Edit widget" type="button" onClick={handleEdit}>
              <IconEdit fontSize="inherit" />
            </button>
            <button
              aria-label="Delete widget"
              type="button"
              onClick={handleDelete}
            >
              <IconDelete fontSize="inherit" />
            </button>
            <button aria-label="Move widget" type="button">
              <IconDrag fontSize="inherit" />
            </button>
          </CardActions>
        </>
      )}
    </Card>
  )
}

const WidgetContent: React.FC<{ widget: WidgetInstance }> = ({ widget }) => {
  if (widget.widget_type === WidgetTypes.RichText) {
    return <RichTextWdigetContent widget={widget as RichTextWidgetInstance} />
  }
  throw new Error(`Unrecognized Widget Type: ${widget.widget_type}`)
}

type WidgetProps = Pick<
  WidgetTemplateProps,
  | "isEditing"
  | "isOpen"
  | "className"
  | "actionsClassName"
  | "widget"
  | "onEdit"
  | "onDelete"
  | "onVisibilityChange"
>

const Widget: React.FC<WidgetProps> = props => {
  return (
    <WidgetTemplate {...props}>
      <WidgetContent widget={props.widget} />
    </WidgetTemplate>
  )
}

export default Widget
export type { WidgetProps }
