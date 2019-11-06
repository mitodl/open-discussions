// @flow
import React from "react"
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@rmwc/dialog"

type Props = {
  open: boolean,
  hideDialog: Function,
  onCancel?: Function,
  onAccept?: ?Function,
  submitText?: string,
  cancelText?: string,
  hideAccept?: boolean,
  hideCancel?: boolean,
  title: string,
  id?: string,
  className?: string,
  children?: any
}

export default function OurDialog(props: Props) {
  const {
    open,
    hideDialog,
    onCancel,
    hideCancel,
    onAccept,
    hideAccept,
    title,
    submitText,
    cancelText,
    id,
    className,
    children
  } = props
  return (
    <Dialog open={open} onClose={hideDialog} id={id} className={className}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        {!hideCancel ? (
          <button
            className="cancel"
            onClick={onCancel || hideDialog}
            type="button"
          >
            {cancelText || "Cancel"}
          </button>
        ) : null}
        {!hideAccept ? (
          <button className="submit" onClick={onAccept} type="button">
            {submitText || "Accept"}
          </button>
        ) : null}
      </DialogActions>
    </Dialog>
  )
}
