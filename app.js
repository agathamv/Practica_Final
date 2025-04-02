const express = require("express");
const cors = require("cors");
require('dotenv').config();
const dbConnect = require('./config/mongo');
const app = express();

//Le decimos a la app de express() que use cors para evitar el error Cross-Domain (XD)
app.use(cors());

//para utilizar el req.body
app.use(express.json());

app.use("/api", require("./routes"));

const userRoutes = require("./routes/users");
app.use("/api/user", userRoutes);


const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log("Servidor escuchando en el puerto " + port);
})

dbConnect();