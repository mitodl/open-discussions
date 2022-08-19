import * as Yup from "yup"
import { WidgetTypes } from "../../interfaces"

const title = Yup.string().required("Title is required")

const richTextSchema = Yup.object().shape({
  title
})

const getWidgetSchema = (widgetType: string) => {
  if (widgetType === WidgetTypes.RichText) {
    return richTextSchema
  }
  throw new Error("Unrecognized widget type")
}

export { getWidgetSchema }
