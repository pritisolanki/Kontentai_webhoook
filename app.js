const express = require("express")
const axios = require("axios")
require('dotenv').config()

const app = express();
const port = 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log(process.env.DSDK);

app.post("/webhook", (req,res) =>{
    console.log("webhook called")
    console.log(req.body);
    
    // const fetchDetails = `${process.env.DSDK}/${process.env.PROJECT_ID}/items?system.codename[eq]=${req.body.data.items[0].codename}`;
    // console.log(fetchDetails);
    // axios.get(fetchDetails).then((response) =>{
    //     console.log(response.data);
    // })
    res.status(200).send("ok");

});

app.listen(port,() =>{
    console.log(`app listening at http://localhost:${port}`);
})