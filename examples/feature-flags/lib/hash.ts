// MurmurHash3 implementation for deterministic percentage rollouts

const C1 = 0xcc9e2d51
const C2 = 0x1b873593
const R1 = 15
const R2 = 13
const M = 5
const N = 0xe6546b64

function imul(a: number, b: number): number {
  const aHi = (a >>> 16) & 0xffff
  const aLo = a & 0xffff
  const bHi = (b >>> 16) & 0xffff
  const bLo = b & 0xffff
  return (aLo * bLo + (((aHi * bLo + aLo * bHi) << 16) >>> 0)) | 0
}

function rotl32(x: number, r: number): number {
  return (x << r) | (x >>> (32 - r))
}

function fmix32(h: number): number {
  h ^= h >>> 16
  h = imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return h
}

/**
 * MurmurHash3 32-bit implementation
 */
export function murmurhash3(key: string, seed: number = 0): number {
  const data = new TextEncoder().encode(key)
  const len = data.length
  const nblocks = len >>> 2
  let h1 = seed

  // Process 4-byte blocks
  for (let i = 0; i < nblocks; i++) {
    const i4 = i * 4
    let k1 =
      (data[i4] & 0xff) |
      ((data[i4 + 1] & 0xff) << 8) |
      ((data[i4 + 2] & 0xff) << 16) |
      ((data[i4 + 3] & 0xff) << 24)

    k1 = imul(k1, C1)
    k1 = rotl32(k1, R1)
    k1 = imul(k1, C2)

    h1 ^= k1
    h1 = rotl32(h1, R2)
    h1 = imul(h1, M) + N
  }

  // Process remaining bytes
  const tail = nblocks * 4
  let k1 = 0

  switch (len & 3) {
    case 3:
      k1 ^= (data[tail + 2] & 0xff) << 16
    // fallthrough
    case 2:
      k1 ^= (data[tail + 1] & 0xff) << 8
    // fallthrough
    case 1:
      k1 ^= data[tail] & 0xff
      k1 = imul(k1, C1)
      k1 = rotl32(k1, R1)
      k1 = imul(k1, C2)
      h1 ^= k1
  }

  // Finalization
  h1 ^= len
  h1 = fmix32(h1)

  return h1 >>> 0 // Convert to unsigned
}

/**
 * Convert a user ID and flag key to a percentage bucket (0-99)
 * The salt parameter allows for different distributions per flag
 */
export function hashToPercentage(
  userId: string,
  flagKey: string,
  salt: string = ''
): number {
  const key = `${salt}:${flagKey}:${userId}`
  const hash = murmurhash3(key)
  return hash % 100
}
