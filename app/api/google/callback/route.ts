import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, fetchUserEmail } from '@/lib/google/client'
import { encrypt } from '@/lib/utils/crypto'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?google_error=${encodeURIComponent(error)}`, request.url),
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/settings?google_error=missing_params', request.url),
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // state 검증 (user_id 일치)
  const stateUserId = state.split(':')[0]
  if (stateUserId !== user.id) {
    return NextResponse.redirect(
      new URL('/settings?google_error=state_mismatch', request.url),
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('id', user.id)
    .single()

  if (!profile?.family_id) {
    return NextResponse.redirect(
      new URL('/settings?google_error=no_family', request.url),
    )
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        new URL('/settings?google_error=no_refresh_token', request.url),
      )
    }

    const email = await fetchUserEmail(tokens.access_token)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // upsert: family당 1개
    const { error: dbError } = await supabase
      .from('google_calendar_connections')
      .upsert(
        {
          family_id: profile.family_id,
          user_id: user.id,
          google_email: email,
          access_token_encrypted: encrypt(tokens.access_token),
          refresh_token_encrypted: encrypt(tokens.refresh_token),
          token_expires_at: expiresAt,
        },
        { onConflict: 'family_id' },
      )

    if (dbError) {
      return NextResponse.redirect(
        new URL(`/settings?google_error=${encodeURIComponent(dbError.message)}`, request.url),
      )
    }

    return NextResponse.redirect(new URL('/settings?google_connected=1', request.url))
  } catch (e) {
    return NextResponse.redirect(
      new URL(
        `/settings?google_error=${encodeURIComponent((e as Error).message)}`,
        request.url,
      ),
    )
  }
}
