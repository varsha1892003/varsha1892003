/* eslint-disable no-unneeded-ternary */
/* eslint-disable standard/object-curly-even-spacing */
/* eslint-disable eqeqeq */
/* eslint-disable camelcase */
'use strict'

const express = require('express')
const app = express.Router()
require('dotenv').config()
var bcrypt = require('bcryptjs')
var jwt = require('jsonwebtoken')
const moment = require('moment')
var axios = require('axios')
var mysql = require('mysql')
const hubspot = require('@hubspot/api-client')
runmigration()
// Logic goes here
const auth = require('./middleware/auth')
const adminAuth = require('./middleware/adminAuth')
const hubspotClient2 = new hubspot.Client({
  accessToken: 'pat-na1-c63bb9b5-75b9-4704-9bb2-c65db6bed5ab'
});
function getDates (startDate, stopDate) {
  var dateArray = []
  var currentDate = moment(startDate)
  var stopDate2 = moment(stopDate)
  while (currentDate <= stopDate2) {
    dateArray.push(moment(currentDate).format('YYYY-MM-DD'))
    currentDate = moment(currentDate).add(1, 'days')
  }
  return dateArray
}
// Login
app.post('/login', async (req, res) => {
  // Our login logic starts here
  try {
    // Get user input
    const { email, password } = req.body

    // Validate user input
    if (!(email && password)) {
      res.status(400).send('All input is required')
    }
    var con = getConnection()
    // Validate if user exist in our database
    const sqlSearch = "SELECT * FROM Users WHERE email = '" + email + "'"
    con.query(sqlSearch, async function (err, result) {
      if (err) throw err
      if (result.length === 0) {
        console.log(result, 'result', email)
        res.sendStatus(409)
      } else {
        if (result && (await bcrypt.compare(password, result[0].password))) {
          // Create token
          const token = jwt.sign(
            { userId: result[0].userId, email },
            process.env.TOKEN_KEY,
            {
              expiresIn: '2h'
            }
          )

          // save user token
          result[0].token = token

          // user
          res.status(200).json(result[0])
        }
      }
      res.status(400).json()
    })
  } catch (err) {
    res.status(400).json()
  }
  // Our register logic ends here
})
app.post('/request-reset', async (req, res) => {
  // Our login logic starts here
  try {
    // Get user input
    const { email } = req.body

    // Validate user input
    if (!(email)) {
      res.status(400).send('All input is required')
    }
    var con = getConnection()
    // Validate if user exist in our database
    const sqlSearch = "SELECT * FROM Users WHERE email = '" + email + "'"
    con.query(sqlSearch, async function (err, result) {
      if (err) throw err
      if (result.length === 0) {
        res.sendStatus(409)
      } else {
        if (result) {
          // Create token
          const token = jwt.sign(
            { userId: result[0].userId, email },
            process.env.TOKEN_KEY,
            {
              expiresIn: '2h'
            }
          )

          // save user token
          result[0].token = token

          // user
          res.status(200).json(result[0])
        }
      }
      res.status(400).json()
    })
  } catch (err) {
    res.status(400).json()
  }
  // Our register logic ends here
})
app.post('/add-contact-hs', async function (req, res) {
  console.log(req)
  var data = req.body

  try {
    if (data) {
      processRequest(data);
      res.status(200);//Set status to 404 as movie was not found
      res.json({ message: "Success" });
    } else {
      res.status(200);//Set status to 404 as movie was not found
      res.json({ message: "Success" });
    }
  } catch (e) {
      res.status(400);//Set status to 404 as movie was not found
      res.json({ message: "Failed", error: e });
  }
})
async function processRequest(data) {

  const quotePayload = data;

  let payload = {
    properties: {
      email: quotePayload.emailAddress,
      phone: quotePayload.phoneNumber,
      lastname: quotePayload.nameLast,
      firstname: quotePayload.nameFirst,
      company: quotePayload.company,
      address: quotePayload.address,
      city: quotePayload.city,
      country: quotePayload.county,
      state: quotePayload.state,
      zip: quotePayload.zip,
      additional_details: quotePayload.details
    },
  };

  if (quotePayload.buildingDescription) {
    let leanLowHeight = 0;
    if (
      quotePayload.buildingDescription &&
      quotePayload.buildingDescription["Main Building Dimensions"]
    ) {
      payload.properties["building_width"] =
      processFeet(quotePayload.buildingDescription["Main Building Dimensions"].Width);
      payload.properties["building_height"] =
      processFeet(quotePayload.buildingDescription["Main Building Dimensions"][
          "Eave Height"
        ]);
      payload.properties["building_length"] =
      processFeet(quotePayload.buildingDescription["Main Building Dimensions"].Length);
      payload.properties["roof_pitch"] =
        quotePayload.buildingDescription["Main Building Dimensions"][
          "Roof Pitch"
        ];
    }

    if (
      quotePayload.buildingDescription &&
      quotePayload.buildingDescription["Lean-to (Side A)"]
    ) {
      leanLowHeight =
      processFeet(quotePayload.buildingDescription["Lean-to (Side A)"]["Eave Height"]);
      // leanLowHeight = leanAHeight > leanLowHeight ? leanLowHeight : leanAHeight;
    }

    // if (quotePayload.BuildingDescription && quotePayload.BuildingDescription['Lean-to (Side B)']) {
    //   let leanBHeight = quotePayload.BuildingDescription['Lean-to (Side B)']['Eave Height'];
    //   leanLowHeight = leanBHeight > leanLowHeight ? leanLowHeight : leanBHeight;
    // }
    payload.properties["right__high__eave_height"] =
      payload.properties["building_height"];
    payload.properties["left__low__eave_height"] = leanLowHeight;
  }
  console.log(payload);

  const getContactByEmail = await hubspotClient2.apiRequest({
    method: "post",
    path: "/crm/v3/objects/contacts/search",
    body: {
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: "EQ",
              value: quotePayload.emailAddress,
            },
          ],
        },
      ],
    },
  });

  const getContactByEmailJSON = await getContactByEmail.json();
  if (
    getContactByEmailJSON &&
    getContactByEmailJSON.results &&
    getContactByEmailJSON.results.length
  ) {
    const updateContact = await hubspotClient2.apiRequest({
      method: "patch",
      path: "/crm/v3/objects/contacts/" + getContactByEmailJSON.results[0].id,
      body: payload,
    });
    const updateContactJson = await updateContact.json();
    console.log(updateContactJson);
  } else {
    const createContact = await hubspotClient2.apiRequest({
      method: "post",
      path: "/crm/v3/objects/contacts",
      body: payload,
    });
    const createContactData = await createContact.json();
    console.log(createContactData);
  }


}

