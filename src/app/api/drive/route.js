// src/app/api/drive/route.js
// Server-side Google Drive API using Service Account

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const folderId = searchParams.get('folderId')
  const type = searchParams.get('type') || 'all'

  if (!folderId) {
    return Response.json({ error: 'folderId required' }, { status: 400 })
  }

  try {
    // Get access token from service account
    const accessToken = await getAccessToken()

    // Build query
    let mimeFilter = ''
    if (type === 'images') {
      mimeFilter = " and mimeType contains 'image/'"
    } else if (type === 'folders') {
      mimeFilter = " and mimeType = 'application/vnd.google-apps.folder'"
    } else {
      mimeFilter = " and (mimeType = 'application/vnd.google-apps.folder' or mimeType contains 'image/')"
    }

    const query = `'${folderId}' in parents and trashed = false${mimeFilter}`
    const fields = 'files(id,name,mimeType,thumbnailLink)'

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=100`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 60 }
    })

    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: err }, { status: res.status })
    }

    const data = await res.json()
    const files = (data.files || []).map(f => ({
      id: f.id,
      title: f.name,
      type: f.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'image',
      mimeType: f.mimeType,
      thumbnailLink: f.thumbnailLink,
    }))

    return Response.json({ files })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// Generate JWT and exchange for access token
async function getAccessToken() {
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  // Create JWT
  const header = { alg: 'RS256', typ: 'JWT' }
  const encodedHeader = base64url(JSON.stringify(header))
  const encodedPayload = base64url(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`

  // Sign with private key
  const privateKey = await importPrivateKey(serviceAccount.private_key)
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    privateKey,
    new TextEncoder().encode(signingInput)
  )
  const encodedSignature = base64url(signature)
  const jwt = `${signingInput}.${encodedSignature}`

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) throw new Error('Failed to get access token')
  return tokenData.access_token
}

function base64url(data) {
  let base64
  if (typeof data === 'string') {
    base64 = btoa(unescape(encodeURIComponent(data)))
  } else {
    base64 = btoa(String.fromCharCode(...new Uint8Array(data)))
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function importPrivateKey(pem) {
  const pemContent = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const binaryDer = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
}
