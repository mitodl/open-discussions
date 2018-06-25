// @flow
import React from "react"
import onClickOutside from "react-onclickoutside"
import {
  FacebookShareButton,
  LinkedinShareButton,
  TwitterShareButton
} from "react-share"
import { FacebookIcon, TwitterIcon, LinkedinIcon } from "react-share"

type SharePopupProps = {
  url: string,
  closePopup: Function,
  hideSocialButtons?: boolean
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

  selectInputText = (e: Event) => {
    e.preventDefault()
    if (this.input.current) {
      this.input.current.select()
      document.execCommand("copy")
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
          <a href="#" className="copy-url" onClick={this.selectInputText}>
            Copy URL to clipboard
          </a>
        </div>
      </div>
    )
  }
}

const SharePopup = onClickOutside(SharePopupHelper)
export default SharePopup
