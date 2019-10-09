// @flow
import React from "react"
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@rmwc/dialog"

type Props = {
  open: boolean,
  hideDialog: Function,
  onCancel?: Function,
  onAccept: ?Function,
  title: string,
  submitText: string,
  id?: string,
  className?: string,
  children?: any
}

export default function OurDialog(props: Props) {
  const {
    open,
    hideDialog,
    onCancel,
    onAccept,
    title,
    submitText,
    id,
    className,
    children
  } = props
  return (
    <Dialog open={open} onClose={hideDialog} id={id} className={className}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        <button
          className="cancel"
          onClick={onCancel || hideDialog}
          type="button"
        >
          Cancel
        </button>
        <button className="submit" onClick={onAccept} type="button">
          {submitText || "Accept"}
        </button>
      </DialogActions>
    </Dialog>
  )
}
