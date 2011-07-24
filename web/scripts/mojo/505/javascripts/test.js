/**
 * @name test.js
 * @fileOverview This file has functions related to related to writing and executing tests.

Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
 * @namespace Holds functionality related to writing and executing tests.
@private
*/

Mojo.Test = {};

Mojo.Test.passed = {};
Mojo.Test.beforeFinished = {};

/**
 * ??
 */
Mojo.Test.CollectionRunner = function CollectionRunner (tests, options) {
	this.options = options || {};
	this.tests = $A(tests);
	this.listeners = [];
};

/**
 * Loads the test specification file in pathToSpecification. For each spec, looks
 * for the specified test function. If the test function doesn't exist, attempts to
 * load the associated source file for that test.
 * @param {String} pathToSpecification Absolute or document-relative path to the test specification file.
 * @param {Function} loadFinishedCallback Optional function object to call when any needed code loading is finished.
 * @returns An array of test specifications.
 * @type Array
 */
Mojo.Test.loadCollection = function loadCollection (pathToSpecification, loadFinishedCallback) {
	var collection = [];
	var sync, loadCallback;
	var specAsJSONText = palmGetResource(pathToSpecification);
	var syncCallback = loadFinishedCallback || Mojo.doNothing;
	if (specAsJSONText) {
		collection = Mojo.parseJSON(specAsJSONText);
		for (var i = collection.length - 1; i >= 0; i--){
			var testSpec = collection[i];
			var f = Mojo.findConstructorFunction(testSpec.testFunction);
			if (!f) {
				if (!sync) {
					sync = new Mojo.Function.Synchronize({syncCallback: syncCallback});
				}
				loadCallback = sync.wrap(Mojo.doNothing);
				Mojo.loadScriptWithCallback(testSpec.source, loadCallback);
			}
		}
		if (!sync && loadFinishedCallback) {
			loadFinishedCallback();
		}
	}
	return collection;
};

/**
 * Starts running the first test in the collection.
 */
Mojo.Test.CollectionRunner.prototype.start = function start(callback) {
	this.results = [];
	this.callback = callback;
	this.runNextTest();
};

/**
 * Stops the tests after the currently running test completes.
 */
Mojo.Test.CollectionRunner.prototype.stop = function stop() {
	this.stopRequested = true;
	if (this.currentTestRunner) {
		this.currentTestRunner.stop();
	}
};

/**
 * Starts running the next test in the collection.
 * @private
 */
Mojo.Test.CollectionRunner.prototype.runNextTest = function runNextTest() {
	delete this.currentTestRunner;
	if (this.stopRequested) {
		delete this.currentTest;
		this.stopped = true;
	} else {
		this.currentTest = this.tests.shift();		
	}

	if (this.currentTest) {
		this.runCurrentTest();		
	} else {
		this.callback();
	}		
};

/**
 * Creates and starts a test runner for the current test.
 * @private
 */
Mojo.Test.CollectionRunner.prototype.runCurrentTest = function runCurrentTest() {
	this.currentTestRunner = new Mojo.Test.Runner(this, this.currentTest, {perf: this.options.perf});
	this.currentTestRunner.start();
};

/**
 * Called by the test runner when it is finished running tests. Starts up
 * the next test, if any.
 * @private
 * @param {Object} test Reference to the test object that is finishing.
 */

Mojo.Test.CollectionRunner.prototype.testFinished = function testFinished(test) {
	this.results = this.results.concat(test.results);
	var that = this;
	var deferNextText = function() {
		that.runNextTest();
	};
	deferNextText.defer();
};

/**
 * Object that runs all the tests for a particular test object.
 */
Mojo.Test.Runner = function Runner(parentRunner, testConstructorFunction, options) {
	this.options = options || {};
	this.timeoutInterval = testConstructorFunction.timeoutInterval || 1000;
	this.timeoutFired = {};
	this.afterCalled = {};
	this.parentRunner = parentRunner;
	this.testConstructorFunction = testConstructorFunction;
	if (this.options.perf) {
		this.findMeasureFunctions();		
	} else {
		this.findTestFunctions();		
	}
};

