import React, { useCallback, useMemo } from "react"

import SearchIcon from "@mui/icons-material/Search"
import EastIcon from "@mui/icons-material/East"
import ClearIcon from "@mui/icons-material/Clear"
import OutlinedInput from "@mui/material/OutlinedInput"
import InputAdornment from "@mui/material/InputAdornment"
import IconButton from "@mui/material/IconButton"

type SearchSubmissionEvent = {
  target: {
    value: string
  },
  /**
   * Deprecated. course-search-utils calls unnecessarily.
   */
  preventDefault: () => void
}

type SearchSubmitHandler = (event: SearchSubmissionEvent) => void

type SearchInputProps = {
  className?: string,
  classNameClear?: string,
  classNameSubmit?: string,
  classNameSearch?: string,
  value: string,
  placeholder?: string,
  autoFocus?: boolean,
  onChange: Function,
  onClear: Function,
  onSubmit: SearchSubmitHandler
}

const searchIconAdjustments = {
  fontSize:  "150%",
  /**
   * We want the icon to have its circle a bit closer to the baseline, which
   * this accounts for.
   */
  transform: "translateY(+5%)"
}

const SearchInput = (props: SearchInputProps) => {
  const { onSubmit, value } = props
  const handleSubmit = useCallback(() => {
    const event = {
      target:         { value },
      preventDefault: () => null
    }
    onSubmit(event)
  }, [onSubmit, value])
  const onInputKeyDown =
    useCallback(
      e => {
        if (e.key !== "Enter") return
        handleSubmit()
      },
      [handleSubmit]
    )
  const muiInputProps = useMemo(() => ({ "aria-label": "Search for" }), [])
  return (
    <OutlinedInput
      inputProps={muiInputProps}
      autoFocus={props.autoFocus}
      className={props.className}
      placeholder={props.placeholder}
      value={props.value}
      onChange={props.onChange}
      onKeyDown={onInputKeyDown}
      startAdornment={
        <InputAdornment position="start">
          <IconButton
            aria-label="Search"
            className={props.classNameSearch}
            onClick={handleSubmit}
          >
            <SearchIcon sx={searchIconAdjustments} />
          </IconButton>
        </InputAdornment>
      }
      endAdornment={
        <>
          <InputAdornment position="end">
            {props.value && (
              <IconButton
                className={props.classNameClear}
                aria-label="Clear"
                onClick={props.onClear}
              >
                <ClearIcon />
              </IconButton>
            )}
          </InputAdornment>
          <InputAdornment position="end">
            <IconButton
              aria-label="Search"
              className={props.classNameSubmit}
              onClick={handleSubmit}
            >
              <EastIcon />
            </IconButton>
          </InputAdornment>
        </>
      }
    />
  )
}

export default SearchInput
export type { SearchInputProps }
