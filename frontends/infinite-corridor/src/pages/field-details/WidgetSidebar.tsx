import React from "react"

interface WidgetsSidebarProps {
  isEditing: boolean
}

const WidgetList: React.FC<WidgetsSidebarProps> = ({ isEditing }) => {
  return <div>
    Widgets!
    Editing: {String(isEditing)}
  </div>
}

export default WidgetList
