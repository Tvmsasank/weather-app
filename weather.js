const API_KEY = 'f0be62accaa06f827c40446b57a331da'; // Replace with your own key
let currentUnit = 'metric'; // or 'imperial'

// Load last city on page load
document.addEventListener('DOMContentLoaded', () => {
  const lastCity = localStorage.getItem('lastCity');
  if (lastCity) {
    document.getElementById('cityInput').value = lastCity;
    getWeather();
  }
});

// Toggle between Celsius and Fahrenheit
function toggleUnits() {
  const checkbox = document.getElementById('unitToggle');
  currentUnit = checkbox.checked ? 'imperial' : 'metric';

  const city = document.getElementById('cityInput').value.trim();
  if (city) {
    getWeather();
  }
}

// Get weather by city input
function getWeather() {
  const city = document.getElementById('cityInput').value.trim();
  const resultDiv = document.getElementById('weatherResult');

  if (!city) {
    resultDiv.innerHTML = `<p>Please enter a city name.</p>`;
    return;
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=${currentUnit}`;
  console.log("Fetching:", url);

  fetchWeather(url);
}

// Get weather by user's current location
function getWeatherByLocation() {
  const resultDiv = document.getElementById('weatherResult');
  resultDiv.innerHTML = `<p>Detecting location...</p>`;

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

// Fetch and display weather data
function fetchWeather(url) {
  const resultDiv = document.getElementById('weatherResult');
  resultDiv.innerHTML = `<p>Loading...</p>`;

  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error("City not found");
      return response.json();
    })
    .then(data => {
      // Save city to localStorage
      localStorage.setItem("lastCity", data.name);

      const { name, main, weather, sys, timezone, wind } = data;
      const description = weather[0].description;
      const icon = weather[0].icon;
      const temp = main.temp;
      const condition = weather[0].main.toLowerCase();
      const humidity = main.humidity;
      const windSpeed = wind.speed;
      const countryCode = sys.country;

      // Update background based on condition
      document.body.className = '';
      document.body.classList.add(condition);

      // Timezone handling
      const utc = new Date().getTime() + new Date().getTimezoneOffset() * 60000;
      const localTime = new Date(utc + timezone * 1000);
      const timeString = localTime.toLocaleTimeString();

      // Country flag
      const flagUrl = `https://flagcdn.com/48x36/${countryCode.toLowerCase()}.png`;

      // Temperature symbol
      const unitSymbol = currentUnit === 'metric' ? '°C' : '°F';

      // Display results
      resultDiv.innerHTML = `
      <h3>${name}, <img src="${flagUrl}" alt="${countryCode}" style="vertical-align: middle; width: 48px; height: 36px; border: 1px solid #ccc; margin-left: 5px;" />
      <span>(${countryCode})</span></h3>
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}" />
      <p><strong>${temp}${unitSymbol}</strong></p>
      <p>${description}</p>
      <p>Humidity: ${humidity}%</p>
      <p>Wind: ${windSpeed} m/s</p>
      <p>Local time: ${timeString}</p>`;
    })
    .catch(error => {
      resultDiv.innerHTML = `<p id="errorMsg">Error: ${error.message}</p>`;
    });
}
