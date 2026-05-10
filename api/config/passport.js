/* eslint-disable no-unused-vars */
import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'
import argon2 from 'argon2'
import { pool } from './config.js'

const fakeHash = '$argon2id$v=19$m=19456,t=2,p=1$+to4xlALTkt0j6xnwHsvnw$fHRVrgonDBSmjJUZsXkYItC85pEWhKZc2Cva+0eeqPo'

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
          await argon2.verify(fakeHash, psswdLogin || '')
          return done(null, false)
        }

        const user = rows[0]

        const isMatch = await argon2.verify(user.psswd, psswdLogin)

        if (!isMatch) {
          return done(null, false)
        }

        const { psswd, ...safeUser } = user

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
