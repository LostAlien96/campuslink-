const router = require('express').Router();
const auth = require('../middleware/auth');
const { browseUsers, getUser, getMe, updateMe, addSkill, deleteSkill } = require('../controllers/users');

router.use(auth);

router.get('/',                      browseUsers);
router.get('/me',                    getMe);        // ← must be before /:id
router.get('/:id',                   getUser);
router.put('/me',                    updateMe);
router.post('/me/skills',            addSkill);
router.delete('/me/skills/:skillId', deleteSkill);

module.exports = router;