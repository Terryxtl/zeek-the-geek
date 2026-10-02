import Level from './level';
import Stage from './stage';
import Demon from './demon';
import {
	leftFirst,
	rightFirst,
	randomSelection,
	randomTurn
} from './demon';
import Player from './player';
import {
	Apple,
	AppleRotten,
	Ball,
	Bomb,
	Crystal,
	Door,
	Egg,
	Flower,
	Key,
	LaserGun,
	Mushroom,
	PFlower,
	Pill,
	Treasure,
	Wall
} from './object';
import {
	DIR_NORTH,
	DIR_EAST,
	DIR_WEST,
	DIR_SOUTH,
	DIR_LEFT,
	DIR_RIGHT,
	DIR_BACK,
} from './misc';
import{
	IMAGE_W,
	IMAGE_H,
	ART_STYLE,
	imagesReady,
} from './image';

Object.assign(window,{
	Stage,
	Player,
	Demon,
	Apple,
	AppleRotten,
	Ball,
	Bomb,
	Crystal,
	Door,
	Egg,
	Flower,
	Key,
	LaserGun,
	Mushroom,
	PFlower,
	Pill,
	Treasure,
	Wall,
	IMAGE_W,
	IMAGE_H,
	DIR_NORTH,
	DIR_EAST,
	DIR_WEST,
	DIR_SOUTH,
	DIR_LEFT,
	DIR_RIGHT,
	DIR_BACK,
	leftFirst,
	rightFirst,
	randomSelection,
	randomTurn,
});

function puzzlePackFinished(packName, totalScore){
	document.querySelector('canvas#stage').style.display='none';
	document.querySelector('div#footer').style.display='none';
	document.querySelector('div#gamefinished').style.display='block';
	document.querySelector('div#gamefinished h1#totalscore').innerHTML=totalScore;
	//Replay puzzle pack
	try{
		let storageData=localStorage.getItem('puzzleProcess');
		if(storageData){
			storageData=JSON.parse(storageData);
			delete storageData[packName + '_Level'];
			delete storageData[packName + '_Score'];
			localStorage.setItem('puzzleProcess',JSON.stringify(storageData));
		}
	}catch(e){
		console.error(e);
	}
}
export default function(packName, levelData) {
	var canvas = document.querySelector('canvas#stage');
	var ctx = canvas.getContext('2d');
	const fitBoard = () => {
		const controlsHeight = document.querySelector('#footer').getBoundingClientRect().height
			+ document.querySelector('#artToolbar').getBoundingClientRect().height;
		const availableHeight = Math.max(120, window.innerHeight - Math.max(120, controlsHeight + 64));
		const width = Math.max(1, Math.min(window.innerWidth - 34, availableHeight * 17 / 12, 2448));
		document.body.style.setProperty('--board-width', Math.floor(width) + 'px');
	};
	const resizeCanvas = () => {
		const bounds = canvas.getBoundingClientRect();
		const density = window.devicePixelRatio || 1;
		const width = Math.min(2448, Math.max(1, Math.round((bounds.width - 2) * density)));
		const height = Math.max(1, Math.round(width * 12 / 17));
		if (canvas.width === width && canvas.height === height) return;
		canvas.width = width;
		canvas.height = height;
		ctx.setTransform(width / 612, 0, 0, height / 432, 0, 0);
		ctx.imageSmoothingEnabled = ART_STYLE !== 'classic';
		// Resizing clears the canvas. Preserve the visible board while paused.
		imagesReady.then(() => {
			const stage = levelData[Number(document.querySelector('#level').textContent || 1) - 1];
			if (stage && canvas.offsetWidth) stage.draw(ctx);
		}).catch(() => {});
	};
	fitBoard();
	resizeCanvas();
	new ResizeObserver(resizeCanvas).observe(canvas);
	window.addEventListener('resize', fitBoard);
	const fullscreenButton = document.querySelector('#fullscreen');
	fullscreenButton.addEventListener('click', async () => {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			else await document.documentElement.requestFullscreen();
		} catch (error) {
			document.querySelector('#artStatus').textContent = '无法进入全屏，请使用浏览器的全屏功能。';
		}
	});
	document.addEventListener('fullscreenchange', () => {
		fullscreenButton.textContent = document.fullscreenElement ? '退出全屏' : '全屏';
		fitBoard();
	});
	const artSelect = document.querySelector('#artStyle');
	if (artSelect) {
		artSelect.value = ART_STYLE;
		artSelect.addEventListener('change', () => {
			const url = new URL(window.location.href);
			url.searchParams.set('art', artSelect.value);
			window.location.href = url.href;
		});
	}
	imagesReady.then(() => startGame(packName, levelData, ctx)).catch(error => {
		console.error(error);
		document.querySelector('#artStatus').textContent = 'Artwork failed to load. Please reload or choose Classic.';
	});
}

function startGame(packName, levelData, ctx) {
	var totalScore = 0;
	var levelNum = 0;

	//Disable sound by default
	document.querySelector('input#enableSound').checked = false;
	document.querySelector('input#enableSound').addEventListener('change',(e)=>{
		let settingData=localStorage.getItem('gameSetting');
		settingData = settingData ? JSON.parse(settingData) : {};
		settingData.soundOn=e.target.checked;
		localStorage.setItem('gameSetting',JSON.stringify(settingData));
		e.target.blur();
	});

	//Read sound on/off from localStorage
	try{
		let settingData=localStorage.getItem('gameSetting');
		if(settingData){
			settingData=JSON.parse(settingData);
			document.querySelector('input#enableSound').checked = settingData.soundOn;
		}
	}catch(e){
		console.error(e);
	}

	//Get puzzle pack stored data
	try{
		let storageData=localStorage.getItem('puzzleProcess');
		if(storageData){
			storageData=JSON.parse(storageData);
			totalScore=storageData[packName + '_Score'] || undefined;
			levelNum=storageData[packName + '_Level'] || undefined;
		}
	}catch(e){
		console.error(e);
	}
	if (undefined != totalScore && !isNaN(totalScore)) {
		totalScore = Number(totalScore);
	}
	if (undefined != levelNum && !isNaN(levelNum)) {
		levelNum = Number(levelNum);
	} else {
		levelNum = totalScore = 0;
	}

	//Game already finished
	if (levelNum >= levelData.length) {
		puzzlePackFinished(packName, totalScore);
		return;
	} 

	//Start game
	var level = new Level(levelData[levelNum], ctx);
	document.querySelector('span#level').innerHTML=(levelNum + 1);
	const onFinish=function(levelScore){
		totalScore += levelScore;
		levelNum++;
		try{
			let storageData=localStorage.getItem('puzzleProcess');
			if(storageData){
				storageData=JSON.parse(storageData);
			}else{
				storageData={};
			}
			storageData[packName + '_Level']=levelNum;
			storageData[packName + '_Score']=totalScore;
			localStorage.setItem('puzzleProcess',JSON.stringify(storageData));
		}catch(e){
			console.error(e);
		}
		if (levelNum < levelData.length) {
			//Next level
			level = new Level(levelData[levelNum], ctx);
			level.onFinish(onFinish);
			document.querySelector('span#level').innerHTML=(levelNum + 1);
		} else {
			//Game finished
			level = undefined;
			puzzlePackFinished(packName, totalScore);
		}
	}
	level.onFinish(onFinish);
}
