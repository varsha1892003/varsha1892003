/* eslint-disable indent */
/* eslint-disable semi */
/* eslint-disable quotes */
/* eslint-disable spaced-comment */
/* eslint-disable space-before-function-paren */
'use strict'

const config = require('../config')
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const bodyParser = require('body-parser')
const errorHandler = require('../middlewares/error-handler')
const apiRouter = require('../routes/api')
const passport = require('passport')
const passportJwt = require('../services/passport')
const hrmsApiRouter = require('../hrms/hrms-api.route')
var cron = require('node-cron')
var mysqldump = require('mysqldump')
const app = express()
const hubspot = require('@hubspot/api-client')
const nodemailer = require('nodemailer')
const hubspotClient = new hubspot.Client({
  accessToken: 'pat-na1-8f067e5c-6a7d-41fe-a488-832a0f786e8a'
})
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'tejas@hubresolution.com',
    pass: 'evby zyah jzdk xbtv'
  }
})
const createReadStream = require('fs').createReadStream
const path = require('path')
const process = require('process')
const { google } = require('googleapis')
const pkey = require('../../pk.json')
const SCOPES = ['https://www.googleapis.com/auth/drive.file']
app.use(bodyParser.json())
app.use(cors())
app.use(helmet())

if (config.env !== 'test') app.use(morgan('combined'))

// passport
app.use(passport.initialize())
passport.use('jwt', passportJwt.jwt)
app.use('/hrmsApi', hrmsApiRouter)
app.use('/api', apiRouter)
app.use(errorHandler.handleNotFound)
app.use(errorHandler.handleError)

exports.start = () => {
  app.listen(config.port, (err) => {
    if (err) {
      console.log(`Error : ${err}`)
      process.exit(-1)
    }

    console.log(`${config.app} is running on ${config.port}`)
  })
}
cron.schedule('*/5 * * * *', function () {
  console.log('Cron executed')
  try {
    getContactsForSendGreetings()
  } catch (e) {
    console.log(e)
  }
})

cron.schedule('0 */6 * * *', function () {
  mysqldump({
    connection: {
      host: 'localhost',
      user: 'root',
      password: 'KK@work54',
      database: 'hubresolution'
    },
    dumpToFile: './dump.sql'
  })
  authorize().then(uploadFile).catch(console.error)
})

async function getContactsForSendGreetings () {
  var getContactFlag = true
  var after = 0
  var contacts = []
  while (getContactFlag) {
    const publicObjectSearchRequest = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'greeting_mail_status',
              operator: 'EQ',
              value: 'Send'
            }
          // {
          //   propertyName: "hs_latest_source_data_1",
          //   operator: "EQ",
          //   value: "MARKETPLACE",
          // },
          ]
        }
      ],
      sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
      properties: ['createdate', 'firstname', 'lastname', 'email'],
      limit: 100,
      after: after
    }
    const response = await hubspotClient.crm.contacts.searchApi.doSearch(
      publicObjectSearchRequest
    )
    if (!(response.results && response.results.length)) {
      getContactFlag = false
    } else {
      if (response.paging) {
        after = response.paging && response.paging.next ? response.paging.next.after : 0
      } else {
        getContactFlag = false
      }
    }

    if (response.results && response.results.length) {
      contacts = [...contacts, ...response.results]

      console.log(contacts)
    }
  }
  for (let contact of contacts) {
    let email = contact.properties.email
    let name = (contact.properties.firstname ? contact.properties.firstname + ' ' : '') + (contact.properties.lastname ? contact.properties.lastname : '')
    sendGreetingMail(email, name, contact)
    sendGreetingMail('tejas@hubresolution.com', name, contact)
  }
  console.log(contacts)
}

