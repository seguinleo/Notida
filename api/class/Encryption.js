import crypto from 'crypto'
import { Buffer } from 'buffer'

class Encryption {
  /**
   * @function base64ToArrayBuffer()
   * @description Converts a base64 string to an ArrayBuffer
   * @returns {ArrayBuffer}
   */
  #base64ToArrayBuffer(base64) {
    return Uint8Array.from(Buffer.from(base64, 'base64')).buffer
  }

  /**
   * @function encryptData()
   * @description Encrypts in AES-256-GCM the given plaintext using the provided key
   * @returns 
   */
  encryptData(plaintext, keyBase64) {
    try {
      if (!plaintext || plaintext === null) return ''
      const plaintextJson = JSON.stringify(plaintext)
      const keyBuffer = this.#base64ToArrayBuffer(keyBase64)
      const iv = crypto.randomBytes(12)
      const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv)
      const enc = Buffer.concat([cipher.update(plaintextJson, 'utf8'), cipher.final()])
      return `${enc.toString('base64')},${iv.toString('base64')},${cipher.getAuthTag().toString('base64')}`
    } catch {
      console.error("Encryption failed")
      throw new Error("Encryption failed")
    }
  }

  /**
   * @function decryptData()
   * @description Decrypts the given ciphertext using the provided key
   * @returns 
   */
  decryptData(ciphertext, keyBase64) {
    if (!ciphertext || ciphertext === null) return ''
    try {
      const arrayCiphertext = ciphertext.split(',')
      const keyBuffer = this.#base64ToArrayBuffer(keyBase64)
      const [encBase64, ivBase64, authTagBase64] = arrayCiphertext
      const enc = Buffer.from(encBase64, 'base64')
      const iv = Buffer.from(ivBase64, 'base64')
      const authTag = Buffer.from(authTagBase64, 'base64')
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv)
      decipher.setAuthTag(authTag)
      const decrypted = Buffer.concat([decipher.update(enc), decipher.final()])
      return JSON.parse(decrypted.toString('utf8'))
    } catch {
      console.error("Decryption failed")
      throw new Error("Decryption failed")
    }
  }
}

export default Encryption
