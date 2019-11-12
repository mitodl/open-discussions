import React, { useState } from "react"

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
  const {
    text,
    lines,
    estCharsPerLine,
    className,
    showExpansionControls
  } = props
  const [expanded, setExpanded] = useState(false)

  return (
    <React.Fragment>
      {expanded ? (
        <div>
          <RenderedNewlines text={text} />
        </div>
      ) : (
        <Dotdotdot clamp={lines} className={className}>
          {/* Dotdotdot seems to trip on long, unbroken strings. As a fail-safe, we're limiting
              the input string to a number of characters that is greater than the characters that
              will be shown, but not so long that it will cause issues with Dotdotdot.*/}
          <RenderedNewlines
            text={text.substring(0, estCharsPerLine * (lines + 2))}
          />
        </Dotdotdot>
      )}
      {showExpansionControls ? (
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
