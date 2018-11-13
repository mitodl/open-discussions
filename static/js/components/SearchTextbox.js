// @flow
import React from "react"

type Props = {
  onChange: Function,
  onClear: Function,
  onSubmit: Function,
  value: string
}

const SearchTextbox = ({ onChange, onClear, onSubmit, value }: Props) => (
  <div className="search-textbox">
    <i className="material-icons search-icon" onClick={onSubmit}>
      search
    </i>
    {value ? (
      <i className="material-icons clear-icon" onClick={onClear}>
        clear
      </i>
    ) : null}
    <input
      type="text"
      className="underlined"
      value={value}
      onChange={onChange}
      onKeyDown={event => (event.key === "Enter" ? onSubmit(event) : null)}
    />
  </div>
)

export default SearchTextbox
