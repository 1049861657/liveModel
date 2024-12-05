import React, { Suspense } from 'react'
import Scene from './components/Scene'

function App() {
  return (
    <div className="App">
      <Suspense fallback={<div>Loading...</div>}>
        <Scene />
      </Suspense>
    </div>
  )
}

export default App