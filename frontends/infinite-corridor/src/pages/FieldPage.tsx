import React from "react"
import { useParams } from "react-router"
import { Card } from "ol-util"

type RouteParams = {
  name: string
}

const FieldPage: React.FC = () => {
  const { name } = useParams<RouteParams>()

  return (
    <Card>
      <h2>{name}</h2>
      Welcome to the field page for: <code>{name}</code>!
    </Card>
  )
}

export default FieldPage
