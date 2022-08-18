import * as React from "react"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import Button from "@mui/material/Button"
import { Formik, Form, Field, ErrorMessage } from "formik"
import type { WidgetInstance, WidgetSpec } from "../../interfaces"
import { getWidgetFieldComponent } from "./getWidgetFieldComponent"
import { useMemo } from "react"
import { getWidgetSchema } from "./schemas"

interface MuiEditWidgetDialogProps {
  widget: WidgetInstance
  spec: WidgetSpec
  isOpen: boolean
  onClose: () => void
  onSubmit: (widget: WidgetInstance) => void
  className?: string
  errorClassName?: string
  fieldClassName?: string
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
  onClose,
  className,
  fieldClassName,
  errorClassName
}) => {
  const validationSchema = useMemo(
    () => getWidgetSchema(widget.widget_type),
    [widget.widget_type]
  )
  return (
    <Dialog className={className} open={isOpen} onClose={onClose}>
      <DialogTitle>Edit Widget</DialogTitle>
      <Formik
        initialValues={widget as WidgetInstance<Record<string, unknown>>}
        validationSchema={validationSchema}
        validateOnChange={false}
        onSubmit={onSubmit}
      >
        {({ handleSubmit, values }) => (
          <Form onSubmit={handleSubmit}>
            <DialogContent>
              <label htmlFor="title">Title</label>
              <Field
                className={fieldClassName}
                name="title"
                type="text"
                value={values.title}
              />
              <ErrorMessage
                className={errorClassName}
                component="div"
                name="title"
              />
              {spec.form_spec.map(fieldSpec => {
                const fieldName = fieldSpec.field_name
                // Formik uses dot notation for nested objects as name attrs
                // https://formik.org/docs/guides/arrays#nested-objects
                const attrName = `configuration.${fieldName}`
                return (
                  <React.Fragment key={fieldName}>
                    <label htmlFor={attrName}>{fieldSpec.label}</label>
                    <Field
                      className={fieldClassName}
                      as={getWidgetFieldComponent(fieldSpec)}
                      name={attrName}
                      value={values.configuration[fieldSpec.field_name]}
                    />
                    <ErrorMessage
                      className={errorClassName}
                      component="div"
                      name={attrName}
                    />
                  </React.Fragment>
                )
              })}
            </DialogContent>
            <DialogActions>
              <Button type="submit" variant="outlined">
                Cancel
              </Button>
              <Button type="submit" variant="contained">
                Submit
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  )
}

export default MuiEditWidgetDialog
export type { MuiEditWidgetDialogProps }
