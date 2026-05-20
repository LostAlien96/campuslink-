// src/routes/groups.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const { browseGroups, createGroup, requestJoin, respondToMember } = require('../controllers/groups');

router.use(auth);

router.get('/',                              browseGroups);
router.post('/',                             createGroup);
router.post('/:id/join',                     requestJoin);
router.put('/:id/members/:userId',           respondToMember);

module.exports = router;
