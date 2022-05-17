const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DV_USER}:${process.env.DV_PASS}@cluster0.xk3fe.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run(){
    try{
        await client.connect();
        const serviceCollection = client.db('docotors_portal').collection('services');
        console.log('connected');

        app.get('/service', async(req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        })

    }
    finally{}
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from Doctors Uncle');
})

app.listen(port, () => {
  console.log(`docotrs portal server is listening ${port}`)
})