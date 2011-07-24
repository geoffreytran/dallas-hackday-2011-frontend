/**
 * @name animation_generator.js
 * @fileOverview This file has functions related to animation value generators;
 
Copyright 2009 Palm, Inc.  All rights reserved.

*/

/**
 * This entire widget class is private. 
 * Generators are used to control the curves used for animations.
 * They operate on time and position values ranging from 0 to 1.
 * @private
 * @class
 */

Mojo.Animation.Generator = {};

/**
 * Distance returned by the linear generator correspond 1-1 to the time that has passed.
 *
 */
Mojo.Animation.Generator.Linear = Class.create({
		initialize: function(details) {
			this.details = details;
		},

		getPositionFromTime: function(time) {
			return time;
		},

		getTimeFromPosition: function(value) {
			return value;
		}


	});

/**
 * Gives positions that are a constant fraction closer to the destination at 'discrete timesteps'.
 *
 * e.g. For a coefficient of 0.5, after a single timestep 1/2 of the distance is covered. After 2 and 3 timesteps, 3/4
 * and 7/8 of the total distance would be completed.
 *
 * A small 'overshoot' is added so that the animation doesn't take forever to complete and so that when it reached the
 * 'to' position, it is going at a rate of 1 frame/second and will be stopped.
 */
Mojo.Animation.Generator.Zeno = Class.create({
		initialize: function(details) {
			var delta;

			details = details || {};

			this.from = details.from;
			this.to = details.to;

			this.coefficient = details.coefficient || 0.4;
			this.details = details;

			this.spread = details.to - details.from;
			this.goingUp = (this.spread > 0);

			if(this.goingUp) {
				this.fakeToValue = this.spread + 1/this.coefficient;
			} else {
				this.fakeToValue = this.spread - 1/this.coefficient;
			}

			this.overshoot = 1/(this.coefficient * this.spread);
			this.numFrames = Math.ceil(Math.log(this.spread)/ Math.log(1/(1-this.coefficient)));
		},

		getPositionFromTime: function(time) {
			var position;
			
			if(this.details.reverse) {
				time = 1-time;
			}

			position = Math.min(1, (1-Math.pow(1-this.coefficient, (time*this.numFrames))) + this.overshoot);

			return (this.details.reverse ? 1-position : position);
		},

		getTimeFromPosition: function(position) {
			if(this.details.reverse) {
				position = 1-position;
			}
			var time = Math.log(1+this.overshoot-position) /Math.log(1-this.coefficient) / this.numFrames;
			return (this.details.reverse ? 1-time : time);
		},


		getNumberFrames: function(value) {
			return this.numFrames;
		}
	});


	/*
	  Cubic Bezier Support
	  ====================

	  Bezier equations as defined for PostScript.
	  Formulas for y are the same as X.
	  x(t) = at^3 + bt^2 + ct + x0

	  x1 = x0 + c / 3
	  x2 = x1 + (c + b) / 3
	  x3 = x0 + c + b + a

	  Solved for a,b,c:
	  c = 3 (x1 - x0)
	  b = 3 (x2 - x1) - c
	  a = x3 - x0 - c - b

	  Then given 4 points [(x0,y0), (x1,y1), (x2,y2), (x3,y3)], we can generate the curve.

	  Point 0 is the starting point and point 3 is endpoint.  In the code, we simplify the
	  equations assuming P0=(0,0) and P3=(1,1) respectively.  The 4 values used to
	  define the curve, then, are the control points: [x1,y1,x2,y2].

	  We also use the derivative, when approximating t for a given x:
	  x'(t) = 3at^2 + 2bt + c

	*/

