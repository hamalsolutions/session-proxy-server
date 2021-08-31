require("dotenv").config();
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { v4: uuidv4 } = require("uuid");
var session = require("express-session");
const app = express();

app.get("/", (req, res) => {
  res.send("you are hiting the starting path");
});
app.use(
  session({
    genid: (req) => {
      return uuidv4(); // use UUIDs for session IDs
    },
    secret: "veryimportantsecret",
    name: "secretname",
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      maxAge: 600000, // Time is in miliseconds
    },
  })
);
app.use(
  createProxyMiddleware("/api/authenticate", {
    target: process.env.API_SERVICE_URL,
    changeOrigin: true,
    onProxyRes: function (proxyRes, req, res) {
      if (proxyRes.statusMessage === "OK") {
        proxyRes.on("data", function (data) {
          data = JSON.parse(data.toString("utf-8"));
          console.log(data.accesssToken);
          req.session.accesssToken = data.accesssToken;
        });
      }
    },
  })
);

app.listen(process.env.PORT, () => {
  console.log(
    `sever listening at ${process.env.PROXY_URL}:${process.env.PORT}`
  );
});
