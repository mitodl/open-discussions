import React, { useState, useRef, useLayoutEffect } from "react"

import Dotdotdot from "react-dotdotdot"

type Props = {
  text: string,
  lines: number,
  // Estimated maximum number of characters on a single line of text for the element where this
  // text will be rendered. Doesn't have to be exact.
  estCharsPerLine: number,
  className: ?string
}

const RenderedNewlines = React.memo(({ text }) =>
  text.split(/\n/g).map((item, key) => (
    <React.Fragment key={key}>
      {key === 0 ? null : <br />}
      {item}
    </React.Fragment>
  ))
)

export default function TruncatedText(props: Props) {
  const { text, lines, estCharsPerLine, className, showExpansionControls } =
    props
  const [expanded, setExpanded] = useState(false)
  const [hasOverflow, setHasOverflow] = useState(false)
  const [, forceReRender] = useState(0)
  const [currentText, setCurrentText] = useState(text)
  const dotRef = useRef(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (text !== currentText) {
      setCurrentText(text)
      setExpanded(false)
      setHasOverflow(false)
    }

    if (dotRef.current) {
      // the .container on the Dotdotdot holds the ref for the div it uses to
      // wrap the text
      const { container } = dotRef.current

      if (
        container.scrollHeight === 0 &&
        container.offsetHeight === 0 &&
        text.trim() !== ""
      ) {
        // the div which holds the text has been added to the DOM but doesn't have
        // a calculated height yet. in this case we need to use a setState call
        // to force the component to re-render so we can get the values we need
        // to figure out when the div has overflow
        forceReRender(val => val + 1)
      }

      if (container.scrollHeight > container.offsetHeight) {
        // scrollHeight is the height of the rendered text, while offsetHeight
        // is the height of the portion which is shown
        setHasOverflow(true)
      }
    }
  })

  return (
    <React.Fragment>
      {expanded ? (
        <div>
          <RenderedNewlines text={text} />
        </div>
      ) : (
        <Dotdotdot clamp={lines} ref={dotRef} className={className}>
          {/* Dotdotdot seems to trip on long, unbroken strings. As a fail-safe, we're limiting
              the input string to a number of characters that is greater than the characters that
              will be shown, but not so long that it will cause issues with Dotdotdot.*/}
          <RenderedNewlines
            text={text.substring(0, estCharsPerLine * (lines + 2))}
          />
        </Dotdotdot>
      )}
      {showExpansionControls && hasOverflow ? (
        <span
          className="tt-expansion-control"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Read less" : "Read more"}
        </span>
      ) : null}
    </React.Fragment>
  )
}
