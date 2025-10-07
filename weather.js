const API_KEY = 'f0be62accaa06f827c40446b57a331da'; // Replace with your OpenWeatherMap API key
let currentUnit = 'metric'; // or 'imperial'
let map; // Leaflet map instance
let marker; // Marker instance

// Load last city on page load
document.addEventListener('DOMContentLoaded', () => {
  const lastCity = localStorage.getItem('lastCity');
  if (lastCity) {
    document.getElementById('cityInput').value = lastCity;
    getWeather(); // auto-fetch
  }
});

// Toggle units
function toggleUnits() {
  const checkbox = document.getElementById('unitToggle');
  currentUnit = checkbox.checked ? 'imperial' : 'metric';

  const city = document.getElementById('cityInput').value.trim();
  if (city) {
    getWeather(); // re-fetch with new unit
  }
}

// Get weather by city name
function getWeather() {
  const city = document.getElementById('cityInput').value.trim();
  const resultDiv = document.getElementById('weatherResult');

  if (!city) {
    resultDiv.innerHTML = `<p>Please enter a city name.</p>`;
    document.getElementById('shareButtons').style.display = 'none';
    return;
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${currentUnit}`;
  const button = document.querySelector('button');
  button.disabled = true;
  console.log("Fetching:", url);
  fetchWeather(url);
  setTimeout(() => button.disabled = false, 1000); // re-enable after 1s
}

// Get weather by user's location
function getWeatherByLocation() {
  const resultDiv = document.getElementById('weatherResult');
  resultDiv.innerHTML = `<p>Detecting location...</p>`;
  document.getElementById('shareButtons').style.display = 'none';

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`;
      console.log("Fetching:", url);
      fetchWeather(url);
    }, error => {
      resultDiv.innerHTML = `<p>Location error: ${error.message}</p>`;
    });
  } else {
    resultDiv.innerHTML = `<p>Geolocation not supported.</p>`;
  }
}

// Clear previous animations
function clearAnimations() {
  const animContainer = document.getElementById('animationContainer');
  animContainer.innerHTML = '';
  document.body.className = ''; // clear weather class
}

// Create raindrops animation
function createRain() {
  const animContainer = document.getElementById('animationContainer');
  animContainer.innerHTML = '';
  const rainContainer = document.createElement('div');
  rainContainer.classList.add('rain-container');

  // Generate 50 raindrops randomly positioned
  for (let i = 0; i < 50; i++) {
    const drop = document.createElement('div');
    drop.classList.add('raindrop');
    drop.style.left = Math.random() * 100 + 'vw';
    drop.style.animationDuration = (Math.random() * 0.5 + 0.75) + 's';
    drop.style.animationDelay = (Math.random() * 2) + 's';
    rainContainer.appendChild(drop);
  }
  animContainer.appendChild(rainContainer);
}

// Create sun rays animation
function createSunrays() {
  const animContainer = document.getElementById('animationContainer');
  animContainer.innerHTML = '';
  const sunrays = document.createElement('div');
  sunrays.classList.add('sunrays');
  animContainer.appendChild(sunrays);
}

// Copy weather summary to clipboard
function copyWeather() {
  const weatherDiv = document.getElementById('weatherResult');
  if (!weatherDiv.innerText.trim()) {
    alert('No weather info to copy!');
    return;
  }

  let summary = weatherDiv.innerText;

  navigator.clipboard.writeText(summary)
    .then(() => alert('Weather summary copied to clipboard!'))
    .catch(() => alert('Failed to copy.'));
}

// Share weather info on Twitter
function shareTwitter() {
  const weatherDiv = document.getElementById('weatherResult');
  if (!weatherDiv.innerText.trim()) {
    alert('No weather info to share!');
    return;
  }

  const text = encodeURIComponent(weatherDiv.innerText + ' #WeatherApp');
  const url = `https://twitter.com/intent/tweet?text=${text}`;

  window.open(url, '_blank', 'width=550,height=420');
}

// Fetch weather from OpenWeatherMap
function fetchWeather(url) {
  const resultDiv = document.getElementById('weatherResult');
  resultDiv.innerHTML = `<p>Loading...</p>`;
  clearAnimations();
  document.getElementById('shareButtons').style.display = 'none';

  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error("City not found");
      return response.json();
    })
    .then(data => {
      // Save to localStorage
      localStorage.setItem("lastCity", data.name);

      const { name, main, weather, sys, timezone } = data;
      const { coord } = data; // contains { lat, lon }

      if (!map) {
        map = L.map('map').setView([coord.lat, coord.lon], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);
        marker = L.marker([coord.lat, coord.lon]).addTo(map);
      } else {
        map.setView([coord.lat, coord.lon], 10);
        marker.setLatLng([coord.lat, coord.lon]);
      }

      const description = weather[0].description;
      const icon = weather[0].icon;
      const temp = main.temp;
      const condition = weather[0].main.toLowerCase(); // e.g. "rain"

      // Update background & animations based on condition
      switch (condition) {
        case 'clear':
          document.body.className = 'clear';
          createSunrays();
          break;
        case 'rain':
        case 'drizzle':
          document.body.className = 'rain';
          createRain();
          break;
        case 'clouds':
          document.body.className = 'clouds';
          break;
        case 'snow':
          document.body.className = 'snow';
          break;
        case 'thunderstorm':
          document.body.className = 'thunderstorm';
          createRain();
          break;
        case 'mist':
        case 'fog':
        case 'haze':
          document.body.className = 'mist';
          break;
        default:
          document.body.className = '';
          break;
      }

      const humidity = main.humidity;
      const wind = data.wind.speed;
      const countryCode = sys.country;

      // Timezone adjustment
      const utc = new Date().getTime() + new Date().getTimezoneOffset() * 60000;
      const localTime = new Date(utc + timezone * 1000);
      const timeString = localTime.toLocaleTimeString();

      // Country flag
      const flagUrl = `https://flagcdn.com/48x36/${countryCode.toLowerCase()}.png`;

      // Temperature unit
      const unitSymbol = currentUnit === 'metric' ? '°C' : '°F';

      resultDiv.innerHTML = `
        <h3>${name} <img src="${flagUrl}" alt="${countryCode}" /></h3>
        <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}" />
        <p><strong>${temp}${unitSymbol}</strong></p>
        <p>${description}</p>
        <p>Humidity: ${humidity}%</p>
        <p>Wind: ${wind} m/s</p>
        <p>Local time: ${timeString}</p>
      `;

      // Show share buttons
      document.getElementById('shareButtons').style.display = 'block';
    })
    .catch(error => {
      resultDiv.innerHTML = `<p id="errorMsg">Error: ${error.message}</p>`;
      clearAnimations();
      document.getElementById('shareButtons').style.display = 'none';
    });
}