Mojo.Test.Runner.prototype.findFunctionsCommon = function findFunctionsCommon(arrayName, functionPrefix) {
	var names = this.testConstructorFunction[arrayName];
	if (names !== undefined) {
		Mojo.requireArray(names, "testConstructorFunction." + arrayName + " must be undefined or an array.");
		this.functionsToRun = $A(names);
		return;
	}
	this.functionsToRun = [];
	for (var propertyName in this.testConstructorFunction.prototype) {
		if (propertyName.startsWith(functionPrefix)) {
			var f = this.testConstructorFunction.prototype[propertyName];
			if (Object.isFunction(f)) {
				this.functionsToRun.push(propertyName);
			}
		}
	}
};

/**
 * Checks the test object constructor function for a "testFunctionNames" property. If
 * such a property exists, and is an array, uses the strings in that array as the names of test
 * functions to call. The array also provides the order for the test functions to be called.
 * If there is no test functions array, this function searches through the constructor function's
 * prototype to find functions whose name starts with "test". The results of this search provides
 * the list and order of the test functions.
 * @private
 */
Mojo.Test.Runner.prototype.findTestFunctions = function findTestFunctions() {
	this.findFunctionsCommon("testFunctionNames", "test");
};

/**
 * Checks the test object constructor function for a "measureFunctionNames" property. If
 * such a property exists, and is an array, uses the strings in that array as the names of measure
 * functions to call. The array also provides the order for the  measure functions to be called.
 * If there is no  measure functions array, this function searches through the constructor function's
 * prototype to find functions whose name starts with "measure". The results of this search provides
 * the list and order of the measure functions.
 * @private
 */
Mojo.Test.Runner.prototype.findMeasureFunctions = function findMeasureFunctions() {
	this.findFunctionsCommon("measureFunctionNames", "measure");
};

/**
 * Forgets any previous results and starts the tests running.
 */
Mojo.Test.Runner.prototype.start = function start() {
	if (this.running) {
		throw new Error("Can't start tests that are already running.");
	}
	this.running = true;
	this.results = [];
	this.runNextTest();
};

/**
 * Stops a running test after the completion of any currently running
 * test function.
 */
Mojo.Test.Runner.prototype.stop = function stop() {
	if (!this.running) {
		throw new Error("Can't stop tests that are not already running.");
	}
	this.stopRequested = true;
};

/**
 * Resets the timeout used to detect tests that haven't completed in the required time.
 * Expected to be used by tests that sometimes need to run longer than the default timeout.
 * This method isn't called directly, but a version with the currently test method name curried
 * to it is passed to each test.
 * @param {String} testMethodName Name of the currently running test function.
 */
Mojo.Test.Runner.prototype.tickle = function tickle(testMethodName) {
	this.stopTimeout();
	this.startTimeout(testMethodName);
};

/**
 * Starts the test execution timeout timer.
 * @private
 * @param {String} testMethodName The name of the test method that is being run.
 */
Mojo.Test.Runner.prototype.startTimeout = function startTimeout(testMethodName) {
	this.timeoutFired[testMethodName] = false;
	this.testTimeout = window.setTimeout(this.timeoutHandler.bind(this, testMethodName), this.timeoutInterval);
};

/**
 * Stops the test execution timeout timer.
 * @private
 */
Mojo.Test.Runner.prototype.stopTimeout = function stopTimeout() {
	window.clearTimeout(this.testTimeout);
};

/**
 * Handler function for the test execution timeout timer. Records a failure for
 * the specified test wth recordResult().
 * @private
 * @param {String} testMethodName The name of the test method that is being run.
 */
Mojo.Test.Runner.prototype.timeoutHandler = function timeoutHandler(testMethodName) {
	this.recordResult(testMethodName, "Timeout fired while waiting for test to finish.");
	this.timeoutFired[testMethodName] = true;
};

/**
 * Starts the next test running. If there aren't any more to run, or a stop has
 * been requested, informs the parent runner that this test object is finished.
 * @private
 */
Mojo.Test.Runner.prototype.runNextTest = function runNextTest() {
	var testMethodName;
	if (!this.stopRequested) {
		testMethodName = this.functionsToRun.shift();
	}
	if (testMethodName) {
		this.currentTest = new this.testConstructorFunction(this.tickle.bind(this, testMethodName));
		if (this.options.perf) {
			this.currentTest.timing = Mojo.Timing;
		}
		this.startTimeout(testMethodName);
		this.callBeforeMethod(testMethodName);
	} else {
		this.running = false;
		this.parentRunner.testFinished(this);
	}
};

