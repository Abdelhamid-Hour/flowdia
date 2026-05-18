//(Basic Auth - AAL1)
const express = require('express');
const router = express.Router();



// This route only requires the user to be logged in (AAL1)
router.get('/overview', (req, res) => {
  res.json({
    message: "📊 Analytics data accessed successfully.",
    user_id: req.user.sub,
    auth_level: req.user.aal,
    data: {
      visitors: 1240,
      conversions: 42,
      status: "Basic Access Granted"
    }
  });
});

module.exports = router;