function sendGreetingMail (email, name, contact) {
  var mailOptions = {
    from: 'tejas@hubresolution.com',
    to: email,
    subject: 'Thank you for downloading the module | Hub Resolution',
    html: `<!DOCTYPE html>
    <html>

    <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Email Template (1)</title>



    <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@100;300;400;500;700;900&display=swap');

    * {box-sizing: border-box !important;	-moz-box-sizing: border-box !important;	-webkit-box-sizing: border-box !important;}
    body {	margin: 0;	padding: 0; background:#eaf0f6;	font-family: 'Roboto', sans-serif;	font-size: 14px;	max-width: 600px;	margin: 0 auto;	line-height: 1.57;	color: #050A30;	font-weight: 400;}
    p {	margin: 0;}
    *+p {margin-top: 22px;}
    .highlighter{ color: #FFB200;}
    img {max-width: 100%;height: auto;border: none;vertical-align: middle;}
    @media (max-width: 810px) {

      .emailWrap,.viewAs,table {		max-width: 100% !important;		width: auto !important;		margin: 0 auto;		width: 100% !important;	}
      .leftRightPadChange {		padding-left: 15px !important;		padding-right: 15px !important	}
      .pl15 {		padding-left: 15px !important	}}

    @media (max-width:650px) {

      .tableBlock>tbody>tr>td,
      .tableBlock>tbody>tr,
      .tableBlock>tbody,
      .tableBlock>thead {display: block !important;width: 100% !important;}
      table.tableBlock,table.tableBlock table {display: block !important;}
      table.tableInline,
      table.tableInline table {display: inline-block !important;width: auto !important;margin: 0 !important;}
      .mpr0 {padding-right: 0 !important;}
      .mpl0 {padding-left: 0 !important;}
      .mpt0 {padding-top: 0 !important;}
      .mpb0 {padding-bottom: 0 !important;}
      .mpt-15 {padding-top: 15px !important;}
      .mp35-15 {padding: 35px 15px !important;}
    .mTxt-Left {text-align: left !important;}
    .mTxt-center {text-align: center !important;}
    .min-heightAuto{ min-height: auto !important;}
    .m0{margin: 0 !important;}
    }
    </style>
    </head>

    <body>


    <table width="100%" cellspacing="0" cellpadding="0">
      <tr>

        <td>
          <table class="viewAs mp35-15" width="600" cellspacing="0" align="center" cellpadding="0"
            style="padding:40px 20px;  max-width:100%; background-color:#ffffff;">
            <tr>
              <td style="background-color: #ffffff">
                <a href="https://www.hubresolution.com/"><img src="https://8518145.fs1.hubspotusercontent-na1.net/hubfs/8518145/Hub%20Resolution%20New%20Theme/images/Logo.png" alt="logo"></a>
              </td>
            </tr>
            <tr>
              <td style="height:2px; max-width:62px;display:block;background-color:#FFB200;margin-top: 20px;">

              </td>
            </tr>
            <tr>
              <td style="padding-top: 20px;">Hi ${name},</td>
            </tr>
            <tr>
              <td style="padding-top: 20px;">Thank you for downloading our Hero module.</td>
            </tr>
            <tr>
              <td style="padding-top: 20px;">If you need any assistance with Hubspot or the Hero module please
                feel
                free to contact me. I'm always happy to help and available for a quick conversation.</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>

        <td>
          <table class="viewAs mp35-15" width="600" cellspacing="0" align="center" cellpadding="0"
            style="padding:40px 10px; max-width:100%; background-color:#050A30;">
            <tr>
              <td class="m0"
                style="color: #fff;font-size: 18px;font-weight: 700;line-height: 1.44;border-left: 2px solid #FFB200;padding: 5px 15px ; margin: 0 10px;    display: block;">
                Are you also looking for <span class="highlighter">developer support?</span>
              </td>
            </tr>
            <tr>
              <td class="m0"
                style="padding-top: 20px; color: #fff;font-size: 14px;font-weight: 400;line-height: 1.57; margin: 0 10px;    display: block;">
                We can help you
                with any guidance you need with development and Hubspot.</td>
            </tr>
            <tr>
              <td style="padding-top: 14px;">
                <table cellspacing="0" cellpadding="0" class="tableBlock" width="100%">
                  <tr>
                    <td class="mpl0 mpr0" style="padding: 10px; width: 50%; ">
                      <table cellspacing="0" class="min-heightAuto" cellpadding="0" width="100%"
                        style="padding: 32px 20px;min-height: 219px; background-color: #ffffff;border-radius: 6px;">
                        <tr>
                          <td>
                            <img src="https://8518145.fs1.hubspotusercontent-na1.net/hubfs/8518145/Hub%20Resolution%20New%20Theme/images/hubspot-website-maintenance.png"alt="hubspot-website-maintenance">
                          </td>
                        </tr>
                        <tr>
                          <td
                            style="padding-top: 15px;font-size: 14px;font-weight: 700;line-height: 1.57; color: #050A30;">
                            HubSpot website maintenance
                          </td>
                        </tr>
                        <tr>
                          <td
                            style="font-size: 14px;font-weight: 400;line-height: 1.57; color: #595959;">
                            We can help you with your website needs and maintenance that you need.
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td class="mpl0 mpr0" style="padding: 10px; width: 50%;">
                      <table cellspacing="0" cellpadding="0" class="min-heightAuto" width="100%"
                        style="padding: 32px 20px;min-height: 219px; background-color: #ffffff;border-radius: 6px;">
                        <tr>
                          <td>
                            <img src="https://8518145.fs1.hubspotusercontent-na1.net/hubfs/8518145/Hub%20Resolution%20New%20Theme/images/Bug%20Fixing%202%20(2).png" alt="Bug-Fixing">
                          </td>
                        </tr>
                        <tr>
                          <td
                            style="padding-top: 15px;font-size: 14px;font-weight: 700;line-height: 1.57; color: #050A30;">
                            Bug fixing
                          </td>
                        </tr>
                        <tr>
                          <td
                            style="font-size: 14px;font-weight: 400;line-height: 1.57; color: #595959;">
                            We can help you with any minor fixing that you need with Hubspot CMS and
                            CRM.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td class="mpl0 mpr0" style="padding:10px; width: 50%;">
                      <table cellspacing="0" cellpadding="0" width="100%" class="min-heightAuto"
                        style="padding: 32px 20px;min-height: 219px; background-color: #ffffff;border-radius: 6px;">
                        <tr>
                          <td>
                            <img src="https://8518145.fs1.hubspotusercontent-na1.net/hubfs/8518145/Hub%20Resolution%20New%20Theme/images/Website%20optimization%201%20(2).png" alt="Website-optimization">
                          </td>
                        </tr>
                        <tr>
                          <td
                            style="padding-top: 15px;font-size: 14px;font-weight: 700;line-height: 1.57; color: #050A30;">
                            Website optimization
                          </td>
                        </tr>
                        <tr>
                          <td
                            style="font-size: 14px;font-weight: 400;line-height: 1.57; color: #595959;">
                            Is your website up for your business in Google? We can help you to keep
                            up the ranking and be the number one.
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td class="mpl0 mpr0" style="padding:10px; width: 50%; ">
                      <table cellspacing="0" cellpadding="0" width="100%" class="min-heightAuto"
                        style="padding: 32px 20px;min-height: 219px; background-color: #ffffff;border-radius: 6px;">
                        <tr>
                          <td>
                            <img src="https://8518145.fs1.hubspotusercontent-na1.net/hubfs/8518145/Hub%20Resolution%20New%20Theme/images/Module%20Updates%20(2).png" alt="Module-Updates">
                          </td>
                        </tr>
                        <tr>
                          <td
                            style="padding-top: 15px;font-size: 14px;font-weight: 700;line-height: 1.57; color: #050A30;">
                            Module updates
                          </td>
                        </tr>
                        <tr>
                          <td
                            style="font-size: 14px;font-weight: 400;line-height: 1.57; color: #595959;">
                            For any changes in your current website or module we are there to help
                            you and get it done.
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>

            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td>
          <table class="viewAs mp35-15 tableBlock" width="600" cellspacing="0" align="center" cellpadding="0"
            style="padding:40px 20px; max-width:100%; background-color:#ffffff;">
            <tr>
              <td class="mpl0 mpr0 mTxt-center"
                style="padding: 0 33px;font-size: 18px;font-weight: 600;line-height: 1.44;color: #050A30;    width: 75%;">
                Schedule a Free call and talk to us.
              </td>
              <td class="mpl0 mpr0 mpt-15 mTxt-center" style="    width: 25%;padding-left: 15px;">
                <a href="https://meetings.hubspot.com/neel-kalaria"> <img src="https://8518145.fs1.hubspotusercontent-na1.net/hubfs/8518145/Hub%20Resolution%20New%20Theme/images/CTA-btn.png"
                    alt="CTA Button"></a>
              </td>
            </tr>

          </table>
        </td>
      </tr>
      <tr>

        <td>
          <table class="viewAs mp35-15" width="600" cellspacing="0" align="center" cellpadding="0"
            style="padding:40px 20px; max-width:100%; background-color:#050A30;">
            <tr>
              <td style="color: #fff;    color: #fff;font-size: 14px;font-weight: 400;line-height: 1.57;">
                502 Sakar-9 Beside old Reserve Bank of India, Ashram Road, Ahmedabad, Gujarat 380009.
              </td>
            </tr>
            <tr>
              <td style="padding-top: 20px;">
                <table cellspacing="0" cellpadding="0" width="100%">
                  <tr>
                    <td style="padding-right: 15px;display: inline-block;width: auto;">
                      <a href="https://www.facebook.com/Hubresolution" target="_blank">
                        <img src="https://8518145.fs1.hubspotusercontent-na1.net/hubfs/8518145/Hub%20Resolution%20New%20Theme/images/facebook.png" alt="facebook">
                      </a>
                    </td>
                    <td style="padding-right: 15px;display: inline-block;width: auto;">
                      <a href="https://www.linkedin.com/company/hub-resolution/" target="_blank">
                        <img src="https://8518145.fs1.hubspotusercontent-na1.net/hubfs/8518145/Hub%20Resolution%20New%20Theme/images/linkedin.png" alt="linkedin">
                      </a>
                    </td>
                    <td style="padding-right: 15px;display: inline-block;width: auto;">
                      <a href="https://twitter.com/HubResolution" target="_blank">
                        <img src="https://8518145.fs1.hubspotusercontent-na1.net/hubfs/8518145/Hub%20Resolution%20New%20Theme/images/twitter-x.png" alt="twitter-x">
                      </a>
                    </td>
                    <td style="padding-right: 15px;display: inline-block;width: auto;">
                      <a href="https://www.instagram.com/hubresolution" target="_blank">
                        <img src="https://8518145.fs1.hubspotusercontent-na1.net/hubfs/8518145/Hub%20Resolution%20New%20Theme/images/instagram.png" alt="instagram">
                      </a>
                    </td>

                  </tr>
                </table>
              </td>
            </tr>


          </table>
        </td>
      </tr>

    </table>

    </body>

    </html>`
  }

  transporter.sendMail(mailOptions, async function (error, info) {
    if (error) {
      console.log(error)
    } else {
      console.log('Email sent: ' + info.response)

      const markContactAsGreetingsSent = await hubspotClient.apiRequest({
        method: 'patch',
        path: '/crm/v3/objects/contacts/' + contact.id,
        body: {
          properties: {
            greeting_mail_status: ''
          }
        }
      })
      const markContactAsGreetingsSentResp = await markContactAsGreetingsSent.json()
      console.log(markContactAsGreetingsSentResp)
    }
  })
}
/**
 * Authorize with service account and get jwt client
 *
 */
async function authorize () {
  const jwtClient = new google.auth.JWT(
    pkey.client_email,
    null,
    pkey.private_key,
    SCOPES
  )
  await jwtClient.authorize()
  return jwtClient
}

async function uploadFile (authClient) {
  const drive = google.drive({ version: 'v3', auth: authClient })
  const finalPath = path.resolve(__dirname, '../../dump.sql')
  const file = await drive.files.create({
    media: {
      body: createReadStream(finalPath)
    },
    fields: 'id',
    requestBody: {
      name: 'DB_BKP',
      parents: ['10CLLq5IBi3WAZWZ9YMsd4MNf-idAYwZd'],
      mimeType: 'application/sql'

    }
  })

  console.log(file)
}

exports.app = app
