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

import type { AnonymousWidget, RichTextWidgetInstance } from "../interfaces"
import { WidgetTypes } from "../interfaces"
import RichTextWdigetContent from "./RichTextWidgetContent"

/**
 * Button labels for Widgets.
 *
 * Useful for tests.
 */
const btnLabel = {
  expand:   "Show widget content",
  collapse: "Hide widget content",
  edit:     "Edit widget",
  delete:   "Delete widget",
  move:     "Move widget"
}

type WidgetTemplateProps = {
  widget: AnonymousWidget
  isEditing?: boolean
  isOpen?: boolean
  className?: string
  actionsClassName?: string
  children?: React.ReactNode
  onEdit?: (widget: AnonymousWidget) => void
  onDelete?: (widget: AnonymousWidget) => void
  onVisibilityChange?: (widget: AnonymousWidget) => void
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

  if (!isEditing && !isOpen) {
    throw new Error("Collapsed widgets outside of editing mode not supported")
  }

  return (
    <Card
      className={classNames("ol-widget", className, {
        "ol-widget-collapsed": !isOpen
      })}
    >
      <CardContent>
        <h2 className="ol-widget-header">
          {widget.title}
          {isEditing &&
            (isOpen ? (
              <button
                aria-label={btnLabel.collapse}
                onClick={handleVisibilityChange}
              >
                <IconCollapse fontSize="inherit" />
              </button>
            ) : (
              <button
                aria-label={btnLabel.expand}
                onClick={handleVisibilityChange}
              >
                <IconExpand fontSize="inherit" />
              </button>
            ))}
        </h2>
        {isOpen && <div className="ol-widget-content">{children}</div>}
      </CardContent>
      {isEditing && (
        <>
          <Divider />
          <CardActions
            className={classNames("ol-widget-actions", actionsClassName)}
          >
            <button
              aria-label={btnLabel.edit}
              type="button"
              onClick={handleEdit}
            >
              <IconEdit fontSize="inherit" />
            </button>
            <button
              aria-label={btnLabel.delete}
              type="button"
              onClick={handleDelete}
            >
              <IconDelete fontSize="inherit" />
            </button>
            <button aria-label={btnLabel.move} type="button">
              <IconDrag fontSize="inherit" />
            </button>
          </CardActions>
        </>
      )}
    </Card>
  )
}

const WidgetContent: React.FC<{ widget: AnonymousWidget }> = ({ widget }) => {
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
export { btnLabel }
