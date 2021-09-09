require("dotenv").config();
const express = require("express");
const cors = require("cors");
const {
  createProxyMiddleware,
  responseInterceptor,
} = require("http-proxy-middleware");
const { v4: uuidv4 } = require("uuid");
var session = require("express-session");

const app = express();
const PORT = process.env.PORT || 5000;
var corsOptions = {
  origin: ["https://develop.d24n0gojm8f6nt.amplifyapp.com"],
  optionsSuccessStatus: 200,
};
var mwCache = Object.create(null);
function virtualHostSession(req, res, next) {
  var host = req.get("host");
  console.log(host);
  var hostSession = mwCache[host];
  if (!hostSession) {
    hostSession = mwCache[host] = session({
      genid: (req) => {
        return uuidv4(); // use UUIDs for session IDs
      },
      secret: "veryimportantsecret",
      name: "secretname",
      resave: false,
      saveUninitialized: true,
      cookie: {
        domain:
          host === "localhost:5000"
            ? ""
            : "https://develop.d24n0gojm8f6nt.amplifyapp.com",
        httpOnly: true,
        maxAge: 600000, // Time is in miliseconds
      },
    });
  }
  hostSession(req, res, next);
  //don't need to call next since hostSession will do it for you
}

app.use(virtualHostSession);
app.use(cors(corsOptions));
app.use(
  createProxyMiddleware("/api/authenticate", {
    target: process.env.API_SERVICE_URL,
    changeOrigin: true,
    selfHandleResponse: true,
    onProxyRes: responseInterceptor(
      async (responseBuffer, proxyRes, req, res) => {
        if (proxyRes.statusCode === 201) {
          let { accesssToken, ...rest } = JSON.parse(
            responseBuffer.toString("utf8")
          );
          req.session.accesssToken = accesssToken;
          return JSON.stringify(rest);
        }
        return responseBuffer;
      }
    ),
  })
);
app.use(
  createProxyMiddleware("/api", {
    target: process.env.API_SERVICE_URL,
    changeOrigin: true,
    onProxyReq: function onProxyReq(proxyReq, req) {
      proxyReq.setHeader("authorization", `Bearer ${req.session.accesssToken}`);
    },
  })
);
app.get("/", (req, res) => {
  res.send("you are hiting the starting path");
});
app.listen(process.env.PORT, () => {
  console.log(`sever listening at ${process.env.PROXY_URL}:${PORT}`);
});
