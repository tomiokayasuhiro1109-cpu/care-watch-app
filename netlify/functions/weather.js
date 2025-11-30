exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    const city = 'Sasebo';
    const country = 'JP';
    
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city},${country}&appid=${apiKey}&units=metric&lang=ja`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error('天気情報の取得に失敗しました');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        temp: Math.round(data.main.temp),
        description: data.weather[0].description,
        city: '佐世保市'
      })
    };
  } catch (error) {
    console.error('Weather API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};