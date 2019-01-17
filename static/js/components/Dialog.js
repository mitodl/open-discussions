// @flow
import React from "react"
import {
  Dialog,
  DialogSurface,
  DialogHeader,
  DialogHeaderTitle,
  DialogBody,
  DialogFooter,
  DialogBackdrop
} from "rmwc/Dialog"

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

const OurDialog = ({
  open,
  hideDialog,
  onCancel,
  onAccept,
  title,
  submitText,
  id,
  className,
  children
}: Props) => (
  <Dialog open={open} onClose={hideDialog} id={id}>
    <DialogSurface className={className}>
      <DialogHeader>
        <DialogHeaderTitle>{title}</DialogHeaderTitle>
      </DialogHeader>
      <DialogBody>{children}</DialogBody>
      <DialogFooter>
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
      </DialogFooter>
    </DialogSurface>
    <DialogBackdrop />
  </Dialog>
)

export default OurDialog
