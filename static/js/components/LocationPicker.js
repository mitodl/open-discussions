// @flow
/* global SETTINGS: false */
import React from "react"
import Places from "places.js"

type Props = {
  placeholder?: string,
  onChange: Function,
  onClear: Function,
  options: Object,
  initialLocation: ?string
}

export default class LocationPicker extends React.Component<Props> {
  autocomplete: Object
  autocompleteElem: ?Object

  static defaultProps = {
    placeholder:     "Location (city)",
    initialLocation: "",
    options:         {
      type:     "city",
      language: "en"
    }
  }

  componentDidMount() {
    const { onChange, onClear, options } = this.props
    this.autocomplete = Places({
      appId:     SETTINGS.algolia_appId,
      apiKey:    SETTINGS.algolia_apiKey,
      ...options,
      container: this.autocompleteElem
    })

    this.autocomplete.on("change", onChange)
    this.autocomplete.on("clear", onClear)
  }

  shouldComponentUpdate() {
    return false
  }

  componentWillUnmount() {
    this.autocomplete.removeAllListeners("change")
    this.autocomplete.removeAllListeners("clear")
  }

  updateJSON = (e: Object) => {
    const { onChange } = this.props
    onChange({
      suggestion: {
        value: e.target.value
      }
    })
  }

  render() {
    const { placeholder, initialLocation } = this.props

    return (
      <div>
        <input
          type="text"
          placeholder={placeholder}
          defaultValue={initialLocation}
          ref={ref => {
            this.autocompleteElem = ref
          }}
          onChange={this.updateJSON}
        />
      </div>
    )
  }
}
