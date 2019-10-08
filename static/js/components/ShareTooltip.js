// @flow
import { connect } from "react-redux"
import React from "react"
import R from "ramda"
import {
  FacebookShareButton,
  LinkedinShareButton,
  TwitterShareButton
} from "react-share"
import { FacebookIcon, TwitterIcon, LinkedinIcon } from "react-share"
import Tooltip from "rc-tooltip"

import { setSnackbarMessage } from "../actions/ui"

type HelperProps = {
  url: string,
  hideSocialButtons?: boolean,
  setSnackbarMessage: Function
}

export class ShareTooltipHelper extends React.Component<HelperProps> {
  input: { current: null | React$ElementRef<typeof HTMLInputElement> }

  constructor(props: HelperProps) {
    super(props)
    this.input = React.createRef()
  }

  selectAndCopyLinkText = (e: Event) => {
    const { setSnackbarMessage } = this.props
    e.preventDefault()
    if (this.input.current) {
      this.input.current.select()
      document.execCommand("copy")
      setSnackbarMessage({ message: "Copied to clipboard" })
    }
  }

  render() {
    const { url, hideSocialButtons } = this.props

    return (
      <div className="tooltip">
        <div className="tooltip-text">Share a link to this post:</div>
        <input ref={this.input} readOnly value={url} />
        <div className="bottom-row">
          {hideSocialButtons ? null : (
            <div className="tooltip-buttons">
              <FacebookShareButton url={url}>
                <FacebookIcon round size={28} />
              </FacebookShareButton>
              <LinkedinShareButton url={url}>
                <LinkedinIcon round size={28} />
              </LinkedinShareButton>
              <TwitterShareButton url={url}>
                <TwitterIcon round size={28} />
              </TwitterShareButton>
            </div>
          )}
          <a href="#" className="copy-url" onClick={this.selectAndCopyLinkText}>
            Copy URL to clipboard
          </a>
        </div>
      </div>
    )
  }
}

const ConnectedShareTooltipHelper = connect(
  R.always({}), // mapStateToProps is not needed - just return an object
  { setSnackbarMessage }
)(ShareTooltipHelper)

type Props = {
  url: string,
  hideSocialButtons?: boolean,
  children: Array<React$Element<any>> | React$Element<any>
}

export default function ShareTooltip({ children, ...props }: Props) {
  return (
    <Tooltip
      placement="top"
      trigger={["click"]}
      overlay={() => <ConnectedShareTooltipHelper {...props} />}
    >
      {children}
    </Tooltip>
  )
}
