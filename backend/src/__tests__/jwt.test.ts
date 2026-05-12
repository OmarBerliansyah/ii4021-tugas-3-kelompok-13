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

describe('sign – jalur sukses', () => {
  it('menghasilkan string tiga bagian yang dipisahkan titik', () => {
    const token = buildToken()
    expect(token.split('.')).toHaveLength(3)
  })

  it('menyandikan algoritma yang benar pada header', () => {
    const token = buildToken()
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString())
    expect(header.alg).toBe('ES256')
    expect(header.typ).toBe('JWT')
  })

  it('menggabungkan payload dan claims; claims diprioritaskan dibanding key payload', () => {
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

  it('berfungsi dengan ES384', () => {
    const token = sign(
      { alg: 'ES384', typ: 'JWT' },
      { iat: now, exp: now + 60 },
      {},
      es384Keys.privateKey,
    )
    expect(token.split('.')).toHaveLength(3)
  })

  it('berfungsi dengan ES512', () => {
    const token = sign(
      { alg: 'ES512', typ: 'JWT' },
      { iat: now, exp: now + 60 },
      {},
      es512Keys.privateKey,
    )
    expect(token.split('.')).toHaveLength(3)
  })

  it('berfungsi saat semua claims dihilangkan', () => {
    const token = sign({ alg: 'ES256', typ: 'JWT' }, {}, { data: 'only-payload' }, es256Keys.privateKey)
    expect(token.split('.')).toHaveLength(3)
  })
})

describe('sign – kasus tepi', () => {
  it('melempar error saat alg bukan ES256 | ES384 | ES512', () => {
    expect(() =>
      sign(
        // @ts-expect-error alg invalid yang disengaja
        { alg: 'HS256', typ: 'JWT' },
        {},
        {},
        es256Keys.privateKey,
      ),
    ).toThrow()
  })

  it('melempar error saat payload tidak bisa diserialisasi menjadi JSON', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular
    expect(() =>
      sign({ alg: 'ES256', typ: 'JWT' }, {}, circular, es256Keys.privateKey),
    ).toThrow()
  })

  it('melempar error atau menghasilkan token tak terverifikasi saat kurva key tidak cocok dengan algoritma', () => {
    expect(() =>
      sign({ alg: 'ES256', typ: 'JWT' }, {}, {}, es384Keys.privateKey),
    ).toThrow()
  })

  it('menerima exp yang sudah kedaluwarsa tanpa melempar error', () => {
    const token = sign(
      { alg: 'ES256', typ: 'JWT' },
      { exp: now - 3600 },
      {},
      es256Keys.privateKey,
    )
    expect(token.split('.')).toHaveLength(3)
  })

  it('melempar error saat private key berupa string kosong', () => {
    expect(() =>
      sign({ alg: 'ES256', typ: 'JWT' }, {}, {}, ''),
    ).toThrow()
  })

  it('mempertahankan nilai numerik dan boolean pada payload', () => {
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

describe('verify – jalur sukses', () => {
  it('mengembalikan header, payload, dan signature terdekode untuk token valid', () => {
    const token = buildToken()
    const decoded = verify(token, es256Keys.publicKey)
    expect(decoded.header.alg).toBe('ES256')
    expect(decoded.header.typ).toBe('JWT')
    expect(decoded.payload.sub).toBe('1')
    expect(decoded.payload.role).toBe('user')
    expect(typeof decoded.signature).toBe('string')
  })

  it('memvalidasi iss, sub, aud, dan jti saat ditentukan di opsi', () => {
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

  it('mengabaikan exp saat ignoreExp bernilai true', () => {
    const token = buildToken({ exp: now - 1 })
    expect(() =>
      verify(token, es256Keys.publicKey, { ignoreExp: true }),
    ).not.toThrow()
  })

  it('mengabaikan nbf saat ignoreNbf bernilai true', () => {
    const token = buildToken({ nbf: now + 9999 })
    expect(() =>
      verify(token, es256Keys.publicKey, { ignoreNbf: true }),
    ).not.toThrow()
  })

  it('menerima token yang ditandatangani dengan ES384', () => {
    const token = sign(
      { alg: 'ES384', typ: 'JWT' },
      { iat: now, exp: now + 3600 },
      {},
      es384Keys.privateKey,
    )
    const decoded = verify(token, es384Keys.publicKey)
    expect(decoded.header.alg).toBe('ES384')
  })

  it('menerima token yang ditandatangani dengan ES512', () => {
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

describe('verify – kasus tepi', () => {
  it('melempar error saat token memiliki kurang dari tiga bagian', () => {
    expect(() => verify('only.two', es256Keys.publicKey)).toThrow(
      'JWT must contain header, payload, and signature',
    )
  })

  it('melempar error saat signature dimanipulasi', () => {
    const token = buildToken()
    const parts = token.split('.')
    parts[2] = parts[2].split('').reverse().join('')
    expect(() => verify(parts.join('.'), es256Keys.publicKey)).toThrow()
  })

  it('melempar error saat diverifikasi dengan public key yang salah', () => {
    const token = buildToken()
    expect(() => verify(token, wrongKeys.publicKey)).toThrow('JWT signature is invalid')
  })

  it('melempar error saat token kedaluwarsa', () => {
    const token = buildToken({ exp: now - 1 })
    expect(() => verify(token, es256Keys.publicKey)).toThrow('JWT is expired')
  })

  it('melempar error saat nbf berada di masa depan', () => {
    const token = buildToken({ nbf: now + 9999 })
    expect(() => verify(token, es256Keys.publicKey)).toThrow('JWT is not active yet')
  })

  it('melempar error saat alg tidak ada di daftar yang diizinkan', () => {
    const token = buildToken()
    expect(() =>
      verify(token, es256Keys.publicKey, { algs: ['ES384', 'ES512'] }),
    ).toThrow('JWT alg is not allowed')
  })

  it('melempar error saat iss tidak cocok', () => {
    const token = buildToken({ iss: 'real-issuer' })
    expect(() =>
      verify(token, es256Keys.publicKey, { iss: 'wrong-issuer' }),
    ).toThrow('JWT issuer is invalid')
  })

  it('melempar error saat sub tidak cocok', () => {
    const token = buildToken({ sub: 'user-1' })
    expect(() =>
      verify(token, es256Keys.publicKey, { sub: 'user-2' }),
    ).toThrow('JWT subject is invalid')
  })

  it('melempar error saat aud tidak cocok', () => {
    const token = buildToken({ aud: 'app' })
    expect(() =>
      verify(token, es256Keys.publicKey, { aud: 'other-app' }),
    ).toThrow('JWT audience is invalid')
  })

  it('menerima claim aud sebagai array yang memuat audience yang diharapkan', () => {
    const token = sign(
      { alg: 'ES256', typ: 'JWT' },
      { iat: now, exp: now + 3600 },
      { aud: ['app', 'admin'] },
      es256Keys.privateKey,
    )
    expect(() => verify(token, es256Keys.publicKey, { aud: 'app' })).not.toThrow()
  })

  it('melempar error saat aud berupa array yang tidak memuat audience yang diharapkan', () => {
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

  it('melempar error saat jti tidak cocok', () => {
    const token = buildToken({ jti: 'original-jti' })
    expect(() =>
      verify(token, es256Keys.publicKey, { jti: 'different-jti' }),
    ).toThrow('JWT ID is invalid')
  })

  it('melempar error saat segmen header bukan JSON yang valid', () => {
    const badHeader = Buffer.from('not-json!!!').toString('base64url')
    const token = buildToken()
    const parts = token.split('.')
    expect(() =>
      verify(`${badHeader}.${parts[1]}.${parts[2]}`, es256Keys.publicKey),
    ).toThrow('JWT contains invalid JSON')
  })

  it('melempar error saat segmen payload bukan JSON yang valid', () => {
    const badPayload = Buffer.from('not-json!!!').toString('base64url')
    const token = buildToken()
    const parts = token.split('.')
    expect(() =>
      verify(`${parts[0]}.${badPayload}.${parts[2]}`, es256Keys.publicKey),
    ).toThrow('JWT contains invalid JSON')
  })

  it('melempar error saat ada segmen yang kosong', () => {
    const token = buildToken()
    const parts = token.split('.')
    expect(() =>
      verify(`${parts[0]}..${parts[2]}`, es256Keys.publicKey),
    ).toThrow('JWT must contain header, payload, and signature')
  })
})
