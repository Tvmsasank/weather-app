const API_KEY = 'f0be62accaa06f827c40446b57a331da';
let currentUnit = 'metric';
let map, marker;

document.addEventListener('DOMContentLoaded', () => {
  const lastCity = localStorage.getItem('lastCity');
  if (lastCity) {
    document.getElementById('cityInput').value = lastCity;
    getWeather();
  }
});

function toggleUnits() {
  currentUnit = document.getElementById('unitToggle').checked ? 'imperial' : 'metric';
  const city = document.getElementById('cityInput').value.trim();
  if (city) getWeather();
}

function getWeather() {
  const city = document.getElementById('cityInput').value.trim();
  if (!city) return showError('Please enter a city name.');

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${currentUnit}`;
  fetchWeather(url);
}

function getWeatherByLocation() {
  if (!navigator.geolocation) return showError('Geolocation not supported.');

  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${currentUnit}`;
      fetchWeather(url);
    },
    err => showError(`Location error: ${err.message}`)
  );
}

function fetchWeather(url) {
  const resultDiv = document.getElementById('weatherResult');
  resultDiv.innerHTML = 'Loading...';
  document.getElementById('shareButtons').style.display = 'none';
  clearAnimations();

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error('City not found');
      return res.json();
    })
    .then(data => {
      const { name, main, weather, sys, timezone, coord, wind } = data;
      localStorage.setItem('lastCity', name);

      updateMap(coord.lat, coord.lon);

      const condition = weather[0].main.toLowerCase();
      const description = weather[0].description;
      const icon = weather[0].icon;
      const temp = main.temp;
      const humidity = main.humidity;
      const windSpeed = wind.speed;
      const countryCode = sys.country;
      const unitSymbol = currentUnit === 'metric' ? '°C' : '°F';

      updateAnimations(condition);
      
      const timeZoneName = "Asia/Kolkata"; // you can get this from APIs or a mapping 
      const timeString = new Date().toLocaleTimeString("en-US", {
      timeZone: timeZoneName,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      });

      const formattedTime = `${timeString} hrs`;
      console.log(formattedTime);

      const flagUrl = `https://flagcdn.com/48x36/${countryCode.toLowerCase()}.png`;

      resultDiv.innerHTML = `
        <h3>${name} <img src="${flagUrl}" alt="${countryCode}" /></h3>
        <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}" />
        <p><strong>${temp}${unitSymbol}</strong></p>
        <p>${description}</p>
        <p>Humidity: ${humidity}%</p>
        <p>Wind: ${windSpeed} m/s</p>
        <p>Local time: ${timeString} hrs</p>
      `;

      document.getElementById('shareButtons').style.display = 'block';
    })
    .catch(err => showError(`Error: ${err.message}`));
}

function updateMap(lat, lon) {
  if (!map) {
    map = L.map('map').setView([lat, lon], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    marker = L.marker([lat, lon]).addTo(map);
  } else {
    map.setView([lat, lon], 10);
    marker.setLatLng([lat, lon]);
  }
}

function showError(message) {
  document.getElementById('weatherResult').innerHTML = `<p id="errorMsg">${message}</p>`;
  document.getElementById('shareButtons').style.display = 'none';
  clearAnimations();
}

function clearAnimations() {
  document.getElementById('animationContainer').innerHTML = '';
  document.body.className = '';
}

function updateAnimations(condition) {
  document.body.className = condition;
  switch (condition) {
    case 'clear':
      createSunrays();
      break;
    case 'rain':
    case 'drizzle':
    case 'thunderstorm':
      createRain();
      break;
    case 'snow':
      createSnow();
      break;
  }
}

function createRain() {
  const animContainer = document.getElementById('animationContainer');
  const rainContainer = document.createElement('div');
  rainContainer.className = 'rain-container';

  for (let i = 0; i < 50; i++) {
    const drop = document.createElement('div');
    drop.className = 'raindrop';
    drop.style.left = `${Math.random() * 100}vw`;
    drop.style.animationDuration = `${Math.random() * 0.5 + 0.75}s`;
    drop.style.animationDelay = `${Math.random() * 2}s`;
    rainContainer.appendChild(drop);
  }
  animContainer.appendChild(rainContainer);
}

function createSnow() {
  const animContainer = document.getElementById('animationContainer');
  for (let i = 0; i < 50; i++) {
    const flake = document.createElement('div');
    flake.className = 'snowflake';
    flake.textContent = '❄';
    flake.style.left = `${Math.random() * 100}vw`;
    flake.style.top = `${Math.random() * -20}vh`;
    flake.style.fontSize = `${Math.random() * 10 + 10}px`;
    flake.style.animationDuration = `${Math.random() * 3 + 3}s`;
    flake.style.animationDelay = `${Math.random()}s`;
    animContainer.appendChild(flake);
  }
}

function createSunrays() {
  const animContainer = document.getElementById('animationContainer');
  const sunrays = document.createElement('div');
  sunrays.className = 'sunrays';
  animContainer.appendChild(sunrays);
}

function copyWeather() {
  const text = document.getElementById('weatherResult').innerText.trim();
  if (!text) return alert('No weather info to copy!');
  navigator.clipboard.writeText(text).then(() => alert('Copied!'));
}

function shareTwitter() {
  const text = document.getElementById('weatherResult').innerText.trim();
  if (!text) return alert('No weather info to share!');
  const tweet = encodeURIComponent(text + ' #WeatherApp');
  window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank');
}
