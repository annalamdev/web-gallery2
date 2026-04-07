require("dotenv").config();
const express = require("express");
const exphbs = require("express-handlebars");
const path = require("path");
const fs = require("fs");
const clientSessions = require("client-sessions");
const randomstring = require("randomstring");
const mongoose = require("mongoose");

const Gallery = require("./models/Gallery");
const orderRouter = require("./routes/order");

const app = express();
const PORT = process.env.PORT || 3000;

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error("ERROR: MONGODB_URI environment variable is not set");
    process.exit(1);
}

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB connection error:", err));

// Handlebars setup with partials
const Handlebars = require("handlebars");
const { allowInsecurePrototypeAccess } = require("@handlebars/allow-prototype-access");

app.engine(".hbs", exphbs.engine({
    extname: ".hbs",
    partialsDir: path.join(__dirname, "views", "partials"),
    handlebars: allowInsecurePrototypeAccess(Handlebars)
}));
app.set("view engine", ".hbs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));

app.use(clientSessions({
    cookieName: "session",
    secret: randomstring.generate(),
    duration: 30 * 60 * 1000,
    activeDuration: 5 * 60 * 1000
}));

const users = JSON.parse(fs.readFileSync(path.join(__dirname, "user.json"), "utf8"));

// Mount the order router (Express.Router)
app.use("/order", orderRouter);

// Helper to build label from filename
function buildLabel(filename) {
    return filename.substring(0, filename.lastIndexOf("."));
}

// Home / Gallery page
app.get("/", async function (req, res) {
    if (!req.session.username) {
        return res.render("login", { errorMessage: null });
    }

    try {
        // Only show available (status "A") images
        const docs = await Gallery.find({ status: "A" });

        const selectedImage = req.query.image || "default.jpg";
        const isDefault = (selectedImage === "default.jpg");

        let selectedLabel = "Gallery";
        if (!isDefault) {
            const found = docs.find(d => d.filename === selectedImage);
            if (found) {
                selectedLabel = buildLabel(found.filename);
            } else {
                // try to find even if sold (e.g. cancel just happened on a now-sold one)
                const any = await Gallery.findOne({ filename: selectedImage });
                if (any) selectedLabel = buildLabel(any.filename);
            }
        }

        const images = docs.map(d => ({
            filename: d.filename,
            label: buildLabel(d.filename),
            selected: d.filename === selectedImage
        }));

        res.render("gallery", {
            images: images,
            selectedImage: selectedImage,
            selectedLabel: selectedLabel,
            isDefault: isDefault,
            username: req.session.username
        });
    } catch (err) {
        console.error("Gallery load error:", err);
        res.status(500).send("Database error");
    }
});

// Login submission
app.post("/", async function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    if (!users[username]) {
        return res.render("login", { errorMessage: "Not a registered username" });
    }
    if (users[username] !== password) {
        return res.render("login", { errorMessage: "Invalid password" });
    }

    try {
        // On successful login, reset all images to Available ("A")
        await Gallery.updateMany({}, { $set: { status: "A" } });
        req.session.username = username;
        res.redirect("/");
    } catch (err) {
        console.error("Login reset error:", err);
        res.render("login", { errorMessage: "Database error, try again" });
    }
});

app.get("/logout", function (req, res) {
    req.session.reset();
    res.redirect("/");
});

app.listen(PORT, function () {
    console.log("Server is running on http://localhost:" + PORT);
});

module.exports = app;