/**
 * Utility routine to make a result object from an exception.
 * @private
 * @param {String} testObjectName Name of the test object being used.
 * @param {String} methodName Name of the test function being run.
 * @param {Object} e Error object from a catch statement..
 * @returns Describe what it returns
 * @type String|Object|Array|Boolean|Number
 */
Mojo.Test.Runner.prototype.makeResultFromException = function makeResultFromException(suitName, methodName, e) {
	return {
		passed: false,
		suite: suitName,
		method: methodName,
		message: e.toString()
	};
};

/** @private */
Mojo.Test.Runner.prototype.makeResultMessage = function makeResultFromException(suitName, methodName, message, isMeasurement) {
	if (message === Mojo.Test.passed) {
		message = undefined;
	}
	return {
		passed: isMeasurement || !message,
		suite: suitName,
		method: methodName,
		message: message || "Passed."
	};
};

/** @private */
Mojo.Test.Runner.prototype.callBeforeMethod = function callBeforeMethod(testMethodName) {
	var nextMethod;
	if (this.options.perf) {
		nextMethod = this.executeMeasureMethod.bind(this, testMethodName);
	} else {
		nextMethod = this.executeTestMethod.bind(this, testMethodName);
		
	}
	if (this.currentTest.before) {
		try {
			var r = this.currentTest.before(nextMethod);
			if (r === Mojo.Test.beforeFinished) {
				this.executeTestMethod(testMethodName);
			}
		} catch (e) {
			this.results.push(this.makeResultFromException(this.testConstructorFunction.name, testMethodName, e));
			this.runNextTest();
		}
	} else {
		nextMethod();
	}
};

/** @private */
Mojo.Test.Runner.prototype.afterCallback = function afterCallback(testMethodName) {
	this.stopTimeout();
	this.runNextTest();
};

/** @private */
Mojo.Test.Runner.prototype.callAfterMethod = function callAfterMethod(testMethodName) {
	if (this.afterCalled[testMethodName]) {
		return;
	}
	if (this.currentTest.after) {
		this.currentTest.after(this.afterCallback.bind(this, testMethodName));
	} else {
		this.afterCallback(testMethodName);
	}
	this.afterCalled[testMethodName] = true;
};

/** @private */
Mojo.Test.Runner.prototype.recordResult = function recordResult (testMethodName, result) {
	if (!this.timeoutFired[testMethodName]) {
		this.results.push(this.makeResultMessage(this.testConstructorFunction.name, testMethodName, result));		
	}
	this.callAfterMethod(testMethodName);
};

/** @private */
Mojo.Test.Runner.prototype.recordMeasurement = function recordMeasurement (measureMethodName, result) {
	this.results.push(this.makeResultMessage(this.testConstructorFunction.name, measureMethodName, result, true));		
	this.callAfterMethod(measureMethodName);
};

/** @private */
Mojo.Test.Runner.prototype.executeMethodCommon = function executeMethodCommon(methodName, handleResult) {
	if (this.timeoutFired[methodName]) {
		return;
	}
	this.tickle(methodName);
	var f = this.currentTest[methodName];
	if (f) {
		try {
			var result = f.call(this.currentTest, handleResult);
			if (result === Mojo.Test.passed || Object.isString(result)) {
				handleResult(result);
			}
		} catch (e) {
			this.results.push(this.makeResultFromException(this.testConstructorFunction.name, methodName, e));
			this.callAfterMethod(methodName);
		}
	} else {
		this.callAfterMethod(methodName);
	}
};

/** @private */
Mojo.Test.Runner.prototype.executeTestMethod = function executeTestMethod(testMethodName) {
	var that = this;
	var recordTestResult = function(result) {
		if (result === Mojo.Test.passed || Object.isString(result) || result === undefined) {
			that.recordResult(testMethodName, result);
		}
	};
	this.executeMethodCommon(testMethodName, recordTestResult);
};

