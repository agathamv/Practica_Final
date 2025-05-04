const mongoose = require("mongoose");
const mongoose_delete = require('mongoose-delete');

const CompanySchema = new mongoose.Schema({
    nombre: { type: String },
    cif: {
        type: String
    },
    street: { type: String },
    number: { type: String }, 
    postal: { type: String },
    city: { type: String },
    province: { type: String },
}, { _id: false });


const UsersModel = new mongoose.Schema(
    {
        email: {
            type: String,
            unique: true,
            required: true,
        },
        password: {
            type: String,
            select: false
        },
        codigo: {
            type: String,
            select: false
        },
        intentos: {
            type: Number,
            default: 3,
            select: false
        },
        status: {
            type: Boolean,
            default: false 
        },
        role: {
            type: String,
            enum: ["user", "autonomo", "invitado"],
            default: "user"
        },
        nombre: {
            type: String,
        },
        apellidos: {
            type: String,
        },
        nif: {
            type: String,
        },
        company: {
            type: CompanySchema,
            default: null 
        },
        logo: {
            type: String
        },
        //deleted: {
        //    type: Boolean,
        //    default: false,
        //    select: false
        //}
        
        resetPasswordToken: { type: String, select: false },
        resetPasswordExpires: { type: Date, select: false },
 
        
        invitationToken: { type: String, select: false },
        invitationExpires: { type: Date, select: false },
        invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'users', select: false } // Optional: Track inviter
 
    },
    {
        timestamps: true,
        versionKey: false
    }
);


UsersModel.plugin(mongoose_delete, {
    overrideMethods: 'all',
    deletedAt: true,
    indexFields: ['deleted', 'deletedAt'] // Opcional: Indexar campos para mejor rendimiento
});



module.exports = mongoose.model("users", UsersModel);