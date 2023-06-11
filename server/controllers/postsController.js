const { Post } = require("../models/post.models");
const  User  = require("../models/users.models");

const createPost = async (req, res) => {
  const newPost = new Post(req.body);
  try {
    const savedPost = await newPost.save();
    res.status(200).json(savedPost);
  } catch (err) {
    res.status(500).json(err);
  }
};

const getAllPosts = async (req, resp) => {
  try {
    const allPosts = await Post.find();
    resp.json(allPosts);
  } catch (error) {
    resp.status(500).json({ message: error.message });
  }
};

const getPost = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    const posts = await Post.find({ userId: user._id });
    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json(err);
  }
};
const friendPost = async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await User.findById(userId);
    const followedUserIds = user.following;
    const followedUserPosts = await Post.find({ userId: { $in: followedUserIds } });
    const userPosts = await Post.find({ userId });
    const posts = followedUserPosts.concat(userPosts);

    res.json(posts);
  } catch (err) {
    console.error('Error al buscar publicaciones:', err);
    res.status(500).json({ error: 'Error al buscar publicaciones.' });
  }
};

const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post.likes.includes(req.body.userId)) {
      await post.updateOne({ $push: { likes: req.body.userId } });
      res.status(200).json("The post has been liked");
    } else {
      await post.updateOne({ $pull: { likes: req.body.userId } });
      res.status(200).json("The post has been disliked");
    }
  } catch (err) {
    res.status(500).json(err);
    console.log(err);
  }
};

const getPostsByUserID = async (req, res) => {
  const userId = req.params.userId;

  try {
    const posts = await Post.find({ userId: userId });
    res.json(posts);
  } catch (err) {
    console.error('Error al buscar publicaciones:', err);
    res.status(500).json({ error: 'Error al buscar publicaciones.' });
  }
};

const updatePostsFullname = async (userId, newFullname) => {
  try {
    await Post.update({ userId: userId }, { $set: { "user.$[].fullName": newFullname } }, { multi: true });
    console.log('Se actualizaron todas las publicaciones correctamente.');
  } catch (err) {
    console.error('Error al actualizar las publicaciones:', err);
  }
};

const updateProfileFullName = async (req, res) => {
  const userId = req.params.userId;
  const newFullname = req.body.fullName; 

  try {
    await updatePostsFullname(userId, newFullname);
    res.json({ message: 'Se actualizó el fullname en todas las publicaciones.' });
    console.log(newFullname)
  } catch (err) {
    console.error('Error al actualizar el fullname:', err);
    res.status(500).json({ error: 'Error al actualizar el fullname en las publicaciones.' });
  }
};

const updatePostsAvatarImage = async (userId, newAvatarImage) => {
  try {
    await Post.update({ userId: userId }, { $set: { "user.$[].avatarImage": newAvatarImage } }, { multi: true });
    console.log('Se actualizaron todas las publicaciones correctamente.');
  } catch (err) {
    console.error('Error al actualizar las publicaciones:', err);
  }
};

const updateProfileAvatarImage = async (req, res) => {
  const userId = req.params.userId;
  const newAvatarImage = req.body.avatarImage;

  try {
    await updatePostsAvatarImage(userId, newAvatarImage);
    res.json({ message: 'Se actualizó el avatarImage en todas las publicaciones.' });
    console.log(newAvatarImage);
  } catch (err) {
    console.error('Error al actualizar el avatarImage:', err);
    res.status(500).json({ error: 'Error al actualizar el avatarImage en las publicaciones.' });
  }
};

const checkLike = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const hasLiked = post.likes.includes(userId);
    res.json(hasLiked);
  } catch (err) {
    // Manejar el error
  }
}

const getLikes = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id).populate('likes', 'name'); // Suponiendo que el campo de likes en el modelo Post está referenciado a los usuarios que han dado like y tiene un campo 'name' para el nombre del usuario.

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const likes = post.likes;
    res.json(likes);
  } catch (err) {
    console.error('Error fetching likes:', err);
    res.status(500).json({ message: 'Server error' });
  }
}

const comentPost = async (req, res) => {
  const post = await Post.findById(req.params.id);
  // console.log(req.body);
  try {
    if (post) {
      await post.updateOne({ $push: { comments: req.body } });
      res.status(200);
    }
  } catch (err) {
    res.status(500).json(err);
    console.log(err);
  }
};

const findByPost = async (req, res) => {
  const { id } = req.params;
  Post.findById(id)
    .then((data) => {
      res.json(data);
    })
    .catch(() => {
      res.json({ message: "Id no encontrado" });
    });
};

const getPostDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const post = await Post.findById(id)
      .populate('likes', 'username')
      .populate('comments.userId', 'username');

    if (!post) {
      return res.json({ message: "Id no encontrado" });
    }

    res.json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error retrieving post details" });
  }
};



module.exports = {
  friendPost,
  createPost,
  getPost,
  likePost,
  comentPost,
  getAllPosts,
  findByPost,
  checkLike,
  getLikes,
  getPostsByUserID,
  getPostDetails,
  updateProfileFullName,
  updateProfileAvatarImage,

};
