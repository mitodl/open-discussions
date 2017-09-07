// @flow
import React from "react"
import { MDCToolbar } from "@material/toolbar/dist/mdc.toolbar"

export default class Toolbar extends React.Component {
  toolbarRoot: React$Element<*, *, *>
  toolbar: Object

  componentDidMount() {
    this.toolbar = new MDCToolbar(this.toolbarRoot)
  }

  componentWillUnmount() {
    if (this.toolbar) {
      this.toolbar.destroy()
    }
  }

  render() {
    const { toggleShowSidebar } = this.props

    return (
      <div className="navbar">
        <header className="mdc-toolbar" ref={div => (this.toolbarRoot = div)}>
          <div className="mdc-toolbar__row">
            <section className="mdc-toolbar__section mdc-toolbar__section--align-start">
              <a
                href="#"
                className="material-icons mdc-toolbar__icon--menu"
                onClick={toggleShowSidebar}
              >
                menu
              </a>
              <a href="http://www.mit.edu" className="mitlogo">
                <img src="/static/images/mit-logo-transparent3.svg" />
              </a>
              <a href="/" className="mdc-toolbar__title">
                Open Discussions
              </a>
            </section>
          </div>
        </header>
      </div>
    )
  }
}
