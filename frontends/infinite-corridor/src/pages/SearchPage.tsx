import React from "react"
import { useSearchParams } from "ol-util"

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  return (
    <div className="page-content">
      Search params: <code>{searchParams.toString()}</code>
    </div>
  )
}

export default SearchPage