/** @private */
Mojo.Test.Runner.prototype.executeMeasureMethod = function executeMeasureMethod(measureMethodName) {
	var that = this;
	var recordMeasurement = function(result) {
		that.recordMeasurement(measureMethodName, result);
	};
	this.executeMethodCommon(measureMethodName, recordMeasurement);
};


/**
 * Given a test result recording function and a second function, calls the the second function
 * and considers any exception's message to be a failed test result. If no exception occurs,
 * marks the test as passed.
 * @param {Function} recordResults Result recording function passed from the test framework.
 * @param {Function} f Function containing test validations.
 */
Mojo.Test.validate = function validate(recordResults, f) {
	try {
		f();
		recordResults(Mojo.Test.passed);
	} catch (e) {
		recordResults(e.toString());
	}
};

Mojo.Test.pushTestScene = function pushTestScene(stageController, testParams) {
	var sceneArgs = {
		name: 'test',
		assistantConstructor: Mojo.Test.TestAssistant,
		sceneTemplate: Mojo.Widget.getSystemTemplatePath('test/test-scene')
	};
	stageController.pushScene(sceneArgs, testParams);
};

/*
	Constructor function for the test framework bringup scene assistant.
*/
Mojo.Test.TestAssistant = function(testRunParams) {
	var preferredTest = this.ALL_TESTS;
	var perf = false;
	this.cookie = new Mojo.Model.Cookie("TestRunnerPrefs");
	var prefs = this.cookie.get();
	if (prefs) {
		preferredTest = prefs.preferredTest;
		perf = prefs.perf;
	}
	this.testCollection = [];

	this.createTestChoices();

	this.testPrefsModel = {
		selectedTests: preferredTest,
		choices: this.testChoices,
		perf: perf
	};

	this.testSelectorAttributes = {
		label: 'Test', 
		modelProperty:'selectedTests'
	};

	this.testsLoaded = this.testsLoaded.bind(this);
	this.updatePrefs = this.updatePrefs.bind(this);
	
	this.testRunParams = testRunParams;	
};

Mojo.Test.TestAssistant.prototype.ALL_TESTS = "ALL_TESTS";

/*
	Set up the widgets and menus.
*/
Mojo.Test.TestAssistant.prototype.setup = function() {
	var dividerFunc = function(testResult) {
		return testResult.suite;
	};
	
	
	this.testCollection = Mojo.Test.loadCollection(Mojo.appPath + "tests/all_tests.json", this.testsLoaded);

	this.resultsModel = {listTitle: 'Waiting for Run', items:[]};

	this.controller.setupWidget('test-results', 
								{itemTemplate:Mojo.Widget.getSystemTemplatePath('test/result'), 
								listTemplate:Mojo.Widget.getSystemTemplatePath('test/testcontainer'),
								dividerTemplate:Mojo.Widget.getSystemTemplatePath('test/divider'), dividerFunction: dividerFunc},
								this.resultsModel);

	this.controller.setupWidget(Mojo.Menu.viewMenu, undefined, {items: [{label: "Unit Test"}, {}]});

	this.controller.setupWidget(Mojo.Menu.commandMenu, undefined, 
			{items: [
				{label:"Run", command:'run'}
				]});

	this.controller.setupWidget('test_selector', this.testSelectorAttributes, this.testPrefsModel);
	this.controller.listen('test_selector', Mojo.Event.propertyChange, this.updatePrefs);
	
	this.controller.setupWidget('perf_toggle', {modelProperty: 'perf'}, this.testPrefsModel);
	this.controller.listen('perf_toggle', Mojo.Event.propertyChange, this.updatePrefs);

	this.testRunningSpinner = this.controller.get('test-running-spinner');
	this.summary = this.controller.get('summary');
};

Mojo.Test.TestAssistant.prototype.testsLoaded = function testsLoaded () {
	Mojo.Log.info("tests loaded");
	this.createTestChoices();
	this.testPrefsModel.choices = this.testChoices;
	this.controller.modelChanged(this.testPrefsModel);
	if (this.testRunParams && this.testRunParams.runAll) {
		var resultsFunction = this.sendResults.bind(this, this.testRunParams.resultsUrl);
		this.runAllTests.bind(this, resultsFunction).delay(0.5);
	}
};

