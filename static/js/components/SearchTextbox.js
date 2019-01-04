// @flow
import React from "react"

type Props = {
  onChange: Function,
  onClear: Function,
  onSubmit: Function,
  value: string
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

  componentDidUpdate() {
    this.focus()
  }

  render() {
    const { onSubmit, onClear, onChange, value } = this.props
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
          className="underlined"
          value={value}
          onChange={onChange}
          onKeyDown={event => (event.key === "Enter" ? onSubmit(event) : null)}
        />
      </div>
    )
  }
}
