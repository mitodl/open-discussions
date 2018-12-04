import _ from "lodash"

function apiPath(name, pk) {
  /**
   * constructs an api path based on the view name and the list and widget ids
   */
  const apiBase = "/api/v1"
  switch (name) {
  case "get_lists":
    return `${apiBase}/list/`

  case "get_configurations":
    return `${apiBase}/list/get_configurations/`

  case "widget_list":
    return `${apiBase}/list/${pk ? `${pk}/` : ""}`

  case "widget":
    return `${apiBase}/widget/${pk ? `${pk}/` : ""}`
  }
}

// TODO: split into two functions

function makeOptionsFromList(values) {
  /**
   * constructs an options object from a list of values
   */
  return _.range(values.length).map(index => ({
    key:   values[index],
    label: values[index],
    value: values[index]
  }))
}

function makeOptionsFromObject(options) {
  /**
   * constructs an options object from an object of key, value mappings where the keys are the value and the value
   * is the key and label
   */
  const keys = Object.keys(options)
  return _.range(keys.length).map(index => ({
    key:   options[keys[index]],
    label: options[keys[index]],
    value: keys[index]
  }))
}

export { makeOptionsFromList, makeOptionsFromObject, apiPath }
