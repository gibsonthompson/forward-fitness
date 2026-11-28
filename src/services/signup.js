// Account creation through the ff-signup edge function. It creates the account already
// confirmed, so signup works while "Confirm email" stays on for other apps in the project.
const URL_BASE = import.meta.env.VITE_SUPABASE_URL
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Create an account. Resolves on success; throws an Error with a user-facing message. */
export async function createAccount(username, password) {
  let res
  try {
    res = await fetch(URL_BASE + '/functions/v1/ff-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + ANON },
      body: JSON.stringify({ username, password }),
    })
  } catch (e) {
    throw new Error('No connection. Check your internet and try again.')
  }
  let body = {}
  try { body = await res.json() } catch (e) { /* non-JSON error */ }
  if (res.ok) return true
  if (res.status === 409) throw new Error('That username is taken')
  throw new Error(body.error || 'Something went wrong. Please try again.')
}
