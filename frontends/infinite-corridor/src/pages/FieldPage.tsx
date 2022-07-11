import React from "react"
import { useParams } from "react-router"

type RouteParams = {
  name: string
}

const FieldPage: React.FC = () => {
  const { name } = useParams<RouteParams>()

  return (
    <div>
      <h2>{name}</h2>
      Welcome to the field page for: <code>{name}</code>!
    </div>
  )
}

export default FieldPage
