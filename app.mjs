import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import twilio from "twilio";
import AfricasTalking from "africastalking";
import mysql from "mysql";
import {
  createUserDB,
  userSessionTimeOut,
  revokeUser,
  bundleLimit,
  QueryBundleBalance,
  accessRequest,
} from "./util/util.mjs";

const credentials = {
  apiKey: process.env.AFRICASTALKING_TOKEN,
  username: "livecrib",
};

const dbConfig = {
  host: "192.168.8.191",
  user: "node",
  password: "m0t0m0t0",
  database: "radius",
  port: 3306,
};

const sms = AfricasTalking(credentials).SMS;

const app = express();
const port = 8080;
const hostname = "0.0.0.0";

const corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
const jsonParser = bodyParser.json();

//////////////////TWILIO//////////////////////
const client = twilio(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);
//////////////////////////////////////////////

//////////////////nodemailer//////////////////
const transporter = nodemailer.createTransport({
  host: process.env.MAILJET_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAILJET_USER,
    pass: process.env.MAILJET_PASSWORD,
  },
});
async function sender() {
  // send mail with defined transport object
  const info = await transporter.sendMail({
    from: '"Fred Foo 👻" samueldeya@outlook.com', // sender address
    to: "samueldeya@gmail.com", // list of receivers
    subject: "Hello ✔", // Subject line
    text: "Hello world?", // plain text body
    html: "<b>Hello world?</b>", // html body
  });

  console.log("Message sent: %s", info.messageId);
}
/////////////////////////////////////////////

/////////////////DB///////////////////////////
main().catch((err) => console.log(err));

async function main() {
  await mongoose.connect(
    "mongodb+srv://samueldeya:m0t0m0t0@cluster0.qd7gjoz.mongodb.net/users-mobile-app?retryWrites=true&w=majority"
  );

  // use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
}
const userSchema = new mongoose.Schema({
  number: String,
  password: String,
  email: String,
  gender: String,
  fullName: String,
  dob: Date,
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
app.post("/access", jsonParser, (req, res) => {
  // User information
  const username = req.body.user;
  const plan = req.body.plan;

  // Create user
  createUserDB(username);

  //create session for the user
  if (plan === "10min") {
    // userSessionTimeOut(600, username);
    // revokeUser(username);
    bundleLimit(username);
  }
  if (plan === "20min") {
    userSessionTimeOut(1200, username);
  }
  if (plan === "30min") {
    userSessionTimeOut(1800, username);
  }

  res.json({ message: "access created", status: 200 });
});

app.get("/balance", async (req, res) => {
  const username = "0726500307";
  QueryBundleBalance(username, res);
});
app.get("/request", jsonParser, (req, res) => {
  const user = "sam";
  createUserDB(user);
  userSessionTimeOut(1200, user);
  res.json({ message: "ok" });
});

app.get("/adds", jsonParser, async (req, res) => {
  const adds = await Add.find();
  res.json(adds);
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/app", (req, res) => {
  res.redirect("http://192.168.8.155:3000/");
});

app.post("/signup", jsonParser, async (req, res) => {
  const signData = {
    number: req.body.number,
    password: req.body.password,
    email: "",
    gender: "",
    fullName: "",
    dob: "",
  };
  // const newUser = new User (loginData)
  // await newUser.save()
  const numberExist = await User.findOne({ number: req.body.number });
  if (numberExist) {
    return res.json({ message: "number Exists", status: 403 });
  }
  await User.create(signData);

  res.json({ message: "login successful" });
});

app.post("/login", jsonParser, async (req, res) => {
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

app.post("/profile", jsonParser, async (req, res) => {
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

app.post("/editprofile", jsonParser, async (req, res) => {
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

app.post("/resetpassword", jsonParser, async (req, res) => {
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

  sms
    .send(options)
    .then((response) => {
      console.log(response);
    })
    .catch((error) => {
      console.log(error);
    });
});

app.post("/passwordrecovery", jsonParser, async (req, res) => {
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
