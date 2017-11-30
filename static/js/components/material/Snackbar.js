// @flow
import React from "react"
import R from "ramda"

import { MDCSnackbar } from "@material/snackbar/dist/mdc.snackbar"

import type { SnackbarState } from "../../reducers/ui"

type SnackbarProps = {
  snackbar: ?SnackbarState
}

export default class Snackbar extends React.Component<*, *> {
  snackbar = null
  snackbarRoot = null

  props: SnackbarProps

  componentDidMount() {
    this.snackbar = new MDCSnackbar(this.snackbarRoot)
  }

  componentWillReceiveProps(nextProps: SnackbarProps) {
    if (!R.equals(this.props.snackbar, nextProps.snackbar)) {
      this.showSnackbar(nextProps.snackbar)
    }
  }

  showSnackbar(snackbar: ?SnackbarState) {
    if (this.snackbar && snackbar) {
      this.snackbar.show(R.omit("id", snackbar))
    }
  }

  render() {
    return (
      <div>
        <div
          className="mdc-snackbar"
          aria-live="assertive"
          aria-atomic="true"
          aria-hidden="true"
          ref={node => (this.snackbarRoot = node)}
        >
          <div className="mdc-snackbar__text" />
          <div className="mdc-snackbar__action-wrapper">
            <button type="button" className="mdc-snackbar__action-button" />
          </div>
        </div>
      </div>
    )
  }
}
