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
const PORT = process.env.PORT || 3000;
var corsOptions = {
  origin: process.env.APP_URL,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
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
