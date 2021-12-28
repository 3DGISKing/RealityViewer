import { Tweens } from './util_tween.js'

var STORAGE_PREFIX = 'timeliner-';

/**************************/
// Utils
/**************************/

function firstDefined() {
	for (var i = 0; i < arguments.length; i++) {
		if (typeof arguments[i] !== 'undefined') {
			return arguments[i];
		}
	}
	return undefined;
}

function style(element, ...styles) {
	for (var i = 0; i < styles.length; ++i) {
		var style = styles[i];
		for (var s in style) {
			element.style[s] = style[s];
		}
	}
}

function format_friendly_seconds(s, type) {
	// TODO Refactor to 60fps???
	// 20 mins * 60 sec = 1080
	// 1080s * 60fps = 1080 * 60 < Number.MAX_SAFE_INTEGER

	var raw_secs = s | 0;
	var secs_micro = s % 60;
	var secs = raw_secs % 60;
	var raw_mins = raw_secs / 60 | 0;
	var mins = raw_mins % 60;
	var hours = raw_mins / 60 | 0;

	var secs_str = (secs / 100).toFixed(2).substring(2);

	var str = mins + ':' + secs_str;

	if (s % 1 > 0) {
		var t2 = (s % 1) * 60;
		if (type === 'frames') str = secs + '+' + t2.toFixed(0) + 'f';
		else str += ((s % 1).toFixed(2)).substring(1);
		// else str = mins + ':' + secs_micro;
		// else str = secs_micro + 's'; /// .toFixed(2)
	}
	return str;
}

// get object at time
function findTimeinLayer(layer, time) {
	var values = layer.values;
	var i, il;

	// TODO optimize by checking time / binary search

	for (i = 0, il = values.length; i < il; i++) {
		var value = values[i];
		if (value.time === time) {
			return {
				index: i,
				object: value
			};
		} else if (value.time > time) {
			return i;
		}
	}

	return i;
}

/**
 * @param {object} layer
 * @param time
 * @returns {{can_tween: boolean, value: *, keyframe: boolean}|{entry: ({tween}|*), tween: (*|boolean|null|string), can_tween: boolean, value: *, keyframe: boolean}|{entry: *, tween: (*|boolean|null|string), can_tween: boolean, value: *, keyframe: boolean}|{tween: boolean, entry: *, can_tween: boolean, value: *, keyframe: boolean}}
 */
function timeAtLayer(layer, time) {
	// Find the value of layer at t seconds.
	// this expect layer to be sorted
	// not the most optimized for now, but would do.

	var values = layer.values;
	var i, il, entry, prevEntry;

	il = values.length;

	// can't do anything
	if (il === 0)
		return;

	if (layer._mute)
		return;

	// find boundary cases
	entry = values[0];

	if (time < entry.time) {
		return {
			value: entry.value,
			can_tween: false, // cannot tween
			keyframe: false // not on keyframe
		};
	}

	for (i = 0; i < il; i++) {
		prevEntry = entry;
		entry = values[i];

		if (time === entry.time) {
			// only exception is on the last KF, where we display tween from prev entry
			if (i === il - 1) {
				return {
					// index: i,
					entry: prevEntry,
					tween: prevEntry.tween,
					can_tween: il > 1,
					value: entry.value,
					keyframe: true
				};
			}
			return {
				// index: i,
				entry: entry,
				tween: entry.tween,
				can_tween: il > 1,
				value: entry.value,
				keyframe: true // il > 1
			};
		}
		if (time < entry.time) {
			// possibly a tween
			if (!prevEntry.tween) { // or if value is none
				return {
					value: prevEntry.value,
					tween: false,
					entry: prevEntry,
					can_tween: true,
					keyframe: false
				};
			}

			// calculate tween
			const timeDiff = entry.time - prevEntry.time;
			const valueDiff = entry.value - prevEntry.value;
			const tween = prevEntry.tween;

			const dt = time - prevEntry.time;
			const amount = dt / timeDiff;
			const newValue = prevEntry.value + Tweens[tween](amount) * valueDiff;

			return {
				entry: prevEntry,
				value: newValue,
				tween: prevEntry.tween,
				can_tween: true,
				keyframe: false
			};
		}
	}

	// time is after all entries
	return {
		value: entry.value,
		can_tween: false,
		keyframe: false
	};
}


function proxy_ctx(ctx) {
	// Creates a proxy 2d context wrapper which
	// allows the fluent / chaining API.
	var wrapper = {};

	function proxy_function(c) {
		return function() {
			// Warning: this doesn't return value of function call
			ctx[c].apply(ctx, arguments);
			return wrapper;
		};
	}

	function proxy_property(c) {
		return function(v) {
			ctx[c] = v;
			return wrapper;
		};
	}

	wrapper.run = function(args) {
		args(wrapper);
		return wrapper;
	};

	for (var c in ctx) {
		// if (!ctx.hasOwnProperty(c)) continue;
		// console.log(c, typeof(ctx[c]), ctx.hasOwnProperty(c));
		// string, number, boolean, function, object

		var type = typeof(ctx[c]);
		switch (type) {
		case 'object':
			break;
		case 'function':
			wrapper[c] = proxy_function(c);
			break;
		default:
			wrapper[c] = proxy_property(c);
			break;
		}
	}

	return wrapper;
}

const utils = {
	STORAGE_PREFIX,
	firstDefined,
	style,
	format_friendly_seconds,
	findTimeinLayer,
	timeAtLayer,
	proxy_ctx
};

export { utils }