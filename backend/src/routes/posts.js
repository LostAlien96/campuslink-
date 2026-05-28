const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  getFeed, createPost, deletePost,
  toggleReaction,
  getComments, addComment, deleteComment,
  getStreak,
} = require('../controllers/posts');

router.use(auth);

router.get('/feed',                        getFeed);
router.post('/',                           createPost);
router.delete('/:id',                      deletePost);
router.post('/:id/reactions',              toggleReaction);
router.get('/:id/comments',               getComments);
router.post('/:id/comments',              addComment);
router.delete('/:id/comments/:commentId', deleteComment);
router.get('/streak/:userId',             getStreak);

module.exports = router;