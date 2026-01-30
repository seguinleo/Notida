import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'
import bcrypt from 'bcrypt'
import { pool } from './config.js'

passport.use(
  new LocalStrategy(
    {
      usernameField: 'nameLogin',
      passwordField: 'psswdLogin'
    },
    async (nameLogin, psswdLogin, done) => {
      if (
        nameLogin.length < 3 ||
        nameLogin.length > 30 ||
        psswdLogin.length < 10 ||
        psswdLogin.length > 64 ||
        !/^[\p{L} -]+$/u.test(nameLogin.normalize('NFC'))
      ) {
        return done(null, false, {
          message: 'Wrong username or password.',
        })
      }
      let connection
      try {
        connection = await pool.getConnection()
        const [rows] = await connection.execute(
          "SELECT id, name, psswd FROM users WHERE name = ? LIMIT 1",
          [nameLogin]
        )

        if (rows.length !== 1) {
          return done(null, false, {
            message: 'Wrong username or password.',
          })
        }

        const user = rows[0]
        const isMatch = await bcrypt.compare(psswdLogin, user.psswd)
        if (!isMatch) {
          return done(null, false, {
            message: 'Wrong username or password.',
          })
        }

        return done(null, user)
      } catch {
        return done(null, false)
      } finally {
        if (connection) connection.release()
      }
    }
  )
)

export default passport
