'use client'

import { createClient } from '@/lib/supabase/client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useRouter } from 'next/navigation'
import { Session } from '@supabase/supabase-js'

export default function Login() {
  const supabase = createClient()
  const router = useRouter()

  supabase.auth.onAuthStateChange((event: string, session: Session | null) => {
    if (event === 'SIGNED_IN') {
      router.push('/')
    }
  })

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ width: '380px' }}>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="dark"
          providers={[]}
          redirectTo="/"
        />
      </div>
    </div>
  )
} 