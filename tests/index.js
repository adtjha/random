const express = require('express')
const app = express()
const port = 8765

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/ping', (req, res) => {
    res.sendStatus(200)
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
