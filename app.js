const express = require("express")
const axios = require("axios")
require('dotenv').config()
const fs = require('fs')

const app = express();
const port = 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
/**
 * 
 * @param object data 
 * @returns object
 * description return preview data
 */
async function getPreviewData(data) {
  try{
      const fetchDetails = `${process.env.PSDK}/${process.env.PROJECT_ID}/items?system.codename[eq]=${data.items[0].codename}&language=${data.items[0].language}`;
      const previewData = await axios.get(fetchDetails,{
        headers: {
        'Authorization': `Bearer ${process.env.PTOKEN}`
       }
      }).then((response) =>{
        return response.data;
      });
      return previewData;
  }catch (error) {
    console.error('An error occurred:', error);
  }
}

/**
 * 
 * @param object data 
 * @returns object
 * description: return published data
 */
async function getDeliverData(data){
  try{
    const fetchDetails = `${process.env.DSDK}/${process.env.PROJECT_ID}/items?system.codename[eq]=${data.items[0].codename}&language=${data.items[0].language}`;

    const responseData = await axios.get(fetchDetails).then((response) =>{
      return response.data;
    });
    return responseData;
}catch (error) {
  console.error('An error occurred:', error);
}
}

/**
 * 
 * @param elements 
 * @returns assset object
 */
function filterAssets(elements){
  for (const entry of Object.entries(elements)) {
   const quote = Object.values(entry)
   if(quote[1].type == 'asset') return quote[1].value
  }
}
/**
 *  Main endpoint to received webhook from Kontent.ai
 */
app.post("/webhook", async (req,res) =>{
    const data = req.body.data;
    const message = req.body.message;
    if(data.length == 0){
      res.status(200).send('empty payload');
    }

    const workflow_step = await getPreviewData(data).then((previewData)=>{
      return previewData.items[0].system.workflow_step;
    }).catch((err)=>{console.log(err)});

    const operation = message.operation == 'upsert' || message.operation.includes('draft') ? 'Draft' : message.operation;
    console.log(`webhook called: ${data.items[0].id}`)

    const sql = `Insert INTO content_update(id,type,operation,collection,language,content_type,workflow_step,ktimestamp)Values('${data.items[0].id}', '${data.items[0].type}','${operation}','${data.items[0].collection}', '${data.items[0].language}','${data.items[0].type}','${workflow_step}','${message.created_timestamp}');`+"\n";
    fs.appendFile("activityBatch.sql",sql, err => {
      if (err) {
        throw err
      }
      console.log('activity File is updated.')
    });

    if(workflow_step == 'published')
    {
      console.log('called for published')
        const deliverData = await getDeliverData(data).then((responseData)=>{
          return responseData
        }).catch((err)=>{console.log(err)});
        
        const deliverItems = deliverData.items[0];
        const assetArr = filterAssets(deliverItems.elements);
        if(assetArr.length == 0)
        {
          assetname = ''
          asseturl=''
        }
        else
        {
          assetname = assetArr[0].name;
          asseturl=assetArr[0].url
        }
        const tags =  deliverItems.elements.tags.value.map(item => item.name);
        const assetSql = `Insert INTO content_asset(id,name,asset_name,asset_url,tags,collection,language,type)Values('${deliverItems.system.id}','${deliverItems.system.name}','${assetname}','${asseturl}','${tags}','${deliverItems.system.collection}','${data.items[0].language}','${deliverItems.system.type}');`+"\n";

        fs.appendFile("asset.sql",assetSql, err => {
          if (err) {
            throw err
          }
          console.log('asset File is updated.')
        });
    }
    res.status(200).send("ok");
});

app.listen(port,() =>{
    console.log(`app listening at http://localhost:${port}`);
})