// @flow
import React from "react"

import type { ChildrenArray } from "react"

type SpinnerButtonProps = {
  component: React.Component<*, *>,
  className?: string,
  onClickPromise: () => Promise<*>,
  children?: ChildrenArray<*>
}

export default class SpinnerButton extends React.Component<*, *> {
  props: SpinnerButtonProps
  _mounted: boolean

  constructor(props: SpinnerButtonProps) {
    super(props)
    this.state = {
      processing: false
    }
    this._mounted = false
  }

  componentDidMount() {
    this._mounted = true
  }

  componentWillUnmount() {
    this._mounted = false
  }

  onClick = async () => {
    const { onClickPromise } = this.props
    this.setState({ processing: true })
    try {
      await onClickPromise()
    } finally {
      // This may cause a memory leak since the callback has a reference to the component and the callback
      // outlives the component. However there shouldn't be much in this component tree and the promise
      // should resolve fairly quickly if it's used for API requests.
      if (this._mounted) {
        this.setState({ processing: false })
      }
    }
  }

  render() {
    let {
      className,
      children,
      onClickPromise, // eslint-disable-line no-unused-vars, prefer-const
      ...otherProps // eslint-disable-line prefer-const
    } = this.props
    const { processing } = this.state

    if (processing) {
      if (!className) {
        className = ""
      }
      className = `${className} disabled-with-spinner`
      children = <div className="sk-fading-circle">
        <div className="sk-circle1 sk-circle" />
        <div className="sk-circle2 sk-circle" />
        <div className="sk-circle3 sk-circle" />
        <div className="sk-circle4 sk-circle" />
        <div className="sk-circle5 sk-circle" />
        <div className="sk-circle6 sk-circle" />
        <div className="sk-circle7 sk-circle" />
        <div className="sk-circle8 sk-circle" />
        <div className="sk-circle9 sk-circle" />
        <div className="sk-circle10 sk-circle" />
        <div className="sk-circle11 sk-circle" />
        <div className="sk-circle12 sk-circle" />
      </div>
    }

    return (
      <button
        className={className}
        disabled={processing}
        {...otherProps}
        onClick={this.onClick}
      >
        {children}
      </button>
    )
  }
}
