// file: stormCron.js
import cron from 'node-cron';
import fetch from 'node-fetch';
import { getIO } from '../socket/socket.js';

// Chuyển km/h -> cấp gió Beaufort 0-12
function kmhToBeaufort(kmh) {
  if (kmh < 1) return 0;
  if (kmh <= 5) return 1;
  if (kmh <= 11) return 2;
  if (kmh <= 19) return 3;
  if (kmh <= 28) return 4;
  if (kmh <= 38) return 5;
  if (kmh <= 49) return 6;
  if (kmh <= 61) return 7;
  if (kmh <= 74) return 8;
  if (kmh <= 88) return 9;
  if (kmh <= 102) return 10;
  if (kmh <= 117) return 11;
  return 12;
}

// ---- GLOBAL STATE ----
let latestAlerts = [];
const DEV_MODE = process.env.DEV_MODE === "true";

// ---- 1. Fetch AccuWeather ----
async function fetchAccuWeather() {
  try {
    const ACCU_API_KEY = process.env.ACCU_API_KEY;
    const ACCU_LOCATION = process.env.ACCU_LOCATION;

    const accuUrl = `https://dataservice.accuweather.com/forecasts/v1/daily/5day/${ACCU_LOCATION}?apikey=${ACCU_API_KEY}&metric=true&details=true&language=vi-vn`;
    const resAccu = await fetch(accuUrl);
    const dataAccu = await resAccu.json();

    let alerts = [];
    const headline = dataAccu.Headline?.Text || null;
    const startDate = dataAccu.Headline?.EffectiveDate;
    const endDate = dataAccu.Headline?.EndDate;

    if (headline && startDate && endDate) {
      const stormDays = dataAccu.DailyForecasts.filter(d => {
        const date = new Date(d.Date);
        return date >= new Date(startDate) && date <= new Date(endDate);
      });

      if (stormDays.length > 0) {
        let totalRain = 0, totalWind = 0, maxRain = 0, maxWind = 0, count = 0;

        stormDays.forEach(d => {
          const rainDay = d.Day.TotalLiquid?.Value || 0;
          const rainNight = d.Night.TotalLiquid?.Value || 0;
          const dayRainTotal = rainDay + rainNight;
          totalRain += dayRainTotal;
          if (dayRainTotal > maxRain) maxRain = dayRainTotal;

          const gustDay = d.Day.WindGust?.Speed?.Value || 0;
          const gustNight = d.Night.WindGust?.Speed?.Value || 0;
          const dayMaxWind = Math.max(gustDay, gustNight);
          totalWind += dayMaxWind;
          if (dayMaxWind > maxWind) maxWind = dayMaxWind;

          count++;
        });

        const avgRain = totalRain / count;
        const avgWind = totalWind / count;
        const avgBeaufort = kmhToBeaufort(avgWind);

        let instruction = '';
        if (avgBeaufort >= 6 && avgBeaufort <= 7) {
          instruction = 'Gió rất mạnh, cần gia cố nhà cửa và hạn chế ra đường.';
        } else if (avgBeaufort >= 8) {
          instruction = 'Bão mạnh, ở yên trong nhà, tuyệt đối tránh ra ngoài!';
        } else {
          instruction = 'Theo dõi thời tiết, chuẩn bị đồ cần thiết.';
        }

        const desc = 
          `🌧️ Mưa TB: ${avgRain.toFixed(1)} mm/ngày (max ${maxRain.toFixed(1)} mm)\n` +
          `💨 Gió giật TB: ${avgWind.toFixed(1)} km/h (max ${maxWind.toFixed(1)} km/h)\n` +
          `🌀 Cấp gió Beaufort: ${avgBeaufort}`;

        alerts.push({
          headline,
          desc,
          instruction,
          effective: startDate,
          expires: endDate,
          areas: "Hà Tĩnh"
        });
      }
    }

    latestAlerts = alerts; // ✅ Cập nhật global alerts
    console.log("✅ Cập nhật latestAlerts từ AccuWeather:", latestAlerts);

  } catch (err) {
    console.error('❌ Lỗi khi fetch dữ liệu AccuWeather:', err);
  }
}

// ---- 2. Fetch WeatherAPI ----
async function fetchWeatherAPI() {
  const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

  let weather = {
    temp_c: null,
    feelslike_c: null,
    wind_kph: null,
    windLevel: null,
    humidity: null,
    pressure_mb: null,
    uv: null
  };

  try {
    const weatherUrl = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=18.3429,105.9057&lang=vi`;
    const resWeather = await fetch(weatherUrl);
    if (!resWeather.ok) throw new Error(`HTTP ${resWeather.status}`);
    const dataWeather = await resWeather.json();

    if (dataWeather.current) {
      const cur = dataWeather.current;
      weather = {
        temp_c: cur.temp_c,
        feelslike_c: cur.feelslike_c,
        wind_kph: cur.wind_kph,
        windLevel: `Beaufort ${kmhToBeaufort(cur.wind_kph)}`,
        humidity: cur.humidity,
        pressure_mb: cur.pressure_mb,
        uv: cur.uv
      };
    } else {
      console.warn('⚠️ WeatherAPI không có dữ liệu current:', dataWeather);
    }
  } catch (err) {
    console.error('❌ Lỗi khi fetch WeatherAPI:', err);
  }

  // ✅ Quyết định alerts (AccuWeather hay giả lập)
  let alertsToSend = latestAlerts;
  if ((!alertsToSend || alertsToSend.length === 0) && DEV_MODE) {
    alertsToSend = [{
      headline: 'Bão nhiệt đới sẽ ảnh hưởng đến khu vực vào Chủ Nhật',
      desc: '🌧️ Mưa TB: 105.6 mm/ngày (max 115.6 mm)\n' +
            '💨 Gió giật TB: 107.4 km/h (max 127.4 km/h)\n' +
            '🌀 Cấp gió Beaufort: 12',
      instruction: 'Bão mạnh, ở yên trong nhà, tuyệt đối tránh ra ngoài!',
      effective: '2025-08-31T07:00:00+07:00',
      expires: '2025-09-02T19:00:00+07:00',
      areas: 'Hà Tĩnh'
    }];
  }

  // ---- Emit về FE ----
  const payload = { alerts: alertsToSend, weather };
  getIO().emit('weather:update', payload);
  //console.log('⚡ Weather broadcasted:', payload);
}

// ---- Cron ----
// AccuWeather: mỗi 3 tiếng
cron.schedule('0 0 */3 * * *', fetchAccuWeather);

// WeatherAPI: mỗi 30 giây
cron.schedule('*/30 * * * * *', fetchWeatherAPI);

// ✅ Gọi 1 lần ngay khi server start
fetchWeatherAPI();
