const User = require("../models/users.models");
const bcrypt = require("bcrypt");
const getIO = require("../server");


module.exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user)
      return res.json({ msg: "Incorrect Username or Password", status: false });
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      return res.json({ msg: "Incorrect Username or Password", status: false });
    delete user.password;
    return res.json({ status: true, user });
  } catch (ex) {
    next(ex);
  }
};

module.exports.register = async (req, res, next) => {
  try {
    const { username, email, password, avatarImage, fullName } = req.body;
    const usernameCheck = await User.exists({ username });
    if (usernameCheck)
      return res.json({ msg: "Username already used", status: false });
    const emailCheck = await User.exists({ email });
    if (emailCheck)
      return res.json({ msg: "Email already used", status: false });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      username,
      fullName,
      password: hashedPassword,
    });
    return res.json({ status: true, user });
  } catch (ex) {
    next(ex);
  }
};

module.exports.getFollowers = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate("follower", ["email", "username", "avatarImage", "_id", "fullName"]);
    return res.json(user.following);
  } catch (ex) {
    next(ex);
  }
};

module.exports.getAllUsers = async (req, res, next) => {
  try {
    const excludedUserId = req.body.id;
    const users = await User.find({ _id: { $ne: excludedUserId } }).select({ email: 1, username: 1, avatarImage: 1, fullName: 1, _id: 1 });
    return res.json(users);
  } catch (ex) {
    next(ex);
  }
};

module.exports.getNotFollowingUsers = async (req, res, next) => {
  try {
    const followingUsers = await User.findById(req.params.id).select("following");
    const notFollowingUsers = await User.find({ _id: { $ne: req.params.id, $nin: followingUsers.following } })
      .select({ email: 1, username: 1, avatarImage: 1, _id: 1, fullName: 1 });
    return res.json(notFollowingUsers);
  } catch (ex) {
    next(ex);
  }
};

module.exports.setAvatar = async (req, res, next) => {
  try {
    const _id = req.params.id;
    const avatarImage = req.body.image;
    const userData = await User.findByIdAndUpdate(
      _id,
      {
        isAvatarImageSet: true,
        avatarImage,
      },
      { new: true }
    );
    return res.json({
      isSet: userData.isAvatarImageSet,
      image: userData.avatarImage,
    });
  } catch (error) {
    next(error);
  }
};

module.exports.logOut = (req, res, next) => {
  try {
    if (!req.params.id) return res.json({ msg: "User id is required " });
    onlineUsers.delete(req.params.id);
    return res.status(200).send();
  } catch (ex) {
    next(ex);
  }
};

module.exports.getUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
};

module.exports.findByUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id).select("-password");
    if (user) {
      res.json(user);
    } else {
      res.json({ message: "Id no encontrado" });
    }
  } catch (error) {
    res.json({ message: "Error al buscar usuario" });
  }
};

module.exports.findUser = async (req, res) => {
  const { username } = req.params;
  try {
    const user = await User.findOne({ username }).select("-password");
    if (user) {
      res.json(user);
    } else {
      res.json({ message: "Usuario no encontrado" });
    }
  } catch (error) {
    res.json({ message: "Error al buscar usuario" });
  }
};

module.exports.findByFollowers = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id).select("followers");
    res.json(user.followers);
  } catch (error) {
    res.json({ message: "Id no encontrado" });
  }
};

module.exports.findByFollowing = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id).select("following");
    res.json(user.following);
  } catch (error) {
    res.json({ message: "Id no encontrado" });
  }
};

module.exports.likePost = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user.likes.includes(req.body.userId)) {
      await user.updateOne({ $push: { likes: req.body.userId } });
      res.status(200).json("The user has been liked");
    } else {
      await user.updateOne({ $pull: { likes: req.body.userId } });
      res.status(200).json("The user has been disliked");
    }
  } catch (err) {
    res.status(500).json(err);
    console.log(err);
  }
};

module.exports.FollowUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const follower = await User.findById(req.body.follower);

    if (user && follower) {
      if (!user.following.includes(req.body.follower)) {
        user.following.push(req.body.follower);
        follower.followers.push(req.params.id);

        await Promise.all([user.save(), follower.save()]);

        req.app.get("io").emit("follower-count-updated", {
          userId: req.params.id,
          followerCount: user.following.length,
        });

        res.send({ message: "Followed successfully" });
      } else {
        res.status(400).send({ error: "Ya estás siguiendo a este usuario" });
      }
    } else {
      res.status(404).send({ error: "No se encontraron los documentos de usuario" });
    }
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

module.exports.UnfollowUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.following.remove(req.body.follower);
    await user.save();

    const follower = await User.findById(req.body.follower);
    follower.followers.remove(req.params.id);
    await follower.save();

    res.send({ message: "Unfollowed successfully" });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
};

module.exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const modelData = { fullName: req.body.fullName };
  await User.updateOne({ _id: id }, modelData);
  res.json({ message: "Usuario Modificado" });
};