Mojo.Test.TestAssistant.prototype.updatePrefs = function updatePrefs (propChangeEvent) {
	this.cookie.put({
		preferredTest: this.testPrefsModel.selectedTests,
		perf: this.testPrefsModel.perf
	});
};

Mojo.Test.TestAssistant.prototype.createTestChoices = function updateTestsMenu () {
	var choices = [
		{
			label: 'All Tests',
			value: this.ALL_TESTS
		}
	];
	var newNames = this.testCollection.each(function(testSpec) {
		var newChoice = {
			label: testSpec.title,
			value: testSpec.testFunction
		};
		choices.push(newChoice);
	});
	this.testChoices = choices;
};

/*
	Handle the run menu command.
*/
Mojo.Test.TestAssistant.prototype.handleCommand = function handleCommand(commandEvent) {
	if(commandEvent.type == Mojo.Event.command) {
		if(commandEvent.command === 'run') {
			this.runTests();
		}
	}
};

Mojo.Test.TestAssistant.prototype.clearResults = function clearResults() {
	this.resultsModel.listTitle = "Running: " + Mojo.Format.formatDate(new Date(), {time: 'medium'});
	this.resultsModel.items = [];
	this.controller.modelChanged(this.resultsModel);
	this.summary.innerHTML = "";
};

Mojo.Test.TestAssistant.prototype.makeSummary = function makeSummary(results) {
	var passedCount = 0;
	results.each(function(result) {
		if (result.passed) {
			passedCount += 1;
		}
	});
	var resultsSummary = {passed: passedCount, failed: results.length - passedCount, total: results.length};
	return Mojo.View.render({object: resultsSummary, template: Mojo.Widget.getSystemTemplatePath('test/summary')});
};

/*
	Update the list widget that shows results.
*/
Mojo.Test.TestAssistant.prototype.updateResults = function updateResults() {
	this.testRunningSpinner.mojo.stop();		
	this.resultsModel.listTitle = "Results: " + Mojo.Format.formatDate(new Date(), {time: 'medium'});
	this.resultsModel.items = this.runner.results;
	this.controller.modelChanged(this.resultsModel);
	this.summary.innerHTML = this.makeSummary(this.runner.results);
};

Mojo.Test.TestAssistant.prototype.doRunTests = function doRunTests(selectedTests, whenCompleted) {
	/*
		Protecting this with a try/catch to aid in unit test framework development.
	*/
	this.controller.sceneScroller.mojo.scrollTo(0,0);
	this.testRunningSpinner.mojo.start();
	this.clearResults();
	try {
		var tests;
		if (selectedTests === this.ALL_TESTS) {
			tests = this.testCollection.collect(function(testSpec) {
				return Mojo.findConstructorFunction(testSpec.testFunction);
			});
		} else {
			tests = [Mojo.findConstructorFunction(selectedTests)];
		}
		this.runner = new Mojo.Test.CollectionRunner(tests, {perf: this.testPrefsModel.perf});
		this.runner.start(whenCompleted);
	} catch (e) {
		var logMsg = "test runner failure: " + e.name + ': ';
		
		if (e.message) {
			logMsg = logMsg + e.message + " ";
		}
		
		if (e.sourceURL) {
			logMsg = logMsg + ', ' + e.sourceURL;
		}
		if (e.line) {
			logMsg = logMsg + ':' + e.line;
		}
		
		whenCompleted("test failed", [{message: logMsg}]);
	}
};

/*
	Start the tests running.
*/
Mojo.Test.TestAssistant.prototype.runTests = function runTests() {
	this.doRunTests(this.testPrefsModel.selectedTests, this.updateResults.bind(this));
};

/*
	Run all tests.
*/
Mojo.Test.TestAssistant.prototype.runAllTests = function runAllTests(optionalResultsFunction) {
	var resultsFunction = optionalResultsFunction || this.updateResults.bind(this);
	this.doRunTests(this.ALL_TESTS, resultsFunction);
};

Mojo.Test.TestAssistant.prototype.sendResults = function sendResults() {
	if (this.testRunParams.resultsUrl) {
		var requestOptions = {
			method: 'put', 
			parameters: {
				"test_run[result]": Object.toJSON(this.runner.results)
			}
		};
		var resultsRequest = new Ajax.Request(this.testRunParams.resultsUrl, requestOptions);		
	}
	this.updateResults();
};