function processFeet(string) {

let feetInchArray = string.split("'");
let feet;
let inch;
if (feetInchArray && feetInchArray.length) {
  feet = +feetInchArray[0];
  inch = +(feetInchArray[1] ? feetInchArray[1].replace('"', '') : 0);
}
return (feet * 12) + inch;
}
app.post('/reset-password', auth, async (req, res) => {
  // Our register logic starts here
  try {
    // Get user input
    const { email, password, confirmPassword } = req.body

    // Validate user input
    if (!(confirmPassword && password)) {
      res.status(400).send('All input is required')
    }
    if (confirmPassword != password) {
      res.status(400).send('Password and confirm password should be same!!')
    }
    var con = getConnection()
    // check if user already exist
    // Validate if user exist in our database
    con.connect(async function (err) {
      if (err) throw err
      const sqlSearch = "SELECT * FROM Users WHERE email = '" + email + "'"

      con.query(sqlSearch, async function (err, result) {
        if (err) throw err

        if (result.length != 0) {
          const encryptedPassword = await bcrypt.hash(password, 10)
          const sqlInsert = `Update Users SET password = '${encryptedPassword}' WHERE email='${email}'`

          await con.query(sqlInsert, (err, _result) => {
            if (err) throw (err)

            res.status(201).json({ status: 200, message: 'Password updated successfully' })
          })
        } else {
          res.sendStatus(409)
        }
      })
    })

    // Encrypt user password

    // Create user in our database

    // Create token
  } catch (err) {
  }
  // Our register logic ends here
})
app.post('/register', adminAuth, async (req, res) => {
  // Our register logic starts here
  try {
    // Get user input
    const { first_name, last_name, email, password } = req.body

    // Validate user input
    if (!(email && password && first_name && last_name)) {
      res.status(400).send('All input is required')
    }
    var con = getConnection()
    // check if user already exist
    // Validate if user exist in our database
    con.connect(async function (err) {
      if (err) throw err
      const sqlSearch = "SELECT * FROM Users WHERE email = '" + email + "'"
      con.query(sqlSearch, async function (err, result) {
        if (err) throw err
        if (result.length != 0) {
          res.sendStatus(409)
        } else {
          const encryptedPassword = await bcrypt.hash(password, 10)
          const sqlInsert = `INSERT INTO Users (firstName, lastName, email, password) VALUES ('${first_name}', '${last_name}', '${email.toLowerCase()}', '${encryptedPassword}')`

          await con.query(sqlInsert, (err, result) => {
            if (err) throw (err)
            const token = jwt.sign(
              { userId: result.insertId, email },
              process.env.TOKEN_KEY,
              {
                expiresIn: '2h'
              }
            )
            // save user token
            result.token = token

            // return new user
            res.status(201).json(result)
          })
        }
      })
    })

    // Encrypt user password

    // Create user in our database

    // Create token
  } catch (err) {
  }
  // Our register logic ends here
})

