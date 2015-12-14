var express = require('express');
var router = express.Router();
var superAgent = require('superagent');
var environment = require('./environment.js');
var logger = require('./logger.js');

var firstLetterToLowerCase = (world) => {
	return world.charAt(0).toLowerCase() + world.slice(1);
};

var firstLetterToUpperCase = (world) => {
	return world.charAt(0).toUpperCase() + world.slice(1);
};

var parseCookieString = (cookieString) => {
	var cookiePairs = cookieString.split('; ');

	var cookieName = null;
	var cookieValue = null;
	var cookieOptions = {
		path: '/',
		secure: false,
		expires: new Date('Fri, 31 Dec 9999 23:59:59 UTC'),
		httpOnly: false
	};

	cookiePairs.forEach((pair) => {
		var separatorIndexEqual =  pair.indexOf('=');
		var name = decodeURIComponent(firstLetterToLowerCase(pair.substr(0, separatorIndexEqual)));
		var value = decodeURIComponent(pair.substr(separatorIndexEqual + 1));

		if (cookieOptions[name]) {
			var date = new Date(value);

			if (isNaN(date.getTime())) {
				cookieOptions[name] = value;
			} else {
				cookieOptions[name] = date;
			}

		} else {
			cookieName = name;
			cookieValue = value;
		}
	});

	return {
		name: cookieName,
		value: cookieValue,
		options: cookieOptions
	};
};


var callRemoteServer = (req, res) => {
	var url = req.url;
	var httpRequest = null;

	if ((req.url.length > 1) && (req.url[req.url.length-1] === '/')) {
		url = url.substr(0, url.length - 1);
	}

	var proxyUrl = environment.$Proxy.server + url;

	logger.info(`API proxy: ${req.method} ${proxyUrl} query: ` + JSON.stringify(req.query));

	switch(req.method) {
		case 'POST':
			httpRequest = superAgent
				.post(proxyUrl)
				.send(req.body);
			break;
		case 'PUT':
			httpRequest = superAgent
				.put(proxyUrl)
				.send(req.body);
			break;
		case 'PATCH':
			httpRequest = superAgent
				.patch(proxyUrl)
				.send(req.body);
			break;
		case 'DELETE':
			httpRequest = superAgent
				.del(proxyUrl)
				.send(req.body);
			break;
		case 'GET':
			httpRequest = superAgent
				.get(proxyUrl)
				.query(req.query);
			break;
	}

	Object
		.keys(req.headers)
		.filter((key) => {
			return ['host', 'Cookie'].indexOf(key) === -1;
		})
		.forEach((key) => {
			httpRequest.set(key, req.headers[key]);
		});

	if (req.get('Cookie') && req.get('Cookie') !== '') {
		httpRequest = httpRequest.set('Cookie', req.get('Cookie'));
	}

	httpRequest
		.end((error, response) => {
			if (error) {
				logger.error(`API ERROR: ${req.method} ${proxyUrl} query: ` + JSON.stringify(req.query), { error });
				res.status(error.status || 500).json({Error: 'API error', message: error.message});
			} else if (response) {
				var settedCookies = response.header['set-cookie'];

				Object
					.keys(response.header)
					.filter((key) => {
						return ['set-cookie', 'content-encoding', 'content-type'].indexOf(key) === -1;
					})
					.map((key) => {
						return ({
							headerName: key
									.split('-')
									.map(firstLetterToUpperCase)
									.join('-'),
							key: key
						});
					})
					.forEach((item) => {
						res.set(item.headerName, response.header[item.key]);
					});

				if (settedCookies) {
					settedCookies.forEach((cookieString) => {
						var cookie = parseCookieString(cookieString);
						res.cookie(cookie.name, cookie.value, cookie.options);
					});
				}

				var result = response.body;
				if ((!result || typeof result === 'object' && Object.keys(result).length === 0) && 
					typeof(response.text) === 'string' && response.text !== '') {
					try {
						console.warn('API sent bad header of content-type. More info how you can to fix it: http://visionmedia.github.io/superagent/#parsing-response bodies');
						result = JSON.parse(response.text);	
					} catch (e) {
						console.error('API response is invalid JSON.', { err });
						result = {};
					}
				}

				res.status(response.status).json(result);
			}
		});
};

router.all('*', function(req, res) {
	callRemoteServer(req, res);
});

module.exports = router;
