import { LayerView } from './ViewLayer.js'
import { IconButton } from '../ui/IconButton.js'
import { utils } from '../utils/utils.js'
import {MARKER_TRACK_HEIGHT} from "./TimelinePanel.js"

const { style } = utils;

function LayerCabinet(data, dispatcher) {
	let layerStore = data.get('layers');

	let root = document.createElement('div');

	root.id = "layer-cabinet-container";

	let titleSpan = document.createElement('span');

	style(titleSpan, {
		position: 'absolute',
		top: '5px',
		left: '15px',
	});

	titleSpan.innerHTML = 'Summary';

	let layerScroll = document.createElement('div');
	layerScroll.id = 'layer_scroll';

	style(layerScroll, {
		position: 'absolute',
		top: MARKER_TRACK_HEIGHT + 'px',
		left: 0,
		right: 0,
		bottom: 0,
		overflow: 'hidden',
		background: '#232323'
	});

	root.appendChild(titleSpan);
	root.appendChild(layerScroll);

	let playing = false;

	let op_button_styles = {
		width: '32px',
		padding: '3px 4px 3px 4px'
	};

	let undo_button = new IconButton(16, 'undo', 'undo', dispatcher);

	style(undo_button.dom, op_button_styles);

	undo_button.onClick(function() {
		dispatcher.fire('controls.undo');
	});

	let redo_button = new IconButton(16, 'repeat', 'redo', dispatcher);
	style(redo_button.dom, op_button_styles);
	redo_button.onClick(function() {
		dispatcher.fire('controls.redo');
	});

	let dropdown = document.createElement('select');

	style(dropdown, {
		position: 'absolute',
		opacity: 0,
		width: '16px',
		height: '16px',
	});

	dropdown.addEventListener('change', function(e) {
		// console.log('changed', dropdown.length, dropdown.value);

		switch (dropdown.value) {
		case '*new*':
			dispatcher.fire('new');
			break;
		case '*import*':
			dispatcher.fire('import');
			break;
		case '*select*':
			dispatcher.fire('openfile');
			break;
		default:
			dispatcher.fire('open', dropdown.value);
			break;
		}
	});

	let layer_uis = [], visible_layers = 0;
	let unused_layers = [];

	this.layers = layer_uis;

	this.setControlStatus = function(v) {
		playing = v;
	};

	/**
	 * @param {DataProx} state
	 */
	this.setState = function(state) {
		layerStore = state;
		let layers = layerStore.value;
		// layers = state;
		console.log(layer_uis.length, layers);
		let i, layer;

		for (i = 0; i < layers.length; i++) {
			layer = layers[i];

			if (!layer_uis[i]) {
				let layer_ui;
				if (unused_layers.length) {
					layer_ui = unused_layers.pop();
					layer_ui.dom.style.display = 'block';
				} else {
					// new
					layer_ui = new LayerView(layer, dispatcher);
					layerScroll.appendChild(layer_ui.dom);
				}
				layer_uis.push(layer_ui);
			}
		}

		console.log('Total layers (view, hidden, total)', layer_uis.length, unused_layers.length,
			layer_uis.length + unused_layers.length);
	};

	function repaint(time) {
		let currentTimeStore = data.get('ui:currentTime');

		time = currentTimeStore.value;

		time = time || 0;

		let layers = layerStore.value;
		for (let i = layer_uis.length; i-- > 0;) {
			// quick hack
			if (i >= layers.length) {
				layer_uis[i].dom.style.display = 'none';
				unused_layers.push(layer_uis.pop());
				continue;
			}

			layer_uis[i].setState(layers[i], layerStore.get(i));
			layer_uis[i].repaint(time);
		}

		visible_layers = layer_uis.length;
	}

	this.repaint = repaint;
	this.setState(layerStore);

	this.scrollTo = function(x) {
		layerScroll.scrollTop = x * (layerScroll.scrollHeight - layerScroll.clientHeight);
	};

	this.dom = root;

	repaint();
}

export { LayerCabinet }