app.post('/add-entry', auth, async (req, res) => {
  try {
    // Get user input
    const { type, time, userId } = req.body
    const sqlInsert = `INSERT INTO TimeEntries (type, loggedBy, timestamp) VALUES ('${type}', '${userId ? userId : req.user.userId}', '${time}')`
    var con = getConnection()
    await con.query(sqlInsert, (err, _result) => {
      if (err) throw (err)
      res.status(201).send('Entry added')
    })
  } catch (err) {
    res.status(400).send('Rejected ')
  }
})

app.post('/update-entry', adminAuth, auth, async (req, res) => {
  try {
    // Get user input
    const { id, time, type } = req.body
    const sqlInsert = `UPDATE TimeEntries SET timestamp = "${time}", type = "${type}" WHERE id = ${id}`
    var con = getConnection()
    await con.query(sqlInsert, (err, _result) => {
      if (err) throw (err)
      res.status(201).send('Entry added')
    })
  } catch (err) {
    res.status(400).send('Rejected ')
  }
})

app.post('/logged-status', auth, async (req, res) => {
  try {
    // Get user input

    const { currentDate } = req.body
    const sqlInsert = `SELECT * FROM TimeEntries WHERE DATE(timestamp) = '${currentDate}' AND loggedBy = ${req.user.userId} ORDER BY id DESC`

    var con = getConnection()
    await con.query(sqlInsert, (err, result) => {
      if (err) throw (err)
      res.status(201).json(result)
    })
  } catch (err) {
    res.status(400).send('Welcome 🙌 ')
  }
})
app.post('/get-entries', auth, async (req, res) => {
  try {
    // Get user input
    const { userId } = req.body
    const sqlInsert = `SELECT * FROM TimeEntries WHERE loggedBy = ${userId} ORDER BY id DESC`

    var con = getConnection()
    await con.query(sqlInsert, (err, result) => {
      if (err) throw (err)
      res.status(201).json(result)
    })
  } catch (err) {
    res.status(400).send('Welcome 🙌 ')
  }
})
app.get('/get-users', adminAuth, async (_req, res) => {
  try {
    // Get user input
    const sqlInsert = `SELECT * FROM Users`
    var con = getConnection()
    await con.query(sqlInsert, (err, result) => {
      if (err) throw (err)
      res.status(201).json(result)
    })
  } catch (err) {
    res.status(400).send('Welcome 🙌 ')
  }
})
app.get('/get-holidays', auth, async (_req, res) => {
  try {
    // Get user input
    const sqlInsert = `SELECT * FROM Holidays`
    var con = getConnection()
    await con.query(sqlInsert, (err, result) => {
      if (err) throw (err)
      res.status(201).json(result)
    })
  } catch (err) {
    res.status(400).send('Welcome 🙌 ')
  }
})
app.post('/add-holiday', adminAuth, async (req, res) => {
  // Our register logic starts here
  try {
    // Get user input
    const { loggedBy, title, start_date, end_date, description, labeltype } = req.body

    // Validate user input
    if (!(loggedBy && title && start_date && end_date && description)) {
      res.status(400).send('All input is required')
    }
    var con = getConnection()
    // check if user already exist
    // Validate if user exist in our database
    con.connect(async function (err) {
      if (err) throw err

      const sqlInsert = `INSERT INTO Holidays (loggedBy, labeltype, title, start_date, end_date, description) VALUES ('${loggedBy}', '${labeltype}', '${title}', '${start_date}', '${end_date}', '${description}')`

      await con.query(sqlInsert, (err, result) => {
        if (err) throw (err)
        // return new user
        res.status(201).json(result)
      })
    })

    // Encrypt user password

    // Create user in our database

    // Create token
  } catch (err) {
  }
  // Our register logic ends here
})
app.post('/update-holiday', adminAuth, async (req, res) => {
  // Our register logic starts here
  try {
    // Get user input
    const { loggedBy, title, start_date, end_date, description, id, labeltype } = req.body

    // Validate user input
    if (!(loggedBy && title && start_date && end_date && description)) {
      res.status(400).send('All input is required')
    }
    var con = getConnection()
    // check if user already exist
    // Validate if user exist in our database
    con.connect(async function (err) {
      if (err) throw err

      const sqlInsert = `UPDATE Holidays SET labeltype = "${labeltype}", loggedBy = "${loggedBy}", title = "${title}", start_date = "${start_date}", end_date = "${end_date}", description = "${description}"  WHERE id = ${id}`

      await con.query(sqlInsert, (err, result) => {
        if (err) throw (err)
        // return new user
        res.status(201).json(result)
      })
    })

    // Encrypt user password

    // Create user in our database

    // Create token
  } catch (err) {
  }
  // Our register logic ends here
})
app.post('/delete-holidays', adminAuth, async (req, res) => {
  // Our register logic starts here
  try {
    // Get user input
    const { id } = req.body

    // Validate user input
    if (!id) {
      res.status(400).send('All input is required')
    }
    var con = getConnection()
    // check if user already exist
    // Validate if user exist in our database
    con.connect(async function (err) {
      if (err) throw err

      const sqlInsert = `DELETE FROM Holidays WHERE id = ${id}`

      await con.query(sqlInsert, (err, result) => {
        if (err) throw (err)
        // return new user
        res.status(201).json(result)
      })
    })

    // Encrypt user password

    // Create user in our database

    // Create token
  } catch (err) {
  }
  // Our register logic ends here
})
app.post('/add-note', adminAuth, async (req, res) => {
  // Our register logic starts here
  try {
    // Get user input
    const { title, description, user } = req.body

    // Validate user input
    if (!(title && description)) {
      res.status(400).send('All input is required')
    }
    var con = getConnection()
    // check if user already exist
    // Validate if user exist in our database
    con.connect(async function (err) {
      if (err) throw err

      const sqlInsert = `INSERT INTO Notes (loggedBy, title, description) VALUES ('${user.userId}', '${title}', '${description}')`

      await con.query(sqlInsert, (err, result) => {
        if (err) throw (err)
        // return new user
        res.status(201).json(result)
      })
    })

    // Encrypt user password

    // Create user in our database

    // Create token
  } catch (err) {
  }
  // Our register logic ends here
})
app.post('/update-note', adminAuth, async (req, res) => {
  // Our register logic starts here
  try {
    // Get user input
    const {title, description, user, id } = req.body

    // Validate user input
    if (!(title && description)) {
      res.status(400).send('All input is required')
    }
    var con = getConnection()
    // check if user already exist
    // Validate if user exist in our database
    con.connect(async function (err) {
      if (err) throw err

      const sqlInsert = `UPDATE Notes SET loggedBy = "${user.userId}", title = "${title}", description = "${description}"  WHERE id = ${id}`

      await con.query(sqlInsert, (err, result) => {
        if (err) throw (err)
        // return new user
        res.status(201).json(result)
      })
    })

    // Encrypt user password

    // Create user in our database

    // Create token
  } catch (err) {
  }
  // Our register logic ends here
})
app.post('/delete-note', adminAuth, async (req, res) => {
  // Our register logic starts here
  try {
    // Get user input
    const { id } = req.body

    // Validate user input
    if (!id) {
      res.status(400).send('All input is required')
    }
    var con = getConnection()
    // check if user already exist
    // Validate if user exist in our database
    con.connect(async function (err) {
      if (err) throw err

      const sqlInsert = `DELETE FROM Notes WHERE id = ${id}`

      await con.query(sqlInsert, (err, result) => {
        if (err) throw (err)
        // return new user
        res.status(201).json(result)
      })
    })

    // Encrypt user password

    // Create user in our database

    // Create token
  } catch (err) {
  }
  // Our register logic ends here
})
app.get('/get-note', adminAuth, async (_req, res) => {
  try {
    // Get user input
    const sqlInsert = `SELECT * FROM Notes`
    var con = getConnection()
    await con.query(sqlInsert, (err, result) => {
      if (err) throw (err)
      res.status(201).json(result)
    })
  } catch (err) {
    res.status(400).send('Welcome 🙌 ')
  }
})
app.get('/get-logs', adminAuth, async (_req, res) => {
  try {
    // Get user input
    const sqlInsert = `SELECT * FROM Logger where description <> "Unknown"`
    var con = getConnection()
    await con.query(sqlInsert, (err, result) => {
      if (err) throw (err)
      res.status(201).json(result)
    })
  } catch (err) {
    res.status(400).send('Welcome 🙌 ')
  }
})
async function getCurrentMonthTotalTime (month, year) {
  return new Promise(async resolve => {
    try {
      var con = getConnection()
      let currentMonthTotalTime = 0
      const getHolidayList = `SELECT * FROM Holidays WHERE year(start_date) = ${year} AND month(start_date) = ${month}`
      await con.query(getHolidayList, (err, result) => {
        if (err) throw (err)
        let holidayDates = []
        for (let holiday of result) {
          let dates = getDates(new Date(holiday.start_date), new Date(holiday.end_date))
          holidayDates = [...holidayDates, ...dates]
        }
        let holidayDatesUniq = holidayDates.filter((item, i, ar) => ar.indexOf(item) === i)
        let now = new Date(year, (month - 1))
        let totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        currentMonthTotalTime = (totalDays - holidayDatesUniq.length) * 8 * 60
        resolve(currentMonthTotalTime)
      })
    } catch (e) {
      console.log(e)
      resolve(31 * 8 * 60)
    }
  })
}
function getUserLoggedData (user, currentMonthTotalTime, year, month) {
  return new Promise(async resolve => {
    try {
      console.log('Test 12')
      let userData = {lastName: user.lastName, firstName: user.firstName, email: user.email, loggedTime: 0, totalTime: currentMonthTotalTime}
      const sqlInsert = `SELECT * FROM TimeEntries WHERE loggedBy = ${user.userId} AND year(timestamp) = ${year} AND month(timestamp) = ${month} ORDER BY id ASC`
      var con = getConnection()
      await con.query(sqlInsert, (err, result) => {
        console.log(err)
        console.log('Test 123')
        let entriesByDate = {}

        for (let entry of result) {
          let date = moment(entry.timestamp).format('MM/DD/YYYY')
          if (!entriesByDate[date]) {
            entriesByDate[date] = []
            entriesByDate[date].push(entry)
          } else {
            entriesByDate[date].push(entry)
          }
        }

        for (let key in entriesByDate) {
          if (!key) return
          let dayEntry = entriesByDate[key]
          let datEntryProccessed = {}
          datEntryProccessed['date'] = key
          let totalBunch = []
          let array = [...dayEntry]
          let count = 0
          let bunch = {
            start: null,
            stop: null
          }
          for (let i = 0; i < array.length; i++) {
            let entry = array[i]
            if (entry.type === 'CHECKIN' || entry.type === 'BREAKOUT') {
              if (entry.type === 'CHECKIN') {
                datEntryProccessed['checkin'] = entry.timestamp
              }
              bunch = {
                start: entry.timestamp,
                stop: null
              }
            }
            if (entry.type === 'BREAKIN' || entry.type === 'CHECKOUT') {
              bunch.stop = entry.timestamp
              if (entry.type === 'CHECKOUT') {
                datEntryProccessed['checkout'] = entry.timestamp
              }
            }
            count++
            if (count >= 2 || i === (array.length - 1)) {
              count = 0
              totalBunch.push(bunch)
            }
          }

          let totalTime = 0
          for (let bunch of totalBunch) {
            let start = moment(bunch.start)
            let stop = moment(bunch.stop ? bunch.stop : bunch.start)
            var duration = moment.duration(stop.diff(start))
            var minuts = duration.asMinutes()

            if (minuts && minuts > 0) {
              totalTime = totalTime + minuts
            }
          }
          if (totalTime > 480) {
            totalTime = 480
          }
          userData['loggedTime'] = userData['loggedTime'] + totalTime
        }
        resolve(userData)
        if (err) throw (err)
      })
    } catch (e) {
      let userData = {lastName: user.lastName, firstName: user.firstName, email: user.email, loggedTime: 0, totalTime: 0}

      console.log(e)
      resolve(userData)
    }
  })
}
app.post('/get-user-attendance/self', auth, async (req, res) => {
  try {
    // Get user input

    const { user, month, year} = req.body
    let currentMonthTotalTime = await getCurrentMonthTotalTime(month, year)
    let userData = await getUserLoggedData(user, currentMonthTotalTime, year, month)
    res.status(201).json(userData)
  } catch (err) {
    console.log(err)
    res.status(400).send('Welcome 🙌 ')
  }
})
app.post('/get-user-attendance', auth, async (req, res) => {
  try {
    // Get user input

    const { month, year } = req.body
    const sqlInsert = `SELECT * FROM Users where role = 0`
    var con = getConnection()
    let currentMonthTotalTime = await getCurrentMonthTotalTime(month, year)

    await con.query(sqlInsert, async (err, users) => {
      if (err) throw (err)
      let alluserData = []
      for (let user of users) {
        let userData = await getUserLoggedData(user, currentMonthTotalTime, year, month)
        alluserData.push(userData)
      }
      res.status(201).json(alluserData)
    })
  } catch (err) {
    res.status(400).send('Welcome 🙌 ')
  }
})
app.post('/get-admin-dashboard', auth, async (_req, res) => {
  try {
    res.status(201).json({
      present: 5,
      total: 11,
      leaves: [
        {
          firstName: 'Meet',
          lastName: 'Simpi',
          profile: '',
          reason: 'Family function'
        },

        {
          firstName: 'Pavan',
          lastName: 'Paramar',
          profile: '',
          reason: 'Family function'
        }
      ]
    })
  } catch (err) {
    res.status(400).send('Welcome 🙌 ')
  }
})

