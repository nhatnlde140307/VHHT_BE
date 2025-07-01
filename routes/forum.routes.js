import express from "express";
import { wrapRequestHandler } from "../utils/handlers.js";
import uploadCloud from "../utils/cloudinary.config.js";
import {
  commentForumPost,
  commentForumPostComment,
  createNewForumPost,
  deleteCommentForumPost,
  deleteCommentForumPostComment,
  deleteForumPost,
  downvoteForumPost,
  downvoteForumPostComment,
  getDownvotePostCommentUsers,
  getDownvotePostUsers,
  getForumPostCommentRelies,
  getForumPostComments,
  getNewForumPosts,
  getRelativeForumPosts,
  getSavedForumPosts,
  getUpvotePostCommentUsers,
  getUpvotePostUsers,
  getUserForumPosts,
  saveForumPost,
  unvoteForumPost,
  unvoteForumPostComment,
  updateForumPost,
  upvoteForumPost,
  upvoteForumPostComment,
  getForumPostDetail
} from "../controllers/forum.controller.js";

const forumRoutes = express.Router();

/**
 * Forum post creation (create/delete/update)
 */
// Create new forum post
forumRoutes.post(
  "/",
  uploadCloud.array("images", 5),
  wrapRequestHandler(createNewForumPost)
);
// Update an existing forum post
forumRoutes.put(
  "/:postId",
  uploadCloud.array("images", 5),
  wrapRequestHandler(updateForumPost)
);
// Delete a forum post
forumRoutes.delete("/:postId", wrapRequestHandler(deleteForumPost));

/**
 * Forum post list
 */
// Get newest forum posts (order by crated time desc)
forumRoutes.get("/news", wrapRequestHandler(getNewForumPosts));
// Get relative forum posts (order by crated time desc)
forumRoutes.get("/relatives", wrapRequestHandler(getRelativeForumPosts));
// Get saved forum posts (order by saved time desc)
forumRoutes.get("/saved", wrapRequestHandler(getSavedForumPosts));
// Get posts belongs to user (order by created time desc)
forumRoutes.get("/posts/users/:userId", wrapRequestHandler(getUserForumPosts));

/**
 * Forum single post
 */
// Get detail of a forum post
forumRoutes.get("/posts/:postId", wrapRequestHandler(getForumPostDetail));
// Like a forum post
forumRoutes.post("/posts/:postId/upvotes", wrapRequestHandler(upvoteForumPost));
// UnLike a forum post
forumRoutes.post(
  "/posts/:postId/downvotes",
  wrapRequestHandler(downvoteForumPost)
);
// Remove vote of a forum post
forumRoutes.delete("/posts/:postId/votes", wrapRequestHandler(unvoteForumPost));
// Save a forum post
forumRoutes.post("/posts/:postId/save", wrapRequestHandler(saveForumPost));
// Get list user upvotes forum post
forumRoutes.get(
  "/posts/:postId/upvotes",
  wrapRequestHandler(getUpvotePostUsers)
);
// Get list user downvotes forum post
forumRoutes.get(
  "/posts/:postId/downvotes",
  wrapRequestHandler(getDownvotePostUsers)
);

/**
 * For comment
 */
// Comment on a post
forumRoutes.post(
  "/posts/:postId/comments",
  wrapRequestHandler(commentForumPost)
);
// Delete comment on a post
forumRoutes.delete(
  "/posts/:postId/comments/:commentId",
  wrapRequestHandler(deleteCommentForumPost)
);
// Reply a comment on a post
forumRoutes.post(
  "/posts/:postId/comments/:commentId/comments",
  wrapRequestHandler(commentForumPostComment)
);
// Delete a reply comment on a post
forumRoutes.delete(
  "/posts/:postId/comments/:commentId",
  wrapRequestHandler(deleteCommentForumPostComment)
);
// Like a comment
forumRoutes.post(
  "/posts/:postId/comments/:commentId/upvotes",
  wrapRequestHandler(upvoteForumPostComment)
);
// UnLike a comment
forumRoutes.post(
  "/posts/:postId/comments/:commentId/downvotes",
  wrapRequestHandler(downvoteForumPostComment)
);
// Remote vote of a comment
forumRoutes.delete(
  "/posts/:postId/comments/:commentId/votes",
  wrapRequestHandler(unvoteForumPostComment)
);
// Get comment list of a forum post
forumRoutes.get(
  "/posts/:postId/comments",
  wrapRequestHandler(getForumPostComments)
);
// Get comment list of a comment
forumRoutes.get(
  "/posts/:postId/comments/:commentId/comments",
  wrapRequestHandler(getForumPostCommentRelies)
);
// Get list user upvotes comment
forumRoutes.get(
  "/posts/:postId/comments/:commentId/upvotes",
  wrapRequestHandler(getUpvotePostCommentUsers)
);
// Get list user downvotes comment
forumRoutes.get(
  "/posts/:postId/comments/:commentId/downvotes",
  wrapRequestHandler(getDownvotePostCommentUsers)
);

export default forumRoutes;
