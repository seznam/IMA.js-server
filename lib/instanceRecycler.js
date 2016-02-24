module.exports = (() => {
	'use strict';

	/**
	 * Instance Recycler.
	 *
	 * @class InstanceRecycler
	 */
	class InstanceRecycler {

		clear() {
			this._instanceConstructor = null;
			this._maxInstanceCount = 1;
			this._instancies = [];
		}

		init(instanceConstructor, maxInstanceCount) {
			if (arguments.length < 2) {
				maxInstanceCount = 1;
			}
			this._instanceConstructor = instanceConstructor;
			this._maxInstanceCount = maxInstanceCount;

			for(var i = 0; i < maxInstanceCount; i++) {
			  this._instancies.push(this._instanceConstructor());
			}
		}

		hasNextInstance() {
			return this._instancies.length > 0;
		}

		getInstance() {
			if (this.hasNextInstance()) {
				return this._instancies.shift();
			} else {
				return this._instanceConstructor();
			}

		}

		clearInstance(instance) {
			instance.oc.clear();
			if (this._instancies.length < this._maxInstanceCount) {
				this._instancies.push(instance);
			}
		}
	}

	var instanceRecycler = new InstanceRecycler();
	instanceRecycler.clear();

	return instanceRecycler;
})();