app.post('/test', auth, (_req, res) => {
  res.status(200).send('Welcome 23🙌 ')
})

app.post('/run-query', adminAuth, (req, res) => {
  var con = getConnection()
  const { query } = req.body
  con.query(query, async function (_err, result) {
    res.status(200).send(result)
  })
})

app.post('/proxy-api-hubspot', (req, res) => {
  const { url } = req.body
  const { payload } = req.body
  const { headers } = req.body
  const { method } = req.body

  try {
    axios({
      'method': method,
      'url': url,
      'data': JSON.stringify(payload),
      'headers': headers,
      'json': true
    }).then((resp) => {
      res.status(200).send(resp.data)
    }).catch((e) => {
      res.status(200).send(e)
    })
  } catch (e) {
    res.status(400).send(e)
  }
})
app.post('/get-user', auth, async (req, res) => {
  try {
    const { userId} = req.body
    // Get user input
    const sqlInsert = `SELECT * FROM Users WHERE userId=${userId};`
    var con = getConnection()
    await con.query(sqlInsert, (err, result) => {
      if (err) throw (err)
      res.status(201).json(result)
    })
  } catch (err) {
    res.status(400).send('Welcome 🙌 ')
  }
})
app.post('/update-user-details', auth, async (req, res) => {
  try {
  // Get user input
    const { userId, email, firstName, lastName } = req.body
    const sqlUpdateUser = `UPDATE Users SET email='${email}', firstName='${firstName}', lastName='${lastName}' WHERE userId='${userId}';`

    var con = getConnection()
    await con.query(sqlUpdateUser, (err, result) => {
      if (err) throw (err)
      res.status(201).json(result)
    })
  } catch (err) {
    res.status(400).send('Welcome 🙌 ')
  }
})
app.post('/update-user-profile', auth, async (req, res) => {
  res.status(400).send(req.body)
})

