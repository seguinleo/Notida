import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local'
import bcrypt from 'bcrypt'
import { pool } from './config.js'

passport.use(
  new LocalStrategy(
    {
      usernameField: 'nameConnect',
      passwordField: 'psswdConnect'
    },
    async (nameConnect, psswdConnect, done) => {
      if (
        !nameConnect ||
        !psswdConnect ||
        !/^[a-zA-ZÀ-ÿ -]+$/.test(nameConnect) ||
        nameConnect.length < 3 ||
        nameConnect.length > 30 ||
        psswdConnect.length < 10 ||
        psswdConnect.length > 64
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
          [nameConnect]
        )

        if (rows.length !== 1) {
          return done(null, false, {
            message: 'Wrong username or password.',
          })
        }

        const user = rows[0]
        const isMatch = await bcrypt.compare(psswdConnect, user.psswd)
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

passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
  let connection
  try {
    connection = await pool.getConnection()
    const [rows] = await connection.execute(
      "SELECT id, name FROM users WHERE id = ? LIMIT 1",
      [id]
    )
    if (rows.length === 0) {
      return done(null, false)
    }
    done(null, rows[0])
  } catch {
    return done(null, false)
  } finally {
    if (connection) connection.release()
  }
})

export default passport
