import dotenv from 'dotenv';
import cron from 'node-cron';
import { getIO } from '../socket/socket.js';
import fetch from 'node-fetch';

dotenv.config();

const API_KEY = process.env.API_KEY_WEATHER;
const DEV_FORCE_STORM = process.env.DEV_FORCE_STORM;
const HATINH_QUERY = 'Ha Tinh';

function getWindLevel(kph) {
  if (kph < 39) return "Dưới cấp 6";
  if (kph < 50) return "Cấp 6";
  if (kph < 62) return "Cấp 7";
  if (kph < 75) return "Cấp 8";
  if (kph < 89) return "Cấp 9";
  if (kph < 103) return "Cấp 10";
  if (kph < 118) return "Cấp 11";
  return "Cấp 12+ (siêu bão)";
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleString('vi-VN', {
    timeZone: 'Asia/Bangkok',
    hour12: false,
  });
}

// ⏰ Cron mỗi 2 tiếng (vào phút 0)
cron.schedule('*/30 * * * * *', async () => {
// cron.schedule('0 */30 * * * *', async () => {
  try {
    const url = `https://api.weatherapi.com/v1/forecast.json?q=${encodeURIComponent(HATINH_QUERY)}&days=1&alerts=yes&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    const current = data.current;
    const location = data.location;
    let alerts = data.alerts?.alert || [];

    // Nếu không có cảnh báo nhưng bật DEV_FORCE_STORM → chèn alert giả
    if (alerts.length === 0 && DEV_FORCE_STORM) {
      alerts = [
        {
          headline: "[GIẢ LẬP] Bão LINFA",
          event: "Tropical Storm",
          desc: "Bão cấp 10, giật cấp 12, dự kiến đổ bộ từ 14h.",
          areas: "Ha Tinh",
          instruction: "Hạn chế ra ngoài, theo dõi cảnh báo.",
          effective: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          expires: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          isMock: true,
        },
      ];
    }

    const weatherSummary = {
      location: {
        name: location?.name,
        country: location?.country,
      },
      weather: {
        condition: current?.condition?.text,
        temp_c: current?.temp_c,
        feelslike_c: current?.feelslike_c,
        wind_kph: current?.wind_kph,
        windLevel: getWindLevel(current?.wind_kph),
        humidity: current?.humidity,
        pressure_mb: current?.pressure_mb,
        uv: current?.uv,
      },
      alerts: alerts.map(alert => ({
        headline: alert.headline,
        event: alert.event,
        desc: alert.desc,
        areas: alert.areas,
        instruction: alert.instruction,
        effective: formatTime(alert.effective),
        expires: formatTime(alert.expires),
        isMock: alert.isMock || false,
      })),
      timestamp: new Date().toISOString(),
    };
    console.log(weatherSummary)
    getIO().emit('weather:update', weatherSummary);

  } catch (err) {
    console.error('❌ Lỗi khi emit weather cron:', err);
  }
});
