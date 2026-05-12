import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'bun:test'
import { sign, verify } from '../lib/jwt/index'

const es256Keys = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
  publicKeyEncoding: { format: 'pem', type: 'spki' },
})

const es384Keys = generateKeyPairSync('ec', {
  namedCurve: 'secp384r1',
  privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
  publicKeyEncoding: { format: 'pem', type: 'spki' },
})

const es512Keys = generateKeyPairSync('ec', {
  namedCurve: 'secp521r1',
  privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
  publicKeyEncoding: { format: 'pem', type: 'spki' },
})

const wrongKeys = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
  publicKeyEncoding: { format: 'pem', type: 'spki' },
})

const now = Math.floor(Date.now() / 1000)

const buildToken = (overrides: Parameters<typeof sign>[1] = {}) =>
  sign(
    { alg: 'ES256', typ: 'JWT' },
    { iss: 'test', sub: '1', aud: 'app', iat: now, exp: now + 3600, nbf: now, jti: 'abc', ...overrides },
    { role: 'user' },
    es256Keys.privateKey,
  )

describe('sign – happy path', () => {
  it('produces a three-part dot-separated string', () => {
    const token = buildToken()
    expect(token.split('.')).toHaveLength(3)
  })

  it('encodes the correct algorithm in the header', () => {
    const token = buildToken()
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString())
    expect(header.alg).toBe('ES256')
    expect(header.typ).toBe('JWT')
  })

  it('merges payload and claims; claims take priority over payload keys', () => {
    const token = sign(
      { alg: 'ES256', typ: 'JWT' },
      { sub: 'claims-sub' },
      { sub: 'payload-sub', extra: 'value' },
      es256Keys.privateKey,
    )
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    expect(payload.sub).toBe('claims-sub')
    expect(payload.extra).toBe('value')
  })

  it('works with ES384', () => {
    const token = sign(
      { alg: 'ES384', typ: 'JWT' },
      { iat: now, exp: now + 60 },
      {},
      es384Keys.privateKey,
    )
    expect(token.split('.')).toHaveLength(3)
  })

  it('works with ES512', () => {
    const token = sign(
      { alg: 'ES512', typ: 'JWT' },
      { iat: now, exp: now + 60 },
      {},
      es512Keys.privateKey,
    )
    expect(token.split('.')).toHaveLength(3)
  })

  it('works when all claims are omitted', () => {
    const token = sign({ alg: 'ES256', typ: 'JWT' }, {}, { data: 'only-payload' }, es256Keys.privateKey)
    expect(token.split('.')).toHaveLength(3)
  })
})

describe('sign – edge cases', () => {
  it('throws when alg is not ES256 | ES384 | ES512', () => {
    expect(() =>
      sign(
        // @ts-expect-error intentional invalid alg
        { alg: 'HS256', typ: 'JWT' },
        {},
        {},
        es256Keys.privateKey,
      ),
    ).toThrow()
  })

  it('throws when payload cannot be JSON-serialized', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(() =>
      sign({ alg: 'ES256', typ: 'JWT' }, {}, circular, es256Keys.privateKey),
    ).toThrow()
  })

  it('throws or produces an unverifiable token when key curve mismatches algorithm', () => {
    expect(() =>
      sign({ alg: 'ES256', typ: 'JWT' }, {}, {}, es384Keys.privateKey),
    ).toThrow()
  })

  it('accepts an already-expired exp without throwing', () => {
    const token = sign(
      { alg: 'ES256', typ: 'JWT' },
      { exp: now - 3600 },
      {},
      es256Keys.privateKey,
    )
    expect(token.split('.')).toHaveLength(3)
  })

  it('throws when private key is an empty string', () => {
    expect(() =>
      sign({ alg: 'ES256', typ: 'JWT' }, {}, {}, ''),
    ).toThrow()
  })

  it('preserves numeric and boolean values in payload', () => {
    const token = sign(
      { alg: 'ES256', typ: 'JWT' },
      {},
      { count: 42, active: true, score: 3.14 },
      es256Keys.privateKey,
    )
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
    expect(payload.count).toBe(42)
    expect(payload.active).toBe(true)
    expect(payload.score).toBeCloseTo(3.14)
  })
})

