const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const OFFICIAL_EMAIL = "nitasha1917.be23@chitkara.edu.in";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Helper Functions
function fibonacci(n) {
  if (n < 0) throw new Error("Invalid input");
  if (n === 0) return [];
  if (n === 1) return [0];
  
  const result = [0, 1];
  for (let i = 2; i < n; i++) {
    result.push(result[i-1] + result[i-2]);
  }
  return result;
}

function isPrime(num) {
  if (num < 2) return false;
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) return false;
  }
  return true;
}

function getPrimes(arr) {
  return arr.filter(isPrime);
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function lcm(a, b) {
  return (a * b) / gcd(a, b);
}

function calculateLCM(arr) {
  return arr.reduce((acc, num) => lcm(acc, num));
}

function calculateHCF(arr) {
  return arr.reduce((acc, num) => gcd(acc, num));
}

async function getAIResponse(question) {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `Answer this question with ONLY a single word or short phrase, no explanation: ${question}`
          }]
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 50
        }
      }
    );
    
    if (!response.data.candidates || response.data.candidates.length === 0) {
      throw new Error("No response from AI");
    }
    
    const answer = response.data.candidates[0].content.parts[0].text.trim();
    // Return first word/phrase, remove punctuation
    return answer.split('\n')[0].split('.')[0].replace(/[.,!?]/g, '').trim();
    
  } catch (error) {
    console.error('AI Error:', error.response?.data || error.message);
    throw new Error(`AI API error: ${error.response?.data?.error?.message || error.message}`);
  }
}
// POST /bfhl
app.post('/bfhl', async (req, res) => {
  try {
    const keys = Object.keys(req.body);
    
    // Validation: exactly one key
    if (keys.length !== 1) {
      return res.status(400).json({
        is_success: false,
        error: "Request must contain exactly one operation key"
      });
    }

    const operation = keys[0];
    const input = req.body[operation];
    let data;

    switch(operation) {
      case 'fibonacci':
        if (typeof input !== 'number' || input < 0) {
          return res.status(400).json({
            is_success: false,
            error: "fibonacci requires a non-negative integer"
          });
        }
        data = fibonacci(input);
        break;

      case 'prime':
        if (!Array.isArray(input) || !input.every(n => typeof n === 'number')) {
          return res.status(400).json({
            is_success: false,
            error: "prime requires an array of integers"
          });
        }
        data = getPrimes(input);
        break;

      case 'lcm':
        if (!Array.isArray(input) || input.length === 0 || !input.every(n => typeof n === 'number' && n > 0)) {
          return res.status(400).json({
            is_success: false,
            error: "lcm requires a non-empty array of positive integers"
          });
        }
        data = calculateLCM(input);
        break;

      case 'hcf':
        if (!Array.isArray(input) || input.length === 0 || !input.every(n => typeof n === 'number' && n > 0)) {
          return res.status(400).json({
            is_success: false,
            error: "hcf requires a non-empty array of positive integers"
          });
        }
        data = calculateHCF(input);
        break;

      case 'AI':
        if (typeof input !== 'string' || input.trim() === '') {
          return res.status(400).json({
            is_success: false,
            error: "AI requires a non-empty question string"
          });
        }
        data = await getAIResponse(input);
        break;

      default:
        return res.status(400).json({
          is_success: false,
          error: "Invalid operation. Allowed: fibonacci, prime, lcm, hcf, AI"
        });
    }

    res.status(200).json({
      is_success: true,
      official_email: OFFICIAL_EMAIL,
      data: data
    });

  } catch (error) {
    res.status(500).json({
      is_success: false,
      error: error.message || "Internal server error"
    });
  }
});

// GET /health
app.get('/health', (req, res) => {
  res.status(200).json({
    is_success: true,
    official_email: OFFICIAL_EMAIL
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    is_success: false,
    error: "Endpoint not found"
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});