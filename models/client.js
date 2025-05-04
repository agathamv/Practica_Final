const mongoose = require("mongoose");
const mongoose_delete = require('mongoose-delete');


const AddressSchema = new mongoose.Schema({
    street: { type: String },
    number: { type: String },
    postal: { type: String },
    city: { type: String },
    province: { type: String }
}, { _id: false }); 

const clientsModel = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
            required: true,
            index: true
        },
        name: {
            type: String,
            required: true
        },
        cif: {
            type: String,
            required: true
        },
        address: {
            type: AddressSchema,
            default: null
        }
    },
    {
        timestamps: true,
        versionKey: false
    }
);

//asegura que un usuario no pueda añadir el mismo cliente (por CIF) más de una vez.
//permite que diferentes usuarios añadan clientes con el mismo CIF.
clientsModel.index({ userId: 1, cif: 1 }, { unique: true });


clientsModel.plugin(mongoose_delete, {
    overrideMethods: 'all', 
    deletedAt: true,
    indexFields: ['deleted', 'deletedAt'] 
});


module.exports = mongoose.model("clients", clientsModel); 