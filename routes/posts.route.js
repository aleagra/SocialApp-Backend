const express = require("express");
const routerPost = express.Router();

const {
  createPost,
  getPost,
  likePost,
  comentPost,
  getAllPosts,
  friendPost,
  checkLike,
  getLikes,
  getPostsByUserID,
  getPostDetails,
  updateProfileFullName,
  updateProfileAvatarImage,
} = require("../controllers/postsController");

routerPost.post("/posts/", createPost);
routerPost.get("/posts/", getAllPosts);
routerPost.get("posts/:username", getPost);
routerPost.get("/posts/:id/likes",getLikes);
routerPost.get("/posts/friends/:userId", friendPost);
routerPost.put("/posts/:id/like", likePost);
routerPost.put("/posts/:id/comment", comentPost);
routerPost.get('/posts/:id/checkLike/:userId',checkLike);
routerPost.get("/posts/user/:userId", getPostsByUserID)
routerPost.get("/posts/details/:id", getPostDetails)
routerPost.put('/posts/profilename/:userId', updateProfileFullName);
routerPost.put('/posts/profileimg/:userId', updateProfileAvatarImage);

module.exports = routerPost;
