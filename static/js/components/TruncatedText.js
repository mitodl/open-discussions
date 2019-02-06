import React from "react"

import Dotdotdot from "react-dotdotdot"

type Props = {
  text: string,
  lines: number,
  // Estimated maximum number of characters on a single line of text for the element where this
  // text will be rendered. Doesn't have to be exact.
  estCharsPerLine: number,
  className: ?string
}

const TruncatedText = ({ text, lines, estCharsPerLine, className }: Props) => {
  return (
    <Dotdotdot clamp={lines} className={className}>
      {// Dotdotdot seems to trip on long, unbroken strings. As a fail-safe, we're limiting
      // the input string to a number of characters that is greater than the characters that
      // will be shown, but not so long that it will cause issues with Dotdotdot.
        text.substring(0, estCharsPerLine * (lines + 2))}
    </Dotdotdot>
  )
}

export default TruncatedText
