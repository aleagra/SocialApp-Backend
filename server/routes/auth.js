const {
  login,
  register,
  getAllUsers,
  setAvatar,
  logOut,
  getUsers,
  findByUser,
  FollowUser,
  UnfollowUser,
  findByFollowers,
  updateUser,
  findByFollowing,
  getNotFollowingUsers,
  getFollowers,
  findUser,
} = require("../controllers/usersController");

const router = require("express").Router();
const uploadMulter = require("../config/multer");

router.post("/login", login);
router.post("/register",  register);
router.get("/search/:id", getAllUsers);
router.post("/setavatar/:id", setAvatar);
router.get("/logout/:id", logOut);
router.get("/allusers", getUsers);
router.get("/:id", findByUser);
router.get("/not-following/:id",getNotFollowingUsers);
router.get("/follow/:id", findByFollowers);
router.get("/following/:id", findByFollowing);
router.put("/:id",uploadMulter.single("background"), updateUser);
router.post("/follow/:id", FollowUser);
router.post("/unfollow/:id", UnfollowUser);
router.get("/followers/:id",getFollowers);
router.get("/search/:username",findUser);



module.exports = router;