import { createClient } from './client'

export const supabase = createClient()

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    console.error('Erro ao obter usuário:', error)
    return null
  }
  return user
}

export const handleSupabaseError = (error: any, operation: string) => {
  console.error(`Erro na operação ${operation}:`, error)
  throw new Error(`Falha na operação ${operation}: ${error.message}`)
} 