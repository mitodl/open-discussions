import React from "react"
import styled from "styled-components"

type Props = {
  message?: string | null
  className?: string
}

const ValidationDiv = styled.div`
  background-color: var(--validation-bg);
  color: var(--validation-text);
  font-size: 14px;
  padding: 5px;
`

/**
 * Displays a styled validation message for use with forms.
 * Font color and background color are controlled by css variables
 * ```css
 *  --validation-bg
 *  --validation-text
 * ```
 * respectively.
 */
const ValidationError = ({ message, className }: Props): JSX.Element | null => {
  if (!message) return null
  return (
    <ValidationDiv role="alert" className={className}>
      {message}
    </ValidationDiv>
  )
}

export default ValidationError
