const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/news', async function (req, res) {
  try {
    const url = req.query.url;
    if (!url) {
      return;
    }

    axios.get(url).then(response => {
      res.send(response.data);
    }).catch(error => {
      res.status(400).send({
        message: error
      });
    });
  } catch (e) {
    console.error(e);
  }
});

module.exports = router;
