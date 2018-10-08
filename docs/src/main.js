
/* https://ja.wikipedia.org/wiki/Xorshift */
class Xorshift {
	constructor() {
		this.reset();
	}
	set seed(seed) {
		this._w = seed;
		return seed;
	}
	reset() {
		this._x = 123456789;
		this._y = 362436069;
		this._z = 521288629;
		this._w = 88675123;
	}
	random() {
		let t = this._x ^ (this._x << 11);
		this._x = this._y;
		this._y = this._z;
		this._z = this._w;
		return ( this._w=(this._w^(this._w>>19))^(t^(t>>8)) ) % 1000000 / 1000000;
	}
}
const xors = new Xorshift();


let $canvas = null;
let ctx = null;

let backImage;
let origImageData = null;
const sImageW = 400;
const sImageH = 600;

let $file = null;
let $splitNum = null;
let $splitNumRange = null;
let $duration = null;
let $durationRange = null;

let splitNum = 15;
let duration = 10000;
let t = 0;
let startTime = Date.now();
let isPlay = false;

document.addEventListener("DOMContentLoaded", start);

function shredAnimate() {
	if (!isPlay) return;

	t = (Date.now()-startTime)/duration;

	if (t > 1) {
		t = 1;
		updateShredder();
		shredFinished();
	} else {
		updateShredder();
		requestAnimationFrame(shredAnimate);
	}
}

function updateShredder() {
	drawShreddedImage(ctx, origImageData, splitNum, 123456789, t);
	$canvas.style.transform = `translateY(${t*100}%)`;
}

function shredFinished() {
	isPlay = false;
	t = 0;
	updateToggleButton();
}
function stopShredder() {
	isPlay = false;
	t = 0;
	updateShredder();
	updateToggleButton();
}
function pauseShredder() {
	isPlay = false;
	updateToggleButton();
}
function playShredder() {
	isPlay = true;
	startTime = Date.now() - duration*t;
	updateToggleButton();
	shredAnimate();
}

function updateToggleButton() {
	let text = isPlay? "Pause":"play";
	let $elms = document.querySelectorAll(".js_action");
	for (let i=0; i < $elms.length; i++) {
		let $elm = $elms[i];
		if ($elm.getAttribute("data-action") == "toggle") {
			$elm.innerHTML = text;
		}
	}
}

function setSplitNum(value) {
	if (!isFinite(value) || value < 2 || value > 100) return;
	splitNum = value-0;
	updateOptionView();
}

function setDuration(value) {
	if (!isFinite(value) || value < 1 || value > 20) return;
	duration = value * 1000;
	updateOptionView();
}

function updateOptionView() {
	$splitNum.value = splitNum;
	$splitNumRange.value = splitNum;
	$duration.value = duration/1000;
	$durationRange = duration/1000;
}

function setOptionViewListener($elms, func) {
	$elms.forEach($elm => {
		$elm.addEventListener("input", func);
		$elm.addEventListener("change", func);
	});
}

function start() {
	initShredder();
	$file = document.querySelector("#image_file");
	$file.addEventListener("change", event => {
		let file = event.target.files[0];
		let reader = new FileReader();
		reader.addEventListener("load", async event => {
			origImageData =
				generateImageDataForShredder(ctx, await loadImage(event.target.result));
		});
		reader.readAsDataURL(file);
	});


	$splitNum = document.querySelector("#split_num");
	$splitNumRange = document.querySelector("#split_num_range");
	$duration = document.querySelector("#duration");
	$durationRange = document.querySelector("#duration_range");


	setOptionViewListener([$splitNum, $splitNumRange], event => {
		setSplitNum(event.target.value);
	});
	setOptionViewListener([$duration, $durationRange], event => {
		setDuration(event.target.value);
	});


	updateOptionView();

	let $elms = document.querySelectorAll(".js_action");
	for (let i=0; i < $elms.length; i++) {
		let $elm = $elms[i];
		if (!$elm.hasAttribute("data-action")) return;
		let action = $elm.getAttribute("data-action");
		if (action == "toggle") {
			$elm.addEventListener("click", event => {
				event.preventDefault();
				if (isPlay) {
					pauseShredder();
				} else {
					playShredder();
				}
			});
		}
		else if (action == "stop") {
			$elm.addEventListener("click", stopShredder);
		}
	}

}


async function initShredder() {
	$canvas = document.querySelector(".shredded");
	$canvas.width = sImageW;
	$canvas.height = sImageH;
	ctx = $canvas.getContext("2d");
	backImage = await loadImage("./img/back.jpg");
	origImageData = generateImageDataForShredder(ctx);
}


function loadImage(url) {
	return new Promise((resolve, reject) => {
		let image = new Image();
		image.src = url;
		image.addEventListener("load", () => resolve(image));
		image.addEventListener("error", () => reject("Error"));
	});
}

function generateImageDataForShredder(ctx, image, resize) {
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
	ctx.drawImage(backImage, 0, 0);
	if (image) {
		if (resize) {
			let mag = getMagRatio(image.width, image.height, ctx.canvas.width, ctx.canvas.height);
			let w = Math.round(image.width*mag);
			let h = Math.round(image.height*mag);
			let x = (ctx.canvas.width-w)/2;
			let y = (ctx.canvas.height-h)/2;
			ctx.drawImage(image, x, y, w, h);
		} else {
			ctx.drawImage(image, 0, 0, ctx.canvas.width, ctx.canvas.height);
		}
	}
	return ctx.getImageData(0, 0, $canvas.width, $canvas.height);
}

function getMagRatio(w1, h1, w2, h2) {
	return Math.min(w2/w1, h2/h1);
}

function drawShreddedImage(ctx, imageData, splitNum, seed, t) {
	let w = imageData.width,
		h = imageData.height;
	
	ctx.clearRect(0, 0, w, h);

	xors.reset();
	xors.seed = seed;

	ctx.putImageData(imageData, 0, 0, 0, 0, w, h*(1-t)+15*t);

	for (let i=0; i < splitNum; i++) {
		let deviation = 15 * xors.random() * t,
			dw = ( w - 1*(splitNum-1) ) / splitNum,
			dx = dw*i + 1*i,
			dy = h*(1-t)+15*t;
		ctx.putImageData(imageData, 0, 0-deviation, dx, dy, dw, h-dy);
	}
}

