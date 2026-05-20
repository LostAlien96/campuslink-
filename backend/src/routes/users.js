// src/routes/users.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const { browseUsers, getUser, updateMe, addSkill, deleteSkill } = require('../controllers/users');

// All user routes require auth
router.use(auth);

router.get('/',           browseUsers);   // GET /users?skill=React&level=building
router.get('/:id',        getUser);       // GET /users/:id
router.put('/me',         updateMe);      // PUT /users/me
router.post('/me/skills', addSkill);      // POST /users/me/skills
router.delete('/me/skills/:skillId', deleteSkill);

module.exports = router;
