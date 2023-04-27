import React, { useCallback, useState } from "react"
import Dialog, { DialogProps } from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import Box from "@mui/material/Box"
import IconButton from "@mui/material/IconButton"
import Close from "@mui/icons-material/Close"
import Button from "@mui/material/Button"

type BasicDialog = {
  open: boolean
  onClose: () => void
  /**
   * MUI Dialog's [TransitionProps](https://mui.com/material-ui/api/dialog/#props)
   */
  TransitionProps: DialogProps["TransitionProps"]
  onConfirm?: () => void | Promise<void>
  title: string
  children?: React.ReactNode
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
}

/**
 * A basic modal dialog.
 *
 * This is useful for things like confirmation or notifications, but not
 * particularly good for forms, where a <form /> element should wrap the inputs
 * and footer buttons.
 */
const BasicDialog: React.FC<BasicDialog> = ({
  title,
  children,
  open,
  onClose,
  onConfirm,
  cancelText = "Cancel",
  confirmText = "Confirm",
  fullWidth
}) => {
  const [confirming, setConfirming] = useState(false)
  const handleConfirm = useCallback(async () => {
    try {
      setConfirming(true)
      if (onConfirm) {
        await onConfirm()
      }
      onClose()
    } finally {
      setConfirming(false)
    }
  }, [onClose, onConfirm])
  return (
    <Dialog fullWidth={fullWidth} open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <Box position="absolute" top={0} right={0}>
        <IconButton onClick={onClose}>
          <Close />
        </IconButton>
      </Box>
      <DialogContent>{children}</DialogContent>
      <DialogActions>
        <Button variant="outlined" color="secondary" onClick={onClose}>
          {cancelText}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleConfirm}
          disabled={confirming}
        >
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default BasicDialog
