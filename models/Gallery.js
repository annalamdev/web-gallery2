const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema({
    filename: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    status: { type: String, default: "A" }
}, { collection: "gallery" });

module.exports = mongoose.model("Gallery", gallerySchema);
