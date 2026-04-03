// Konfigurasi Supabase
// Ganti dengan kredensial Supabase Anda dari https://supabase.com
import { createClient } from 'https://gweivijtroaxsquotlae.supabase.co'

// TODO: Ganti dengan URL dan anon key dari project Supabase Anda
const supabaseUrl = 'https://gweivijtroaxsquotlae.supabase.co'
const supabaseAnonKey = 'gweivijtroaxsquotlae'

// Inisialisasi Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions untuk autentikasi
export async function signUp(email, password, name) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name
            }
        }
    })
    return { data, error }
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    })
    return { data, error }
}

export async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin
        }
    })
    return { data, error }
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
}

export async function getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
}

// Helper functions untuk transaksi
export async function getTransactions(userId) {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('tanggal', { ascending: false })
    
    return { data, error }
}

export async function addTransaction(transaction) {
    const { data, error } = await supabase
        .from('transactions')
        .insert([transaction])
        .select()
    
    return { data, error }
}

export async function deleteTransaction(id) {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
    
    return { error }
}

export async function updateTransaction(id, updates) {
    const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
    
    return { data, error }
}

// Real-time subscription
export function subscribeToTransactions(userId, callback) {
    const subscription = supabase
        .channel('transactions-channel')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'transactions',
                filter: `user_id=eq.${userId}`
            },
            (payload) => {
                console.log('Change received!', payload)
                callback(payload)
            }
        )
        .subscribe()
    
    return subscription
}

// Fungsi untuk unsubscribe
export function unsubscribeFromTransactions(subscription) {
    supabase.removeChannel(subscription)
}