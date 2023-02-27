const express = require('express')
const moment = require('moment/moment')
const KeySafe = require('../lib')
const router = express.Router()
require('dotenv').config();

console.log("here 01 : /api handler")

const keySafe = new KeySafe(process.env.KEYSAFE_CUSTOMER_ID, process.env.KEYSAFE_CUSTOMER_KEY, process.env.KEYSAFE_CUSTOMER_SECRET)
router.use(keySafe.authenticate)

// middleware that is specific to this router
router.use((_req, res, next) => {
    // console.log('Time: ', Date.now())
    next()
})
// define the home page route
router.get('/time', (_req, res) => {
    res.send(moment().format('MMMM Do YYYY, h:mm:ss.SSS a')).status(200)
})

module.exports = router