describe('verify – happy path', () => {
  it('returns decoded header, payload, and signature for a valid token', () => {
    const token = buildToken()
    const decoded = verify(token, es256Keys.publicKey)
    expect(decoded.header.alg).toBe('ES256')
    expect(decoded.header.typ).toBe('JWT')
    expect(decoded.payload.sub).toBe('1')
    expect(decoded.payload.role).toBe('user')
    expect(typeof decoded.signature).toBe('string')
  })

  it('validates iss, sub, aud, and jti when specified in options', () => {
    const token = buildToken({ iss: 'issuer', sub: 'subject', aud: 'audience', jti: 'unique-id' })
    expect(() =>
      verify(token, es256Keys.publicKey, {
        iss: 'issuer',
        sub: 'subject',
        aud: 'audience',
        jti: 'unique-id',
      }),
    ).not.toThrow()
  })

  it('ignores exp when ignoreExp is true', () => {
    const token = buildToken({ exp: now - 1 })
    expect(() =>
      verify(token, es256Keys.publicKey, { ignoreExp: true }),
    ).not.toThrow()
  })

  it('ignores nbf when ignoreNbf is true', () => {
    const token = buildToken({ nbf: now + 9999 })
    expect(() =>
      verify(token, es256Keys.publicKey, { ignoreNbf: true }),
    ).not.toThrow()
  })

  it('accepts tokens signed with ES384', () => {
    const token = sign(
      { alg: 'ES384', typ: 'JWT' },
      { iat: now, exp: now + 3600 },
      {},
      es384Keys.privateKey,
    )
    const decoded = verify(token, es384Keys.publicKey)
    expect(decoded.header.alg).toBe('ES384')
  })

  it('accepts tokens signed with ES512', () => {
    const token = sign(
      { alg: 'ES512', typ: 'JWT' },
      { iat: now, exp: now + 3600 },
      {},
      es512Keys.privateKey,
    )
    const decoded = verify(token, es512Keys.publicKey)
    expect(decoded.header.alg).toBe('ES512')
  })
})

describe('verify – edge cases', () => {
  it('throws when token has fewer than three parts', () => {
    expect(() => verify('only.two', es256Keys.publicKey)).toThrow(
      'JWT must contain header, payload, and signature',
    )
  })

  it('throws when the signature is manipulated', () => {
    const token = buildToken()
    const parts = token.split('.')
    parts[2] = parts[2].split('').reverse().join('')
    expect(() => verify(parts.join('.'), es256Keys.publicKey)).toThrow()
  })

  it('throws when verified with the wrong public key', () => {
    const token = buildToken()
    expect(() => verify(token, wrongKeys.publicKey)).toThrow('JWT signature is invalid')
  })

  it('throws when token is expired', () => {
    const token = buildToken({ exp: now - 1 })
    expect(() => verify(token, es256Keys.publicKey)).toThrow('JWT is expired')
  })

  it('throws when nbf is in the future', () => {
    const token = buildToken({ nbf: now + 9999 })
    expect(() => verify(token, es256Keys.publicKey)).toThrow('JWT is not active yet')
  })

  it('throws when alg is not in the allowed list', () => {
    const token = buildToken()
    expect(() =>
      verify(token, es256Keys.publicKey, { algs: ['ES384', 'ES512'] }),
    ).toThrow('JWT alg is not allowed')
  })

  it('throws when iss does not match', () => {
    const token = buildToken({ iss: 'real-issuer' })
    expect(() =>
      verify(token, es256Keys.publicKey, { iss: 'wrong-issuer' }),
    ).toThrow('JWT issuer is invalid')
  })

  it('throws when sub does not match', () => {
    const token = buildToken({ sub: 'user-1' })
    expect(() =>
      verify(token, es256Keys.publicKey, { sub: 'user-2' }),
    ).toThrow('JWT subject is invalid')
  })

  it('throws when aud does not match', () => {
    const token = buildToken({ aud: 'app' })
    expect(() =>
      verify(token, es256Keys.publicKey, { aud: 'other-app' }),
    ).toThrow('JWT audience is invalid')
  })

  it('accepts aud claim as an array containing the expected audience', () => {
    const token = sign(
      { alg: 'ES256', typ: 'JWT' },
      { iat: now, exp: now + 3600 },
      { aud: ['app', 'admin'] },
      es256Keys.privateKey,
    )
    expect(() => verify(token, es256Keys.publicKey, { aud: 'app' })).not.toThrow()
  })

  it('throws when aud is an array that does not contain the expected audience', () => {
    const token = sign(
      { alg: 'ES256', typ: 'JWT' },
      { iat: now, exp: now + 3600 },
      { aud: ['service-a', 'service-b'] },
      es256Keys.privateKey,
    )
    expect(() =>
      verify(token, es256Keys.publicKey, { aud: 'service-c' }),
    ).toThrow('JWT audience is invalid')
  })

  it('throws when jti does not match', () => {
    const token = buildToken({ jti: 'original-jti' })
    expect(() =>
      verify(token, es256Keys.publicKey, { jti: 'different-jti' }),
    ).toThrow('JWT ID is invalid')
  })

  it('throws when the header segment is not valid JSON', () => {
    const badHeader = Buffer.from('not-json!!!').toString('base64url')
    const token = buildToken()
    const parts = token.split('.')
    expect(() =>
      verify(`${badHeader}.${parts[1]}.${parts[2]}`, es256Keys.publicKey),
    ).toThrow('JWT contains invalid JSON')
  })

  it('throws when the payload segment is not valid JSON', () => {
    const badPayload = Buffer.from('not-json!!!').toString('base64url')
    const token = buildToken()
    const parts = token.split('.')
    expect(() =>
      verify(`${parts[0]}.${badPayload}.${parts[2]}`, es256Keys.publicKey),
    ).toThrow('JWT contains invalid JSON')
  })

  it('throws when any segment is empty', () => {
    const token = buildToken()
    const parts = token.split('.')
    expect(() =>
      verify(`${parts[0]}..${parts[2]}`, es256Keys.publicKey),
    ).toThrow('JWT must contain header, payload, and signature')
  })
})
