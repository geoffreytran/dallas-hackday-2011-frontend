/**
 * @name timing.js
 * @fileOverview Provides a set of timing functions for measuring performance.
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
 * @namespace Holds performance timing related functionality to the Mojo Framework.
 */
Mojo.Timing = {};

// Switch for timing, enable with "timingEnabled:true" in framework_config.json
Mojo.Timing.enabled = false;

// static object holding all the timers of any category.
Mojo.Timing.perfTimers = {};

/**
 * Create a reset performance timer with a particular label.
 * @param {String} label Label used to identfy the timer, also used as the property name when
 *						added to the perfTimer's object.
 */
Mojo.Timing.PerfTimer = function PerfTimer(label) {
	Mojo.require(label, "label must be defined");
	this.label = label;
	this.reset();
};

/**
 * Wrapper function whatever provides the best millisecond timer, currenly Date.now(). This
 * wrapper is here to allow tests to mock out the time function,
 * @returns Current system time in milliseconds.
 * @type Number
 */
Mojo.Timing.PerfTimer.prototype.millisecondsNow = function millisecondsNow () {
	return Date.now();
};

/**
 * Reset the performance timer, setting its elapsed time to zero.
 */
Mojo.Timing.PerfTimer.prototype.reset = function reset () {
	this.count = 0;
	this.timesRecorded = 0;
	this.elapsedTime = 0;
	delete this.startTime;
	this.running = false;
};

/**
 * Start or resume counting time with this timer.
 */
Mojo.Timing.PerfTimer.prototype.resume = function resume () {
	this.count += 1;
	if (this.count === 1) {
		this.startTime = this.millisecondsNow();
		this.running = true;
	}
};

/**
 * Pause the timer, adding the duration of this run to the elapsed time.
 */
Mojo.Timing.PerfTimer.prototype.pause = function pause () {
	Mojo.require(this.count > 0, "unbalanced call to PerfTimer pause/resume '#{label}'", {label: this.label});
	this.count -= 1;
	if (this.count === 0) {
		this.elapsedTime += (this.millisecondsNow() - this.startTime);
		this.timesRecorded += 1;
		this.running = false;
		delete this.startTime;
	}
};

// Null performance timer to be returned from get() when timing is disabled.
Mojo.Timing.nullPerfTimer = new Mojo.Timing.PerfTimer("<null>");

// Factory function for performance timers to allow tests to create mocks.
Mojo.Timing.defaultCreatePerfTimer = function defaultCreatePerfTimer(label) {
	return new Mojo.Timing.PerfTimer(label);
};

// Reference to the factory function that tests change.
Mojo.Timing.createPerfTimer = Mojo.Timing.defaultCreatePerfTimer;

/**
 * Reset the timings for a category.
 * @param {String} category name of the category to reset
 */
Mojo.Timing.reset = function reset(category) {
	delete Mojo.Timing.perfTimers[category];
};

/**
 * Return a list of category strings with a common prefix
 * @param {String} prefix the common prefix
 * @returns Array of matching categories
 * @type Array
 */
Mojo.Timing.getCategoriesWithPrefix = function getCategoriesWithPrefix(prefix) {
	var categories = $H(Mojo.Timing.perfTimers).keys();

	var withPrefix = function(category) {
		return category.startsWith(prefix);
	};
	return categories.findAll(withPrefix);
};

/**
 * Resets all the performance timers
 */
Mojo.Timing.resetAll = function resetAll() {
	Mojo.Timing.perfTimers = {};
};

/**
 * Reset all the timers with a common prefix.
 * @param {String} prefix common prefix
 */
Mojo.Timing.resetAllWithPrefix = function resetAllWithPrefix(prefix) {
	var categories = Mojo.Timing.getCategoriesWithPrefix(prefix);
	var resetOneCategory = function(category) {
		Mojo.Timing.reset(category);
	};
	categories.each(resetOneCategory);
};

/**
 * Get a performance timer for a particular category, creating it if needed.
 * @param {String} category Category of the timer
 * @returns Performance timer for the category, or the null timer if timing is disabled.
 * @type Mojo.Timing.PerfTimer
 */
Mojo.Timing.get = function get(category) {
	Mojo.require(category, "category must be defined");
	if (!Mojo.Timing.enabled) {
		return Mojo.Timing.nullPerfTimer;
	}
	var perfTimers = Mojo.Timing.perfTimers;
	var timerForCategory = perfTimers[category];
	if (timerForCategory === undefined) {
		timerForCategory = Mojo.Timing.createPerfTimer(category);
		perfTimers[category] = timerForCategory;
	}
	return timerForCategory;
};

/**
 * Start or resume timing for a particular category.
 * @param {String} category category name
 */
Mojo.Timing.resume = function resume(category) {
	if (!Mojo.Timing.enabled) {
		return;
	}
	var timerForCategory = Mojo.Timing.get(category);
	timerForCategory.resume();
};

/**
 * Pause timing for a particular category.
 * @param {String} category category name
 */
Mojo.Timing.pause = function pause(category) {
	if (!Mojo.Timing.enabled) {
		return;
	}
	var timerForCategory = Mojo.Timing.get(category);
	timerForCategory.pause();
};

/**
 * Report (with Mojo.Log.info) all the timings for a particular category prefix
 * @param {String} prefix Prefix to define which timings to show
 * @param {String} label Label shown in the timing output
 */
Mojo.Timing.createTimingString = function createTimingString(prefix, label) {
	if (!Mojo.Timing.enabled) {
		return "";
	}
	var categories = Mojo.Timing.getCategoriesWithPrefix(prefix);
	var makeOneTiming = function(category) {
		var perfTimer = Mojo.Timing.get(category);
		return category.gsub(prefix, '') + ": " + perfTimer.elapsedTime + "ms (" + perfTimer.timesRecorded + ")";
	};
	var timings = categories.collect(makeOneTiming);
	return "" + label + ": " + timings.join(", ");
};

/**
 * Report (with Mojo.Log.info) all the timings for a particular category prefix
 * @param {String} prefix Prefix to define which timings to show
 * @param {String} label Label shown in the timing output
 */
Mojo.Timing.reportTiming = function reportTiming(prefix, label) {
	if (!Mojo.Timing.enabled) {
		return;
	}
	Mojo.Log.info(Mojo.Timing.createTimingString(prefix, label));
};

/**
 * Resets timings for scene push/pop operations
 */
Mojo.Timing.resetSceneTiming = function resetSceneTiming(sceneWindow) {
	Mojo.Timing.resetAllWithPrefix('scene#');
	sceneWindow.layoutCount = 0;
};

/**
 * Reports timings for scene push/pop operations, labeled with prefix 'scene#'.
 */
Mojo.Timing.reportSceneTiming = function reportSceneTiming(sceneName, sceneWindow) {
	var layoutCount;
	if (!Mojo.Timing.enabled) {
		return;
	}
	layoutCount = sceneWindow.layoutCount;
	Mojo.Log.info(Mojo.Timing.reportTiming('scene#', "scene '" + sceneName + "': layouts: " + layoutCount));
};
