const express = require("express");
const cors = require("cors");
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8cnv71c.mongodb.net/?retryWrites=true&w=majority`;

app.use(cors());
app.use(express.json());


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "Unauthorized Access" })
  }
  const token = authorization.split(' ')[1]
  console.log(token);
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: "Unauthorized Access" })
    }
    req.decoded = decoded;
    next();
  })


}



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("stringVerse").collection("users");
    const classesCollection = client.db("stringVerse").collection("classes");
    const instructorCollection = client.db("stringVerse").collection("instructors");
    const selectedClassesCollection = client.db("stringVerse").collection("selectedCart");

    // JWT
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
      res.send({ token })
    })


    // User Apis
    app.post("/users", async (req, res) => {
      const user = req.body;
      const email = user.email;
      console.log(email);
      // const existUserEmail = {email: email}
      const existUser = await userCollection.findOne({ email: email });
      if (existUser) {
        return res.json("User Exist");
      }
      else {
        const result = await userCollection.insertOne(user);
        res.send(result);
      }
    })


    // Classes Apis
    app.get("/popular-classes", async (req, res) => {
      const result = await classesCollection.find({}).sort({ numberOfStudents: -1 }).toArray()
      res.send(result)
    })

    // instructors apis
    app.get("/popular-instructors", async (req, res) => {
      const result = await instructorCollection.find({}).sort({ NumberOfStudents: -1 }).toArray()
      res.send(result)
    })

    // Select Cart apis
    app.post("/selected-classes-cart", async (req, res) => {
      const body = req.body;
      const result = await selectedClassesCollection.insertOne(body);
      res.send(result)
    })

    app.get("/selected-classes-cart", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (!email) {
        return res.send([])
      }
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: "Forbidden Access" })
      }
      const query = { email: email }
      const result = await selectedClassesCollection.find(query).toArray();
      res.send(result)
    })

    app.delete("/selected-classes-cart/:id" , verifyJWT , async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await selectedClassesCollection.deleteOne(query)
      res.send(result);
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Server successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);








app.get("/", (req, res) => {
  res.send("String Verse server")
})

app.listen(port, () => {
  console.log(`This app is running at port ${port}`);
})