const API_KEY = 'f0be62accaa06f827c40446b57a331da';
let currentUnit = 'metric';
let map, marker;
let currentWeatherURL = null;

document.addEventListener('DOMContentLoaded', () => {
  const lastCity = localStorage.getItem('lastCity');
  if (lastCity) {
    document.getElementById('cityInput').value = lastCity;
    getWeather();
  }

  document.getElementById('cityInput').addEventListener('input', showCitySuggestions);
});

// Toggle Celsius / Fahrenheit
function toggleUnits() {
  currentUnit = document.getElementById('unitToggle').checked ? 'imperial' : 'metric';
  const city = document.getElementById('cityInput').value.trim();
  if (city) getWeather();
}

// Dark mode toggle
function toggleDarkMode() {
  document.body.classList.toggle('dark');
}

// Auto-suggest city names
function showCitySuggestions(e) {
  const query = e.target.value;
  const suggestionsBox = document.getElementById('suggestions');
  suggestionsBox.innerHTML = '';
  if (query.length < 3) {
    return;
  }

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}`;
  console.log('Fetching city suggestions from:', url);

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error('Sugeestion API error ' + res.status);
      return res.json();
    })
    .then(data => {
      console.log('Suggestions API returned: ', data);
      const suggestions = data.results?.slice(0, 5) || [];
      suggestions.forEach(city => {
        const div = document.createElement('div');
        div.textContent = `${city.name}${city.country ? ', ' + city.country: ''}`;
        div.style.padding = '5px';
        div.style.cursor = 'pointer';
        div.style.background = '#666666ff';
        div.style.borderBottom = '1px solid #ddd';
        div.addEventListener('click', () => {
          document.getElementById('cityInput').value = city.name;
          suggestionsBox.innerHTML = '';
          getWeather();
        });
        suggestionsBox.appendChild(div);
      });
    })
    .catch(err => {
      console.error('Error fetching suggestions:', err)
    });
}

// Weather by geolocation
function getWeatherByLocation() {
  if (!navigator.geolocation) return showError('Geolocation not supported.');
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${currentUnit}`;
      currentWeatherURL = url;
      fetchWeather(url);
    },
    err => showError(`Location error: ${err.message}`)
  );
}

// Weather by city name
function getWeather() {
  const city = document.getElementById('cityInput').value.trim();
  if (!city) return showError('Please enter a city name.');

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${currentUnit}`;
  currentWeatherURL = url;
  fetchWeather(url);
}

// Fetch and render main weather + then AQI & UV
function fetchWeather(url) {
  console.log('Fetching weather from:', url);
  const resultDiv = document.getElementById('weatherResult');
  resultDiv.innerHTML = 'Loading...';
  document.getElementById('shareButtons').style.display = 'none';
  clearAnimations();

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error('Weathe API error ' + res.status);
      return res.json();
    })
    .then(data => {
      console.log('Weather API returned:', data);
      const { name, main, weather, sys, coord, wind } = data;
      localStorage.setItem('lastCity', name);
      updateMap(coord.lat, coord.lon);
      let condition = 'unknown';
      if (weather && Array.isArray(weather) && weather.length > 0 && weather[0].main) {
        condition = weather[0].main.toLowerCase();
    }
      const description = weather[0].description;
      const icon = weather[0].icon;
      const temp = main.temp;
      const humidity = main.humidity;
      const windSpeed = wind.speed;
      const countryCode = sys.country;
      const unitSymbol = currentUnit === 'metric' ? '°C' : '°F';

      updateAnimations(condition);

      // local time using data.dt & timezone if exists
      let timeString = '';
      if (data.dt != null && data.timezone != null) {
        const localDate = new Date((data.dt + data.timezone) * 1000);
        timeString = localDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      } else {
        timeString = new Date().toLocaleTimeString();
      }

      const flagUrl = `https://flagcdn.com/48x36/${countryCode.toLowerCase()}.png`;

      // Build base HTML (without AQI / UV yet)
      resultDiv.innerHTML = `
        <h3>${name} <img src="${flagUrl}" alt="${countryCode}" /></h3>
        <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}" />
        <p><strong>${temp}${unitSymbol}</strong></p>
        <p>${description}</p>
        <p>Humidity: ${humidity}%</p>
        <p>Wind: ${windSpeed} m/s</p>
        <p>Local time: ${timeString}</p>
        <button onclick="loadForecast(${coord.lat}, ${coord.lon})">📅 Show 5‑Day Forecast</button>
      `;

      document.getElementById('shareButtons').style.display = 'block';

      // Now fetch AQI and UV in parallel
      return Promise.all([
        fetchAirPollution(coord.lat, coord.lon),
        fetchUVIndex(coord.lat, coord.lon)
      ]);
    })
    .then(([aqi, uvi]) => {
      console.log('AQI:', aqi, 'UV index:', uvi);
      const resultDiv = document.getElementById('weatherResult');
      let extraHtml = '';
      if (aqi != null) {
        extraHtml += `<p>Air Quality Index (1 = Good, 5 = Hazardous): <strong>${aqi}</strong></p>`;
      } else {
        extraHtml += `<p>AQI data not available</p>`;
      }
      if (uvi != null) {
        extraHtml += `<p>UV Index: <strong>${uvi.toFixed(1)}</strong></p>`;
      } else {
        extraHtml += `<p>UV index not available</p>`;
      }
      resultDiv.innerHTML += extraHtml;
    })
    .catch(err => {
      console.error('Error in fetchWeather chain:', err);
      showError(`Error: ${err.message}`)
    });
}