Mojo.Animation.Generator.Bezier = Class.create({

	initialize: function(details) {
			this.curve = details.curve;
			if(!this.curve) {
				this.curve = this.bezierCurves["over-easy"];
			}
			this.details = details;

			if(typeof details.curve == "string" && this.bezierCurves[details.curve]) {
				this.curve = this.bezierCurves[details.curve];
				this.bezierMemoizeCoefficients(this.curve.x);
				this.bezierMemoizeCoefficients(this.curve.y);
			}
			// User specified control points for a cubic bezier.
			else if(details.curve[0] !== undefined && details.curve.length == 4) {
				this.curve = {x:[details.curve[0], details.curve[2]], y: [details.curve[1], details.curve[3]]};
				this.bezierMemoizeCoefficients(this.curve.x);
				this.bezierMemoizeCoefficients(this.curve.y);
			}

			// Calculate allowed error, such that when the curve output value is multiplied by our animation range,
			// we'll be within 0.5 of the "correct" value, and thus will either round to the correct integer, or
			// else we'll at least only be off by 1 pixel.
			this.epsilon = 0.5/Math.abs(details.to - details.from); // 0.5 pixels of error


		},


	/** @private
		Find an x or y value for the given t using equations for a cubic bezier curve and the given curve args.
		The curveArgs control whether the calculation yields X or Y values (depending on which points are provided).

		They should be arrays formatted like this:  [x1,x2] or [y1,y2].
		In addition the coefficient values a, b & c should already be calculated and set on the objects.

		Both t and the result value should be in the interval [0,1].
	*/
	bezierCalcPoint : function(t, curveArgs) {
		if(t === undefined) {
			return undefined;
		}
		return ((curveArgs.a*t + curveArgs.b)*t + curveArgs.c)*t;
	},



	/** @private
		Given an X value for the current cubic bezier curve,
		estimate T and then calculate the corresponding Y, returning it.
		Returns undefined if our estimation does not converge within a reasonable number of iterations.
	*/
	getPositionFromTime : function(t) {
		var realT = this.getTFromAxis(t, this.curve.x); // find t value for given x (=t)
		if(realT === undefined) {
			return undefined;
		}
		return this.bezierCalcPoint(realT, this.curve.y); // find y value for the t (and thus also for the x, i).
	},


	getTimeFromPosition : function(p) {
		var t = this.getTFromAxis(p, this.curve.y);
		var xCoordinate = this.bezierCalcPoint(t, this.curve.x);
		return xCoordinate;
		},


	/** @private
		Given an x or y value, calculate the T that goes with it using Newton's method.
	*/

	getTFromAxis: function(p, curveArgs) {
		var curT = p; // we begin by guessing t=p.
		var error;
		var slope;
		var i=0;
		while(i < 20) {

			error = p - this.bezierCalcPoint(curT, curveArgs);

			if(Math.abs(error) < this.epsilon) {
				return curT;
			}

			// Derivative of curve equation: 3at^2 + 2bt + c
			// Invert it to get dt/dx since we're multiplying by an x value (error).
			slope = 1/(3 * curveArgs.a * curT * curT + 2 * curveArgs.b*curT + curveArgs.c);
			curT += error * slope;
			i++;
		}

		// Newton's method is usually extremely fast, but not actually guaranteed to converge.
		Mojo.Log.warn("WARNING: StyleAnimator exceeded max iterations, error="+error);

		return undefined;
	},


	// internal format of storing curves differs from how they're specified by users.
	// Instead of 1 array of [x1,y1,x2,y2], we store X & Y in separate arrays [x1,x2], [y1,y2] so the code can easily operate on one or the other.
	// The coefficients, dependent only on the x OR y values, are calculated and added to the array objects lazily.
	bezierCurves : {
		'ease': {x:[0.25, 0.25], y:[0.1, 1]},
		'ease-in': {x:[0.42, 1], y:[0, 1]},
		'ease-out': {x:[0, 0.58], y:[0, 1]},
		'ease-in-out': {x:[0.42, 0.58], y:[0, 1]},
		'over-easy': {x:[0.6, 0.4], y:[0.1, 0.9]},
		'linear': {x:[0, 1], y:[0, 1]}	// Just for reference, this curve is not actally used for linear animation.
	},





	// Calculates the bezier coefficients a,b,c for the given points [x1,x2] or [y1,y2].
	// Adds them to the hash so they don't need to be calculated again later.
	/** @private */
	bezierMemoizeCoefficients : function(points) {
		var a,b,c;

		// Only calculate once.
		if(points.a !== undefined) {
			return;
		}

		c = 3 * points[0];
		b = 3 * (points[1] - points[0]) - c;
		a = 1 - c - b;

		points.c = c;
		points.b = b;
		points.a = a;
	}




	});


