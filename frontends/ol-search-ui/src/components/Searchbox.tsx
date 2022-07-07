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

const InputWrapper = styled.div`
  position: relative;
  height: 55px;
  max-width: 500px;
  width: 100%;
`

const SearchInput = styled.input`
  &&& {
    height: 100%;
    padding-left: 50px;
    font-size: 20px;
    border-radius: 7px;
    border: none;
  }
`

const PositionedButton = styled.button<{ rightAlign?: boolean }>`
  && {
    background-color: rgba(0, 0, 0, 0);
    color: ${({ theme }) => theme.color.fontGreyMid};
    padding: 0px;
    margin: 0px;
    display: inline-flex;
    align-items: center;
  }
  /* centered vertically */
  position: absolute;
  top: 50%;
  transform: translateY(-50%);

  ${({ rightAlign }) =>
    rightAlign &&
    css`
      right: 10px;
    `}
  ${({ rightAlign }) =>
    !rightAlign &&
    css`
      left: 10px;
      width: 50px;
    `}
`

const SearchboxIcon = styled.i<{ verticalOffset?: number }>`
  font-size: 33px;
  ${({ verticalOffset }) =>
    verticalOffset &&
    css`
      transform: translateY(${verticalOffset}px);
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
          <SearchboxIcon verticalOffset={2} className="material-icons">
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
        {children}
      </InputWrapper>
      {<ValidationError message={validation} />}
    </SearchboxContainer>
  )
}

export default Searchbox
