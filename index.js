const express = require("express");
const cors = require("cors");
require('dotenv').config();
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8cnv71c.mongodb.net/?retryWrites=true&w=majority`;

app.use(cors());
app.use(express.json());




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

    // User Apis
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    })


    // Classes Apis
    app.get("/popular-classes", async (req, res) => {
      const result = await classesCollection.find({}).sort({ numberOfStudents: -1 }).toArray()
      res.send(result)
    })

    // 
    app.get("/popular-instructors", async (req, res) => {
      const result = await instructorCollection.find({}).sort({ NumberOfStudents: -1 }).toArray()
      res.send(result)
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