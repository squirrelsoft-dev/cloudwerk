import { defineProvider, passkey } from "@cloudwerk/auth/convention";

export default defineProvider(
  passkey({
    rpName: 'FlagShip',
    rpId: 'localhost',
    origin: 'http://localhost:3000',
    authenticatorAttachment: 'platform',
    userVerification: 'preferred',
    kvBinding: 'FLAGSHIP_AUTH_SESSIONS', // Same KV namespace as sessions (from wrangler.toml)
    d1Binding: 'DB'
  })
)
