const mongoose = require("mongoose")
const UsersModel = new mongoose.Schema(
    {
        email: {
            type: String,
            unique: true,
        },
        password:{
            type: String 
        },
        codigo:{ //codigo de verificacion
            type:Number,
        },
        intentos:{ //intentos de verificacion
            type:Number,
            default: 3
        },
        status:{ //estado de verificacion
            type:Boolean,
            default: false
        },
        role:{
            type: String,
            enum: ["user", "admin"],
            default: "user"
        },
        nombre:{
            type: String,
        },
        apellidos:{
            type: String,
        },
        nif:{
            type: String,
        },
        company:{
            nombre:{
                type: String,
            },
            cif:{
                type: String,
            },
            direccion:{
                type: String,
            }
        },
        deleted:{
            type: Boolean,
            default: false
        }

    },
    {
        timestamps: true,
        versionKey: false
    }
)

module.exports = mongoose.model("users", UsersModel) 