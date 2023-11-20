'use strict'
const express = require('express')
const router = express.Router()
const authRouter = require('./auth.route')
const connectionRouter = require('./connection.route')
router.get('/status', (req, res) => { res.send({status: 'OK'}) }) // api status
router.use('/auth', authRouter) // mount auth paths
router.use('/connection', connectionRouter) // mount auth paths
module.exports = router
