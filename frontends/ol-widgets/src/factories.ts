import {  faker } from "@faker-js/faker"
import type { Factory } from "ol-util"
import type { WidgetInstance, RichTextWidgetInstance } from "./interfaces"
import { WidgetTypes } from "./interfaces"

const makeRichTextWidget: Factory<RichTextWidgetInstance> = overrides => ({
  id:            faker.datatype.number(),
  title:         faker.lorem.sentence(3),
  widget_type:   WidgetTypes.RichText,
  configuration: {
    source: faker.lorem.paragraph()
  },
  ...overrides
})

const widgetMakers = {
  [WidgetTypes.RichText]: makeRichTextWidget
}

const makeWidget = (type?: WidgetTypes): WidgetInstance => {
  const maker = widgetMakers[type ?? faker.helpers.arrayElement(Object.values(WidgetTypes))]
  return maker()
}

export { makeWidget, makeRichTextWidget }
