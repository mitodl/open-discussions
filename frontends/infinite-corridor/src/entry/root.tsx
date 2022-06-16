import React from 'react'
import { createRoot } from 'react-dom/client'

const container = document.getElementById('container')!
const root = createRoot(container)

const App = () => {
  return (
    <div>
      <p>Hello, World. Neato!</p>
      <p>Back to <a href="/">open discussions</a></p>
    </div>
  )
}

root.render(<App />)
