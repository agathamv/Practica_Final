const mongoose = require("mongoose");
const mongoose_delete = require('mongoose-delete');


const DeliveryNoteSchema = new mongoose.Schema(
    {
        
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true, index: true },
        clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'clients', required: true, index: true },
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'projects', required: true, index: true },

        format: {
            type: String,
            enum: ['hours', 'material'],
            required: true
        },
        workdate: { type: Date, required: true, default: Date.now },

        description: { type: String, trim: true }, 
        hours: { type: Number, min: 0 },      
        quantity: { type: Number, min: 0 },


        sign: { type: String, default: null },
        photo: { type: String, default: null },
        pdf: { type: String, default: null },
        isSigned: { type: Boolean, default: false },
        
        observerName: { type: String },
        observerNif: { type: String },
        observations: { type: String },
    },
    {
        timestamps: true,
        versionKey: false
    }
);


DeliveryNoteSchema.plugin(mongoose_delete, {
    overrideMethods: 'all',
    deletedAt: true,
    indexFields: ['deleted', 'deletedAt']
});

module.exports = mongoose.model("deliveryNotes", DeliveryNoteSchema);