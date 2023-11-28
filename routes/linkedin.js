const config = require('../config');
const express = require('express');
const router = express.Router();
const axios = require('axios');
const qs = require('qs');
const fs = require('fs');

async function retrieveLinkedInInfo() {
  const configFile = config.get('linkedinConfigFile');

  const configData = fs.readFileSync(configFile, {
    encoding: 'utf8',
    flag: 'r'
  });

  let configMap = {};
  for (let d of configData.split('\n')) {
    const value = d.split('=');
    configMap[value[0]] = value[1];
  }

  const expirationDate = new Date(parseInt(configMap.accessTokenExpiration, 10));
  const now = new Date();

  // Update access token if expired
  if (isNaN(expirationDate.valueOf()) || now > expirationDate) {
    console.log('LinkedIn access token is expired. Requesting a new one.');

    let requestData = qs.stringify({
      'grant_type': 'refresh_token',
      'refresh_token': configMap.refreshToken,
      'client_id': configMap.clientId,
      'client_secret': configMap.clientSecret
    });

    const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', requestData, {
      headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    });

    if (response.status === 200) {
      const obj = response.data;
      const accessToken = obj.access_token;
      const refreshToken = obj.refresh_token;
      const atExpiresIn = obj.expires_in; // in seconds
      const rtExpiresIn = obj.refresh_token_expires_in; // in seconds

      // Set expiration dates to one day before to be safe
      const atExpirationInMs = now.getTime() + (atExpiresIn * 1000) - 86400000;
      const rtExpirationInMs = now.getTime() + (rtExpiresIn * 1000) - 86400000;

      const updatedData = configData.replace(/(?<=accessToken=).*/g, accessToken)
        .replace(/(?<=refreshToken=).*/g, refreshToken)
        .replace(/(?<=accessTokenExpiration=).*/g, atExpirationInMs)
        .replace(/(?<=refreshTokenExpiration=).*/g, rtExpirationInMs);
      fs.writeFileSync(configFile, updatedData);

      configMap.accessToken = accessToken;
      console.log('LinkedIn access token has been updated. It is valid until', new Date(atExpirationInMs));
    }
  }

  return configMap;
}

router.get('/posts', async function (req, res) {
  try {
    const linkedinConfig = await retrieveLinkedInInfo();

    axios.get('https://api.linkedin.com/rest/posts', {
      'headers': {
        Authorization: `Bearer ${linkedinConfig.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': linkedinConfig.apiVersion
      },
      params: {
        author: encodeURIComponent(`urn:li:organization:${linkedinConfig.organizationId}`),
        q: 'author',
        count: req.query.count || 20,
        sortBy: req.query.sortBy || 'LAST_MODIFIED',
        fields: 'id'
      },
      paramsSerializer: (params) => {
        let result = '';
        Object.keys(params).forEach(key => {
          result += `${key}=${params[key]}&`;
        });
        return result.substring(0, result.length - 1);
      }
    }).then(response => {
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