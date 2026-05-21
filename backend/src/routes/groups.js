const router = require('express').Router();
const auth = require('../middleware/auth');
const {
  browseGroups, getGroup, createGroup, updateGroup,
  requestJoin, respondToMember, promoteMember
} = require('../controllers/groups');

router.use(auth);

router.get('/',                                    browseGroups);
router.get('/:id',                                 getGroup);
router.post('/',                                   createGroup);
router.put('/:id',                                 updateGroup);
router.post('/:id/join',                           requestJoin);
router.put('/:id/members/:userId/respond',         respondToMember);
router.put('/:id/members/:userId/promote',         promoteMember);

module.exports = router;