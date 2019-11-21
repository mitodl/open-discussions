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
  title: string,
  id?: string,
  className?: string,
  children?: any,
  noButtons?: boolean
}

export default function OurDialog(props: Props) {
  const {
    open,
    hideDialog,
    onCancel,
    onAccept,
    title,
    submitText,
    cancelText,
    id,
    className,
    children,
    noButtons
  } = props
  return (
    <Dialog open={open} onClose={hideDialog} id={id} className={className}>
      <DialogTitle>
        <span>{title}</span>
        <i onClick={hideDialog} className="material-icons close">
          close
        </i>
      </DialogTitle>
      <DialogContent>{children}</DialogContent>
      {noButtons ? null : (
        <DialogActions>
          <button
            className="cancel"
            onClick={onCancel || hideDialog}
            type="button"
          >
            {cancelText || "Cancel"}
          </button>
          <button className="submit" onClick={onAccept} type="button">
            {submitText || "Accept"}
          </button>
        </DialogActions>
      )}
    </Dialog>
  )
}
