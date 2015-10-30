export function initMorphicTools() {
	initDragBehaviour();
	initMagnifier();
}

function initMagnifier() {
	$("body").on("click", (e) => {
		if (e.ctrlKey) {
			let target = getTargetElementFromEvent(e);
			console.log("Current element:" ,target);
		}
	});
}

function getTargetElementFromEvent(e) {
	return e.target;
}

function initDragBehaviour() {
	$("body").on("click", function(evt) {
		
	});
}
