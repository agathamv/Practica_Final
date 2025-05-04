require('dotenv').config();
const express = require("express");
const cors = require("cors");
const dbConnect = require('./config/mongo');
const { handleHttpError } = require('./utils/handleError');

const app = express();

dbConnect();


app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/user", require("./routes/users"));

app.use("/api/client", require("./routes/clients")); 

app.use("/api/project", require("./routes/projects"));

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