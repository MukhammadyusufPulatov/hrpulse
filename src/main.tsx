import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { useLang } from './lib/i18n'
import './index.css'

/** Til almashganda butun interfeys qayta chiziladi */
function Root() {
  const lang = useLang()
  return <App key={lang} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Root />
    </HashRouter>
  </StrictMode>,
)
