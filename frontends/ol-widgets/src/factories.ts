import {  faker } from "@faker-js/faker"
import type { Factory } from "ol-util"
import type { WidgetInstance, MarkdownWidgetInstance } from "./interfaces"
import { WidgetTypes } from "./interfaces"

const makeMarkdownWidget: Factory<MarkdownWidgetInstance> = overrides => ({
  id:            faker.datatype.number(),
  title:         faker.lorem.sentence(3),
  widget_type:   WidgetTypes.Markdown,
  configuration: {
    source: faker.lorem.paragraph()
  },
  ...overrides
})

const widgetMakers = {
  [WidgetTypes.Markdown]: makeMarkdownWidget
}

const makeWidget = (type?: WidgetTypes): WidgetInstance => {
  const maker = widgetMakers[type ?? faker.helpers.arrayElement(Object.values(WidgetTypes))]
  return maker()
}

export { makeWidget, makeMarkdownWidget }
