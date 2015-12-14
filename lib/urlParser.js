var environment = require('./environment.js');

var getUrlFromRequest = (req) => {
	return  '//' + req.get('host') + req.originalUrl.replace(/\/$/, '');
};

var isHostSame = (currentHost, hostExpression) => {
	return currentHost === hostExpression;
};

var getRootRegExp = (hostExpression, rootExpression, languageParam) => {
	var rootReg = '\/\/' +
				hostExpression.replace(/[\\.+*?\^$\[\](){}\/\'#]/g, '\\$&') +
				rootExpression.replace('/','\/');

	if (languageParam) {
		var build = require('../../app/build.js');
		var languagesExpr = build.languages.join('|');
		rootReg += '(\/('+languagesExpr+'))?';
	}
	rootReg += '.*$';

	return new RegExp(rootReg);
};

module.exports = function(req, res, next) {
	var parseUrlReg = /^.*\/\/([^\/]*)((?:\/[^\/:]+)*)?(\/\:language)?$/;
	var currentUrl = getUrlFromRequest(req);
	var parsedCurrentUrl = currentUrl.match(parseUrlReg);

	var currentLanguage = null;
	var currentLanguagePartPath = '';
	var currentHost = parsedCurrentUrl[1];
	var currentRoot = parsedCurrentUrl[2];
	var currentProtocol = req.protocol + ':';

	if (req.get('X-Forwarded-Proto')) {
		currentProtocol = req.get('X-Forwarded-Proto') + ':';
	}

	for (var expression of Object.keys(environment.$Language)) {
		var parsedDomainExpression = expression.match(parseUrlReg);

		var hostExpression = parsedDomainExpression[1] === '*:*' ? currentHost : parsedDomainExpression[1] || '';
		var rootExpression = parsedDomainExpression[2] || '';
		var languageInPath = parsedDomainExpression[3];

		if (isHostSame(currentHost, hostExpression)) {

			var rootRegExp = getRootRegExp(hostExpression, rootExpression, languageInPath);

			if (rootRegExp.test(currentUrl)) {
				currentRoot = rootExpression;

				if (languageInPath) {
					var matchedLanguage = currentUrl.match(rootRegExp);

					currentLanguagePartPath = matchedLanguage[1];
					currentLanguage = matchedLanguage[2];

					if (!currentLanguage) {
						currentLanguagePartPath = '/'+environment.$Language[expression];
						currentLanguage = environment.$Language[expression];

						// REDIRECT
						res.redirect(currentProtocol + '//'+currentHost+currentRoot+currentLanguagePartPath);
						return;
					}
				} else {
					currentLanguage = environment.$Language[expression];
				}

				break;
			}
		}
	}

	res.locals.language = currentLanguage;
	res.locals.languagePartPath = currentLanguagePartPath;
	res.locals.host = currentHost;
	res.locals.protocol = currentProtocol;
	res.locals.root = currentRoot;

	//res.send(`${currentUrl} : ${currentHost} : ${currentRoot} : ${currentLanguage} : ${currentLanguagePartPath} : ${req.get('origin')} : ${req.hostname}`);

	if (!currentLanguage) {
		throw new Error(`You have undefined language. Set current domain "//${currentHost}" or "//*:*" to attribute $Language in environment.js.`);
	}

	next();
};