const mongoose = require('mongoose')

const dbConnect = () => {
    const db_uri = process.env.DB_URI;
    console.log("Conectando a la BD:", db_uri);
    mongoose.set('strictQuery', false);

    try{
        mongoose.connect(db_uri);
    }catch(error){
        console.err("Error conectando a la BD:", error);
    }

    mongoose.connection.on("connected",() => console.log("Conectado a la BD"));
}
module.exports = dbConnect;