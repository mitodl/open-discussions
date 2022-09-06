import { faker } from "@faker-js/faker"
import { Factory } from "ol-util/build/factories"
import type {
  WidgetInstance,
  RichTextWidgetInstance,
  WidgetListResponse,
  WidgetSpec,
  WidgetFieldSpec
} from "./interfaces"
import { WidgetTypes } from "./interfaces"
import { WIDGET_FIELD_TYPES } from "./constants"

const WIDGET_FIELD_TYPE_VALUES = Object.values(WIDGET_FIELD_TYPES)

const makeWidgetFieldSpec: Factory<WidgetFieldSpec> = overrides => {
  const props: Record<string, unknown> = {}
  const theDefault = ""
  const {
    input_type: inputType = faker.helpers.arrayElement(WIDGET_FIELD_TYPE_VALUES)
  } = overrides ?? {}
  if (!WIDGET_FIELD_TYPE_VALUES.includes(inputType)) {
    throw new Error(`Unsupported input type: ${inputType}.`)
  }
  if (inputType === WIDGET_FIELD_TYPES.markdown) {
    props.placeholder = faker.lorem.paragraph()
  }
  return {
    field_name: faker.lorem.word(),
    label:      faker.lorem.words(),
    under_text: faker.helpers.maybe(faker.lorem.sentence),
    default:    theDefault,
    input_type: inputType,
    props,
    ...overrides
  }
}

const makeRichTextWidgetSpec: Factory<WidgetSpec> = overrides => {
  return {
    description: faker.lorem.words(),
    widget_type: WidgetTypes.RichText,
    form_spec:   [
      makeWidgetFieldSpec({
        field_name: "source",
        input_type: WIDGET_FIELD_TYPES.markdown
      })
    ],
    ...overrides
  }
}

const widgetSpecMakers = {
  [WidgetTypes.RichText]: makeRichTextWidgetSpec
}

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
  const specMakers = Object.values(widgetSpecMakers)
  return {
    id:                faker.datatype.number(),
    available_widgets: specMakers.map(f => f()),
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

const makeWidgetSpec = (type?: WidgetTypes): WidgetSpec => {
  const maker =
    widgetSpecMakers[
      type ?? faker.helpers.arrayElement(Object.values(WidgetTypes))
    ]
  return maker()
}

export {
  makeWidget,
  makeWidgetSpec,
  makeRichTextWidgetSpec,
  makeRichTextWidget,
  makeWidgetListResponse
}
