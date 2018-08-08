// @flow
import React from "react"
import R from "ramda"

import { MDCSnackbar } from "@material/snackbar/dist/mdc.snackbar"

import type { SnackbarState } from "../../reducers/ui"

type Props = {
  snackbar: ?SnackbarState
}

export default class Snackbar extends React.Component<Props> {
  snackbar = null
  snackbarRef = null

  constructor(props: Props) {
    super(props)
    this.snackbarRef = React.createRef()
  }

  componentDidMount() {
    if (this.snackbarRef.current) {
      this.snackbar = new MDCSnackbar(this.snackbarRef.current)
    }
  }

  // see here: https://reactjs.org/docs/react-component.html#unsafe_componentwillreceiveprops
  // this method will be deprecated soon, so we need to refactor away from it somehow
  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps: Props) {
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
          ref={this.snackbarRef}
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
