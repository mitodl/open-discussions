import * as React from "react"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import { Formik, Form, Field } from "formik"
import type { WidgetInstance, WidgetSpec } from "../../interfaces"
import { getWidgetFieldComponent } from "./getWidgetFieldComponent"
import { useMemo } from "react"
import { getWidgetSchema } from "./schemas"

interface MuiEditWidgetDialogProps {
  widget: WidgetInstance
  spec: WidgetSpec
  isOpen: boolean
  onClose: () => void
  className?: string
  onSubmit: (widget: WidgetInstance) => void
}

/**
 * A dialog for editing the widget. If you need to style it, pass a classname
 * and use normal MUI classes.
 */
const MuiEditWidgetDialog: React.FC<MuiEditWidgetDialogProps> = ({
  widget,
  spec,
  onSubmit,
  isOpen,
  onClose
}) => {
  const validationSchema = useMemo(
    () => getWidgetSchema(widget.widget_type),
    [widget.widget_type]
  )
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Edit Widget</DialogTitle>
      <Formik
        initialValues={widget as WidgetInstance<Record<string, unknown>>}
        validationSchema={validationSchema}
        validateOnChange={false}
        onSubmit={onSubmit}
      >
        {({ handleSubmit, values, errors }) => (
          <Form onSubmit={handleSubmit}>
            <DialogContent>
              <label htmlFor="title">Title</label>
              <Field
                className="form-field"
                name="title"
                type="text"
                value={values.title}
              />
              {errors.title ? (
                <div className="validation-message">{errors.title}</div>
              ) : null}
              {spec.form_spec.map(fieldSpec => {
                const fieldName = fieldSpec.field_name
                // Formik uses dot notation for nested objects as name attrs
                // https://formik.org/docs/guides/arrays#nested-objects
                const attrName = `configuration.${fieldName}`
                return (
                  <React.Fragment key={fieldName}>
                    <label htmlFor={attrName}>{fieldSpec.label}</label>
                    <Field
                      className="form-field"
                      as={getWidgetFieldComponent(fieldSpec)}
                      name={attrName}
                      value={values.configuration[fieldSpec.field_name]}
                    />
                    {errors?.configuration?.[fieldName] ? (
                      <div className="validation-message">
                        {errors.configuration[fieldName]}
                      </div>
                    ) : null}
                  </React.Fragment>
                )
              })}
            </DialogContent>
            <DialogActions>
              <button type="submit">Submit</button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  )
}

export default MuiEditWidgetDialog
export type { MuiEditWidgetDialogProps }
