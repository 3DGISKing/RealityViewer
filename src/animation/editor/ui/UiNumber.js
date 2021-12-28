import { Theme } from '../theme.js'
import { Do } from '../utils/do.js'
import { handleDrag } from '../utils/util_handle_drag.js'
import { utils } from '../utils/utils.js'
import { LayoutParameters } from "../Settings.js"
const { firstDefined, style } = utils;

/**************************/
// UINumber
/**************************/

function UINumber(config) {
	config = config || {};
	let min = config.min === undefined ? -Infinity : config.min;

	// config.xstep and config.ystep allow configuring adjustment
	// speed across each axis.
	// config.wheelStep and config.wheelStepFine allow configuring
	// adjustment speed for mousewheel, and mousewheel while holding <alt>

	// If only config.step is specified, all other adjustment speeds
	// are set to the same value.
	let xstep = firstDefined(config.xstep, config.step, 0.001);
	let ystep = firstDefined(config.ystep, config.step, 0.1);
	let wheelStep = firstDefined(config.wheelStep, ystep);
	let wheelStepFine = firstDefined(config.wheelStepFine, xstep);

	let precision = config.precision || 3;
	// Range
	// Max

	const input = document.createElement('input');

	input.className = "animation-editor-ui-number";
	// span.type = 'number'; // spinner

	style(input, {
		textAlign: 'center',
		fontSize: '13px',
		padding: '1px',
		cursor: 'ns-resize',
		width: LayoutParameters.UI_NUMBER_WIDTH + 'px',
		margin: 0,
		//marginRight: '10px',
		appearance: 'none',
		outline: 'none',
		border: 0,
		background: Theme.b,
		borderRadius: '3px',
		borderBottom: '1px dotted '+ Theme.c,
		color: Theme.c,
	});

	let me = this;
	let state, value = 0, unchanged_value;

	this.onChange = new Do();

	input.addEventListener('change', function(e) {
		console.log('input changed', input.value);
		value = parseFloat(input.value, 10);

		fireChange();
	});

	// Allow keydown presses in inputs, don't allow parent to block them
	input.addEventListener('keydown', function(e) {
		e.stopPropagation();
	});

	input.addEventListener('focus', function(e) {
		input.setSelectionRange(0, input.value.length);
	});

	input.addEventListener('wheel', function(e) {
		// Disregard pixel/line/page scrolling and just
		// use event direction.
		let inc = e.deltaY > 0? 1 : -1;
		if (e.altKey) {
			inc *= wheelStepFine;
		} else {
			inc *= wheelStep;
		}
		value = clamp(value + inc);
		fireChange();
	});

	handleDrag(input, onDown, onMove, onUp);

	function clamp(value) {
		return Math.max(min, value);
	}

	function onUp(e) {
		if (e.moved) fireChange();
		else {
			// single click
			input.focus();
		}
	}

	function onMove(e) {
		let dx = e.dx;
		let dy = e.dy;

		value = unchanged_value + (dx * xstep) + (dy * -ystep);

		value = clamp(value);

		// value = +value.toFixed(precision); // or toFixed toPrecision
		me.onChange.fire(value, true);
	}

	function onDown(e) {
		unchanged_value = value;
	}

	function fireChange() {
		me.onChange.fire(value);
	}

	this.dom = input;

	// public
	this.setValue = function(v) {
		value = v;
		input.value = value.toFixed(precision);
	};

	this.paint = function() {
		if (value && document.activeElement !== input) {
			input.value = value.toFixed(precision);
		}
	};
}

export { UINumber }
