require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const postRoutes = require("./routes/posts.route");
const User = require("./models/users.models");
const app = express();
const socketIO = require("socket.io");
const multer = require("multer");
const multerGoogleStorage = require('multer-google-storage');
const admin = require('firebase-admin');
const path = require("path");

app.use(express.json());
app.use(express.static(__dirname));

app.use(cors({
  origin: 'https://social-application.web.app',
}));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  storageBucket: 'social-app-751c3.appspot.com'
});
const storage = admin.storage();

app.use("/users", authRoutes);
app.use("/messages", messageRoutes);
app.use(postRoutes);
app.use("/images", express.static(path.join(__dirname, "public/images")));

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("DB Connection Successful");
  })
  .catch((err) => {
    console.log(err.message);
  });

const server = app.listen(process.env.PORT, () =>
  console.log(`Server started on ${process.env.PORT}`)
)
const io = socketIO(server, {
  cors: {
    origin: "https://social-application.web.app",
    credentials: true,
  },
});
mongoose.set("strictPopulate", false);
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
  const user = await User.findById(data.userId);
  const follower = await User.findById(data.followerId);

  if (user && follower) {
    if (!user.following.includes(data.followerId)) {
      user.following.push(data.followerId);
      follower.followers.push(data.userId);

      await user.save();
      await follower.save();

      io.emit("follower-count-updated", {
        userId: data.userId,
        followerCount: user.following.length,
      });
    }
  } else {
    console.log("No se encontraron los documentos de usuario");
  }
});
socket.on("unfollow-user", async (data) => {
  const user = await User.findById(data.userId);
  const follower = await User.findById(data.followerId);

  if (user && follower) {
    if (user.following.includes(data.followerId)) {
      user.following.pull(data.followerId);
      follower.followers.pull(data.userId);

      await user.save();
      await follower.save();

      io.emit("follower-count-updated", {
        userId: data.userId,
        followerCount: user.following.length,
      });
    }
  } else {
    console.log("No se encontraron los documentos de usuario");
  }
});

});

const upload = multer({
  storage: multerGoogleStorage.storageEngine({
    bucket: 'social-app-751c3.appspot.com',
    projectId: 'social-app-751c3',
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    }
  })
});

app.post('/upload', upload.single('file'), (req, res) => {
  try {
    return res.status(200).json('Archivo subido correctamente');
  } catch (error) {
    console.error(error);
  }
});