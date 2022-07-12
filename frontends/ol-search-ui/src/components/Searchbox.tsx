import { ValidationError } from "ol-forms"
import React, { useCallback, useState } from "react"
import styled, { css } from "styled-components"

const SearchboxContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  height: 252px;
  ${(props) => props.theme.media.phone} {
    height: 115px;
  }

  padding: 0 20px;
`

const SearchboxContents = styled.div`
  max-width: 500px;
  width: 100%;
`

/**
 * Wrapper for input to help absolute positioning of icon buttons.
 */
const InputWrapper = styled.div`
  position: relative;
`

const SearchInput = styled.input`
  && {
    /**
    The relative font size within this component should not be configurable
    from the outside. I.e., the ratio of icon to input text should always be the
    same.

    To facilitate this, explicitly set the font size as 1em ("use parent font size")
    with high specificity.

    The overall font size can be controlled by setting font-size on SearchboxContents,
    e.g., by passing a class to Searchbox.
    */
    font-size: 1em;
    padding-left: 2.5em;
    padding-right: 2.5em;
    /* Box sizes should include the padding used to accomodate
    the icons. */
    box-sizing: border-box;
  }
`

const PositionedButton = styled.button<{ rightAlign?: boolean }>`
  && {
    font-size: 1em;
    background-color: rgba(0, 0, 0, 0);
    color: ${({ theme }) => theme.color.fontGreyMid};
    padding: 0px;
    margin: 0px;
    border: none;
  }
  display: inline-flex;
  align-items: center;
  /* centered vertically */
  position: absolute;
  top: 50%;
  transform: translateY(-50%);

  ${({ rightAlign }) =>
    rightAlign &&
    css`
      right: 0.5em;
    `}
  ${({ rightAlign }) =>
    !rightAlign &&
    css`
      left: 0.5em;
      width: 2.5em;
    `}
`

const SearchboxIcon = styled.i<{ verticalEmOffset?: number }>`
  font-size: 1.65em;
  ${({ verticalEmOffset }) =>
    verticalEmOffset &&
    css`
      transform: translateY(${verticalEmOffset}em);
    `}
`

interface SearchSubmissionEvent {
  target: {
    value: string
  }
  /**
   * Deprecated. course-search-utils calls unnecessarily.
   */
  preventDefault: () => void
}
type SearchSubmitHandler = (event: SearchSubmissionEvent) => void

type SearchboxCommon = {
  onSubmit: SearchSubmitHandler
  validation?: string | null
  autoFocus?: boolean
  children?: React.ReactNode
  /**
   * Classname applied to the content div surrounding containing input and children.
   */
  className?: string
}

export type SearchboxUncontrolled = {
  onChange?: undefined
  onClear?: undefined
  value?: undefined
} & SearchboxCommon
export type SearchboxControlled = {
  onChange: React.ChangeEventHandler
  onClear: React.MouseEventHandler
  value: string
} & SearchboxCommon
export type SearchboxProps = SearchboxUncontrolled | SearchboxControlled

/**
 * Renders a searchbox with Search and Clear icons, and optional child content.
 * Can be used as a controlled or uncontrolled input.
 */
const Searchbox = (props: SearchboxProps): JSX.Element => {
  const { children, onSubmit, validation, value } = props

  const [text, setText] = useState("")

  /**
   * Delegates to props.onChange if provided, otherwise syncs the internal state.
   */
  const onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (props.onChange) {
        props.onChange(e)
      } else {
        const { value } = e.target
        setText(value)
      }
    },
    [props.onChange]
  )

  const onClear: React.MouseEventHandler = useCallback(
    (e) => {
      if (props.onClear) {
        props.onClear(e)
      } else {
        setText("")
      }
    },
    [props.onClear]
  )

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (e.key !== "Enter") return
      const target = e.target as HTMLInputElement // why is this necessary?
      onSubmit({
        target: { value: target.value },
        preventDefault: () => {
          /** fake */
        },
      })
    },
    [onSubmit]
  )
  const onClickSubmit = useCallback(() => {
    const targetValue = props.onChange ? props.value : text
    onSubmit({
      target: { value: targetValue },
      preventDefault: () => {
        /** fake */
      },
    })
  }, [text, props.onChange, props.value])

  return (
    <SearchboxContainer>
      <SearchboxContents className={props.className}>
        <InputWrapper>
          <SearchInput
            type="text"
            aria-label="Search for"
            name="query"
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="Search Learning Offerings"
            value={value ?? text}
          />
          <PositionedButton onClick={onClickSubmit}>
            <SearchboxIcon
              verticalEmOffset={
                0.1 /** So the circle of search magnifying class is baseline-aligned */
              }
              className="material-icons"
            >
              search
            </SearchboxIcon>
          </PositionedButton>
          {(value || text) && (
            <PositionedButton onClick={onClear} rightAlign>
              <SearchboxIcon className="material-icons clear-icon">
                clear
              </SearchboxIcon>
            </PositionedButton>
          )}
        </InputWrapper>
        {children}
      </SearchboxContents>
      {<ValidationError message={validation} />}
    </SearchboxContainer>
  )
}

export default Searchbox