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
        const bookingCollection = client.db('docotors_portal').collection('booking');
        console.log('connected');



        app.get('/service', async(req, res) => {
            const query = {};
            const cursor = serviceCollection.find(query);
            const services = await cursor.toArray();
            res.send(services);
        });

        /*
        * API naming convention
        * app.get('/booking') // get all booking in this collection. or get more than one or by filter.
        * app.get('/booking/:id') // get a specific booking
        * app.post('/booking') // add a new booking
        * app.patch('/booking/:id') // update
        * app.delete('/booking/:id') // delete
        */

        app.post('/booking', async (req, res) => {
           const booking = req.body;
           const query = {treatment: booking.treatment, date: booking.date, patient: booking.patient}
           const exist = await bookingCollection.findOne(query)
           if(exist){
             return res.send({success: false, booking: exist})
           }
           const result = await bookingCollection.insertOne(booking);
           return res.send({ success: true , result });
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