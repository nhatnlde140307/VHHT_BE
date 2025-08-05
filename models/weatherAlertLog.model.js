import mongoose from 'mongoose';

const weatherAlertLogSchema = new mongoose.Schema({
  location: {
    name: String,
    country: String,
    lat: Number,
    lon: Number,
  },

  weather: {
    conditionText: String,
    temp_c: Number,
    feelslike_c: Number,
    wind_kph: Number,
    humidity: Number,
    pressure_mb: Number,
    uv: Number,
  },

  alert: {
    headline: String,
    event: String,
    areas: String,
    desc: String,
    instruction: String,
    effective: Date,
    expires: Date,
    isMock: { type: Boolean, default: false },
  },

  hasAlert: { type: Boolean, default: false }, 
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('WeatherAlertLog', weatherAlertLogSchema);