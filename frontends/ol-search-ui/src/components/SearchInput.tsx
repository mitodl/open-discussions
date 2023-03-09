import React, { useCallback, useMemo } from "react"

import SearchIcon from "@mui/icons-material/Search"
import ClearIcon from "@mui/icons-material/Clear"
import OutlinedInput from "@mui/material/OutlinedInput"
import InputAdornment from "@mui/material/InputAdornment"
import IconButton from "@mui/material/IconButton"
import Button from "@mui/material/Button"

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

interface SearchInputProps {
  className?: string
  classNameClear?: string
  classNameSearch?: string
  value: string
  placeholder?: string
  autoFocus?: boolean
  onChange: React.ChangeEventHandler<HTMLInputElement>
  onClear: React.MouseEventHandler
  onSubmit: SearchSubmitHandler
}

const searchIconAdjustments = {
  fontSize:  "300%",
  /**
   * We want the icon to have its circle a bit closer to the baseline, which
   * this accounts for.
   */
  transform: "translateY(+5%)",
  color:     "white"
}

const searchButtonAdormentAdjustments = {
  alignSelf:   "stretch",
  maxHeight:   "initial",
  height:      "initial",
  marginRight: "-13px"
}

const SearchInput: React.FC<SearchInputProps> = props => {
  const { onSubmit, value } = props
  const handleSubmit = useCallback(() => {
    const event = {
      target:         { value },
      preventDefault: () => null
    }
    onSubmit(event)
  }, [onSubmit, value])
  const onInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> =
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
      }
      endAdornment={
        <InputAdornment
          position="end"
          sx={searchButtonAdormentAdjustments}
          color="secondary"
        >
          <Button
            aria-label="Search"
            className={props.classNameSearch}
            onClick={handleSubmit}
            color="secondary"
            variant="contained"
            disableElevation
          >
            <SearchIcon sx={searchIconAdjustments} color="secondary" />
          </Button>
        </InputAdornment>
      }
    />
  )
}

export default SearchInput
export type { SearchInputProps }
