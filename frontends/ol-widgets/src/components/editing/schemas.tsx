import * as Yup from "yup"
import { WidgetTypes } from "../../interfaces"

const title = Yup.string().required("Title is required")

const richTextSchema = Yup.object().shape({
  title
})

const embeddedUrlSchema = Yup.object().shape({
  title,
  configuration: Yup.object().shape({
    url: Yup.string().required("Url is required")
  })
})

const getWidgetSchema = (widgetType: string) => {
  if (widgetType === WidgetTypes.RichText) {
    return richTextSchema
  }
  if (widgetType === WidgetTypes.EmbeddedUrl) {
    return embeddedUrlSchema
  }
  throw new Error("Unrecognized widget type")
}

export { getWidgetSchema }
