const express = require('express')
const app = express()
const port = 3434
const api = require('./api')

// require('./keysafe')

require('dotenv').config();

app.use('/api', api)

app.use('/static', express.static('public'))

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