app.post('/add-announcement', adminAuth, async (req, res) => {
  // Our register logic starts here
  try {
    // Get user input
    const { title, description, user } = req.body

    // Validate user input
    if (!(title && description)) {
      res.status(400).send('All input is required')
    }
    var con = getConnection()
    // check if user already exist
    // Validate if user exist in our database
    con.connect(async function (err) {
      if (err) throw err

      const sqlInsert = `INSERT INTO Announcements (loggedBy, title, description) VALUES ('${user.userId}', '${title}', '${description}')`

      await con.query(sqlInsert, (err, result) => {
        if (err) throw (err)
        // return new user
        res.status(201).json(result)
      })
    })

    // Encrypt user password

    // Create user in our database

    // Create token
  } catch (err) {
  }
  // Our register logic ends here
})
app.post('/update-announcement', adminAuth, async (req, res) => {
  // Our register logic starts here
  try {
    // Get user input
    const {title, description, user, id } = req.body

    // Validate user input
    if (!(title && description)) {
      res.status(400).send('All input is required')
    }
    var con = getConnection()
    // check if user already exist
    // Validate if user exist in our database
    con.connect(async function (err) {
      if (err) throw err

      const sqlInsert = `UPDATE Announcements SET loggedBy = "${user.userId}", title = "${title}", description = "${description}"  WHERE id = ${id}`

      await con.query(sqlInsert, (err, result) => {
        if (err) throw (err)
        // return new user
        res.status(201).json(result)
      })
    })

    // Encrypt user password

    // Create user in our database

    // Create token
  } catch (err) {
  }
  // Our register logic ends here
})
app.post('/delete-announcement', adminAuth, async (req, res) => {
  // Our register logic starts here
  try {
    // Get user input
    const { id } = req.body

    // Validate user input
    if (!id) {
      res.status(400).send('All input is required')
    }
    var con = getConnection()
    // check if user already exist
    // Validate if user exist in our database
    con.connect(async function (err) {
      if (err) throw err

      const sqlInsert = `DELETE FROM Announcements WHERE id = ${id}`

      await con.query(sqlInsert, (err, result) => {
        if (err) throw (err)
        // return new user
        res.status(201).json(result)
      })
    })

    // Encrypt user password

    // Create user in our database

    // Create token
  } catch (err) {
  }
  // Our register logic ends here
})
app.get('/get-announcement', auth, async (_req, res) => {
  try {
    // Get user input
    const sqlInsert = `SELECT * FROM Announcements`
    var con = getConnection()
    await con.query(sqlInsert, (err, result) => {
      if (err) throw (err)
      res.status(201).json(result)
    })
  } catch (err) {
    res.status(400).send('Welcome 🙌 ')
  }
})
app.post('/update-profile', auth, async (req, res) => {
  try {
    // Get user input
    const { user, profile, personal, bank } = req.body
    if (!(user && profile && personal && bank)) {
      res.status(400).send('All input is required')
    }
    var con = getConnection()
    // check if user already exist
    // Validate if user exist in our database
    con.connect(async function (err) {
      if (err) throw err

      const sqlInsert = `UPDATE Users SET firstName = "${profile.firstName}", lastName = "${profile.lastName}", email = "${profile.email}", phone = "${profile.phone}", designation = "${profile.designation}", team = "${profile.team}", address = "${profile.address}", reportingManager = "${profile.reportingManager}",      aadharNumber = "${personal.aadharNumber}", parentName = "${personal.parentName}", bloodGroup = "${personal.bloodGroup}", birthday = "${personal.birthday}",      gender = "${personal.gender}", languages = "${personal.languages}", prAddress = "${personal.prAddress}", aboutMe = "${personal.aboutMe}",      bankName = "${bank.bankName}", acNumber = "${bank.acNumber}", ifsc = "${bank.ifsc}", documents = "${bank.documents}",      digilocker = "${bank.digilocker}", files = "${JSON.stringify(bank.files)}"  WHERE userId = ${user.userId}`
      await con.query(sqlInsert, (err, result) => {
        if (err) throw (err)
        // return new user
        res.status(201).json(result)
      })
    })
  } catch (err) {
    console.log(err)
    res.status(400).send('Welcome 🙌 ')
  }
})
app.get('/get-code', async (_req, res) => {
  console.log('Test Code is there')
  res.status(201).json({worked: 'Success'})
})
function runmigration () {
  var con = getConnection()

  const sqlSearch = 'CREATE TABLE if not exists Users ( userId int PRIMARY KEY AUTO_INCREMENT, lastName varchar(255), firstName varchar(255), email varchar(255), password varchar(255))'
  con.query(sqlSearch, async function (_err, _result) { })
  const sqlSearch2 = 'CREATE TABLE if not exists Holidays ( id int PRIMARY KEY AUTO_INCREMENT, loggedBy varchar(255), labeltype varchar(255), title varchar(255), description varchar(255), start_date varchar(255), end_date varchar(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP , updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)'
  con.query(sqlSearch2, async function (_err, _result) {

  })
  const createHolidayTable = 'CREATE TABLE if not exists TimeEntries ( id int PRIMARY KEY AUTO_INCREMENT, type varchar(255), loggedBy varchar(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP , updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)'
  con.query(createHolidayTable, async function (_err, _result) {

  })
  const updateTable = 'ALTER TABLE Users ADD profilePic varchar(255);'
  con.query(updateTable, async function (_err, _result) {

  })
  const updateUserTable = 'ALTER TABLE Users ADD tempToken varchar(255);'
  con.query(updateUserTable, async function (_err, _result) {

  })
  const addFieldsToUsers = 'ALTER TABLE Users ADD COLUMN phone varchar(256) NULL, ADD COLUMN designation varchar(256) NULL, ADD COLUMN team varchar(256) NULL, ADD COLUMN address varchar(256) NULL, ADD COLUMN reportingManager varchar(256) NULL,   ADD COLUMN aadharNumber varchar(256) NULL,    ADD COLUMN parentName varchar(256) NULL,    ADD COLUMN bloodGroup varchar(256) NULL,    ADD COLUMN birthday varchar(256) NULL,    ADD COLUMN gender varchar(256) NULL,    ADD COLUMN languages varchar(256) NULL,    ADD COLUMN prAddress varchar(256) NULL,    ADD COLUMN aboutMe varchar(256) NULL,    ADD COLUMN bankName varchar(256) NULL,    ADD COLUMN acNumber varchar(256) NULL,    ADD COLUMN ifsc varchar(256) NULL,    ADD COLUMN documents varchar(256) NULL,    ADD COLUMN digilocker varchar(256) NULL,    ADD COLUMN files varchar(256) NULL;'
  con.query(addFieldsToUsers, async function (_err, _result) { })

  const updateUserTableHoliday = 'ALTER TABLE Holidays ADD labeltype varchar(255);'
  con.query(updateUserTableHoliday, async function (_err, _result) {

  })
  const addNotes = 'CREATE TABLE if not exists Notes ( id int PRIMARY KEY AUTO_INCREMENT, loggedBy varchar(255), title varchar(255), description varchar(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'
  con.query(addNotes, async function (_err, _result) { })
  const addAnnouncements = 'CREATE TABLE if not exists Announcements ( id int PRIMARY KEY AUTO_INCREMENT, loggedBy varchar(255), title varchar(255), description varchar(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'
  con.query(addAnnouncements, async function (_err, _result) { })

  const addLogger = 'CREATE TABLE if not exists Logger ( id int PRIMARY KEY AUTO_INCREMENT, loggedBy varchar(255), title varchar(255), description varchar(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP , updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'
  con.query(addLogger, async function (_err, _result) { })
}

function getConnection () {
  return mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'KK@work54',
    database: 'hubresolution'
  })
}

module.exports = app
