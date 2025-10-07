const API_KEY = 'f0be62accaa06f827c40446b57a331da'; // Replace with your key
let currentUnit = 'metric'; // or 'imperial'

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
    return;
  }

const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${currentUnit}`;
  fetchWeather(url);
}

// Get weather by user's location
function getWeatherByLocation() {
  const resultDiv = document.getElementById('weatherResult');
  resultDiv.innerHTML = `<p>Detecting location...</p>`;

  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${currentUnit}`;
      console.log("Fetching:", url);
      fetchWeather(url); // ✅ now it will actually fetch and display weather
    }, error => {
      resultDiv.innerHTML = `<p>Location error: ${error.message}</p>`;
    });
  } else {
    resultDiv.innerHTML = `<p>Geolocation not supported.</p>`;
  }
}


// Fetch weather from OpenWeatherMap
function fetchWeather(url) {
  const resultDiv = document.getElementById('weatherResult');
  resultDiv.innerHTML = `<p>Loading...</p>`;

  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error("City not found");
      return response.json();
    })
    .then(data => {
      // Save to localStorage
      localStorage.setItem("lastCity", data.name);

      const { name, main, weather, sys, timezone } = data;
      const description = weather[0].description;
      const icon = weather[0].icon;
      const temp = main.temp;
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
        <h3>${name}, <img src="${flagUrl}" alt="${countryCode}" /></h3>
        <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}" />
        <p><strong>${temp}${unitSymbol}</strong></p>
        <p>${description}</p>
        <p>Local time: ${timeString}</p>
      `;
    })
    .catch(error => {
      resultDiv.innerHTML = `<p>Error: ${error.message}</p>`;
    });
}
