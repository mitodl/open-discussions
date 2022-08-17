import { faker } from "@faker-js/faker"
import type { Factory } from "ol-util"
import type {
  WidgetInstance,
  RichTextWidgetInstance,
  WidgetListResponse
} from "./interfaces"
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

const makeWidgetListResponse: Factory<
  WidgetListResponse,
  { count?: number }
> = (overrides, options = {}) => {
  const count = options.count ?? faker.datatype.number({ min: 2, max: 4 })
  return {
    id:                faker.datatype.number(),
    available_widgets: [],
    widgets:           Array(count)
      .fill(null)
      .map(() => makeWidget()),
    ...overrides
  }
}

const makeWidget = (type?: WidgetTypes): WidgetInstance => {
  const maker =
    widgetMakers[type ?? faker.helpers.arrayElement(Object.values(WidgetTypes))]
  return maker()
}

export { makeWidget, makeRichTextWidget, makeWidgetListResponse }
