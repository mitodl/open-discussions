// @flow
import React from "react"
import { useSelector } from "react-redux"
import { createSelector } from "reselect"
import { Snackbar as RMWCSnackbar } from "@rmwc/snackbar"

const getSnackbarState = createSelector(
  state => state.ui,
  ui => ui.snackbar
)

export default function Snackbar() {
  const snackbar = useSelector(getSnackbarState)
  console.log(snackbar)
  const message = snackbar ? snackbar.message : null
  const open = message ? true : false
  return (
    <RMWCSnackbar open={open} message={message} />
  )
}
