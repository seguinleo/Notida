import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'
import bcrypt from 'bcrypt'
import { pool } from './config.js'

const fakeHash = '$2a$12$zKSNbcfzJCMlm1jPRIuabOi0paRqo.AyVhHXoFE4TqIKJZZhd5.ia'

passport.use(
  new LocalStrategy(
    {
      usernameField: 'nameLogin',
      passwordField: 'psswdLogin'
    },
    async (nameLogin, psswdLogin, done) => {
      let connection

      try {
        connection = await pool.getConnection()

        const [rows] = await connection.execute(
          'SELECT id, name, psswd FROM users WHERE name = ? LIMIT 1',
          [nameLogin]
        )

        if (rows.length !== 1) {
          await bcrypt.compare(psswdLogin || '', fakeHash)
          return done(null, false)
        }

        const user = rows[0]

        const isMatch = await bcrypt.compare(psswdLogin, user.psswd)

        if (!isMatch) {
          return done(null, false)
        }

        const { ...safeUser } = user

        return done(null, safeUser)
      } catch (err) {
        return done(err)
      } finally {
        if (connection) connection.release()
      }
    }
  )
)

export default passport
