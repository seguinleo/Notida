import crypto from 'crypto'
import { Buffer } from 'buffer'

class Encryption {
  /**
   * @function encryptData()
   * @description Encrypts in AES-256-GCM the given plaintext using the provided key
   * @returns 
   */
  encryptData(plaintext, masterKey) {
    if (!plaintext) return ''

    const key = masterKey
    if (!Buffer.isBuffer(key) || key.length !== 32) {
      throw new Error('Invalid encryption key: must be 32 bytes')
    }
    const iv = crypto.randomBytes(12)

    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

    const data =
      typeof plaintext === 'string'
        ? plaintext
        : JSON.stringify(plaintext)

    const enc = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ])

    const tag = cipher.getAuthTag()

    return [
      enc.toString('base64'),
      iv.toString('base64'),
      tag.toString('base64')
    ].join(',')
  }

  /**
   * @function decryptData()
   * @description Decrypts the given ciphertext using the provided key
   * @returns 
   */
  decryptData(ciphertext, masterKey) {
    if (!ciphertext) return ''

    try {
      const [encB64, ivB64, tagB64] = ciphertext.split(',')

      const key = masterKey
      if (!Buffer.isBuffer(key) || key.length !== 32) {
        throw new Error('Invalid encryption key: must be 32 bytes')
      }
      const enc = Buffer.from(encB64, 'base64')
      const iv = Buffer.from(ivB64, 'base64')
      const tag = Buffer.from(tagB64, 'base64')

      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        key,
        iv
      )

      decipher.setAuthTag(tag)

      const decrypted = Buffer.concat([
        decipher.update(enc),
        decipher.final()
      ])

      return decrypted.toString('utf8')
    } catch (e) {
      throw new Error('Decryption failed', {
        cause: e
      })
    }
  }
}

export default Encryption
