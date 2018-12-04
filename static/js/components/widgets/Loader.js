import React, { Component } from "react"

export default class Loader extends Component {
  /**
   * _defaultLoader is the default component that shows before data has arrived on an asynchronous request
   */
  render() {
    return <div className="default-loader">Loading</div>
  }
}