// Fetch Air Pollution / AQI
function fetchAirPollution(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
  console.log('Fetching AQI from:', url);
  return fetch(url)
    .then(res => {
      if (!res.ok) {
        console.error('Air pollution API error', res.status);
        throw new Error('Air pollution fetch failed' + res.status);
      }
      return res.json();
    })
    .then(data => {
      if (data.list && data.list.length > 0) {
        return data.list[0].main.aqi;
      }
      return null;
    })
    .catch(err => {
      console.error('AQI error:', err);
      return null;
    });
}

// Fetch UV Index via One Call (v3) or suitable version
function fetchUVIndex(lat, lon) {
  // Use One Call 3.0 or whichever version your API key supports
  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,daily,alerts&appid=${API_KEY}`;
  console.log('Fetching UV via One Call v3 from:', url)
  return fetch(url)
    .then(res => {
      if (!res.ok) {
        console.error('UV fetch response error', res.status, res);
        throw new Error('UV fetch failed' + res.status);
      }
      return res.json();
    })
    .then(data => {
      console.log('One Call v3 response for UV:', data);
      if (data.current && data.current.uvi != null) {
        return data.current.uvi;
      }
      return null;
    })
    .catch(err => {
      console.error('UV error:', err);
      return null;
    });
}

// 5‑Day Forecast display
function loadForecast(lat, lon) {
  const forecastURL = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`;
  fetch(forecastURL)
    .then(res => res.json())
    .then(data => {
      let forecastHTML = '<h4>5-Day Forecast:</h4>';
      const filtered = data.list.filter((_, i) => i % 8 === 0);

      filtered.forEach(entry => {
        const date = new Date(entry.dt_txt).toLocaleDateString();
        const temp = entry.main.temp;
        const desc = entry.weather[0].description;
        const icon = entry.weather[0].icon;
        forecastHTML += `
          <div style="margin: 10px 0;">
            <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${desc}" />
            <p><b>${date}</b> - ${desc}, ${temp}${currentUnit === 'metric' ? '°C' : '°F'}</p>
          </div>
        `;
      });

      document.getElementById('weatherResult').innerHTML += forecastHTML;
    })
    .catch(err => console.error('Forecast error:', err));
}

// Leaflet map update
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

// Error rendering
function showError(message) {
  document.getElementById('weatherResult').innerHTML = `<p id="errorMsg">${message}</p>`;
  document.getElementById('shareButtons').style.display = 'none';
  clearAnimations();
}

// Animation functions
function clearAnimations() {
  document.getElementById('animationContainer').innerHTML = '';
  document.body.className = '';
}

function updateAnimations(condition) {
  document.body.className = condition;
  switch (condition) {
    case 'clear': createSunrays(); break;
    case 'clouds': createClouds(); break;
    case 'rain':
    case 'drizzle':
    case 'thunderstorm': createRain(); break;
    case 'snow': createSnow(); break;
  }
}

function createClouds() {
  const animContainer = document.getElementById('animationContainer');
  const cloudContainer = document.createElement('div');
  cloudContainer.className = 'cloud-container';
  for (let i = 0; i < 30; i++) {
    const cloud = document.createElement('div');
    cloud.className = 'cloud';
    const sizeScale = 0.5 + Math.random() * 1.5;
    cloud.style.width = `${150 * sizeScale}px`;
    cloud.style.height = `${75 * sizeScale}px`;
    cloud.style.left = `${Math.random() * 100}vw`;
    cloud.style.top = `${Math.random() * 100}vh`;
    cloud.style.opacity = `${0.4 + Math.random() * 0.4}`;
    cloud.style.animationDuration = `${60 + Math.random() * 60}s`;
    cloud.style.animationDelay = `${Math.random() * 10}s`;
    cloudContainer.appendChild(cloud);
  }
  animContainer.appendChild(cloudContainer);
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
  const sun = document.createElement('div');
  sun.className = 'sun';
  animContainer.appendChild(sunrays);
  animContainer.appendChild(sun);
}

// Copy to clipboard
function copyWeather() {
  const text = document.getElementById('weatherResult').innerText.trim();
  if (!text) return alert('No weather info to copy!');
  navigator.clipboard.writeText(text).then(() => alert('Copied!'));
}

// Share on Twitter
function shareTwitter() {
  const text = document.getElementById('weatherResult').innerText.trim();
  if (!text) return alert('No weather info to share!');
  const tweet = encodeURIComponent(text + ' #WeatherApp');
  window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank');
}

// Auto refresh every 10 minutes
setInterval(() => {
  if (currentWeatherURL) fetchWeather(currentWeatherURL);
}, 600000);
