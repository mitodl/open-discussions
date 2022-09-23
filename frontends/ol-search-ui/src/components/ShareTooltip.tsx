import React, { useCallback, useRef, useState } from "react"
import {
  FacebookShareButton,
  LinkedinShareButton,
  TwitterShareButton
} from "react-share"
import { FacebookIcon, TwitterIcon, LinkedinIcon } from "react-share"
import Tooltip from "@mui/material/Tooltip"
import type { TooltipProps } from "@mui/material/Tooltip"
import ClickAwayListener from "@mui/material/ClickAwayListener"
import { Button } from "@mui/material"
import type { ButtonProps } from "@mui/material"

type HelperProps = {
  url: string
  hideSocialButtons?: boolean | null | undefined
  objectType?: string | null | undefined
}

const muiCopyButtonSx: ButtonProps["sx"] = {
  padding:  "2px",
  fontSize: "100%"
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
    <div>
      <label>
        Share a link to this {objectType}
        <input ref={inputRef} readOnly value={url} />
      </label>
      <div className="ol-tooltip-row">
        {hideSocialButtons ? null : (
          <div>
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
        <Button size="small" sx={muiCopyButtonSx} onClick={selectAndCopyLinkText}>
          Copy URL to clipboard
        </Button>
      </div>
    </div>
  )
}

type Props = {
  url: string
  hideSocialButtons?: boolean
  placement?: TooltipProps["placement"]
  objectType?: string | null
  children: React.ReactElement
}

const muiTooltipProps: TooltipProps["componentsProps"] = {
  tooltip: {
    sx: {
      color:           "secondary.main",
      backgroundColor: "white",
      padding:         "12px"
    }
  },
  popper: {
    sx: {
      overflow: "visible"
    }
  },
  transition: {
    className: "ol-tooltip-share"
  }
}

export default function ShareTooltip({ children, placement = "top", objectType, url, hideSocialButtons }: Props) {
  const [visible, setVisible] = useState(false)
  const setClose = useCallback(() => setVisible(false), [])
  const setOpen = useCallback(() => setVisible(true), [])
  return (
    <ClickAwayListener onClickAway={setClose}>
      <span>
        <Tooltip
          placement={placement}
          open={visible}
          describeChild
          componentsProps={muiTooltipProps}
          title={
            <ShareTooltipHelper objectType={objectType} hideSocialButtons={hideSocialButtons} url={url} />
          }
          disableFocusListener
          disableHoverListener
          disableTouchListener
          onClick={setOpen}
        >
          {children}
        </Tooltip>
      </span>
    </ClickAwayListener>
  )
}
