import _ from "lodash"

export function mockTextWidget(position) {
  return {
    id:            position,
    position:      position,
    configuration: { body: `example-body-${position}` },
    widgetProps:   {
      html:           `<p>example${position}</p>`,
      position:       position,
      react_renderer: null,
      title:          `example${position}`
    }
  }
}

export function mockWidgetInstances(numWidgets) {
  return _.range(numWidgets).map(i => mockTextWidget(i))
}

export function mockFetchData(data) {
  return async () => {
    return await new Promise(resolve => {
      resolve(data)
    })
  }
}
