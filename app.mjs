import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Africastalking from "africastalking";
import { createUserDB, bundleLimit, QueryBundleBalance } from "./util/util.mjs";
import mysql from "mysql2";

const app = express();
const port = 8000;
const hostname = "0.0.0.0";

app.use(cors());
app.use(bodyParser.json());

/////////// Africa Is Talking /////////////////
const credentials = {
  apiKey: process.env.AFRICASTALKING_TOKEN,
  username: "livecrib",
};

const sms = Africastalking(credentials).SMS;
///////////////////////////////////////////////

const corsOptions = {
  origin: "*",
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};
/////////////////////////////////////////////

/////////////////DB///////////////////////////
const dbConfig = {
  host: process.env.MYSQLDB_HOST,
  user: "node",
  password: process.env.MYSQLDB_PASSWORD,
  database: "radius",
  port: 3306,
};
const db = mysql.createConnection(dbConfig);

main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(
    "mongodb+srv://samueldeya:m0t0m0t0@cluster0.qd7gjoz.mongodb.net/users-mobile-app?retryWrites=true&w=majority",
    { useNewUrlParser: true, useUnifiedTopology: true }
  );
}
const userSchema = new mongoose.Schema({
  number: String,
  password: String,
  email: String,
  gender: String,
  fullName: String,
  dob: Date,
  plan: Number,
  planBalance: Number,
});
const User = mongoose.model("User", userSchema);

const addsSchema = new mongoose.Schema({
  videoURL: String,
  addWebsiteURL: String,
  posterURL: String,
  accessPeriod: String,
});
const Add = mongoose.model("Add", addsSchema);

///////////////////////////////////////////////////////////

//////////////////// GET REQUESTS//////////////////////////

app.get("/adds", async (req, res) => {
  const adds = await Add.find();
  res.json(adds);
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

/////////////////// POST REQUESTS ///////////////////////////

app.post("/access", (req, res) => {
  const username = req.body.user;
  const plan = req.body.plan;
  console.log(plan);

  // Create user in DB
  createUserDB(username);

  if (plan === "10MB") {
    // userSessionTimeOut(600, username);
    bundleLimit(10485760, username);
  }
  if (plan === "20MB") {
    // userSessionTimeOut(1200, username);
    bundleLimit(20485760, username);
  }
  if (plan === "30MB") {
    // userSessionTimeOut(1800, username);
    bundleLimit(30485760, username);
  }

  res.json({ message: "access created", status: 200 });
});

app.post("/balance", async (req, res) => {
  const username = req.body.userName;
  QueryBundleBalance(username, res);
});

app.post("/signup", async (req, res) => {
  const signData = {
    number: req.body.number,
    password: req.body.password,
    email: "",
    gender: "",
    fullName: "",
    dob: "",
    plan: 0,
  };
  console.log(signData);
  // const newUser = new User (loginData)
  // await newUser.save()
  const numberExist = await User.findOne({ number: req.body.number });
  if (numberExist) {
    return res.json({ message: "number Exists", status: 403 });
  }
  await User.create(signData);

  res.json({ message: "login successful" });
});

app.post("/login", async (req, res) => {
  const foundUser = await User.findOne({ number: req.body.number }).exec();
  if (!foundUser) {
    res.json({ message: "user does not exist", status: 404 });
  }
  if (foundUser && foundUser.password !== req.body.password) {
    res.json({ message: "incorrect Password", status: 401 });
  }
  if (foundUser && foundUser.password === req.body.password) {
    const token = jwt.sign(
      {
        data: foundUser.number,
      },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.json({ message: "logged in", token: token });
  }
});

app.post("/profile", async (req, res) => {
  let greet;
  jwt.verify(
    req.body.token,
    process.env.SECRET_KEY,
    async function (err, foundUser) {
      if (err) {
        if (err.message === "jwt expired") {
          res.json({ message: "token expired" });
        }
      }
      if (foundUser) {
        const user = await User.findOne({ number: foundUser.data }).exec();
        const time = new Date();

        if (time.getHours() >= 0 && time.getHours() <= 12) {
          greet = "Good Morning !";
        }
        if (time.getHours() >= 12 && time.getHours() <= 17) {
          greet = "Good Afternoon !";
        }
        if (time.getHours() >= 18 && time.getHours() <= 23) {
          greet = "Good Evening !";
        }

        res.json({
          userNumber: user.number,
          name: user.fullName,
          greet: greet,
          gender: user.gender,
          dob: user.dob,
          email: user.email,
        });
      }
    }
  );
});

app.post("/editprofile", async (req, res) => {
  const user = jwt.verify(req.body.token, process.env.SECRET_KEY);

  const foundUser = await User.findOneAndUpdate(
    { number: user.data },
    {
      email: req.body.email,
      gender: req.body.gender,
      fullName: req.body.fullName,
      dob: req.body.dob,
    }
  );
  res.json({ message: "profile updated" });
});

app.post("/resetpassword", async (req, res) => {
  const user = req.body.number;
  const newPassword = Math.random().toString(36).slice(-8);
  const foundUser = await User.findOne({ number: user }).exec();

  if (!foundUser) {
    res.json({ message: "user does not exist", status: 404 });
  }
  if (foundUser) {
    const updatedUser = await User.findOneAndUpdate(
      { number: user },
      { password: newPassword },
      { new: true }
    );
    if (updatedUser) {
      res.json({ message: "passsword updated", status: 201 });
    } else {
      res.json({ message: "password update failed", status: 404 });
    }
  }

  const options = {
    to: [`+254${user.slice(1)}`],
    message: `Recovery Password: ${newPassword}`,
  };

  async function sendSMS() {
    try {
      const result = await sms.send(options);
      console.log(result);
    } catch (err) {
      console.error(err);
    }
  }
  sendSMS();
});

app.post("/passwordrecovery", async (req, res) => {
  const { resetPassword, newPassword } = req.body;
  const foundUser = await User.findOne({ password: resetPassword }).exec();
  if (!foundUser) {
    res.json({ message: "Recovery Password is wrong", status: 404 });
  }

  if (foundUser) {
    const updatedUser = await User.findOneAndUpdate(
      { password: resetPassword },
      { password: newPassword },
      { new: true }
    );
    if (updatedUser) {
      res.json({ message: "passsword updated", status: 201 });
    } else {
      res.json({ message: "password update failed", status: 404 });
    }
  }
});

app.listen(port, hostname, () => {
  console.log(`Example app listening on port ${port} on ${hostname}`);
});
