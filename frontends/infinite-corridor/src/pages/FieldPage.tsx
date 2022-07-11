import React from "react"
import { useParams } from "react-router"

type RouteParams = {
  name: string
}

const FieldPage: React.FC = () => {
  const { name } = useParams<RouteParams>()
  
  return (
    <div>
      Welcome to the field page for: <code>{name}</code>
    </div>
  )
}

export default FieldPage