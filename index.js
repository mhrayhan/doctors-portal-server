const express = require('express')
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
var jwt = require('jsonwebtoken');
const app = express()
const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DV_USER}:${process.env.DV_PASS}@cluster0.xk3fe.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {

    return res.status(401).send({ message: 'Unauthorized Access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden Access' })
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db('docotors_portal').collection('services');
    const bookingCollection = client.db('docotors_portal').collection('booking');
    const userCollection = client.db('docotors_portal').collection('users');
    const doctorCollection = client.db('docotors_portal').collection('doctors');
    console.log('connected');


    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requisterAccount = await userCollection.findOne({ email: requester });
      if (requisterAccount.role === 'admin') {
        next();
      } else {
        res.status(403).send({ message: 'forbidden' });
      }
    }

    app.get('/service', async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const services = await cursor.toArray();
      res.send(services);
    });

    app.get('/user', async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    })

    // check user role
    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin });
    })

    // Make Admin ==========
    app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: 'admin' },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ result, token });
    })

    /*
    * API naming convention
    * app.get('/booking') // get all booking in this collection. or get more than one or by filter.
    * app.get('/booking/:id') // get a specific booking
    * app.post('/booking') // add a new booking
    * app.patch('/booking/:id') // update
    * app.delete('/booking/:id') // delete
    */

    // get booking collection
    app.get('/booking', verifyJWT, async (req, res) => {
      const patient = req.query.patient;
      const decodedEmail = req.decoded.email;
      if (patient === decodedEmail) {
        const query = { patient: patient };
        const bookings = await bookingCollection.find(query).toArray();
        res.send(bookings);
      }
      else {
        return res.status(403).send({ message: 'Forbidden Access' });
      }
    })

    // get my appointment API
    app.get('/booking/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await bookingCollection.findOne(query);
      res.send(booking);
    })

    // appointment booking api
    app.post('/booking', async (req, res) => {
      const booking = req.body;
      const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
      const exist = await bookingCollection.findOne(query)
      if (exist) {
        return res.send({ success: false, booking: exist })
      }
      const result = await bookingCollection.insertOne(booking);
      return res.send({ success: true, result });
    })


    // add doctor
    app.post('/doctor', verifyAdmin, async (req, res) => {
      const doctor = req.body;
      const result = await doctorCollection.insertOne(doctor);
      res.send(result);
    })


    // this is not proper way to query/
    // after learning more about mongodb. use aggregate lookup, pipeline, match, group.......
    app.get('/available', async (req, res) => {
      const date = req.query.date;
      // step 01: get all service
      const services = await serviceCollection.find().toArray();

      //step 02: get the bookin of that day.
      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();
      //step 03: for each service
      services.forEach(service => {
        // find bookings for that service . output [{},{},{}]
        const serviceBookings = bookings.filter(book => book.treatment === service.name);
        //select slots for ther service booking: ['', '', '']
        const bookedSlots = serviceBookings.map(book => book.slot);
        // select those slots that are not in bookedSlots 
        const available = service.slots.filter(slot => !bookedSlots.includes(slot));
        // set available to slots to make it easier
        service.slots = available;
      })
      res.send(services)
    })

  }
  finally { }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello from Doctors Uncle');
})

app.listen(port, () => {
  console.log(`docotrs portal server is listening ${port}`)
})