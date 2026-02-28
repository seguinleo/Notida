import { redisClient } from '../server.js'
import { pool } from '../config/config.js'
import jwt from 'jsonwebtoken'

/**
 * @function blacklistToken
 * @description Function to blacklist a token to kill a session.
 */
const blacklistToken = async (token) => {
  const decoded = jwt.decode(token)
  if (!decoded?.exp) return

  const ttl = decoded.exp - Math.floor(Date.now() / 1000)
  if (ttl > 0) {
    await redisClient.set(`blacklist:${token}`, '1', { EX: ttl })
  }
}

/**
 * @function deleteInactiveAccounts
 * @description Delete all accounts where lastLogin is > 1 year.
 */
const deleteInactiveAccounts = async () => {
  try {
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    console.log('aaaaaaaaaaaaaaaaaaaaaaaaaa', oneYearAgo)

    const [users] = await pool.execute(
      "SELECT id FROM users WHERE lastLogin < ?",
      [oneYearAgo]
    )

    if (users.length === 0) {
      return
    }

    const userIds = users.map(user => user.id)

    for (const userId of userIds) {
      const tokens = await redisClient.sMembers(`user:tokens:${userId}`)
      if (tokens && tokens.length > 0) {
        await Promise.all(
          tokens.map(token => blacklistToken(token))
        )
        await redisClient.del(`user:tokens:${userId}`)
      }
    }

    await pool.execute(
      "DELETE FROM users WHERE id IN (?)",
      [userIds]
    )
  } catch (err) {
    console.error("Error :", err)
  }
}

export { deleteInactiveAccounts }
