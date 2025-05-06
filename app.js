require('dotenv').config();
const express = require("express");
const cors = require("cors");
const dbConnect = require('./config/mongo');
const { handleHttpError } = require('./utils/handleError');
const morganBody = require("morgan-body")
const {IncomingWebhook} = require("@slack/webhook")

const swaggerUi = require("swagger-ui-express")
const swaggerSpecs = require("./docs/swagger")

const app = express();

const webHook = new IncomingWebhook(process.env.SLACK_WEBHOOK)

const loggerStream = {
    write: message => {
        webHook.send({
            text: message
        })
    },
}
morganBody(app, {
    noColors: true, //limpiamos el String de datos lo máximo posible antes de mandarlo a Slack
    skip: function(req, res) { //Solo enviamos errores (4XX de cliente y 5XX de servidor)
        return res.statusCode < 400
    },
    stream: loggerStream
})

dbConnect();


app.use(cors());

app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

app.use(express.urlencoded({ extended: true }));

app.use("/api/user", require("./routes/users"));

app.use("/api/client", require("./routes/clients")); 

app.use("/api/project", require("./routes/projects"));

app.use("/api/deliverynote", require("./routes/deliveryNotes"));

app.use((req, res, next) => {
    handleHttpError(res, "ROUTE_NOT_FOUND", 404);
});


app.use((err, req, res, next) => {
    console.error("UNHANDLED_ERROR:", err); 
    const statusCode = err.status || 500;

    if (err.name === 'ValidationError') {
        
        return handleHttpError(res, err.message, 422); 
    }

    if (statusCode !== 500) { 
        return handleHttpError(res, err.message || "ERROR", statusCode);
    }

    handleHttpError(res, "INTERNAL_SERVER_ERROR", statusCode); 
});


const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});