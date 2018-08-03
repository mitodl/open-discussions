// @flow
import { connect } from "react-redux"
import React from "react"
import R from "ramda"
import onClickOutside from "react-onclickoutside"
import {
  FacebookShareButton,
  LinkedinShareButton,
  TwitterShareButton
} from "react-share"
import { FacebookIcon, TwitterIcon, LinkedinIcon } from "react-share"

import { setSnackbarMessage } from "../actions/ui"

type SharePopupProps = {
  url: string,
  closePopup: Function,
  hideSocialButtons?: boolean,
  setSnackbarMessage: Function
}

export class SharePopupHelper extends React.Component<SharePopupProps> {
  input: { current: null | React$ElementRef<typeof HTMLInputElement> }

  constructor(props: SharePopupProps) {
    super(props)
    this.input = React.createRef()
  }

  handleClickOutside = () => {
    const { closePopup } = this.props
    closePopup()
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
      <div className="share-popup">
        <div className="triangle" />
        <div className="share-title">Share a link to this post:</div>
        <input ref={this.input} readOnly value={url} />
        <div className="bottom-row">
          {hideSocialButtons ? null : (
            <div className="share-buttons">
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

export default R.compose(
  connect(
    R.always({}), // mapStateToProps is not needed - just return an object
    { setSnackbarMessage }
  ),
  onClickOutside
)(SharePopupHelper)
