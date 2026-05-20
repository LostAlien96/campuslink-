// src/routes/connections.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const { sendRequest, respondToRequest, myConnections } = require('../controllers/connections');

router.use(auth);

router.post('/',     sendRequest);        // POST /connections
router.put('/:id',   respondToRequest);   // PUT  /connections/:id
router.get('/me',    myConnections);      // GET  /connections/me?type=received

module.exports = router;
