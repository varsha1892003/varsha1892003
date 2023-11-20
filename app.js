const express = require('express')
var app = express();

app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.get("/", (req, res) => {
    res.send("i am run at 5000")
})

app.listen(5000, '0.0.0.0')
