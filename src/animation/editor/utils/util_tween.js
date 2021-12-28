/**************************/
// Tweens
/**************************/

const Tweens = {
	none: function(amount) {
		return 0;
	},
	linear: function(amount) {
		return amount;
	},
	quadEaseIn: function(amount) {
		return amount * amount;
	},
	quadEaseOut: function(amount) {
		return - amount * ( amount - 2 );
	},
	quadEaseInOut: function(amount) {
		if ( ( amount *= 2 ) < 1 )
			return 0.5 * amount * amount;

		return - 0.5 * ( --amount * ( amount - 2 ) - 1 );
	}
};

const Easing = {
	none: 'none',
	linear: 'linear',
	quadEaseIn: 'quadEaseIn',
	quadEaseOut: 'quadEaseOut',
	quadEaseInOut: 'quadEaseInOut'
};

export { Tweens, Easing }