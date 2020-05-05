// @flow
import React, { useState } from "react"
import { useSelector } from "react-redux"
import { createSelector } from "reselect"
import { Snackbar as RMWCSnackbar } from "@rmwc/snackbar"

const getSnackbarState = createSelector(state => state.ui, ui => ui.snackbar)

export default function Snackbar() {
  const snackbar = useSelector(getSnackbarState)
  const [id, setId] = useState(-1)
  const [open, setOpen] = useState(false)
  if (snackbar) {
    if (snackbar.id !== id) {
      setId(snackbar.id)
      setOpen(true)
    }
    return (
      <RMWCSnackbar
        open={open}
        onClose={() => setOpen(false)}
        message={snackbar.message}
      />
    )
  } else return <RMWCSnackbar />
}
