import { ValidationError } from "ol-forms"
import React from "react"
import styled from "styled-components"
import SearchInput from "./SearchInput"
import type { SearchInputProps } from "./SearchInput"

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

type SearchboxProps = Omit<SearchInputProps, "className"> & {
  validation?: string | null
  children?: React.ReactNode
  /**
   * Classname applied to the content div surrounding containing input and children.
   */
  className?: string
  /**
   * Classname applied to the search input
   */
  classNameInput?: string
}

/**
 * A container holding SearchInput; accepts children and a validation message.
 */
const Searchbox = (props: SearchboxProps): JSX.Element => {
  const {
    validation,
    children,
    className,
    classNameInput,
    ...searchInputProps
  } = props

  return (
    <SearchboxContainer>
      <SearchboxContents className={className}>
        <SearchInput className={classNameInput} {...searchInputProps} />
        {children}
      </SearchboxContents>
      {<ValidationError message={validation} />}
    </SearchboxContainer>
  )
}

export default Searchbox
export type { SearchboxProps }
