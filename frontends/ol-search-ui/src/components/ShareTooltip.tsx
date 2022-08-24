import React, { useRef } from "react"
import {
  FacebookShareButton,
  LinkedinShareButton,
  TwitterShareButton
} from "react-share"
import { FacebookIcon, TwitterIcon, LinkedinIcon } from "react-share"
import Tooltip from "rc-tooltip"

type HelperProps = {
  url: string
  hideSocialButtons?: boolean | null | undefined
  objectType?: string | null | undefined
}

export const ShareTooltipHelper: React.FC<HelperProps> = ({
  url,
  hideSocialButtons,
  objectType
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const selectAndCopyLinkText = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault()
    if (inputRef.current) {
      navigator.clipboard.writeText(inputRef.current.value)
    }
  }

  return (
    <div className="tooltip">
      <div className="tooltip-text">
        {`Share a link to this ${objectType}:`}
      </div>
      <input ref={inputRef} readOnly value={url} />
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
        <a href="#" className="copy-url" onClick={selectAndCopyLinkText}>
          Copy URL to clipboard
        </a>
      </div>
    </div>
  )
}

type Props = {
  url: string
  hideSocialButtons?: boolean
  children?: React.ReactElement<string>
  placement?: string
  objectType?: string | null
}

export default function ShareTooltip({ children, placement, ...props }: Props) {
  return (
    <Tooltip
      placement={placement || "top"}
      trigger={["click"]}
      overlay={() => <ShareTooltipHelper {...props} />}
      destroyTooltipOnHide={true}
    >
      {children}
    </Tooltip>
  )
}
