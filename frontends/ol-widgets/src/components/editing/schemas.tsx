import * as Yup from "yup"
import { WidgetTypes } from "../../interfaces"
import isURL from "validator/lib/isURL"

const title = Yup.string().required("Title is required")

const richTextSchema = Yup.object().shape({
  title
})

const embeddedUrlSchema = Yup.object().shape({
  title,
  configuration: Yup.object().shape({
    url: Yup.string()
      .required("Url is required")
      // Yup's built-in URL validation requires a protocol, so is stricter than we want.
      .test("isUrl", "The provided URL is invalid.", value =>
        isURL(String(value))
      ),
    custom_html: Yup.string()
      .nullable()
      .oneOf([null], "custom_html is not allowed.")
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
