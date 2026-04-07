const express = require("express");
const router = express.Router();
const Gallery = require("../models/Gallery");

// Middleware: require login for all order routes
function requireLogin(req, res, next) {
    if (!req.session.username) {
        return res.redirect("/");
    }
    next();
}

// GET /order?image=cat.jpg  -> show order/purchase page
router.get("/", requireLogin, async function (req, res) {
    var filename = req.query.image;

    if (!filename || filename === "default.jpg") {
        return res.redirect("/");
    }

    try {
        var item = await Gallery.findOne({ filename: filename }).lean();

        if (!item) {
            return res.redirect("/");
        }

        res.render("order", {
            item: item,
            username: req.session.username
        });
    } catch (err) {
        console.error("Order GET error:", err);
        res.redirect("/");
    }
});

// POST /order/buy -> mark image as Sold, then return to gallery showing default
router.post("/buy", requireLogin, async function (req, res) {
    var filename = req.body.filename;
    try {
        await Gallery.updateOne({ filename: filename }, { $set: { status: "S" } });
        res.redirect("/?image=default.jpg");
    } catch (err) {
        console.error("Buy error:", err);
        res.redirect("/");
    }
});

// POST /order/cancel -> return to gallery still showing the image
router.post("/cancel", requireLogin, function (req, res) {
    var filename = req.body.filename;
    res.redirect("/?image=" + encodeURIComponent(filename));
});

module.exports = router;
