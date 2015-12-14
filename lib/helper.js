'use strict';
var clone = require('clone');

module.exports = (() => {

	var assignRecursively = function (target) {
		var sources = [].slice.call(arguments, 1);
		sources.forEach(source => assign(target, source));

		return target;

		function assign(target, source) {
			Object.keys(source).forEach((field) => {
				if (source[field] instanceof Array) {
					target[field] = source[field].slice();
				} else if (source[field] instanceof Object) {
					if (!(target[field] instanceof Object)) {
						target[field] = {};
					}

					assign(target[field], source[field]);
				} else {
					target[field] = source[field];
				}
			});
		}
	};

	var debounce = (func, wait) => {
		if (arguments.length < 2) {
			wait = 100;
		}
		var timeout = null;

		return function () {
			var args = [].slice.call(arguments);
			clearTimeout(timeout);
			timeout = setTimeout(() => {
				func(...args);
			}, wait);
		};
	};

	var throttle = (func, interval, scope) => {
		if (arguments.length < 2) {
			interval = 100;
		}
		if (arguments.length < 3) {
			scope = null;
		}
		var timeout = null;
		var args = [];
		var shouldFireMethod = false;

		if (scope) {
			func= func.bind(scope);
		}

		var fireMethod = () => {
			timeout = setTimeout(() => {
				timeout = null;
				if (shouldFireMethod) {
					shouldFireMethod = false;
					fireMethod();
				}
			}, interval);
			func(...args);
		};

		return function () {
			var rest = [].slice.call(arguments);
			args = rest;

			if (!timeout) {
				fireMethod();
			} else {
				shouldFireMethod = true;
			}

		};
	};

	var allPromiseHash = (hash) => {
		var keys = Object.keys(hash);
		var loadPromises = keys.map((key) => Promise.resolve(hash[key]));

		return Promise
				.all(loadPromises)
				.then((resolvedValues) => {
					var result = {};

					for (let key of keys) {
						result[key] = resolvedValues.shift();
					}

					return result;
				});
	};

	var escapeRegExp = (string) => {
		return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
	};

	return { assignRecursively, allPromiseHash, escapeRegExp, clone, debounce, throttle };
})();
