const mongoose = require("mongoose");
const mongoose_delete = require('mongoose-delete');

const AddressSchema = new mongoose.Schema({
    street: { type: String },
    number: { type: String },
    postal: { type: String },
    city: { type: String },
    province: { type: String }
}, { _id: false });

const PriceSchema = new mongoose.Schema({
    format: { type: String, enum: ['material', 'hours'], required: true }, 
    unit: { type: String },
    concept: { type: String, required: true },
    price: { type: Number, required: true, min: 0 }
}, { _id: false });


const ProjectSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users',
            required: true,
            index: true
        },
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'clients',
            required: true,
            index: true
        },
        
        name: { 
            type: String,
            required: true
        },
        projectCode: {
            type: String,
            index: true 
        },
        code: {
            type: String
        },
        address: {
            type: AddressSchema,
            default: null
        },
        begin: { type: String }, 
        end: { type: String },
        notes: { type: String, trim: true },
        isActive: {
            type: Boolean,
            default: true 
        },
        unitPrices: {
            type: [PriceSchema],
            default: []
        },
        amount: {
            type: Number,
            min: 0,
            default: null
        }
    },
    {
        timestamps: true, 
        versionKey: false
    }
);


// Prevent the same user from creating projects with the same 'projectCode' (or 'name'?) FOR THE SAME CLIENT
// Adjust the unique fields as needed based on business logic (name? code? projectCode?)
ProjectSchema.index({ userId: 1, clientId: 1, projectCode: 1 }, { unique: true, sparse: true }); 


ProjectSchema.plugin(mongoose_delete, {
    overrideMethods: 'all',
    deletedAt: true,
    indexFields: ['deleted', 'deletedAt']
});


module.exports = mongoose.model("projects", ProjectSchema);