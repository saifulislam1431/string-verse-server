const express = require("express");
const cors = require("cors");
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_INTENTS_SK)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8cnv71c.mongodb.net/?retryWrites=true&w=majority`;

app.use(cors());
app.use(express.json());


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "Unauthorized Access" })
  }
  const token = authorization.split(' ')[1]
  // console.log(token);
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
    const paymentCollection = client.db("stringVerse").collection("payments");

    // JWT
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '3h' })
      res.send({ token })
    })

    //Verify Admin

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const result = await userCollection.findOne(query)
      if (result?.role !== "admin") {
        return res.status(403).send({ error: true, message: "Forbidden access" })
      }
      next()
    }

    //Verify Admin

    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const result = await userCollection.findOne(query)
      if (result?.role !== "instructor") {
        return res.status(403).send({ error: true, message: "Forbidden access" })
      }
      next()
    }


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

    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result)
    })

    app.get("/users/profile", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const query = {email: email};
      const result = await userCollection.findOne(query);
      res.send(result)
    })


    // Admin APIs


    app.patch("/users/admin/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const userUpdate = {
        $set: {
          role: "admin"
        }
      };
      const result = await userCollection.updateOne(filter, userUpdate);
      res.send(result);
    })

    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);

      const result = { admin: user?.role === "admin" }
      res.send(result);
    })

    app.patch("/popular-classes/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const newData = req.body;
      const updateDoc = {
        $set: {
          status: newData.status,
          feedback: newData.feedback || "No Feedback!"
        }
      }
      const result = await classesCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    // Instructors APIs
    app.patch("/users/instructor/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const userUpdate = {
        $set: {
          role: "instructor"
        }
      };
      const result = await userCollection.updateOne(filter, userUpdate);
      res.send(result);
    })

    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);

      const result = { instructor: user?.role === "instructor" }
      res.send(result);
    })

    app.get("/instructor-classes", verifyJWT, verifyInstructor, async (req, res) => {
      const email = req.query.email;
      const query = { instructorEmail: email }
      const result = await classesCollection.find(query).toArray()
      res.send(result)
    })


    // Classes Apis
    app.get("/popular-classes", async (req, res) => {
      const result = await classesCollection.find({}).sort({ numberOfStudents: -1 }).toArray()
      res.send(result)
    })

    app.post("/popular-classes", verifyJWT, verifyInstructor, async (req, res) => {
      const data = req.body;
      const result = await classesCollection.insertOne(data);
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

    app.delete("/selected-classes-cart/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await selectedClassesCollection.deleteOne(query)
      res.send(result);
    })

    // Payment related apis

    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: [
          "card"
        ]
      })
      res.send({
        clientSecret: paymentIntent.client_secret,
      })
    })

    app.post("/payment", verifyJWT, async (req, res) => {
      const data = req.body;
      const result = await paymentCollection.insertOne(data);
      const query = { _id: { $in: data.selectedClasses.map(id => new ObjectId(id)) } }
      const deletedRes = await selectedClassesCollection.deleteMany(query)
      res.send({ result, deletedRes })
    })

    app.get("/payment", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const result = await paymentCollection.find({ email: email }).toArray();
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