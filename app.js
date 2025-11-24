// GeoGuesser Clone - app.js
// Simple round-based guess-the-location game using Leaflet and a small dataset

let map, guessMarker, actualMarker, line;
let images = [];
let currentIndex = -1;
let roundsTotal = 5;
let roundNum = 0;
let totalScore = 0;
let hasGuessed = false;

// Elements
const startBtn = document.getElementById('startBtn');
const nextBtn = document.getElementById('nextBtn');
const sceneImage = document.getElementById('sceneImage');
const roundEl = document.getElementById('round');
const roundsTotalEl = document.getElementById('rounds-total');
const scoreEl = document.getElementById('score');
const distanceEl = document.getElementById('distance');
const roundScoreEl = document.getElementById('roundScore');
const hintToggle = document.getElementById('hintToggle');
const hintEl = document.getElementById('hint');
const locationCreditEl = document.getElementById('locationCredit');

roundsTotalEl.textContent = roundsTotal;

// Utility: load dataset (images.json)
async function loadDataset(){
  try {
    const res = await fetch('images.json');
    images = await res.json();
    // shuffle
    images = shuffle(images);
  } catch (err){
    console.error('Failed to load images.json', err);
    images = [];
  }
}

function shuffle(arr){
  for (let i = arr.length -1; i>0; i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Setup Leaflet map
function initMap(){
  map = L.map('map', {worldCopyJump: true}).setView([20,0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  map.on('click', onMapClick);
}

function onMapClick(e){
  if (roundNum === 0) return; // not started
  if (hasGuessed) return;
  const latlng = e.latlng;

  // place/update guess marker
  if (!guessMarker) {
    guessMarker = L.marker(latlng, {title:'Your guess'}).addTo(map);
  } else {
    guessMarker.setLatLng(latlng);
  }

  // show actual location, line and compute distance & score
  const actual = images[currentIndex];
  const actualLatLng = L.latLng(actual.lat, actual.lng);

  // actual marker
  if (!actualMarker) {
    actualMarker = L.marker(actualLatLng, {icon: L.icon({iconUrl: 'https://cdn-icons-png.flaticon.com/512/854/854866.png', iconSize:[24,24]})}).addTo(map);
  } else {
    actualMarker.setLatLng(actualLatLng);
  }

  // line
  if (line) {
    line.setLatLngs([latlng, actualLatLng]);
  } else {
    line = L.polyline([latlng, actualLatLng], {color:'#ff4d4f'}).addTo(map);
  }

  // zoom to fit
  const group = L.featureGroup([guessMarker, actualMarker]);
  map.fitBounds(group.getBounds().pad(0.2));

  // compute distance (km) and score
  const distKm = haversine(latlng.lat, latlng.lng, actual.lat, actual.lng);
  const points = computeScore(distKm);

  distanceEl.textContent = `Distance: ${distKm.toFixed(2)} km`;
  roundScoreEl.textContent = `Round score: ${points} pts`;
  totalScore += points;
  scoreEl.textContent = totalScore;

  // show credit
  locationCreditEl.textContent = `Answer location: ${actual.name}`;

  hasGuessed = true;
  nextBtn.disabled = false;
}

// haversine formula (km)
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = v => v * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// scoring: linear decay, 5000 at 0km, 0 at >=20000km
function computeScore(distanceKm) {
  const max = 5000;
  const maxDist = 20000;
  if (distanceKm <= 1) return max; // full points for super close guesses (within 1 km)
  const val = Math.round(Math.max(0, max * (1 - Math.min(distanceKm / maxDist, 1))));
  return val;
}

// Start a new game
async function startGame(){
  await loadDataset();
  if (images.length === 0) {
    alert('No images found in images.json. Add sample entries or provide your own dataset.');
    return;
  }

  roundNum = 0;
  totalScore = 0;
  scoreEl.textContent = '0';
  nextBtn.disabled = true;
  startBtn.disabled = true;
  proceedNextRound();
}

function proceedNextRound(){
  roundNum++;
  if (roundNum > roundsTotal || roundNum > images.length){
    endGame();
    return;
  }
  roundEl.textContent = roundNum;
  currentIndex = roundNum - 1; // images already shuffled in loadDataset
  showImage(images[currentIndex]);
  resetRoundState();
}

// show selected image
function showImage(imageObj){
  sceneImage.src = imageObj.url;
  sceneImage.alt = imageObj.name || 'Scene';
  hintEl.textContent = imageObj.hint || '';
  document.getElementById('locationCredit').textContent = '';
}

// reset markers/vars for next round
function resetRoundState(){
  if (guessMarker) { map.removeLayer(guessMarker); guessMarker = null; }
  if (actualMarker) { map.removeLayer(actualMarker); actualMarker = null; }
  if (line) { map.removeLayer(line); line = null; }
  distanceEl.textContent = '';
  roundScoreEl.textContent = '';
  hasGuessed = false;
  nextBtn.disabled = true;
  // center map outwards for fresh guessing
  map.setView([20,0], 2);
}

// end game
function endGame(){
  alert(`Game over! Your total score: ${totalScore} pts`);
  startBtn.disabled = false;
  nextBtn.disabled = true;
  roundNum = 0;
  roundEl.textContent = '0';
  sceneImage.src = '';
  hintEl.textContent = '';
  document.getElementById('locationCredit').textContent = '';
}

// Next button click
nextBtn.addEventListener('click', () => {
  if (!hasGuessed) return;
  if (roundNum >= roundsTotal) {
    endGame();
  } else {
    proceedNextRound();
  }
});

// start button
startBtn.addEventListener('click', startGame);

// hint toggle
hintToggle.addEventListener('change', e => {
  hintEl.style.visibility = e.target.checked ? 'visible' : 'hidden';
});

// initialize
window.addEventListener('load', () => {
  initMap();
  hintEl.style.visibility = 'hidden';
});