const express = require("express");
const exphbs = require("express-handlebars");
const path = require("path");
const readline = require("linebyline");
const fs = require("fs");
const clientSessions = require("client-sessions");
const randomstring = require("randomstring");

const app = express();
const PORT = 3000;

app.engine(".hbs", exphbs.engine({ extname: ".hbs" }));
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

var users = JSON.parse(fs.readFileSync(path.join(__dirname, "user.json"), "utf8"));

var imageList = [];

var rl = readline(path.join(__dirname, "imagelist.txt"));

rl.on("line", function (line) {
    var trimmed = line.trim();
    if (trimmed.length > 0) {
        var label = trimmed.substring(0, trimmed.lastIndexOf("."));
        imageList.push({
            filename: trimmed,
            label: label
        });
    }
});

rl.on("end", function () {
    console.log("Finished reading imagelist.txt");
    console.log("Images found: " + imageList.length);
});

app.get("/", function (req, res) {
    if (!req.session.username) {
        res.render("login", { errorMessage: null });
    } else {
        var selectedImage = req.query.image || "default.jpg";

        var selectedLabel = "Gallery";
        for (var i = 0; i < imageList.length; i++) {
            if (imageList[i].filename === selectedImage) {
                selectedLabel = imageList[i].label;
                break;
            }
        }

        res.render("gallery", {
            images: imageList,
            selectedImage: selectedImage,
            selectedLabel: selectedLabel,
            username: req.session.username
        });
    }
});

app.post("/", function (req, res) {
    var username = req.body.username;
    var password = req.body.password;

    if (!users[username]) {
        res.render("login", { errorMessage: "Not a registered username" });
    } else if (users[username] !== password) {
        res.render("login", { errorMessage: "Invalid password" });
    } else {
        req.session.username = username;
        res.redirect("/");
    }
});

app.get("/logout", function (req, res) {
    req.session.reset();
    res.redirect("/");
});

app.listen(PORT, function () {
    console.log("Server is running on http://localhost:" + PORT);
});
