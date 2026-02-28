import { pool } from '../config/config.js'

/**
 * @function deleteInactiveAccounts
 * @description Delete all accounts where lastLogin is > 1 year.
 */
const deleteInactiveAccounts = async () => {
  try {
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const [users] = await pool.execute(
      "SELECT id FROM users WHERE lastLogin < ?",
      [oneYearAgo]
    )

    if (users.length === 0) {
      return
    }

    const userIds = users.map(user => user.id)

    await pool.execute(
      "DELETE FROM users WHERE id IN (?)",
      [userIds]
    )
  } catch (err) {
    console.error("Error :", err)
  }
}

export { deleteInactiveAccounts }
