const express = require('express');
const router = express.Router();
const { startFix, getFixStatus, commitFix, fixedApp } = require('../controllers/fixFlowController');

router.post('/start', startFix);
router.get('/status/:fixId', getFixStatus);
router.post('/commit', commitFix);
router.post('/fixed', fixedApp)

module.exports = router;