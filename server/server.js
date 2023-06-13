require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const admin = require("firebase-admin");
const path = require("path");
const socketIO = require("socket.io");
const bodyParser = require("body-parser");

const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const postRoutes = require("./routes/posts.route");
const User = require("./models/users.models");

const app = express();
const server = app.listen(process.env.PORT, () => {
  console.log(`Server started on ${process.env.PORT}`);
});

const io = socketIO(server, {
  cors: {
    origin: "https://social-application.web.app",
    credentials: true,
  },
});

const serviceAccountKeyPath = path.join(__dirname, "storage/storage.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKeyPath),
  storageBucket: "socialapp-storage-94b01.appspot.com",
});

const bucket = admin.storage().bucket();

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log("DB Connection Successful");
  })
  .catch((err) => {
    console.log(err.message);
  });

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(cors({
  origin: "https://social-application.web.app",
}));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://social-application.web.app");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  next();
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use("/users", authRoutes);
app.use("/messages", messageRoutes);
app.use(postRoutes);
app.use("/images", express.static(path.join(__dirname, "public/images")));


global.onlineUsers = new Map();
app.set("io", io);

io.on("connection", (socket) => {
  global.chatSocket = socket;
  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);
  });

  socket.on("send-msg", (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit("msg-recieve", data.msg);
    }
  });

  socket.on("follow-user", async (data) => {
    const user = await User.findByIdAndUpdate(
      data.userId,
      { $addToSet: { following: data.followerId } },
      { new: true }
    );

    const follower = await User.findByIdAndUpdate(
      data.followerId,
      { $addToSet: { followers: data.userId } },
      { new: true }
    );

    if (user && follower) {
      io.emit("follower-count-updated", {
        userId: data.userId,
        followerCount: user.following.length,
      });
    } else {
      console.log("No se encontraron los documentos de usuario");
    }
  });

  socket.on("unfollow-user", async (data) => {
    const user = await User.findByIdAndUpdate(
      data.userId,
      { $pull: { following: data.followerId } },
      { new: true }
    );

    const follower = await User.findByIdAndUpdate(
      data.followerId,
      { $pull: { followers: data.userId } },
      { new: true }
    );

    if (user && follower) {
      io.emit("follower-count-updated", {
        userId: data.userId,
        followerCount: user.following.length,
      });
    } else {
      console.log("No se encontraron los documentos de usuario");
    }
  });
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json('No se ha seleccionado ningún archivo');
    }

    const fileName = req.body.name;
    const fileRef = bucket.file(fileName);
    const fileStream = fileRef.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    fileStream.on("error", (error) => {
      console.error(error);
      res.status(500).json('Error al subir el archivo');
    });

    fileStream.on("finish", () => {
      const downloadURL = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      res.status(200).json(downloadURL);
    });

    fileStream.end(file.buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json('Error al subir el archivo');
  }
});

app.get("/images/:filename", (req, res) => {
  const filename = req.params.filename;
  const file = bucket.file(filename);

  const stream = file.createReadStream();
  stream.on("error", (error) => {
    console.error(error);
    res.status(404).send("No se pudo encontrar la imagen");
  });

  res.setHeader("Content-Type", "image/jpeg");

  stream.pipe(res);
});