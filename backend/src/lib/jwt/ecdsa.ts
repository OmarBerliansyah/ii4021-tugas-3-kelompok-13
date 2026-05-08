const sizeByAlg = {
  ES256: 32,
  ES384: 48,
  ES512: 66,
} as const

type JwtAlg = keyof typeof sizeByAlg

const readLength = (buffer: Buffer, offset: number) => {
  const first = buffer[offset]
  if ((first & 0x80) === 0) {
    return { length: first, next: offset + 1 }
  }

  const bytes = first & 0x7f
  let length = 0
  for (let index = 0; index < bytes; index += 1) {
    length = (length << 8) | buffer[offset + 1 + index]
  }

  return { length, next: offset + 1 + bytes }
}

const encodeLength = (length: number) => {
  if (length < 0x80) {
    return Buffer.from([length])
  }

  const bytes: number[] = []
  let value = length
  while (value > 0) {
    bytes.unshift(value & 0xff)
    value >>= 8
  }

  return Buffer.from([0x80 | bytes.length, ...bytes])
}

const readDerInteger = (buffer: Buffer, offset: number) => {
  if (buffer[offset] !== 0x02) {
    throw new Error('Invalid ECDSA signature')
  }

  const { length, next } = readLength(buffer, offset + 1)
  const start = next
  const end = start + length

  return { value: buffer.subarray(start, end), next: end }
}

const trimLeadingZeroes = (buffer: Buffer) => {
  let offset = 0
  while (offset < buffer.length - 1 && buffer[offset] === 0) {
    offset += 1
  }

  return buffer.subarray(offset)
}

const leftPad = (buffer: Buffer, size: number) => {
  const trimmed = trimLeadingZeroes(buffer)
  if (trimmed.length > size) {
    throw new Error('ECDSA signature component is too large')
  }

  return Buffer.concat([Buffer.alloc(size - trimmed.length), trimmed])
}

const derInteger = (value: Buffer) => {
  const trimmed = trimLeadingZeroes(value)
  const needsPositivePadding = (trimmed[0] & 0x80) !== 0
  const bytes = needsPositivePadding
    ? Buffer.concat([Buffer.from([0]), trimmed])
    : trimmed

  return Buffer.concat([Buffer.from([0x02]), encodeLength(bytes.length), bytes])
}

export const derToJose = (signature: Buffer, alg: JwtAlg) => {
  if (signature[0] !== 0x30) {
    throw new Error('Invalid ECDSA signature')
  }

  const sequence = readLength(signature, 1)
  const r = readDerInteger(signature, sequence.next)
  const s = readDerInteger(signature, r.next)
  const size = sizeByAlg[alg]

  return Buffer.concat([leftPad(r.value, size), leftPad(s.value, size)])
}

export const joseToDer = (signature: Buffer, alg: JwtAlg) => {
  const size = sizeByAlg[alg]
  if (signature.length !== size * 2) {
    throw new Error('Invalid ECDSA signature length')
  }

  const r = derInteger(signature.subarray(0, size))
  const s = derInteger(signature.subarray(size))
  const sequenceLength = r.length + s.length

  return Buffer.concat([Buffer.from([0x30]), encodeLength(sequenceLength), r, s])
}
