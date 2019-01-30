// @flow
import React from "react"
import { validationMessage } from "../lib/validation"

type Props = {
  onChange: Function,
  onClear: Function,
  onSubmit: Function,
  value: string,
  validation: ?string
}

export default class SearchTextbox extends React.Component<Props> {
  input: { current: null | React$ElementRef<typeof HTMLInputElement> }

  constructor(props: Props) {
    super(props)
    this.input = React.createRef()
  }

  focus() {
    if (this.input.current) {
      this.input.current.focus()
    }
  }

  componentDidMount() {
    this.focus()
  }

  componentDidUpdate(prevProps: Props) {
    // Focus again if input has been cleared
    const { value } = this.props
    if (!value && prevProps && prevProps.value !== value) {
      this.focus()
    }
  }

  render() {
    const {
      onSubmit,
      onClear,
      onChange,
      value,
      validation,
      ...extraProps
    } = this.props
    return (
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
          ref={this.input}
          type="text"
          name="query"
          className="underlined"
          value={value}
          onChange={onChange}
          onKeyDown={event => (event.key === "Enter" ? onSubmit(event) : null)}
          {...extraProps}
        />
        {validationMessage(validation)}
      </div>
    )
  }
}
