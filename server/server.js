const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const socket = require("socket.io");
const multer = require("multer");
const path = require("path");

const authRoutes = require("./routes/auth");
const messageRoutes = require("./routes/messages");
const postRoutes = require("./routes/posts.route");
const User = require("./models/users.models");

const app = express();
const server = app.listen(process.env.PORT, () => {
  console.log(`Server started on ${process.env.PORT}`);
});

const io = socket(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("DB Connection Successful");
  })
  .catch((err) => {
    console.error("DB Connection Error:", err);
    process.exit(1);
  });

app.use(cors({
  origin: 'https://social-application.web.app',
}));

app.use(express.json());
app.use(express.static(__dirname));
app.use("/users", authRoutes);
app.use("/messages", messageRoutes);
app.use(postRoutes);
app.use("/images", express.static(path.join(__dirname, "public/images")));

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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/images");
  },
  filename: (req, file, cb) => {
    cb(null, req.body.name);
  },
});

const upload = multer({ storage: storage });

app.post("/upload", upload.single("file"), (req, res) => {
  try {
    return res.status(200).json("Archivo subido correctamente");
  } catch (error) {
    console.error(error);
  }
});
