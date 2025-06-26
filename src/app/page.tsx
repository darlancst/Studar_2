import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HomeClient from './HomeClient';

export default async function Home() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return <HomeClient />;
} 