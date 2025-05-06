const mongoose = require('mongoose')

const dbConnect = (DB_URI) => {
    if (!DB_URI) {
        console.error("MONGO DB URI NOT PROVIDED!");
        return;
    }
    console.log("Conectando a la BD:", DB_URI);
    mongoose.set('strictQuery', false);

    try{
        mongoose.connect(DB_URI);
    }catch(error){
        console.err("Error conectando a la BD:", error);
    }

    mongoose.connection.on("connected",() => console.log("Conectado a la BD"));
}
module.exports = dbConnect;