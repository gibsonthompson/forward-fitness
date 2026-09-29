import React from 'react'
import ReactDOM from 'react-dom/client'

const preview = import.meta.env.DEV && new URLSearchParams(location.search).has('design-preview');
const configured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
const root = ReactDOM.createRoot(document.getElementById('root'));
if (preview) {
  import('./DesignPreview').then(({default: Preview}) => root.render(<React.StrictMode><Preview /></React.StrictMode>));
} else if (!configured) {
  root.render(<main style={{fontFamily:'system-ui',maxWidth:480,margin:'80px auto',padding:24}}><h1>Connect Forward Fitness</h1><p>This build needs its Supabase project configuration before you can sign in.</p>{import.meta.env.DEV && <p>Copy .env.example to .env.local, fill in the project’s public credentials, and restart the development server. <a href="?design-preview">Preview the new design</a></p>}</main>);
} else {
  import('./App').then(({default: App}) => root.render(<React.StrictMode><App /></React.StrictMode>));
}
