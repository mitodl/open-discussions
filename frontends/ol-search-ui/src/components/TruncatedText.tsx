import React, { useState, useRef, useLayoutEffect, useReducer } from "react"

import Dotdotdot from "react-dotdotdot"

type TruncatedTextProps = {
  component?: React.ElementType & string
  text: string
  lines: number
  // Estimated maximum number of characters on a single line of text for the element where this
  // text will be rendered. Doesn't have to be exact.
  estCharsPerLine: number
  className?: string
  showExpansionControls: boolean
}

interface DotDotDotElementWithContainer extends Dotdotdot {
  container: MinimalDotDotDotContainerProps
}

type MinimalDotDotDotContainerProps = {
  scrollHeight: number
  offsetHeight: number
}

type RenderedNewlinesProps = {
  text: string
}

const RenderedNewlines = React.memo<RenderedNewlinesProps>(({ text }) => (
  <React.Fragment>
    {text.split(/\n/g).map((item, key) => (
      <React.Fragment key={key}>
        {key === 0 ? null : <br />}
        {item}
      </React.Fragment>
    ))}
  </React.Fragment>
))

export default function TruncatedText(props: TruncatedTextProps) {
  const {
    component: Component = "p",
    text,
    lines,
    estCharsPerLine,
    className,
    showExpansionControls
  } = props
  const [expanded, setExpanded] = useState(false)
  const [hasOverflow, setHasOverflow] = useState(false)
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)
  const [currentText, setCurrentText] = useState(text)
  const dotRef = useRef<DotDotDotElementWithContainer>(null)

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
        forceUpdate()
      }

      if (container.scrollHeight > container.offsetHeight) {
        // scrollHeight is the height of the rendered text, while offsetHeight
        // is the height of the portion which is shown
        setHasOverflow(true)
      }
    }
  }, [text, currentText, setCurrentText])

  return (
    <React.Fragment>
      {expanded ? (
        <Component>
          <RenderedNewlines text={text} />
        </Component>
      ) : (
        <Dotdotdot
          tagName={Component}
          as=""
          clamp={lines}
          ref={dotRef}
          className={className}
        >
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
