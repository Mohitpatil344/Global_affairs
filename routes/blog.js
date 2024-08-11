const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const methodOverride = require("method-override");

const Blog = require("../models/blog");
const Comment = require("../models/comment");

const router = Router();

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const fileName = `${Date.now()}-${file.originalname}`;
    cb(null, fileName);
  },
});

const upload = multer({ storage: storage });

// Middleware to handle method override
router.use(methodOverride("_method"));

// Render the add new blog page
router.get("/add-new", (req, res) => {
  return res.render("addBlog", {
    user: req.user,
  });
});

// Render the edit blog page
router.get("/:id/edit", async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) return res.status(404).json({ message: "Blog not found" });

  return res.render("editBlog", {
    user: req.user,
    blog,
  });
});

// Get a single blog by ID
router.get("/:id", async (req, res) => {
  const blog = await Blog.findById(req.params.id).populate("createdBy");
  const comments = await Comment.find({ blogId: req.params.id }).populate("createdBy");

  return res.render("blog", {
    user: req.user,
    blog,
    comments,
  });
});

// Add a new comment to a blog
router.post("/comment/:blogId", async (req, res) => {
  await Comment.create({
    content: req.body.content,
    blogId: req.params.blogId,
    createdBy: req.user._id,
  });
  return res.redirect(`/blog/${req.params.blogId}`);
});

// Add a new blog
router.post("/", upload.single("coverImage"), async (req, res) => {
  const { title, body } = req.body;
  const blog = await Blog.create({
    body,
    title,
    createdBy: req.user._id,
    coverImageURL: `/uploads/${req.file.filename}`,
  });
  return res.redirect(`/blog/${blog._id}`);
});

// Update a blog
router.patch("/:id", upload.single("coverImage"), async (req, res) => {
  const { title, body } = req.body;
  const updateData = {};
  if (title) updateData.title = title;
  if (body) updateData.body = body;
  if (req.file) updateData.coverImageURL = `/uploads/${req.file.filename}`;

  const blog = await Blog.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!blog) return res.status(404).json({ message: "Blog not found" });

  return res.redirect(`/blog/${blog._id}`);
});

// Delete a blog
router.post("/:id/delete", async (req, res) => {
  await Blog.findByIdAndDelete(req.params.id);
  return res.redirect("/");
});

module.exports = router;
