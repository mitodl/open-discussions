import React, { useCallback } from "react"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import Close from "@mui/icons-material/Close"
import Button, { ButtonProps } from "@mui/material/Button"

type BasicDialog = {
  open: boolean
  onClose: () => void
  onConfirm?: () => void
  title: string
  children?: React.ReactNode
  /**
   * Whether to call `onClose` immediately after `onConfirm` is called. Defaults
   * to `true`.
   */
  closeOnConfirm?: boolean
  /**
   * The text to display on the cancel button. Defaults to "Cancel".
   */
  cancelText?: string
  /**
   * The text to display on the confirm button. Defaults to "Confirm".
   */
  confirmText?: string
  /**
   * Defaults to `true`. If `true`, dialog grows to `maxWidth`. See
   * [Dialog Props](https://mui.com/material-ui/api/dialog/#props).
   */
  fullWidth?: boolean
  cancelButtonProps?: ButtonProps
  confirmButtonProps?: ButtonProps
}
const BasicDialog: React.FC<BasicDialog> = ({
  title,
  children,
  open,
  onClose,
  onConfirm,
  cancelText = "Cancel",
  confirmText = "Confirm",
  cancelButtonProps,
  confirmButtonProps,
  closeOnConfirm = true,
  fullWidth
}) => {
  const handleConfirm = useCallback(() => {
    if (onConfirm) {
      onConfirm()
    }
    if (closeOnConfirm) {
      onClose()
    }
  }, [onClose, onConfirm, closeOnConfirm])
  return (
    <Dialog fullWidth={fullWidth} open={open} onClose={onClose}>
      <DialogTitle>
        {title}
      </DialogTitle>
      <Box position="absolute" top={0} right={0}>
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </Box>
      <DialogContent>
        {children}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="secondary" onClick={onClose} {...cancelButtonProps}>{cancelText}</Button>
        <Button variant="contained" color="primary" onClick={handleConfirm} {...confirmButtonProps} >{confirmText}</Button>
      </DialogActions>
    </Dialog>
  )
}

export default BasicDialog
